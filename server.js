require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const commandHandler = require('./commands/handler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Сессии пользователей (в реальном приложении использовать Redis)
const sessions = new Map();

// Инициализация сессии
function initSession() {
  return {
    currentDir: 'C:\\',
    history: [],
    env: {
      PROMPT: '$P$G',
      PATH: 'C:\\DOS;C:\\WINDOWS',
      TEMP: 'C:\\TEMP'
    },
    doctorMode: false,
    doctorHistory: []
  };
}

// API endpoint для выполнения команд
app.post('/api/command', async (req, res) => {
  try {
    const { command, sessionId } = req.body;
    
    // Получить или создать сессию
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, initSession());
    }
    
    const session = sessions.get(sessionId);
    
    // Обработать команду
    const result = await commandHandler.execute(command, session);
    
    // Сохранить в историю
    session.history.push({
      command,
      result,
      timestamp: new Date()
    });
    
    res.json({
      success: true,
      output: result.output,
      currentDir: session.currentDir,
      doctorMode: session.doctorMode
    });
    
  } catch (error) {
    console.error('Command error:', error);
    res.json({
      success: false,
      output: `Ошибка: ${error.message}`,
      currentDir: 'C:\\'
    });
  }
});

// Получить список доступных команд
app.get('/api/commands', (req, res) => {
  res.json({
    commands: commandHandler.getCommandList()
  });
});

// API для операций с файлами (для проводника)
app.post('/api/file', async (req, res) => {
  try {
    const { action, path: filePath, content, newPath, sessionId } = req.body;
    
    // Получить или создать сессию
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, initSession());
    }
    
    const session = sessions.get(sessionId);
    
    let result;
    switch(action) {
      case 'create':
        result = await commandHandler.execute(`ECHO ${content || ''} > ${filePath}`, session);
        break;
      case 'delete':
        result = await commandHandler.execute(`DEL ${filePath}`, session);
        break;
      case 'rename':
        result = await commandHandler.execute(`REN ${filePath} ${newPath}`, session);
        break;
      case 'copy':
        result = await commandHandler.execute(`COPY ${filePath} ${newPath}`, session);
        break;
      case 'mkdir':
        result = await commandHandler.execute(`MKDIR ${filePath}`, session);
        break;
      case 'rmdir':
        result = await commandHandler.execute(`RMDIR ${filePath}`, session);
        break;
      default:
        return res.json({ success: false, message: 'Unknown action' });
    }
    
    res.json({ success: true, message: result.output || 'OK' });
  } catch (error) {
    console.error('File operation error:', error);
    res.json({ success: false, message: error.message });
  }
});

// Главная страница - Windows 95 интерфейс (по умолчанию)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'win95.html'));
});

app.get('/win95', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'win95.html'));
});

app.get('/win95.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'win95.html'));
});

// Старый DOS терминал
app.get('/dos', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`╔════════════════════════════════════════╗`);
  console.log(`║   DOS Web System v1.0                  ║`);
  console.log(`║   Server running on port ${PORT}         ║`);
  console.log(`║   http://localhost:${PORT}               ║`);
  console.log(`╚════════════════════════════════════════╝`);
});

