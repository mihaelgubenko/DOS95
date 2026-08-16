'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { afterEach, describe, it } = require('node:test');
const { VfsStorage } = require('../../filesystem/storage');

const temporaryDirectories = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('VfsStorage', () => {
  it('saves and reloads JSON atomically', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dos95-storage-'));
    temporaryDirectories.push(directory);
    const storage = new VfsStorage(directory);
    storage.save({ 'C:\\': { type: 'dir', contents: {} } });
    assert.deepEqual(storage.load(), { 'C:\\': { type: 'dir', contents: {} } });
    assert.equal(fs.existsSync(`${storage.filePath}.bak`), false);
  });

  it('preserves corrupt data and returns a clean-state signal', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dos95-corrupt-'));
    temporaryDirectories.push(directory);
    const storage = new VfsStorage(directory);
    fs.writeFileSync(storage.filePath, '{broken', 'utf8');
    assert.equal(storage.load(), null);
    assert.equal(fs.readdirSync(directory).some((name) => name.startsWith('vfs.corrupt-')), true);
  });
});
