'use strict';

const fileCommands = require('./fileCommands');
const systemCommands = require('./systemCommands');
const defaultDoctorCommand = require('./doctorCommand');

function success(result = {}) {
  return { success: true, output: '', ...result };
}

function failure(output) {
  return { success: false, output };
}

class CommandHandler {
  constructor({ vfs, doctorCommand = defaultDoctorCommand } = {}) {
    if (!vfs) throw new Error('CommandHandler requires a VFS instance');
    this.vfs = vfs;
    this.doctorCommand = doctorCommand;
    this.commands = {
      DIR: fileCommands.dir,
      CD: fileCommands.cd,
      CHDIR: fileCommands.cd,
      TYPE: fileCommands.type,
      COPY: fileCommands.copy,
      DEL: fileCommands.del,
      DELETE: fileCommands.del,
      ERASE: fileCommands.del,
      MD: fileCommands.mkdir,
      MKDIR: fileCommands.mkdir,
      RD: fileCommands.rmdir,
      RMDIR: fileCommands.rmdir,
      REN: fileCommands.rename,
      RENAME: fileCommands.rename,
      MOVE: fileCommands.move,
      TREE: fileCommands.tree,
      ATTRIB: fileCommands.attrib,
      MORE: fileCommands.more,
      CLS: systemCommands.cls,
      CLEAR: systemCommands.cls,
      HELP: systemCommands.help,
      '?': systemCommands.help,
      VER: systemCommands.ver,
      DATE: systemCommands.date,
      TIME: systemCommands.time,
      ECHO: systemCommands.echo,
      PROMPT: systemCommands.prompt,
      SET: systemCommands.set,
      PATH: systemCommands.path,
      VOL: systemCommands.vol,
      MEM: systemCommands.mem,
      EXIT: systemCommands.exit,
      DOCTOR: doctorCommand.start,
      CALC: systemCommands.calc,
      BANNER: systemCommands.banner,
      FORTUNE: systemCommands.fortune,
      WIN95: systemCommands.win95,
      WIN: systemCommands.win95
    };
  }

  async execute(commandLine, session) {
    if (typeof commandLine !== 'string') return failure('Команда должна быть строкой.\n');
    if (!commandLine.trim()) return success();

    if (session.doctorMode) {
      const normalized = commandLine.trim().toUpperCase();
      if (normalized === 'QUIT' || normalized === 'EXIT') {
        session.doctorMode = false;
        session.doctorHistory = [];
        session.elizaMemory = [];
        return success({ output: 'Сеанс завершен. Берегите себя!\n' });
      }
      return this.#normalizeResult(await this.doctorCommand.chat(commandLine, session));
    }

    let redirect;
    try {
      redirect = this.parseRedirection(commandLine);
    } catch (error) {
      return failure(`Ошибка разбора команды: ${error.message}\n`);
    }
    if (redirect) {
      const result = await this.#executeCommand(redirect.commandLine, session);
      if (!result.success) return result;
      try {
        const targetPath = this.vfs.normalizePath(session.currentDir, redirect.filePath);
        const previous = redirect.append ? (this.vfs.readFile(targetPath) ?? '') : '';
        if (!this.vfs.writeFile(targetPath, previous + (result.output || ''))) {
          return failure(`Ошибка записи в файл: ${targetPath}\n`);
        }
        return success();
      } catch (error) {
        return failure(`Ошибка записи в файл: ${error.message}\n`);
      }
    }

    return this.#executeCommand(commandLine, session);
  }

  async #executeCommand(commandLine, session) {
    let parsed;
    try {
      parsed = this.parseCommand(commandLine);
    } catch (error) {
      return failure(`Ошибка разбора команды: ${error.message}\n`);
    }
    const command = parsed.command.toUpperCase();
    const handler = this.commands[command];
    if (!handler) {
      return failure(`Неверная команда или имя файла: ${command}\nИспользуйте HELP для списка команд.\n`);
    }
    try {
      return this.#normalizeResult(await handler(parsed.args, session, this.vfs));
    } catch (error) {
      return failure(`Ошибка выполнения команды: ${error.message}\n`);
    }
  }

  #normalizeResult(result) {
    if (!result) return success();
    return { success: result.success !== false, output: result.output || '', ...result };
  }

  parseRedirection(commandLine) {
    let quoted = false;
    for (let index = 0; index < commandLine.length; index += 1) {
      const character = commandLine[index];
      if (character === '"') quoted = !quoted;
      if (!quoted && character === '>') {
        const append = commandLine[index + 1] === '>';
        const commandPart = commandLine.slice(0, index).trim();
        const targetPart = commandLine.slice(index + (append ? 2 : 1)).trim();
        if (!commandPart || !targetPart) throw new Error('Укажите команду и файл перенаправления');
        const targetTokens = this.tokenize(targetPart);
        if (targetTokens.length !== 1) throw new Error('Имя файла с пробелами заключите в кавычки');
        return { commandLine: commandPart, filePath: targetTokens[0], append };
      }
    }
    if (quoted) throw new Error('Незакрытая кавычка');
    return null;
  }

  parseCommand(commandLine) {
    const trimmed = commandLine.trim();
    if (/^CD\.\.$/i.test(trimmed)) return { command: 'CD', args: ['..'], raw: commandLine };
    if (/^CD\\/i.test(trimmed)) return { command: 'CD', args: [trimmed.slice(2)], raw: commandLine };
    if (/^CD\.\\/i.test(trimmed)) return { command: 'CD', args: [trimmed.slice(2)], raw: commandLine };
    if (/^[A-Z]:$/i.test(trimmed)) return { command: 'CD', args: [`${trimmed}\\`], raw: commandLine };

    const parts = this.tokenize(trimmed);
    return { command: parts[0] || '', args: parts.slice(1), raw: commandLine };
  }

  tokenize(input) {
    const tokens = [];
    let token = '';
    let quoted = false;
    for (const character of input) {
      if (character === '"') {
        quoted = !quoted;
      } else if (/\s/.test(character) && !quoted) {
        if (token) {
          tokens.push(token);
          token = '';
        }
      } else {
        token += character;
      }
    }
    if (quoted) throw new Error('Незакрытая кавычка');
    if (token) tokens.push(token);
    return tokens;
  }

  getCommandList() {
    return {
      'Файловые команды': [
        'DIR - Список файлов и каталогов', 'CD - Смена текущего каталога',
        'TYPE - Просмотр содержимого файла', 'COPY - Копирование файлов',
        'DEL - Удаление файлов', 'MKDIR - Создание каталога',
        'RMDIR - Удаление каталога', 'REN - Переименование',
        'MOVE - Перемещение', 'TREE - Дерево каталогов', 'ATTRIB - Атрибуты файла'
      ],
      'Системные команды': [
        'CLS - Очистка экрана', 'HELP - Справка по командам', 'VER - Версия системы',
        'DATE - Показать дату', 'TIME - Показать время', 'ECHO - Вывод текста',
        'SET - Переменные окружения', 'PATH - Путь поиска программ',
        'VOL - Метка тома', 'MEM - Информация о памяти', 'EXIT - Выход'
      ],
      Дополнительно: [
        'DOCTOR - Виртуальный собеседник ELIZA', 'CALC - Калькулятор',
        'BANNER - ASCII баннер', 'FORTUNE - Случайная цитата', 'WIN95 - Интерфейс Windows 95'
      ]
    };
  }
}

module.exports = { CommandHandler, success, failure };
