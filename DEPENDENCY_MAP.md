# 🗺️ DEPENDENCY MAP - Карта зависимостей DOS95

**Версия:** 1.0  
**Обновлено:** Январь 2025

---

## 📊 VISUAL OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│                      DOS95 SYSTEM                           │
└─────────────────────────────────────────────────────────────┘
                              │
                  ┌───────────┴───────────┐
                  │                       │
              SERVER.JS             PUBLIC/
              (Backend)            (Frontend)
                  │                       │
        ┌─────────┼─────────┐       ┌─────┼─────┐
        │         │         │       │     │     │
   commands/  filesystem/  .env  win95-  dos-  css
        │         │              manager  terms
        │         │                 │
    ┌───┼───┐   virtualFS.js        │
    │   │   │                      │
handler system file           explorer
       │   │  command              │
       │   │   │                  │
    doctor                  crud files
```

---

## 🔗 DETAILED DEPENDENCY GRAPH

### TIER 1: Core Infrastructure

#### `server.js` (Root Module)
**Зависит от:**
- `express` - HTTP сервер
- `cors` - CORS middleware
- `dotenv` - Environment variables
- `commands/handler.js` - Command router
- `filesystem/virtualFS.js` - VFS instance

**Используется в:**
- `index.html` (DOS терминал) через API `/api/command`
- `win95.html` (Win95 GUI) через API `/api/command` и `/api/file`

**Критичность:** 🔴 КРИТИЧЕСКИЙ  
**Изменение влияет на:** Весь фронтенд, все API запросы

---

### TIER 2: Command Processing

#### `commands/handler.js`
**Зависит от:**
- `commands/systemCommands.js`
- `commands/fileCommands.js`
- `commands/doctorCommand.js`

**Используется в:**
- `server.js` (маршрутизация команд)
- Все фронтенд запросы команд

**Критичность:** 🔴 КРИТИЧЕСКИЙ  
**Изменение влияет на:** Все DOS команды, все GUI операции

**Модули:**

**2.1. `commands/systemCommands.js`**
- Команды: `HELP`, `VER`, `CLS`, `DATE`, `TIME`, `ECHO`, `PROMPT`, `SET`, `PATH`, `VOL`, `MEM`, `EXIT`, `CALC`, `BANNER`, `FORTUNE`, `WIN95`
- Зависит от: `filesystem/virtualFS.js` (для некоторых команд)
- Критичность: 🟡 ВЫСОКАЯ
- Влияние на: Справочная система, системная информация

**2.2. `commands/fileCommands.js`**
- Команды: `DIR`, `CD`, `TYPE`, `COPY`, `DEL`, `MD`, `RD`, `REN`, `MOVE`, `TREE`, `ATTRIB`
- Зависит от: `filesystem/virtualFS.js` (ОБЯЗАТЕЛЬНО!)
- Критичность: 🔴 КРИТИЧЕСКИЙ
- Влияние на: Все файловые операции, File Explorer

**2.3. `commands/doctorCommand.js`**
- Команда: `DOCTOR`
- Зависит от: `openai` SDK, `.env` (API ключи)
- Критичность: 🟡 ВЫСОКАЯ
- Влияние на: AI функциональность, пользовательский опыт

---

### TIER 3: Virtual File System

#### `filesystem/virtualFS.js`
**Зависит от:**
- Node.js встроенные модули (нет внешних зависимостей)

**Используется в:**
- `server.js` (общая VFS instance)
- `commands/fileCommands.js` (все файловые команды)
- `commands/systemCommands.js` (некоторые системные команды)
- `public/explorer-enhanced.js` (через API)

**Критичность:** 🔴🔴 КРИТИЧЕСКИЙ (самый важный!)  
**Изменение влияет на:** ВСЯ файловая система, ВСЕ файловые операции, File Explorer

**Структура VFS:**
```javascript
VirtualFS {
  root: {
    'C:\\': {
      'DOS': {},
      'WINDOWS': {},
      'TEMP': {},
      'AUTOEXEC.BAT': {...},
      'README.TXT': {...}
    }
  },
  currentDir: 'C:\\'
}
```

**Операции VFS:**
- `createFile(path, content)` → FILE создание
- `deleteFile(path)` → FILE удаление
- `createDir(path)` → DIR создание
- `deleteDir(path)` → DIR удаление (содержимое!)
- `readFile(path)` → FILE чтение
- `listDir(path)` → DIR список
- `copyFile(src, dst)` → COPY файла
- `moveFile(src, dst)` → MOVE файла
- `exists(path)` → EXISTS проверка
- `normalizePath(path)` → NORMALIZE пути

---

### TIER 4: Frontend DOS Terminal

#### `public/index.html`
**Зависит от:**
- `public/style.css` (DOS стили)
- `public/script.js` (JS логика)

**Использует:**
- API: `POST /api/command`
- API: `POST /api/file` (для некоторых команд)

**Критичность:** 🟡 ВЫСОКАЯ  
**Изменение влияет на:** DOS пользовательский интерфейс

#### `public/script.js`
**Зависит от:**
- DOM API (встроенный браузер)
- Fetch API (HTTP запросы)

**Использует:**
- `server.js` через `/api/command`

**Критичность:** 🟡 ВЫСОКАЯ  
**Изменение влияет на:** Отправка команд, отображение результатов

---

### TIER 5: Frontend Windows 95

#### `public/win95.html`
**Зависит от:**
- `public/win95.css` (Win95 стили)
- `public/win95-manager.js` (Window manager)

**Использует:**
- API: `POST /api/command`
- API: `POST /api/file`

**Критичность:** 🟡 ВЫСОКАЯ  
**Изменение влияет на:** Win95 GUI, desktop, taskbar

#### `public/win95-manager.js`
**Зависит от:**
- `public/explorer-enhanced.js` (File Explorer)

**Использует:**
- API запросы к `server.js`
- DOM API для window management

**Критичность:** 🟡 ВЫСОКАЯ  
**Изменение влияет на:** Все Win95 окна, меню, задачи

#### `public/explorer-enhanced.js`
**Зависит от:**
- `window.explorerInstances` Map (управление экземплярами)

**Использует:**
- API: `POST /api/file` для операций с файлами
- `public/win95-manager.js` для открытия окон

**Критичность:** 🟡 ВЫСОКАЯ  
**Изменение влияет на:** File Explorer, CRUD файлов, копирование, вставка

---

## 🚨 CRITICAL PATHS (Критические цепочки)

### Path 1: Копирование файла через GUI
```
User clicks "Copy" in Explorer
    ↓
explorer-enhanced.js → copyItem()
    ↓
POST /api/file → {action: 'copy'}
    ↓
server.js → fileController
    ↓
commands/fileCommands.js → COPY command
    ↓
filesystem/virtualFS.js → copyFile()
    ↓
✅ File copied
```

**Проблема:** Если сломать любой шаг → вся цепочка перестает работать

### Path 2: Выполнение DOS команды
```
User types "DIR" in DOS terminal
    ↓
script.js → processCommand()
    ↓
POST /api/command → {command: 'DIR'}
    ↓
server.js → commandHandler.execute()
    ↓
commands/handler.js → routeCommand()
    ↓
commands/fileCommands.js → DIR command
    ↓
filesystem/virtualFS.js → listDir()
    ↓
✅ Directory listing shown
```

**Проблема:** Если сломать маршрутизацию → команды не работают

### Path 3: AI психотерапевт
```
User types "DOCTOR"
    ↓
script.js → processCommand()
    ↓
POST /api/command → {command: 'DOCTOR'}
    ↓
server.js → commandHandler.execute()
    ↓
commands/handler.js → routeCommand()
    ↓
commands/doctorCommand.js → DOCTOR command
    ↓
OpenAI API (или simpleEliza)
    ↓
✅ Response returned
```

**Проблема:** Если OpenAI недоступен → нужен fallback на ELIZA

---

## ⚠️ RISK ASSESSMENT (Оценка рисков)

### 🔴 ВЫСОКИЙ РИСК (менять только с аудитом):

1. **`filesystem/virtualFS.js`**
   - Риск: Потеря всех файлов, невозможность работы VFS
   - Защита: Полный регрессионный тест всех файловых команд

2. **`commands/handler.js`**
   - Риск: Команды не обрабатываются
   - Защита: Тест всех команд

3. **`server.js` API endpoints**
   - Риск: Фронтенд не подключается
   - Защита: Тест HTTP запросов

### 🟡 СРЕДНИЙ РИСК:

4. **`commands/fileCommands.js`**
   - Риск: Некоторые файловые операции не работают
   - Защита: Тест конкретной операции

5. **`public/explorer-enhanced.js`**
   - Риск: GUI операции не работают
   - Защита: Тест GUI

### 🟢 НИЗКИЙ РИСК (можно менять безопасно):

6. **CSS файлы** (`style.css`, `win95.css`)
7. **Документация** (MD файлы)
8. **README.md**
9. **Batch файлы** (`start.bat`, `install.bat`)

---

## 📋 CHANGE IMPACT TABLE (Таблица влияния изменений)

| Файл | Изменение | Влияет на | Критичность |
|------|-----------|-----------|-------------|
| `virtualFS.js` | Любое | ВСЕ файловые команды | 🔴🔴 |
| `handler.js` | Любое | ВСЕ команды | 🔴🔴 |
| `server.js` | API endpoints | Весь фронтенд | 🔴 |
| `fileCommands.js` | Любая команда | Эта команда + GUI | 🔴 |
| `systemCommands.js` | Любая команда | Эта команда | 🟡 |
| `doctorCommand.js` | AI логика | DOCTOR команда | 🟡 |
| `script.js` | Клиент логика | DOS терминал | 🟡 |
| `win95-manager.js` | Window mgmt | Win95 GUI | 🟡 |
| `explorer-enhanced.js` | CRUD логика | File Explorer | 🟡 |
| CSS файлы | Стили | Отображение | 🟢 |

---

## 🔍 DEBUGGING DEPENDENCIES (Цепочка отладки)

Если что-то не работает, проверьте в порядке:

1. **Browser Console** → Ошибки JS
2. **Server logs** → Ошибки Node.js
3. **Network tab** → HTTP запросы/ответы
4. **VFS state** → `console.log(virtualFS)` в `server.js`
5. **Session state** → `console.log(sessions)` в `server.js`

---

## 📝 NEXT STEPS

1. Откройте этот файл перед внесением изменений
2. Найдите изменяемый файл в таблице влияния
3. Проверьте "Влияет на" и "Критичность"
4. Запустите соответствующие тесты из `REGRESSION_TESTS.md`
5. Сделайте коммит только если все тесты пройдены

---

**Следующий:** См. `REGRESSION_TESTS.md` для списка тестов


