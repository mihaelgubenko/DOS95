// Виртуальная файловая система
class VirtualFileSystem {
  constructor() {
    this.fs = {
      'C:\\': {
        type: 'dir',
        contents: {
          'DOS': {
            type: 'dir',
            contents: {
              'COMMAND.COM': { type: 'file', content: 'MS-DOS Command Interpreter', readonly: true },
              'FORMAT.COM': { type: 'file', content: 'Disk Format Utility', readonly: true },
              'FDISK.EXE': { type: 'file', content: 'Fixed Disk Setup Program', readonly: true }
            }
          },
          'WINDOWS': {
            type: 'dir',
            contents: {
              'SYSTEM': {
                type: 'dir',
                contents: {
                  'CONFIG.SYS': { type: 'file', content: 'DEVICE=C:\\DOS\\HIMEM.SYS\nFILES=30\nBUFFERS=20' }
                }
              },
              'WIN.COM': { type: 'file', content: 'Windows Loader', readonly: true }
            }
          },
          'TEMP': {
            type: 'dir',
            contents: {}
          },
          'AUTOEXEC.BAT': {
            type: 'file',
            content: '@ECHO OFF\nPROMPT $P$G\nPATH C:\\DOS;C:\\WINDOWS\nECHO Welcome to DOS Web System v1.0\nECHO Type HELP for available commands'
          },
          'README.TXT': {
            type: 'file',
            content: 'DOS Web System v1.0\n==================\n\nДобро пожаловать в виртуальную DOS систему!\n\nОсновные команды:\n- DIR - список файлов\n- CD - смена каталога\n- TYPE - просмотр файла\n- HELP - справка\n- DOCTOR - AI психотерапевт\n\nИспользуйте HELP для полного списка команд.'
          }
        }
      }
    };
  }

  // Нормализация пути
  normalizePath(currentDir, targetPath) {
    if (!targetPath || targetPath === '.') {
      return currentDir;
    }

    // Корень диска: \ или /
    if (targetPath === '\\' || targetPath === '/') {
      return 'C:\\';
    }

    // Абсолютный путь C:\ или C:/
    if (targetPath.match(/^[A-Z]:[\\\/]/i)) {
      let normalized = targetPath.toUpperCase().replace(/\//g, '\\');
      // Убрать лишние слеши в конце (кроме корня)
      if (normalized.length > 3 && normalized.endsWith('\\')) {
        normalized = normalized.slice(0, -1);
      }
      return normalized;
    }

    // Относительный путь
    let path = currentDir;
    const parts = targetPath.split(/[\\\/]/);  // Поддержка / и \

    for (const part of parts) {
      if (part === '..') {
        // Вверх на один уровень
        const lastSlash = path.lastIndexOf('\\');
        if (lastSlash > 2) { // Не выше корня диска C:\
          path = path.substring(0, lastSlash);
        } else {
          path = 'C:\\';  // Достигли корня
        }
      } else if (part && part !== '.') {
        // Вниз на один уровень
        if (!path.endsWith('\\')) path += '\\';
        path += part.toUpperCase();
      }
    }

    return path;
  }

  // Получить объект по пути
  getNode(path) {
    path = path.toUpperCase();
    
    // Специальная обработка корня диска
    if (path === 'C:\\' || path === 'C:') {
      return this.fs['C:\\'];
    }
    
    const parts = path.split('\\').filter(p => p);
    
    let current = this.fs['C:\\'];  // Начинаем с корня C:\
    
    for (const part of parts) {
      // Пропускаем 'C:' если он в начале пути
      if (part === 'C:') continue;
      
      if (!current.contents || !current.contents[part]) {
        return null;
      }
      current = current.contents[part];
      if (!current) return null;
    }
    
    return current;
  }

  // Проверить существование пути
  exists(path) {
    return this.getNode(path) !== null;
  }

  // Проверить, является ли путь директорией
  isDirectory(path) {
    const node = this.getNode(path);
    return node && node.type === 'dir';
  }

  // Получить содержимое директории
  listDirectory(path) {
    const node = this.getNode(path);
    if (!node || node.type !== 'dir') {
      return null;
    }

    const items = [];
    for (const [name, item] of Object.entries(node.contents || {})) {
      items.push({
        name,
        type: item.type,
        size: item.type === 'file' ? item.content.length : 0,
        readonly: item.readonly || false
      });
    }

    return items;
  }

  // Прочитать файл
  readFile(path) {
    const node = this.getNode(path);
    if (!node || node.type !== 'file') {
      return null;
    }
    return node.content;
  }

  // Создать директорию
  createDirectory(path) {
    const parentPath = path.substring(0, path.lastIndexOf('\\'));
    const dirName = path.substring(path.lastIndexOf('\\') + 1);
    
    const parent = this.getNode(parentPath);
    if (!parent || parent.type !== 'dir') {
      return false;
    }

    if (parent.contents[dirName.toUpperCase()]) {
      return false; // Уже существует
    }

    parent.contents[dirName.toUpperCase()] = {
      type: 'dir',
      contents: {}
    };

    return true;
  }

  // Создать или записать файл
  writeFile(path, content) {
    const parentPath = path.substring(0, path.lastIndexOf('\\'));
    const fileName = path.substring(path.lastIndexOf('\\') + 1);
    
    const parent = this.getNode(parentPath);
    if (!parent || parent.type !== 'dir') {
      return false;
    }

    // Проверить readonly
    if (parent.contents[fileName.toUpperCase()]?.readonly) {
      return false;
    }

    parent.contents[fileName.toUpperCase()] = {
      type: 'file',
      content: content
    };

    return true;
  }

  // Удалить файл
  deleteFile(path) {
    const parentPath = path.substring(0, path.lastIndexOf('\\'));
    const fileName = path.substring(path.lastIndexOf('\\') + 1);
    
    const parent = this.getNode(parentPath);
    if (!parent || parent.type !== 'dir') {
      return false;
    }

    const file = parent.contents[fileName.toUpperCase()];
    if (!file || file.type !== 'file') {
      return false;
    }

    if (file.readonly) {
      return false;
    }

    delete parent.contents[fileName.toUpperCase()];
    return true;
  }

  // Удалить директорию
  deleteDirectory(path) {
    const parentPath = path.substring(0, path.lastIndexOf('\\'));
    const dirName = path.substring(path.lastIndexOf('\\') + 1);
    
    const parent = this.getNode(parentPath);
    if (!parent || parent.type !== 'dir') {
      return false;
    }

    const dir = parent.contents[dirName.toUpperCase()];
    if (!dir || dir.type !== 'dir') {
      return false;
    }

    // Проверить, что директория пуста
    if (dir.contents && Object.keys(dir.contents).length > 0) {
      return false;
    }

    delete parent.contents[dirName.toUpperCase()];
    return true;
  }

  // Копировать файл
  copyFile(sourcePath, destPath) {
    const content = this.readFile(sourcePath);
    if (content === null) {
      return false;
    }

    return this.writeFile(destPath, content);
  }

  // Переместить/переименовать файл
  moveFile(sourcePath, destPath) {
    if (this.copyFile(sourcePath, destPath)) {
      return this.deleteFile(sourcePath);
    }
    return false;
  }
}

// Singleton instance
const vfs = new VirtualFileSystem();

module.exports = vfs;

