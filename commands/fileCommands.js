// Файловые команды DOS

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

const fileCommands = {
  // DIR - список файлов
  dir: (args, session, vfs) => {
    const path = args.length > 0 ? vfs.normalizePath(session.currentDir, args[0]) : session.currentDir;
    
    if (!vfs.exists(path)) {
      return { output: `Файл не найден: ${path}\n` };
    }

    if (!vfs.isDirectory(path)) {
      return { output: `${path} - не является каталогом\n` };
    }

    const items = vfs.listDirectory(path);
    const now = new Date();
    
    let output = ` Содержимое каталога ${path}\n\n`;
    
    // Список файлов и директорий
    let fileCount = 0;
    let dirCount = 0;
    let totalSize = 0;

    // Сначала директории
    items.filter(item => item.type === 'dir').forEach(item => {
      output += ` ${formatDate(now)}  ${formatTime(now)}    <DIR>          ${item.name}\n`;
      dirCount++;
    });

    // Потом файлы
    items.filter(item => item.type === 'file').forEach(item => {
      const size = String(item.size).padStart(13, ' ');
      output += ` ${formatDate(now)}  ${formatTime(now)} ${size} ${item.name}\n`;
      fileCount++;
      totalSize += item.size;
    });

    output += `\n`;
    output += `     ${fileCount} файл(ов)     ${totalSize} байт\n`;
    output += `     ${dirCount} папок(и)     1048576 байт свободно\n`;

    return { output };
  },

  // CD - смена каталога
  cd: (args, session, vfs) => {
    if (args.length === 0) {
      return { output: `${session.currentDir}\n` };
    }

    const newPath = vfs.normalizePath(session.currentDir, args[0]);
    
    if (!vfs.exists(newPath)) {
      return { output: `Неверный путь: ${newPath}\n` };
    }

    if (!vfs.isDirectory(newPath)) {
      return { output: `${newPath} - не является каталогом\n` };
    }

    session.currentDir = newPath;
    return { output: '' };
  },

  // TYPE - просмотр файла
  type: (args, session, vfs) => {
    if (args.length === 0) {
      return { output: `Использование: TYPE <имя файла>\n` };
    }

    const path = vfs.normalizePath(session.currentDir, args[0]);
    const content = vfs.readFile(path);

    if (content === null) {
      return { output: `Файл не найден: ${path}\n` };
    }

    return { output: content + '\n' };
  },

  // COPY - копирование
  copy: (args, session, vfs) => {
    if (args.length < 2) {
      return { output: `Использование: COPY <источник> <назначение>\n` };
    }

    const source = vfs.normalizePath(session.currentDir, args[0]);
    const dest = vfs.normalizePath(session.currentDir, args[1]);

    if (!vfs.exists(source)) {
      return { output: `Файл не найден: ${source}\n` };
    }

    if (vfs.copyFile(source, dest)) {
      return { output: `Скопировано файлов: 1\n` };
    } else {
      return { output: `Ошибка копирования файла\n` };
    }
  },

  // DEL - удаление
  del: (args, session, vfs) => {
    if (args.length === 0) {
      return { output: `Использование: DEL <имя файла>\n` };
    }

    const path = vfs.normalizePath(session.currentDir, args[0]);

    if (vfs.deleteFile(path)) {
      return { output: '' };
    } else {
      return { output: `Ошибка удаления файла: ${path}\n` };
    }
  },

  // MKDIR - создание каталога
  mkdir: (args, session, vfs) => {
    if (args.length === 0) {
      return { output: `Использование: MKDIR <имя каталога>\n` };
    }

    const path = vfs.normalizePath(session.currentDir, args[0]);

    if (vfs.createDirectory(path)) {
      return { output: '' };
    } else {
      return { output: `Невозможно создать каталог: ${path}\n` };
    }
  },

  // RMDIR - удаление каталога
  rmdir: (args, session, vfs) => {
    if (args.length === 0) {
      return { output: `Использование: RMDIR [/S] <имя каталога>\n` };
    }

    // Проверить флаг /S (рекурсивное удаление)
    let recursive = false;
    let dirName = args[0];
    
    if (args[0].toUpperCase() === '/S') {
      recursive = true;
      dirName = args[1];
      if (!dirName) {
        return { output: `Использование: RMDIR /S <имя каталога>\n` };
      }
    }

    const path = vfs.normalizePath(session.currentDir, dirName);
    
    if (!vfs.exists(path)) {
      return { output: `Каталог не найден: ${path}\n` };
    }
    
    if (!vfs.isDirectory(path)) {
      return { output: `${path} - не является каталогом\n` };
    }
    
    // Если не рекурсивное удаление, проверить что каталог пустой
    if (!recursive) {
      const items = vfs.listDirectory(path);
      if (items && items.length > 0) {
        return { output: `Каталог не пуст: ${path}\nИспользуйте RMDIR /S для удаления с содержимым\n` };
      }
    } else {
      // Рекурсивное удаление - удалить все файлы и подкаталоги
      const deleteRecursive = (dirPath) => {
        const items = vfs.listDirectory(dirPath);
        if (items) {
          for (const item of items) {
            const itemPath = vfs.normalizePath(dirPath, item.name);
            if (item.type === 'dir') {
              deleteRecursive(itemPath);
              vfs.deleteDirectory(itemPath);
            } else {
              vfs.deleteFile(itemPath);
            }
          }
        }
      };
      deleteRecursive(path);
    }
    
    if (vfs.deleteDirectory(path)) {
      return { output: '' };
    } else {
      return { output: `Невозможно удалить каталог: ${path}\n` };
    }
  },

  // REN - переименование
  rename: (args, session, vfs) => {
    if (args.length < 2) {
      return { output: `Использование: REN <старое имя> <новое имя>\n` };
    }

    const oldPath = vfs.normalizePath(session.currentDir, args[0]);
    const newPath = vfs.normalizePath(session.currentDir, args[1]);

    if (vfs.moveFile(oldPath, newPath)) {
      return { output: '' };
    } else {
      return { output: `Ошибка переименования файла\n` };
    }
  },

  // MOVE - перемещение
  move: (args, session, vfs) => {
    if (args.length < 2) {
      return { output: `Использование: MOVE <источник> <назначение>\n` };
    }

    const source = vfs.normalizePath(session.currentDir, args[0]);
    const dest = vfs.normalizePath(session.currentDir, args[1]);

    if (vfs.moveFile(source, dest)) {
      return { output: `Перемещено файлов: 1\n` };
    } else {
      return { output: `Ошибка перемещения файла\n` };
    }
  },

  // TREE - дерево каталогов
  tree: (args, session, vfs) => {
    const path = args.length > 0 ? vfs.normalizePath(session.currentDir, args[0]) : session.currentDir;
    
    if (!vfs.exists(path) || !vfs.isDirectory(path)) {
      return { output: `Неверный путь: ${path}\n` };
    }

    let output = `Структура папки ${path}\n`;
    
    function buildTree(currentPath, prefix = '') {
      const items = vfs.listDirectory(currentPath);
      const dirs = items.filter(item => item.type === 'dir');
      
      dirs.forEach((dir, index) => {
        const isLast = index === dirs.length - 1;
        const connector = isLast ? '└──' : '├──';
        const extension = isLast ? '    ' : '│   ';
        
        output += `${prefix}${connector} ${dir.name}\n`;
        
        const newPath = currentPath.endsWith('\\') ? currentPath + dir.name : currentPath + '\\' + dir.name;
        buildTree(newPath, prefix + extension);
      });
    }

    buildTree(path);
    return { output };
  },

  // ATTRIB - атрибуты файла
  attrib: (args, session, vfs) => {
    if (args.length === 0) {
      return { output: `Использование: ATTRIB <имя файла>\n` };
    }

    const path = vfs.normalizePath(session.currentDir, args[0]);
    const node = vfs.getNode(path);

    if (!node) {
      return { output: `Файл не найден: ${path}\n` };
    }

    const attrs = node.readonly ? 'R' : 'A';
    return { output: `${attrs}        ${path}\n` };
  },

  // MORE - постраничный вывод
  more: (args, session, vfs) => {
    if (args.length === 0) {
      return { output: `Использование: MORE <имя файла>\n` };
    }

    const path = vfs.normalizePath(session.currentDir, args[0]);
    const content = vfs.readFile(path);

    if (content === null) {
      return { output: `Файл не найден: ${path}\n` };
    }

    // Разбить на строки
    const lines = content.split('\n');
    const pageSize = 20; // Строк на странице
    
    let output = '';
    for (let i = 0; i < lines.length; i++) {
      output += lines[i] + '\n';
      
      // Каждые pageSize строк - показать "-- Ещё --"
      if ((i + 1) % pageSize === 0 && i + 1 < lines.length) {
        output += '\n-- Ещё -- (нажмите Enter)\n';
      }
    }

    return { output };
  }
};

module.exports = fileCommands;

