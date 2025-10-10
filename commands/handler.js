const vfs = require('../filesystem/virtualFS');
const fileCommands = require('./fileCommands');
const systemCommands = require('./systemCommands');
const doctorCommand = require('./doctorCommand');

class CommandHandler {
  constructor() {
    this.commands = {
      // Файловые команды
      'DIR': fileCommands.dir,
      'CD': fileCommands.cd,
      'CHDIR': fileCommands.cd,
      'TYPE': fileCommands.type,
      'COPY': fileCommands.copy,
      'DEL': fileCommands.del,
      'DELETE': fileCommands.del,
      'ERASE': fileCommands.del,
      'MD': fileCommands.mkdir,
      'MKDIR': fileCommands.mkdir,
      'RD': fileCommands.rmdir,
      'RMDIR': fileCommands.rmdir,
      'REN': fileCommands.rename,
      'RENAME': fileCommands.rename,
      'MOVE': fileCommands.move,
      'TREE': fileCommands.tree,
      'ATTRIB': fileCommands.attrib,
      'MORE': fileCommands.more,

      // Системные команды
      'CLS': systemCommands.cls,
      'CLEAR': systemCommands.cls,
      'HELP': systemCommands.help,
      '?': systemCommands.help,
      'VER': systemCommands.ver,
      'DATE': systemCommands.date,
      'TIME': systemCommands.time,
      'ECHO': systemCommands.echo,
      'PROMPT': systemCommands.prompt,
      'SET': systemCommands.set,
      'PATH': systemCommands.path,
      'VOL': systemCommands.vol,
      'MEM': systemCommands.mem,
      'EXIT': systemCommands.exit,

      // Специальные команды
      'DOCTOR': doctorCommand.start,
      'CALC': systemCommands.calc,
      'BANNER': systemCommands.banner,
      'FORTUNE': systemCommands.fortune,
      'WIN95': systemCommands.win95,
      'WIN': systemCommands.win95
    };
  }

  async execute(commandLine, session) {
    // Пустая команда
    if (!commandLine.trim()) {
      return { output: '' };
    }

    // Режим DOCTOR
    if (session.doctorMode) {
      if (commandLine.toUpperCase() === 'QUIT' || commandLine.toUpperCase() === 'EXIT') {
        session.doctorMode = false;
        session.doctorHistory = [];
        return { output: 'Сеанс завершен. Берегите себя!\n' };
      }
      return await doctorCommand.chat(commandLine, session);
    }

    // Проверка перенаправления вывода (> и >>)
    const redirectMatch = commandLine.match(/^(.+?)\s*(>>?)\s+(.+)$/);
    if (redirectMatch) {
      const [, cmdPart, redirectOp, filePath] = redirectMatch;
      
      // Выполнить команду
      const parts = this.parseCommand(cmdPart);
      const cmd = parts.command.toUpperCase();
      const args = parts.args;
      
      if (!this.commands[cmd]) {
        return { 
          output: `Неверная команда или имя файла: ${cmd}\nИспользуйте HELP для списка команд.\n`
        };
      }
      
      try {
        const result = await this.commands[cmd](args, session, vfs);
        const content = result.output || '';
        
        // Записать в файл
        const targetPath = vfs.normalizePath(session.currentDir, filePath.trim());
        
        // >> - добавить, > - перезаписать
        let finalContent = content;
        if (redirectOp === '>>') {
          const existingContent = vfs.readFile(targetPath) || '';
          finalContent = existingContent + content;
        }
        
        if (vfs.writeFile(targetPath, finalContent)) {
          return { output: '' };
        } else {
          return { output: `Ошибка записи в файл: ${targetPath}\n` };
        }
      } catch (error) {
        return { output: `Ошибка выполнения команды: ${error.message}\n` };
      }
    }

    // Парсинг команды
    const parts = this.parseCommand(commandLine);
    const cmd = parts.command.toUpperCase();
    const args = parts.args;

    // Проверить наличие команды
    if (!this.commands[cmd]) {
      return { 
        output: `Неверная команда или имя файла: ${cmd}\nИспользуйте HELP для списка команд.\n`
      };
    }

    try {
      // Выполнить команду
      const result = await this.commands[cmd](args, session, vfs);
      return result || { output: '' };
    } catch (error) {
      return { 
        output: `Ошибка выполнения команды: ${error.message}\n`
      };
    }
  }

  parseCommand(commandLine) {
    const trimmed = commandLine.trim();
    
    // Специальная обработка DOS команд без пробелов
    // CD.. → CD ..
    if (/^CD\.\./i.test(trimmed)) {
      return { command: 'CD', args: ['..'], raw: commandLine };
    }
    // CD\ → CD \
    if (/^CD\\$/i.test(trimmed)) {
      return { command: 'CD', args: ['\\'], raw: commandLine };
    }
    // CD.\ → CD .\
    if (/^CD\.\\/i.test(trimmed)) {
      return { command: 'CD', args: ['.\\'], raw: commandLine };
    }
    // C: → CD C:\
    if (/^[A-Z]:$/i.test(trimmed)) {
      return { command: 'CD', args: [trimmed + '\\'], raw: commandLine };
    }
    
    // Обычный парсинг
    const parts = trimmed.split(/\s+/);
    const command = parts[0] || '';
    const args = parts.slice(1);
    
    return { command, args, raw: commandLine };
  }

  getCommandList() {
    const categories = {
      'Файловые команды': [
        'DIR - Список файлов и каталогов',
        'CD - Смена текущего каталога',
        'TYPE - Просмотр содержимого файла',
        'COPY - Копирование файлов',
        'DEL - Удаление файлов',
        'MKDIR - Создание каталога',
        'RMDIR - Удаление каталога',
        'REN - Переименование файла',
        'MOVE - Перемещение файла',
        'TREE - Дерево каталогов',
        'ATTRIB - Атрибуты файла'
      ],
      'Системные команды': [
        'CLS - Очистка экрана',
        'HELP - Справка по командам',
        'VER - Версия системы',
        'DATE - Показать дату',
        'TIME - Показать время',
        'ECHO - Вывод текста',
        'SET - Переменные окружения',
        'PATH - Путь поиска программ',
        'VOL - Метка тома',
        'MEM - Информация о памяти',
        'EXIT - Выход'
      ],
      'Дополнительно': [
        'DOCTOR - AI психотерапевт (GPT-4O)',
        'CALC - Калькулятор',
        'BANNER - ASCII баннер',
        'FORTUNE - Случайная цитата'
      ]
    };

    return categories;
  }
}

module.exports = new CommandHandler();

