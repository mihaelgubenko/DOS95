'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

function resolveDataDirectory(dataDirectory) {
  return dataDirectory || process.env.DOS95_DATA_DIR || path.join(
    process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'),
    'DOS95'
  );
}

class VfsStorage {
  constructor(dataDirectory) {
    this.dataDirectory = resolveDataDirectory(dataDirectory);
    this.filePath = path.join(this.dataDirectory, 'vfs.json');
  }

  load() {
    if (!fs.existsSync(this.filePath)) return null;
    try {
      return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
    } catch (error) {
      fs.mkdirSync(this.dataDirectory, { recursive: true });
      const corruptPath = path.join(this.dataDirectory, `vfs.corrupt-${Date.now()}.json`);
      try {
        fs.renameSync(this.filePath, corruptPath);
      } catch {
        // The original file remains available if it cannot be moved.
      }
      console.warn(`Не удалось загрузить VFS: ${error.message}. Загружено исходное состояние.`);
      return null;
    }
  }

  save(state) {
    fs.mkdirSync(this.dataDirectory, { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    const backupPath = `${this.filePath}.bak`;
    fs.writeFileSync(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

    let hadOriginal = false;
    try {
      if (fs.existsSync(this.filePath)) {
        fs.copyFileSync(this.filePath, backupPath);
        fs.unlinkSync(this.filePath);
        hadOriginal = true;
      }
      fs.renameSync(temporaryPath, this.filePath);
      if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
    } catch (error) {
      if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
      if (hadOriginal && !fs.existsSync(this.filePath) && fs.existsSync(backupPath)) {
        fs.renameSync(backupPath, this.filePath);
      }
      throw error;
    }
  }
}

module.exports = { VfsStorage, resolveDataDirectory };
