'use strict';

function createInitialState() {
  return {
    'C:\\': {
      type: 'dir',
      contents: {
        DOS: {
          type: 'dir',
          contents: {
            'COMMAND.COM': { type: 'file', content: 'MS-DOS Command Interpreter', readonly: true },
            'FORMAT.COM': { type: 'file', content: 'Disk Format Utility', readonly: true },
            'FDISK.EXE': { type: 'file', content: 'Fixed Disk Setup Program', readonly: true }
          }
        },
        WINDOWS: {
          type: 'dir',
          contents: {
            SYSTEM: {
              type: 'dir',
              contents: {
                'CONFIG.SYS': { type: 'file', content: 'DEVICE=C:\\DOS\\HIMEM.SYS\nFILES=30\nBUFFERS=20' }
              }
            },
            'WIN.COM': { type: 'file', content: 'Windows Loader', readonly: true }
          }
        },
        TEMP: { type: 'dir', contents: {} },
        'AUTOEXEC.BAT': {
          type: 'file',
          content: '@ECHO OFF\nPROMPT $P$G\nPATH C:\\DOS;C:\\WINDOWS\nECHO Welcome to DOS95 v1.1.0\nECHO Type HELP for available commands'
        },
        'README.TXT': {
          type: 'file',
          content: 'DOS95 v1.1.0\n=============\n\nДобро пожаловать в виртуальную DOS-систему!\n\nОсновные команды:\n- DIR - список файлов\n- CD - смена каталога\n- TYPE - просмотр файла\n- HELP - справка\n- DOCTOR - защищённый виртуальный собеседник\n\nИспользуйте HELP для полного списка команд.'
        }
      }
    }
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isValidNode(node) {
  if (!node || typeof node !== 'object') return false;
  if (node.type === 'file') return typeof node.content === 'string';
  if (node.type !== 'dir' || !node.contents || typeof node.contents !== 'object') return false;
  return Object.entries(node.contents).every(([name, child]) => name && isValidNode(child));
}

class VirtualFileSystem {
  constructor({ state, onChange } = {}) {
    const candidate = state ? clone(state) : createInitialState();
    if (!candidate['C:\\'] || !isValidNode(candidate['C:\\'])) {
      throw new Error('Некорректное состояние виртуальной файловой системы');
    }
    this.fs = candidate;
    this.onChange = typeof onChange === 'function' ? onChange : null;
  }

  static createInitialState() {
    return createInitialState();
  }

  toJSON() {
    return clone(this.fs);
  }

  normalizePath(currentDir = 'C:\\', targetPath = '.') {
    if (typeof currentDir !== 'string' || typeof targetPath !== 'string') {
      throw new TypeError('Путь должен быть строкой');
    }

    let target = targetPath.trim();
    if (target.length >= 2 && target.startsWith('"') && target.endsWith('"')) {
      target = target.slice(1, -1);
    }
    target = target.replace(/\//g, '\\');

    if (!target || target === '.') return this.normalizePath('C:\\', currentDir);
    if (/^[A-Z]:$/i.test(target)) target += '\\';
    if (/^[A-Z]:/i.test(target) && !/^C:/i.test(target)) {
      throw new Error('Поддерживается только диск C:');
    }

    let parts;
    if (target === '\\' || /^C:\\?$/i.test(target)) {
      parts = [];
    } else if (/^C:\\/i.test(target)) {
      parts = target.slice(3).split('\\');
    } else {
      const base = currentDir.replace(/\//g, '\\');
      if (!/^C:\\?/i.test(base)) throw new Error('Некорректный текущий каталог');
      parts = base.replace(/^C:\\?/i, '').split('\\').filter(Boolean).concat(target.split('\\'));
    }

    const normalized = [];
    for (const rawPart of parts) {
      const part = rawPart.trim();
      if (!part || part === '.') continue;
      if (part === '..') {
        normalized.pop();
        continue;
      }
      this.validateName(part);
      normalized.push(part.toUpperCase());
    }
    return normalized.length ? `C:\\${normalized.join('\\')}` : 'C:\\';
  }

  validateName(name) {
    if (typeof name !== 'string' || !name || name !== name.trim()) {
      throw new Error('Некорректное имя файла или каталога');
    }
    if (name === '.' || name === '..' || /[<>:"/\\|?*\x00-\x1f]/.test(name)) {
      throw new Error(`Недопустимое имя: ${name}`);
    }
    if (/[. ]$/.test(name)) throw new Error(`Недопустимое имя: ${name}`);
  }

  getNode(targetPath) {
    let normalized;
    try {
      normalized = this.normalizePath('C:\\', targetPath);
    } catch {
      return null;
    }
    if (normalized === 'C:\\') return this.fs['C:\\'];

    let current = this.fs['C:\\'];
    for (const part of normalized.slice(3).split('\\')) {
      if (!current.contents || !current.contents[part]) return null;
      current = current.contents[part];
    }
    return current;
  }

  exists(targetPath) {
    return this.getNode(targetPath) !== null;
  }

  isDirectory(targetPath) {
    return this.getNode(targetPath)?.type === 'dir';
  }

  listDirectory(targetPath) {
    const node = this.getNode(targetPath);
    if (!node || node.type !== 'dir') return null;
    return Object.entries(node.contents).map(([name, item]) => ({
      name,
      type: item.type,
      size: item.type === 'file' ? Buffer.byteLength(item.content, 'utf8') : 0,
      readonly: Boolean(item.readonly)
    }));
  }

  readFile(targetPath) {
    const node = this.getNode(targetPath);
    return node?.type === 'file' ? node.content : null;
  }

  createDirectory(targetPath) {
    const destination = this.#destination(targetPath);
    if (!destination || destination.parent.contents[destination.name]) return false;
    destination.parent.contents[destination.name] = { type: 'dir', contents: {} };
    this.#changed();
    return true;
  }

  writeFile(targetPath, content) {
    const destination = this.#destination(targetPath);
    if (!destination) return false;
    const existing = destination.parent.contents[destination.name];
    if (existing?.readonly || existing?.type === 'dir') return false;
    destination.parent.contents[destination.name] = { type: 'file', content: String(content ?? '') };
    this.#changed();
    return true;
  }

  deleteFile(targetPath) {
    const destination = this.#destination(targetPath);
    if (!destination) return false;
    const file = destination.parent.contents[destination.name];
    if (!file || file.type !== 'file' || file.readonly) return false;
    delete destination.parent.contents[destination.name];
    this.#changed();
    return true;
  }

  deleteDirectory(targetPath, { recursive = false } = {}) {
    const normalized = this.normalizePath('C:\\', targetPath);
    if (normalized === 'C:\\') return false;
    const destination = this.#destination(normalized);
    if (!destination) return false;
    const directory = destination.parent.contents[destination.name];
    if (!directory || directory.type !== 'dir') return false;
    if (!recursive && Object.keys(directory.contents).length) return false;
    if (recursive && this.#containsReadonly(directory)) return false;
    delete destination.parent.contents[destination.name];
    this.#changed();
    return true;
  }

  copyFile(sourcePath, destinationPath) {
    const source = this.getNode(sourcePath);
    if (!source || source.type !== 'file') return false;
    return this.writeFile(destinationPath, source.content);
  }

  copyNode(sourcePath, destinationPath) {
    const source = this.getNode(sourcePath);
    const destination = this.#destination(destinationPath);
    if (!source || !destination || destination.parent.contents[destination.name]) return false;
    destination.parent.contents[destination.name] = clone(source);
    this.#changed();
    return true;
  }

  moveFile(sourcePath, destinationPath) {
    const source = this.getNode(sourcePath);
    if (!source || source.type !== 'file') return false;
    return this.moveNode(sourcePath, destinationPath);
  }

  moveNode(sourcePath, destinationPath) {
    const source = this.normalizePath('C:\\', sourcePath);
    const destination = this.normalizePath('C:\\', destinationPath);
    if (source === 'C:\\' || source === destination || destination.startsWith(`${source}\\`)) return false;

    const sourceRef = this.#destination(source);
    const destinationRef = this.#destination(destination);
    if (!sourceRef || !destinationRef) return false;
    const node = sourceRef.parent.contents[sourceRef.name];
    if (!node || node.readonly || destinationRef.parent.contents[destinationRef.name]?.readonly) return false;
    if (destinationRef.parent.contents[destinationRef.name]) return false;

    destinationRef.parent.contents[destinationRef.name] = node;
    delete sourceRef.parent.contents[sourceRef.name];
    this.#changed();
    return true;
  }

  #destination(targetPath) {
    let normalized;
    try {
      normalized = this.normalizePath('C:\\', targetPath);
    } catch {
      return null;
    }
    if (normalized === 'C:\\') return null;
    const lastSlash = normalized.lastIndexOf('\\');
    const parent = this.getNode(normalized.slice(0, lastSlash) || 'C:\\');
    if (!parent || parent.type !== 'dir') return null;
    return { parent, name: normalized.slice(lastSlash + 1) };
  }

  #containsReadonly(node) {
    if (node.type === 'file') return Boolean(node.readonly);
    return Object.values(node.contents).some((child) => this.#containsReadonly(child));
  }

  #changed() {
    if (this.onChange) this.onChange(this.toJSON());
  }
}

module.exports = { VirtualFileSystem, createInitialState };
