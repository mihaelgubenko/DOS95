# 🏗️ Архитектура DOS Web System

## Обзор системы

DOS Web System - это веб-приложение, эмулирующее DOS-подобную операционную систему с виртуальной файловой системой и AI-интеграцией.

```
┌─────────────────────────────────────────────────────────┐
│                    Браузер (Client)                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │  HTML/CSS (Ретро DOS интерфейс)                   │  │
│  │  JavaScript (Terminal Controller)                 │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP/REST API
                       ↓
┌─────────────────────────────────────────────────────────┐
│              Node.js Server (Express)                   │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Command Handler                                  │  │
│  │  ┌─────────────┬─────────────┬─────────────────┐  │  │
│  │  │ File Cmds   │ System Cmds │ DOCTOR (AI)     │  │  │
│  │  └─────────────┴─────────────┴─────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Virtual File System (In-Memory)                  │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │ API Call
                       ↓
┌─────────────────────────────────────────────────────────┐
│                 OpenAI API (GPT-4O)                     │
│              (для команды DOCTOR)                       │
└─────────────────────────────────────────────────────────┘
```

## Компоненты системы

### 1. Frontend (Client-Side)

**Технологии:** Vanilla HTML/CSS/JavaScript

**Файлы:**
- `public/index.html` - Структура страницы
- `public/style.css` - Ретро DOS стили с CRT эффектами
- `public/script.js` - Контроллер терминала

**Основные функции:**
- Рендеринг терминального интерфейса
- Обработка ввода пользователя
- История команд (↑/↓)
- Асинхронные запросы к API
- Визуальные эффекты (мерцание, свечение)

**Класс DOSTerminal:**
```javascript
class DOSTerminal {
  - executeCommand(cmd)      // Отправка команды на сервер
  - handleKeyPress(event)    // Обработка клавиатуры
  - appendToOutput(text)     // Добавление вывода
  - setDoctorMode(enabled)   // Переключение режима DOCTOR
}
```

### 2. Backend (Server-Side)

**Технологии:** Node.js + Express

**Файл:** `server.js`

**Основные функции:**
- HTTP сервер на Express
- Управление сессиями пользователей
- Маршрутизация API запросов
- Отдача статических файлов

**API Endpoints:**
```
POST /api/command          Выполнение команды
GET  /api/commands         Список доступных команд
GET  /                     Главная страница
```

**Структура сессии:**
```javascript
{
  currentDir: 'C:\\',
  history: [],
  env: { PROMPT, PATH, TEMP },
  doctorMode: false,
  doctorHistory: []
}
```

### 3. Command Handler

**Файл:** `commands/handler.js`

**Архитектура:**
```
CommandHandler
├── parseCommand()         // Парсинг входной строки
├── execute()              // Выполнение команды
└── commands = {
    'DIR': fileCommands.dir,
    'CD': fileCommands.cd,
    'DOCTOR': doctorCommand.start,
    ...
}
```

**Процесс обработки команды:**
```
1. Получить команду от клиента
2. Парсинг (команда + аргументы)
3. Валидация команды
4. Выполнение обработчика
5. Обновление состояния сессии
6. Возврат результата клиенту
```

### 4. Virtual File System (VFS)

**Файл:** `filesystem/virtualFS.js`

**Структура данных:**
```javascript
{
  'C:\\': {
    type: 'dir',
    contents: {
      'DOS': { type: 'dir', contents: {...} },
      'README.TXT': { type: 'file', content: '...', readonly: false }
    }
  }
}
```

**Основные методы:**
```javascript
class VirtualFileSystem {
  - normalizePath()        // Преобразование путей
  - getNode(path)          // Получить объект по пути
  - exists(path)           // Проверка существования
  - isDirectory(path)      // Проверка типа
  - listDirectory(path)    // Список содержимого
  - readFile(path)         // Чтение файла
  - writeFile(path, data)  // Запись файла
  - deleteFile(path)       // Удаление файла
  - createDirectory(path)  // Создание каталога
  - copyFile(src, dst)     // Копирование
  - moveFile(src, dst)     // Перемещение
}
```

**Особенности:**
- In-Memory хранение (данные теряются при перезапуске)
- Поддержка относительных и абсолютных путей
- Защита системных файлов (readonly)
- Case-insensitive (как в DOS)

### 5. Команды системы

#### File Commands (`commands/fileCommands.js`)
```
DIR, CD, TYPE, COPY, DEL, MKDIR, RMDIR, 
REN, MOVE, TREE, ATTRIB
```

#### System Commands (`commands/systemCommands.js`)
```
CLS, HELP, VER, DATE, TIME, ECHO, SET, 
PATH, VOL, MEM, EXIT, CALC, BANNER, FORTUNE
```

#### AI Commands (`commands/doctorCommand.js`)
```
DOCTOR - Психотерапевт на базе GPT-4O
```

### 6. DOCTOR Command (AI Integration)

**Архитектура:**
```
User Input
    ↓
DOCTOR Mode Check
    ↓
History Management (last 10 messages)
    ↓
OpenAI API Request
    ↓
[System Prompt] + [Conversation History] + [User Message]
    ↓
GPT-4O Response
    ↓
Save to Session History
    ↓
Return to User
```

**Fallback механизм:**
- Если OpenAI недоступен → классическая ELIZA
- Pattern-based ответы
- Без сохранения контекста

**System Prompt для GPT-4O:**
```
Роль: Роджерианский психотерапевт
Стиль: Эмпатичный, задающий вопросы
Ограничения: 2-3 предложения
Язык: Русский
Контекст: DOS терминал
```

## Поток данных

### Выполнение обычной команды:
```
1. User вводит: DIR
2. Client отправляет POST /api/command
3. Server получает запрос
4. Handler парсит команду
5. Вызывает fileCommands.dir()
6. VFS читает директорию
7. Форматирует вывод
8. Возвращает JSON клиенту
9. Client отображает результат
```

### Выполнение DOCTOR команды:
```
1. User вводит: DOCTOR
2. Session.doctorMode = true
3. Client меняет UI (желтый цвет)
4. User вводит сообщение
5. Server добавляет в history
6. OpenAI API call (GPT-4O)
7. Response сохраняется в history
8. Возвращается клиенту
9. Client отображает ответ
10. User вводит QUIT
11. Session.doctorMode = false
12. Возврат в нормальный режим
```

## Безопасность

### Реализованные меры:
- ✅ Виртуальная изолированная файловая система
- ✅ Нет доступа к реальной FS
- ✅ Sanitization в CALC команде
- ✅ Защита системных файлов (readonly)
- ✅ API ключ в переменных окружения

### Потенциальные уязвимости:
- ⚠️ eval() в CALC (ограничен regex)
- ⚠️ Нет аутентификации
- ⚠️ Нет rate limiting для OpenAI
- ⚠️ Session в памяти (не персистентны)

## Масштабируемость

### Текущие ограничения:
- In-Memory сессии (не выдержат много пользователей)
- In-Memory VFS (теряется при перезапуске)
- Нет персистентности данных

### Улучшения для production:
1. **Сессии:** Redis для хранения
2. **VFS:** MongoDB/PostgreSQL для файлов
3. **Аутентификация:** JWT токены
4. **Rate Limiting:** Express-rate-limit
5. **Логирование:** Winston/Morgan
6. **Мониторинг:** PM2/Prometheus
7. **Кеширование:** Redis для команд
8. **WebSockets:** Real-time обновления

## Расширяемость

### Добавление новой команды:

```javascript
// 1. Создать функцию
const myCommand = (args, session, vfs) => {
  return { output: 'Hello!' };
};

// 2. Зарегистрировать в handler.js
this.commands['MYCOMMAND'] = myCommand;

// 3. Добавить в HELP
```

### Добавление нового режима:

```javascript
// 1. Добавить флаг в сессию
session.myMode = true;

// 2. Обработка в handler
if (session.myMode) {
  return handleMyMode(command);
}

// 3. UI изменения на клиенте
terminal.setMyMode(true);
```

## Производительность

### Оптимизации:
- ✅ Singleton VFS
- ✅ Минимальная обработка на клиенте
- ✅ Асинхронные API вызовы
- ✅ Ограничение истории DOCTOR (10 сообщений)

### Метрики:
- Время отклика команды: ~50ms (без AI)
- Время отклика DOCTOR: ~2000ms (с GPT-4O)
- Размер клиента: ~15KB (HTML+CSS+JS)
- Память сервера: ~50MB базовая

## Технологический стек

```
Frontend:
├── HTML5
├── CSS3 (Flexbox, Animations)
└── Vanilla JavaScript (ES6+)

Backend:
├── Node.js (>=14)
├── Express.js
├── dotenv (конфигурация)
└── OpenAI SDK

Дополнительно:
└── nodemon (разработка)
```

## Заключение

DOS Web System - это модульная, расширяемая система с чистым разделением concerns. Архитектура позволяет легко добавлять новые команды, режимы и интеграции, сохраняя при этом простоту и производительность.

---

**Автор:** DOS Web System Team  
**Версия:** 1.0.0  
**Дата:** 2025

