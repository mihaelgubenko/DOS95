'use strict';

function ok(output = '', extra = {}) {
  return { success: true, output, ...extra };
}

function fail(output) {
  return { success: false, output };
}

function resolve(vfs, session, target = '.') {
  return vfs.normalizePath(session.currentDir, target);
}

function formatDate(date) {
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

function formatTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

const fileCommands = {
  dir(args, session, vfs) {
    const targetPath = resolve(vfs, session, args[0]);
    const items = vfs.listDirectory(targetPath);
    if (!vfs.exists(targetPath)) return fail(`Файл не найден: ${targetPath}\n`);
    if (!items) return fail(`${targetPath} - не является каталогом\n`);

    const now = new Date();
    let output = ` Содержимое каталога ${targetPath}\n\n`;
    let fileCount = 0;
    let directoryCount = 0;
    let totalSize = 0;
    for (const item of items.filter((entry) => entry.type === 'dir')) {
      output += ` ${formatDate(now)}  ${formatTime(now)}    <DIR>          ${item.name}\n`;
      directoryCount += 1;
    }
    for (const item of items.filter((entry) => entry.type === 'file')) {
      output += ` ${formatDate(now)}  ${formatTime(now)} ${String(item.size).padStart(13, ' ')} ${item.name}\n`;
      fileCount += 1;
      totalSize += item.size;
    }
    output += `\n     ${fileCount} файл(ов)     ${totalSize} байт\n`;
    output += `     ${directoryCount} папок(и)     1048576 байт свободно\n`;
    return ok(output);
  },

  cd(args, session, vfs) {
    if (!args.length) return ok(`${session.currentDir}\n`);
    const targetPath = resolve(vfs, session, args[0]);
    if (!vfs.exists(targetPath)) return fail(`Неверный путь: ${targetPath}\n`);
    if (!vfs.isDirectory(targetPath)) return fail(`${targetPath} - не является каталогом\n`);
    session.currentDir = targetPath;
    return ok();
  },

  type(args, session, vfs) {
    if (!args.length) return fail('Использование: TYPE <имя файла>\n');
    const targetPath = resolve(vfs, session, args[0]);
    const content = vfs.readFile(targetPath);
    return content === null ? fail(`Файл не найден: ${targetPath}\n`) : ok(`${content}\n`);
  },

  copy(args, session, vfs) {
    if (args.length < 2) return fail('Использование: COPY <источник> <назначение>\n');
    const source = resolve(vfs, session, args[0]);
    const destination = resolve(vfs, session, args[1]);
    if (!vfs.exists(source)) return fail(`Файл не найден: ${source}\n`);
    return vfs.copyFile(source, destination) ? ok('Скопировано файлов: 1\n') : fail('Ошибка копирования файла\n');
  },

  del(args, session, vfs) {
    if (!args.length) return fail('Использование: DEL <имя файла>\n');
    const targetPath = resolve(vfs, session, args[0]);
    return vfs.deleteFile(targetPath) ? ok() : fail(`Ошибка удаления файла: ${targetPath}\n`);
  },

  mkdir(args, session, vfs) {
    if (!args.length) return fail('Использование: MKDIR <имя каталога>\n');
    const targetPath = resolve(vfs, session, args[0]);
    return vfs.createDirectory(targetPath) ? ok() : fail(`Невозможно создать каталог: ${targetPath}\n`);
  },

  rmdir(args, session, vfs) {
    if (!args.length) return fail('Использование: RMDIR [/S] <имя каталога>\n');
    const recursive = args[0].toUpperCase() === '/S';
    const name = recursive ? args[1] : args[0];
    if (!name) return fail('Использование: RMDIR /S <имя каталога>\n');
    const targetPath = resolve(vfs, session, name);
    if (session.currentDir === targetPath || session.currentDir.startsWith(`${targetPath}\\`)) {
      return fail('Нельзя удалить текущий каталог.\n');
    }
    if (!vfs.exists(targetPath)) return fail(`Каталог не найден: ${targetPath}\n`);
    if (!vfs.isDirectory(targetPath)) return fail(`${targetPath} - не является каталогом\n`);
    if (vfs.deleteDirectory(targetPath, { recursive })) return ok();
    return fail(recursive
      ? `Невозможно удалить каталог: ${targetPath}\n`
      : `Каталог не пуст: ${targetPath}\nИспользуйте RMDIR /S для удаления с содержимым\n`);
  },

  rename(args, session, vfs) {
    if (args.length < 2) return fail('Использование: REN <старое имя> <новое имя>\n');
    const oldPath = resolve(vfs, session, args[0]);
    const newPath = resolve(vfs, session, args[1]);
    return vfs.moveNode(oldPath, newPath) ? ok() : fail('Ошибка переименования\n');
  },

  move(args, session, vfs) {
    if (args.length < 2) return fail('Использование: MOVE <источник> <назначение>\n');
    const source = resolve(vfs, session, args[0]);
    const destination = resolve(vfs, session, args[1]);
    return vfs.moveNode(source, destination) ? ok('Перемещено объектов: 1\n') : fail('Ошибка перемещения\n');
  },

  tree(args, session, vfs) {
    const targetPath = resolve(vfs, session, args[0]);
    if (!vfs.isDirectory(targetPath)) return fail(`Неверный путь: ${targetPath}\n`);
    let output = `Структура папки ${targetPath}\n`;
    const build = (currentPath, prefix = '') => {
      const directories = vfs.listDirectory(currentPath).filter((item) => item.type === 'dir');
      directories.forEach((directory, index) => {
        const last = index === directories.length - 1;
        output += `${prefix}${last ? '└──' : '├──'} ${directory.name}\n`;
        build(vfs.normalizePath(currentPath, directory.name), prefix + (last ? '    ' : '│   '));
      });
    };
    build(targetPath);
    return ok(output);
  },

  attrib(args, session, vfs) {
    if (!args.length) return fail('Использование: ATTRIB <имя файла>\n');
    const targetPath = resolve(vfs, session, args[0]);
    const node = vfs.getNode(targetPath);
    if (!node) return fail(`Файл не найден: ${targetPath}\n`);
    return ok(`${node.readonly ? 'R' : 'A'}        ${targetPath}\n`);
  },

  more(args, session, vfs) {
    if (!args.length) return fail('Использование: MORE <имя файла>\n');
    const targetPath = resolve(vfs, session, args[0]);
    const content = vfs.readFile(targetPath);
    if (content === null) return fail(`Файл не найден: ${targetPath}\n`);
    const lines = content.split('\n');
    let output = '';
    lines.forEach((line, index) => {
      output += `${line}\n`;
      if ((index + 1) % 20 === 0 && index + 1 < lines.length) output += '\n-- Ещё --\n';
    });
    return ok(output);
  }
};

module.exports = fileCommands;
