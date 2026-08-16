'use strict';

// Системные команды DOS
const VERSION = require('../package.json').version;

const fortunes = [
  'Самая большая ошибка, которую вы можете совершить в жизни, - это постоянный страх совершить ошибку.',
  'Будущее принадлежит тем, кто верит в красоту своих мечтаний.',
  'Единственный способ сделать великую работу - любить то, что ты делаешь.',
  'Жизнь - это то, что происходит с вами, пока вы строите другие планы.',
  'Не считайте дни, сделайте так, чтобы дни считались.',
  'Успех - это способность идти от неудачи к неудаче, не теряя энтузиазма.',
  'Программирование - это искусство говорить другому человеку, что он хочет сказать компьютеру.',
  'Любой дурак может написать код, который понимает компьютер. Хорошие программисты пишут код, который понимают люди.'
];

function evaluateExpression(source) {
  if (typeof source !== 'string' || !source.trim() || /[^0-9+\-*/().\s]/.test(source)) {
    throw new Error('Недопустимое выражение');
  }
  const tokens = source.match(/\d+(?:\.\d+)?|[()+\-*/]/g) || [];
  let position = 0;

  const parsePrimary = () => {
    const token = tokens[position];
    if (token === '+' || token === '-') {
      position += 1;
      const value = parsePrimary();
      return token === '-' ? -value : value;
    }
    if (token === '(') {
      position += 1;
      const value = parseAdditive();
      if (tokens[position] !== ')') throw new Error('Незакрытая скобка');
      position += 1;
      return value;
    }
    if (!token || !/^\d/.test(token)) throw new Error('Ожидалось число');
    position += 1;
    return Number(token);
  };

  const parseMultiplicative = () => {
    let value = parsePrimary();
    while (tokens[position] === '*' || tokens[position] === '/') {
      const operator = tokens[position++];
      const right = parsePrimary();
      if (operator === '/' && right === 0) throw new Error('Деление на ноль');
      value = operator === '*' ? value * right : value / right;
    }
    return value;
  };

  const parseAdditive = () => {
    let value = parseMultiplicative();
    while (tokens[position] === '+' || tokens[position] === '-') {
      const operator = tokens[position++];
      const right = parseMultiplicative();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  };

  const result = parseAdditive();
  if (position !== tokens.length || !Number.isFinite(result)) throw new Error('Недопустимое выражение');
  return result;
}

const systemCommands = {
  // CLS - очистка экрана
  cls: () => {
    return { output: '', clear: true };
  },

  // HELP - справка
  help: (args, _session) => {
    if (args.length > 0) {
      const cmd = args[0].toUpperCase();
      const helpText = getCommandHelp(cmd);
      return { output: helpText };
    }

    let output = `DOS95 v${VERSION} - Справка по командам\n`;
    output += `${'='.repeat(50)}\n\n`;
    
    output += `ФАЙЛОВЫЕ КОМАНДЫ:\n`;
    output += `  DIR [путь]         - Список файлов и каталогов\n`;
    output += `  CD [путь]          - Смена каталога\n`;
    output += `    CD..             - На уровень вверх\n`;
    output += `    CD\\              - В корень диска\n`;
    output += `    C:               - Перейти на диск C:\n`;
    output += `  TYPE <файл>        - Просмотр содержимого файла\n`;
    output += `  MORE <файл>        - Постраничный просмотр файла\n`;
    output += `  COPY <1> <2>       - Копирование файлов\n`;
    output += `  DEL <файл>         - Удаление файла\n`;
    output += `  MD <каталог>       - Создание каталога\n`;
    output += `  RD <каталог>       - Удаление пустого каталога\n`;
    output += `  REN <старый> <новый> - Переименование\n`;
    output += `  MOVE <1> <2>       - Перемещение файла\n`;
    output += `  TREE [путь]        - Дерево каталогов\n`;
    output += `  ATTRIB <файл>      - Атрибуты файла\n\n`;
    
    output += `СИСТЕМНЫЕ КОМАНДЫ:\n`;
    output += `  CLS                - Очистка экрана\n`;
    output += `  HELP [команда]     - Справка\n`;
    output += `  VER                - Версия системы\n`;
    output += `  DATE               - Показать дату\n`;
    output += `  TIME               - Показать время\n`;
    output += `  ECHO <текст>       - Вывод текста\n`;
    output += `  SET [переменная]   - Переменные окружения\n`;
    output += `  PATH               - Путь поиска программ\n`;
    output += `  VOL                - Метка тома\n`;
    output += `  MEM                - Информация о памяти\n`;
    output += `  EXIT               - Выход\n\n`;
    
    output += `СПЕЦИАЛЬНЫЕ КОМАНДЫ:\n`;
    output += `  DOCTOR             - Защищённый виртуальный собеседник\n`;
    output += `  WIN95 / WIN        - Запустить Windows 95 интерфейс\n`;
    output += `  CALC <выражение>   - Калькулятор\n`;
    output += `  BANNER <текст>     - ASCII баннер\n`;
    output += `  FORTUNE            - Случайная цитата\n\n`;
    
    output += `ПЕРЕНАПРАВЛЕНИЕ ВЫВОДА:\n`;
    output += `  команда > файл     - Создать файл с выводом команды\n`;
    output += `  команда >> файл    - Добавить вывод к существующему файлу\n`;
    output += `\n`;
    output += `  Примеры:\n`;
    output += `    ECHO Привет > test.txt       - Создать файл\n`;
    output += `    DIR > список.txt             - Сохранить список файлов\n`;
    output += `    VER >> info.txt              - Добавить версию к файлу\n`;
    output += `    DATE > log.txt               - Начать лог-файл\n`;
    output += `    CALC 2 + 2 >> result.txt     - Добавить результат\n\n`;
    
    output += `Для подробной справки: HELP <команда>\n`;
    
    return { output };
  },

  // VER - версия
  ver: () => {
    let output = `\n`;
    output += `╔════════════════════════════════════════════════╗\n`;
    output += `║   DOS95 Version ${VERSION.padEnd(31, ' ')}║\n`;
    output += `║   Виртуальная DOS среда с AI интеграцией       ║\n`;
    output += `║   (c) 2026 - Protected OpenAI integration      ║\n`;
    output += `╚════════════════════════════════════════════════╝\n`;
    output += `\n`;
    return { output };
  },

  // DATE - дата
  date: () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('ru-RU', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    return { output: `Текущая дата: ${dateStr}\n` };
  },

  // TIME - время
  time: () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ru-RU');
    return { output: `Текущее время: ${timeStr}\n` };
  },

  // ECHO - вывод текста
  echo: (args) => {
    const text = args.join(' ');
    return { output: text + '\n' };
  },

  // PROMPT - настройка приглашения
  prompt: (args, session) => {
    if (args.length === 0) {
      return { output: `Текущее приглашение: ${session.env.PROMPT}\n` };
    }
    session.env.PROMPT = args.join(' ');
    return { output: '' };
  },

  // SET - переменные окружения
  set: (args, session) => {
    if (args.length === 0) {
      let output = 'Переменные окружения:\n';
      for (const [key, value] of Object.entries(session.env)) {
        output += `${key}=${value}\n`;
      }
      return { output };
    }

    const varDef = args.join(' ');
    const [key, ...valueParts] = varDef.split('=');
    const value = valueParts.join('=');
    
    if (value) {
      session.env[key.toUpperCase()] = value;
      return { output: '' };
    } else {
      return { output: `${key}=${session.env[key.toUpperCase()] || ''}\n` };
    }
  },

  // PATH - путь
  path: (args, session) => {
    if (args.length === 0) {
      return { output: `PATH=${session.env.PATH}\n` };
    }
    session.env.PATH = args.join(' ');
    return { output: '' };
  },

  // VOL - метка тома
  vol: () => {
    let output = ` Том в устройстве C - DOSWEB\n`;
    output += ` Серийный номер тома: 1A2B-3C4D\n`;
    return { output };
  },

  // MEM - память
  mem: () => {
    let output = `\n`;
    output += ` Тип памяти         Всего      Используется  Свободно\n`;
    output += ` ${'─'.repeat(58)}\n`;
    output += ` Обычная            640K       128K          512K\n`;
    output += ` Верхняя            384K       64K           320K\n`;
    output += ` Расширенная (XMS)  15360K     2048K         13312K\n`;
    output += ` Всего              16384K     2240K         14144K\n`;
    output += `\n`;
    output += ` Самый большой исполняемый размер программы: 512K\n`;
    return { output };
  },

  // EXIT - выход
  exit: () => {
    return { output: 'Для выхода закройте окно браузера.\n' };
  },

  // CALC - калькулятор
  calc: (args) => {
    if (args.length === 0) {
      return { output: `Использование: CALC <выражение>\nПример: CALC 2 + 2\n` };
    }

    try {
      const expression = args.join(' ');
      const result = evaluateExpression(expression);
      return { output: `${expression} = ${result}\n` };
    } catch (error) {
      return { success: false, output: `Ошибка вычисления: ${error.message}\n` };
    }
  },

  // BANNER - ASCII баннер
  banner: (args) => {
    if (args.length === 0) {
      return { output: `Использование: BANNER <текст>\n` };
    }

    const text = args.join(' ').toUpperCase();
    let output = '\n';
    
    // Простой ASCII art
    const height = 5;
    for (let row = 0; row < height; row++) {
      for (const char of text) {
        output += getASCIIChar(char, row) + ' ';
      }
      output += '\n';
    }
    output += '\n';
    
    return { output };
  },

  // FORTUNE - случайная цитата
  fortune: () => {
    const quote = fortunes[Math.floor(Math.random() * fortunes.length)];
    let output = '\n';
    output += ` ┌${'─'.repeat(60)}┐\n`;
    
    // Разбить цитату на строки по 58 символов
    const words = quote.split(' ');
    let line = '';
    
    for (const word of words) {
      if ((line + word).length > 58) {
        output += ` │ ${line.padEnd(58)} │\n`;
        line = word + ' ';
      } else {
        line += word + ' ';
      }
    }
    
    if (line.trim()) {
      output += ` │ ${line.trim().padEnd(58)} │\n`;
    }
    
    output += ` └${'─'.repeat(60)}┘\n\n`;
    
    return { output };
  },

  // WIN95 - запуск Windows 95 интерфейса
  win95: () => {
    let output = '\n';
    output += `╔════════════════════════════════════════════════════════════╗\n`;
    output += `║          Запуск Windows 95 Interface...                    ║\n`;
    output += `╚════════════════════════════════════════════════════════════╝\n`;
    output += `\n`;
    output += `Загружаю графическую среду Windows 95...\n`;
    output += `\n`;
    output += `URL: /win95\n`;
    output += `\n`;
    output += `Если переход не выполнен автоматически, откройте ссылку выше.\n`;
    output += `\n`;
    
    // Клиент загружает Windows 95 в текущей вкладке.
    return { 
      output,
      openWindow: '/win95'
    };
  }
};

// Простой ASCII art для баннеров
function getASCIIChar(char, row) {
  const chars = {
    'A': ['  A  ', ' A A ', 'AAAAA', 'A   A', 'A   A'],
    'B': ['BBBB ', 'B   B', 'BBBB ', 'B   B', 'BBBB '],
    'C': [' CCC ', 'C   C', 'C    ', 'C   C', ' CCC '],
    'D': ['DDD  ', 'D  D ', 'D   D', 'D  D ', 'DDD  '],
    'E': ['EEEEE', 'E    ', 'EEEE ', 'E    ', 'EEEEE'],
    'F': ['FFFFF', 'F    ', 'FFFF ', 'F    ', 'F    '],
    'G': [' GGG ', 'G    ', 'G  GG', 'G   G', ' GGG '],
    'H': ['H   H', 'H   H', 'HHHHH', 'H   H', 'H   H'],
    'I': ['IIIII', '  I  ', '  I  ', '  I  ', 'IIIII'],
    'J': ['JJJJJ', '   J ', '   J ', 'J  J ', ' JJ  '],
    'K': ['K   K', 'K  K ', 'KKK  ', 'K  K ', 'K   K'],
    'L': ['L    ', 'L    ', 'L    ', 'L    ', 'LLLLL'],
    'M': ['M   M', 'MM MM', 'M M M', 'M   M', 'M   M'],
    'N': ['N   N', 'NN  N', 'N N N', 'N  NN', 'N   N'],
    'O': [' OOO ', 'O   O', 'O   O', 'O   O', ' OOO '],
    'P': ['PPPP ', 'P   P', 'PPPP ', 'P    ', 'P    '],
    'Q': [' QQQ ', 'Q   Q', 'Q   Q', 'Q  Q ', ' QQ Q'],
    'R': ['RRRR ', 'R   R', 'RRRR ', 'R  R ', 'R   R'],
    'S': [' SSS ', 'S    ', ' SSS ', '    S', ' SSS '],
    'T': ['TTTTT', '  T  ', '  T  ', '  T  ', '  T  '],
    'U': ['U   U', 'U   U', 'U   U', 'U   U', ' UUU '],
    'V': ['V   V', 'V   V', 'V   V', ' V V ', '  V  '],
    'W': ['W   W', 'W   W', 'W W W', 'WW WW', 'W   W'],
    'X': ['X   X', ' X X ', '  X  ', ' X X ', 'X   X'],
    'Y': ['Y   Y', ' Y Y ', '  Y  ', '  Y  ', '  Y  '],
    'Z': ['ZZZZZ', '   Z ', '  Z  ', ' Z   ', 'ZZZZZ'],
    '0': [' 000 ', '0  00', '0 0 0', '00  0', ' 000 '],
    '1': ['  1  ', ' 11  ', '  1  ', '  1  ', '11111'],
    '2': [' 222 ', '2   2', '   2 ', '  2  ', '22222'],
    '3': ['3333 ', '    3', ' 333 ', '    3', '3333 '],
    '4': ['4   4', '4   4', '44444', '    4', '    4'],
    '5': ['55555', '5    ', '5555 ', '    5', '5555 '],
    '6': [' 666 ', '6    ', '6666 ', '6   6', ' 666 '],
    '7': ['77777', '   7 ', '  7  ', ' 7   ', '7    '],
    '8': [' 888 ', '8   8', ' 888 ', '8   8', ' 888 '],
    '9': [' 999 ', '9   9', ' 9999', '    9', ' 999 '],
    '!': ['  !  ', '  !  ', '  !  ', '     ', '  !  '],
    '?': [' ??? ', '?   ?', '   ? ', '     ', '  ?  '],
    '.': ['     ', '     ', '     ', '     ', '  .  '],
    ' ': ['     ', '     ', '     ', '     ', '     '],
    // Кириллица
    'А': ['  А  ', ' А А ', 'ААААА', 'А   А', 'А   А'],
    'Б': ['ББББ ', 'Б    ', 'ББББ ', 'Б   Б', 'ББББ '],
    'В': ['ВВВВ ', 'В   В', 'ВВВВ ', 'В   В', 'ВВВВ '],
    'Г': ['ГГГГГ', 'Г    ', 'Г    ', 'Г    ', 'Г    '],
    'Д': ['  Д  ', ' ДД  ', 'Д  Д ', 'Д  Д ', 'ДДДДД'],
    'Е': ['ЕЕЕЕЕ', 'Е    ', 'ЕЕЕЕ ', 'Е    ', 'ЕЕЕЕЕ'],
    'Ё': ['ЕЕЕЕЕ', 'Е    ', 'ЕЕЕЕ ', 'Е    ', 'ЕЕЕЕЕ'],
    'Ж': ['Ж Ж Ж', 'Ж Ж Ж', ' ЖЖЖ ', 'Ж Ж Ж', 'Ж Ж Ж'],
    'З': [' ЗЗЗ ', '   З ', '  ЗЗ ', '   З ', ' ЗЗЗ '],
    'И': ['И   И', 'И  И ', 'И И  ', 'ИИ   ', 'И    '],
    'Й': ['И   И', 'И  И ', 'И И  ', 'ИИ   ', 'И    '],
    'К': ['К   К', 'К  К ', 'ККК  ', 'К  К ', 'К   К'],
    'Л': ['  ЛЛЛ', ' Л  Л', ' Л  Л', 'Л   Л', 'Л   Л'],
    'М': ['М   М', 'ММ ММ', 'М М М', 'М   М', 'М   М'],
    'Н': ['Н   Н', 'Н   Н', 'ННННН', 'Н   Н', 'Н   Н'],
    'О': [' ООО ', 'О   О', 'О   О', 'О   О', ' ООО '],
    'П': ['ППППП', 'П   П', 'П   П', 'П   П', 'П   П'],
    'Р': ['РРРР ', 'Р   Р', 'РРРР ', 'Р    ', 'Р    '],
    'С': [' ССС ', 'С   С', 'С    ', 'С   С', ' ССС '],
    'Т': ['ТТТТТ', '  Т  ', '  Т  ', '  Т  ', '  Т  '],
    'У': ['У   У', 'У   У', ' У У ', '  У  ', ' У   '],
    'Ф': [' ФФФ ', 'ФФФФФ', 'Ф Ф Ф', 'ФФФФФ', ' ФФФ '],
    'Х': ['Х   Х', ' Х Х ', '  Х  ', ' Х Х ', 'Х   Х'],
    'Ц': ['Ц   Ц', 'Ц   Ц', 'Ц   Ц', 'ЦЦЦЦЦ', '    Ц'],
    'Ч': ['Ч   Ч', 'Ч   Ч', ' ЧЧЧЧ', '    Ч', '    Ч'],
    'Ш': ['Ш Ш Ш', 'Ш Ш Ш', 'Ш Ш Ш', 'Ш Ш Ш', 'ШШШШШ'],
    'Щ': ['Щ Щ Щ', 'Щ Щ Щ', 'Щ Щ Щ', 'ЩЩЩЩЩ', '    Щ'],
    'Ъ': ['ЪЪ   ', ' Ъ   ', ' ЪЪЪ ', ' Ъ  Ъ', ' ЪЪЪ '],
    'Ы': ['Ы   Ы', 'Ы   Ы', 'ЫЫЫ Ы', 'Ы  ЪЫ', 'ЫЫЫ Ы'],
    'Ь': ['Ь    ', 'Ь    ', 'ЬЬЬЬ ', 'Ь   Ь', 'ЬЬЬЬ '],
    'Э': [' ЭЭЭ ', '    Э', '  ЭЭЭ', '    Э', ' ЭЭЭ '],
    'Ю': ['Ю   Ю', 'Ю   Ю', 'ЮЮЮЮ ', 'Ю Ю Ю', 'Ю   Ю'],
    'Я': [' ЯЯЯЯ', 'Я   Я', ' ЯЯЯЯ', '  Я Я', 'Я   Я'],
  };
  
  return chars[char]?.[row] || '  ?  ';
}

// Подробная справка по командам
function getCommandHelp(cmd) {
  const help = {
    'DIR': 'DIR [путь]\nВыводит список файлов и подкаталогов указанного каталога.',
    'CD': `CD [путь]
Изменяет текущий каталог или выводит его имя.

Использование:
  CD             - Показать текущий каталог
  CD путь        - Перейти в указанный каталог
  CD..           - Перейти на уровень вверх
  CD\\            - Перейти в корень диска
  C:             - Перейти на диск C:\\

Примеры:
  CD TEMP        - перейти в C:\\TEMP
  CD..           - вернуться назад
  CD\\            - перейти в C:\\
  CD C:\\DOS      - перейти в C:\\DOS`,
    'TYPE': 'TYPE <файл>\nВыводит содержимое текстового файла.',
    'DOCTOR': 'DOCTOR\nЗапускает защищённого виртуального собеседника. Это не врач.\nДля выхода введите QUIT.',
    'REDIRECT': `ПЕРЕНАПРАВЛЕНИЕ ВЫВОДА
==================

Вы можете сохранить вывод любой команды в файл!

СИНТАКСИС:
  команда > файл      - Создать новый файл или перезаписать
  команда >> файл     - Добавить к существующему файлу

КАК ЭТО РАБОТАЕТ:
1. Команда выполняется нормально
2. Вывод не показывается на экране
3. Вместо этого сохраняется в файл
4. Файл создаётся автоматически, если не существует

ПРИМЕРЫ:

  Создать простой файл:
    ECHO Привет, мир! > hello.txt

  Сохранить список файлов:
    DIR > список.txt

  Создать многострочный файл:
    ECHO Строка 1 > file.txt
    ECHO Строка 2 >> file.txt
    ECHO Строка 3 >> file.txt

  Системный отчёт:
    VER > report.txt
    DATE >> report.txt
    TIME >> report.txt
    MEM >> report.txt

  Сохранить результат калькулятора:
    CALC 2 + 2 > result.txt

  Создать заметку:
    ECHO TODO: купить молоко > note.txt
    TYPE note.txt

РАБОТАЕТ С КОМАНДАМИ:
  ✅ ECHO, DIR, TYPE, VER, DATE, TIME
  ✅ CALC, FORTUNE, TREE, VOL, MEM
  ✅ И любыми другими командами с выводом!

ПОПРОБУЙТЕ:
  ECHO Тест > test.txt
  TYPE test.txt
  ECHO Ещё текст >> test.txt
  TYPE test.txt

Для полного руководства см. docs/COMMANDS.md`,
    '>': 'См. HELP REDIRECT для справки по перенаправлению вывода.',
    '>>': 'См. HELP REDIRECT для справки по перенаправлению вывода.',
  };
  
  return help[cmd] || `Справка для команды ${cmd} недоступна.\n`;
}

module.exports = systemCommands;
module.exports.evaluateExpression = evaluateExpression;

