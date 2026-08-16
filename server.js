'use strict';

const crypto = require('crypto');
const path = require('path');
const { spawn } = require('child_process');
const express = require('express');
const { rateLimit } = require('express-rate-limit');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { isSea } = require('node:sea');
const { VirtualFileSystem } = require('./filesystem/virtualFS');
const { VfsStorage } = require('./filesystem/storage');
const { CommandHandler } = require('./commands/handler');

const VERSION = require('./package.json').version;
const HOST = '127.0.0.1';

function runtimeDirectory() {
  return isSea() || process.pkg ? path.dirname(process.execPath) : __dirname;
}

dotenv.config({ path: path.join(runtimeDirectory(), '.env') });

function initSession() {
  return {
    currentDir: 'C:\\',
    history: [],
    env: { PROMPT: '$P$G', PATH: 'C:\\DOS;C:\\WINDOWS', TEMP: 'C:\\TEMP' },
    doctorMode: false,
    doctorHistory: [],
    doctorRequests: [],
    elizaMemory: [],
    lastAccess: Date.now()
  };
}

function createPersistentVfs({ dataDirectory, storage: suppliedStorage } = {}) {
  const storage = suppliedStorage || new VfsStorage(dataDirectory);
  let state = storage.load();
  let vfs;
  try {
    vfs = new VirtualFileSystem({ state, onChange: (nextState) => storage.save(nextState) });
  } catch (error) {
    console.warn(`Некорректное сохранённое состояние VFS: ${error.message}. Загружено исходное состояние.`);
    state = null;
    vfs = new VirtualFileSystem({ onChange: (nextState) => storage.save(nextState) });
  }
  return { vfs, storage };
}

function createApp(options = {}) {
  const app = express();
  const sessions = new Map();
  const sessionTtlMs = options.sessionTtlMs || 24 * 60 * 60 * 1000;
  const maxSessions = options.maxSessions || 100;
  const apiToken = crypto.randomBytes(32).toString('hex');
  const persistent = options.vfs
    ? { vfs: options.vfs, storage: options.storage || null }
    : createPersistentVfs(options);
  const commandHandler = options.commandHandler || new CommandHandler({
    vfs: persistent.vfs,
    doctorCommand: options.doctorCommand
  });

  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: null
      }
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'no-referrer' }
  }));
  app.use(express.json({ limit: '256kb' }));
  app.use((req, res, next) => {
    const localPort = String(req.socket.localPort || '');
    const hostHeader = req.get('host');
    try {
      const host = new URL(`http://${hostHeader}`);
      if (!['127.0.0.1', 'localhost'].includes(host.hostname)
        || String(host.port || '80') !== localPort) {
        return res.status(403).json({ success: false, message: 'Invalid local host' });
      }
    } catch {
      return res.status(403).json({ success: false, message: 'Invalid local host' });
    }
    const origin = req.get('origin');
    if (origin) {
      try {
        const parsed = new URL(origin);
        if (parsed.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(parsed.hostname)
          || String(parsed.port || '80') !== localPort) {
          return res.status(403).json({ success: false, message: 'Cross-origin request denied' });
        }
      } catch {
        return res.status(403).json({ success: false, message: 'Invalid origin' });
      }
    }
    next();
  });
  app.use('/api', rateLimit({
    windowMs: 60 * 1000,
    limit: options.apiRateLimit || 120,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: (req) => req.path === '/health',
    message: { success: false, message: 'Слишком много запросов. Повторите позже.' }
  }));
  app.get('/api/bootstrap', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ apiToken, shutdownEnabled: typeof options.onShutdown === 'function' });
  });
  app.use('/api', (req, res, next) => {
    if (req.method === 'GET') return next();
    const expected = Buffer.from(apiToken);
    const received = Buffer.from(req.get('x-dos95-token') || '');
    if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
      return res.status(403).json({ success: false, message: 'Invalid application token' });
    }
    next();
  });
  app.use(express.static(path.join(__dirname, 'public'), { index: false }));

  function getSession(sessionId) {
    if (typeof sessionId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(sessionId)) return null;
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (now - session.lastAccess > sessionTtlMs) sessions.delete(id);
    }
    if (!sessions.has(sessionId)) {
      if (sessions.size >= maxSessions) {
        const oldest = [...sessions.entries()].sort((left, right) => left[1].lastAccess - right[1].lastAccess)[0];
        if (oldest) sessions.delete(oldest[0]);
      }
      sessions.set(sessionId, initSession());
    }
    const session = sessions.get(sessionId);
    session.lastAccess = now;
    return session;
  }

  app.post('/api/command', async (req, res) => {
    const { command, sessionId } = req.body || {};
    const session = getSession(sessionId);
    if (!session || typeof command !== 'string' || command.length > 2048) {
      return res.status(400).json({
        success: false,
        output: 'Требуются строковые command и sessionId. Максимум 2048 символов.\n'
      });
    }
    const isDoctorMessage = session.doctorMode;
    if (isDoctorMessage) {
      const now = Date.now();
      session.doctorRequests = session.doctorRequests.filter((timestamp) => now - timestamp < 60_000);
      if (session.doctorRequests.length >= (options.doctorRateLimit || 12)) {
        return res.status(429).json({
          success: false,
          output: 'Слишком много сообщений DOCTOR. Повторите через минуту.\n'
        });
      }
      session.doctorRequests.push(now);
    }
    try {
      const result = await commandHandler.execute(command, session);
      session.history.push({
        command: isDoctorMessage ? '[DOCTOR MESSAGE]' : command,
        success: result.success,
        timestamp: new Date().toISOString()
      });
      if (session.history.length > 100) session.history.shift();
      return res.json({
        ...result,
        currentDir: session.currentDir,
        doctorMode: session.doctorMode
      });
    } catch (error) {
      console.error(`Command error: status=${Number(error?.status) || 0}`);
      return res.status(500).json({ success: false, output: 'Внутренняя ошибка выполнения команды.\n' });
    }
  });

  app.get('/api/commands', (req, res) => {
    res.json({ commands: commandHandler.getCommandList() });
  });

  app.post('/api/file', (req, res) => {
    const { action, path: requestedPath, newPath, content, recursive, sessionId } = req.body || {};
    const session = getSession(sessionId);
    if (!session || typeof action !== 'string' || typeof requestedPath !== 'string') {
      return res.status(400).json({ success: false, message: 'Требуются action, path и sessionId.' });
    }

    let targetPath;
    let destinationPath;
    try {
      targetPath = persistent.vfs.normalizePath(session.currentDir, requestedPath);
      if (newPath !== undefined) {
        if (typeof newPath !== 'string') throw new Error('newPath должен быть строкой');
        destinationPath = persistent.vfs.normalizePath(session.currentDir, newPath);
      }
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    const respond = (success, message, extra = {}, status = success ? 200 : 409) => res.status(status).json({
      success,
      message,
      currentDir: session.currentDir,
      ...extra
    });

    switch (action.toLowerCase()) {
      case 'list': {
        const items = persistent.vfs.listDirectory(targetPath);
        return items ? respond(true, 'OK', { path: targetPath, items }) : respond(false, 'Каталог не найден.', {}, 404);
      }
      case 'read': {
        const fileContent = persistent.vfs.readFile(targetPath);
        return fileContent !== null
          ? respond(true, 'OK', { path: targetPath, content: fileContent })
          : respond(false, 'Файл не найден.', {}, 404);
      }
      case 'create':
        if (typeof content !== 'string' || content.length > 256 * 1024) {
          return respond(false, 'Содержимое должно быть строкой не более 256 КБ.', {}, 400);
        }
        if (persistent.vfs.exists(targetPath)) {
          return respond(false, 'Файл или каталог уже существует.');
        }
        return persistent.vfs.writeFile(targetPath, content ?? '')
          ? respond(true, 'Файл создан.', { path: targetPath })
          : respond(false, 'Не удалось создать файл.');
      case 'write':
        if (typeof content !== 'string' || content.length > 256 * 1024) {
          return respond(false, 'Содержимое должно быть строкой не более 256 КБ.', {}, 400);
        }
        return persistent.vfs.writeFile(targetPath, content ?? '')
          ? respond(true, 'Файл сохранён.', { path: targetPath })
          : respond(false, 'Не удалось сохранить файл.');
      case 'delete':
        return persistent.vfs.deleteFile(targetPath)
          ? respond(true, 'Файл удалён.')
          : respond(false, 'Не удалось удалить файл.', {}, 404);
      case 'rename':
      case 'move':
        if (!destinationPath) return respond(false, 'Требуется newPath.', {}, 400);
        return persistent.vfs.moveNode(targetPath, destinationPath)
          ? respond(true, 'Объект перемещён.', { path: destinationPath })
          : respond(false, 'Не удалось переместить объект.');
      case 'copy':
        if (!destinationPath) return respond(false, 'Требуется newPath.', {}, 400);
        return persistent.vfs.copyNode(targetPath, destinationPath)
          ? respond(true, 'Объект скопирован.', { path: destinationPath })
          : respond(false, 'Не удалось скопировать объект.');
      case 'mkdir':
        return persistent.vfs.createDirectory(targetPath)
          ? respond(true, 'Каталог создан.', { path: targetPath })
          : respond(false, 'Не удалось создать каталог.');
      case 'rmdir':
        if (session.currentDir === targetPath || session.currentDir.startsWith(`${targetPath}\\`)) {
          return respond(false, 'Нельзя удалить текущий каталог.');
        }
        return persistent.vfs.deleteDirectory(targetPath, { recursive: Boolean(recursive) })
          ? respond(true, 'Каталог удалён.')
          : respond(false, 'Не удалось удалить каталог.');
      default:
        return respond(false, 'Неизвестная файловая операция.', {}, 400);
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', version: VERSION });
  });

  app.get('/api/runtime', (req, res) => {
    res.json({ shutdownEnabled: typeof options.onShutdown === 'function' });
  });

  app.post('/api/shutdown', (req, res) => {
    if (typeof options.onShutdown !== 'function') {
      return res.status(404).json({ success: false, message: 'Shutdown is disabled' });
    }
    res.json({ success: true });
    setImmediate(options.onShutdown);
  });

  const sendPage = (fileName) => (req, res) => res.sendFile(path.join(__dirname, 'public', fileName));
  app.get('/', sendPage('index.html'));
  app.get(['/win95', '/win95.html'], sendPage('win95.html'));
  app.get(['/dos', '/index.html'], sendPage('index.html'));

  app.use((error, req, res, _next) => {
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
      return res.status(400).json({ success: false, message: 'Некорректный JSON.' });
    }
    console.error('Server error:', error);
    return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера.' });
  });

  return { app, vfs: persistent.vfs, storage: persistent.storage, sessions, apiToken };
}

function openBrowser(url) {
  let executable;
  let args;
  if (process.platform === 'win32') {
    executable = 'cmd.exe';
    args = ['/d', '/s', '/c', 'start', '', url];
  } else if (process.platform === 'darwin') {
    executable = 'open';
    args = [url];
  } else {
    executable = 'xdg-open';
    args = [url];
  }
  const child = spawn(executable, args, { detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
}

function listen(app, port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, HOST, () => resolve(server));
    server.once('error', reject);
  });
}

async function startServer(options = {}) {
  let server;
  const shutdown = () => {
    if (!server) return;
    server.close(() => {
      if (options.exitOnShutdown !== false) process.exit(0);
    });
  };
  const runtime = createApp({ ...options, onShutdown: options.onShutdown || shutdown });
  const requestedPort = Number.parseInt(options.port ?? process.env.PORT ?? '3000', 10);
  const initialPort = Number.isInteger(requestedPort) && requestedPort >= 0 && requestedPort <= 65535 ? requestedPort : 3000;
  try {
    server = await listen(runtime.app, initialPort);
  } catch (error) {
    if (error.code !== 'EADDRINUSE' || initialPort === 0) throw error;
    console.warn(`Порт ${initialPort} занят; выбран свободный локальный порт.`);
    server = await listen(runtime.app, 0);
  }

  const actualPort = server.address().port;
  const url = `http://${HOST}:${actualPort}/`;
  console.log(`DOS95 v${VERSION}: ${url}`);
  const autoOpen = options.autoOpen ?? !['0', 'false'].includes(String(process.env.DOS95_AUTO_OPEN).toLowerCase());
  if (autoOpen) openBrowser(url);

  const handleSignal = () => server.close(() => process.exit(0));
  process.once('SIGINT', handleSignal);
  process.once('SIGTERM', handleSignal);
  return { ...runtime, server, port: actualPort, url, shutdown };
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error(`Не удалось запустить DOS95: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { createApp, startServer, initSession, createPersistentVfs, openBrowser };
