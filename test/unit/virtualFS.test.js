'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { VirtualFileSystem } = require('../../filesystem/virtualFS');

describe('VirtualFileSystem', () => {
  it('normalizes relative, absolute and parent paths without leaving C:', () => {
    const vfs = new VirtualFileSystem();
    assert.equal(vfs.normalizePath('C:\\TEMP', '..\\DOS'), 'C:\\DOS');
    assert.equal(vfs.normalizePath('C:\\', '..\\..'), 'C:\\');
    assert.equal(vfs.normalizePath('C:\\TEMP', '"My File.txt"'), 'C:\\TEMP\\MY FILE.TXT');
    assert.throws(() => vfs.normalizePath('C:\\', 'D:\\DATA'), /только диск C/);
    assert.throws(() => vfs.normalizePath('C:\\', 'bad?.txt'), /Недопустимое имя/);
  });

  it('performs CRUD and reports UTF-8 byte sizes', () => {
    const vfs = new VirtualFileSystem();
    assert.equal(vfs.createDirectory('C:\\WORK'), true);
    assert.equal(vfs.writeFile('C:\\WORK\\ПРИВЕТ.TXT', 'Привет'), true);
    assert.equal(vfs.readFile('c:\\work\\привет.txt'), 'Привет');
    assert.equal(vfs.listDirectory('C:\\WORK')[0].size, Buffer.byteLength('Привет'));
    assert.equal(vfs.deleteFile('C:\\WORK\\ПРИВЕТ.TXT'), true);
    assert.equal(vfs.deleteDirectory('C:\\WORK'), true);
  });

  it('protects readonly files and keeps failed moves atomic', () => {
    const vfs = new VirtualFileSystem();
    assert.equal(vfs.deleteFile('C:\\DOS\\COMMAND.COM'), false);
    assert.equal(vfs.moveNode('C:\\DOS\\COMMAND.COM', 'C:\\COMMAND.COM'), false);
    assert.equal(vfs.exists('C:\\DOS\\COMMAND.COM'), true);
    assert.equal(vfs.exists('C:\\COMMAND.COM'), false);
    assert.equal(vfs.moveNode('C:\\README.TXT', 'C:\\README.TXT'), false);
    assert.equal(vfs.exists('C:\\README.TXT'), true);
  });

  it('copies directories deeply and prevents recursive removal of readonly content', () => {
    const vfs = new VirtualFileSystem();
    assert.equal(vfs.copyNode('C:\\TEMP', 'C:\\TEMP COPY'), true);
    assert.equal(vfs.isDirectory('C:\\TEMP COPY'), true);
    assert.equal(vfs.deleteDirectory('C:\\DOS', { recursive: true }), false);
    assert.equal(vfs.isDirectory('C:\\DOS'), true);
  });

  it('emits serializable state after successful mutations', () => {
    let state;
    const vfs = new VirtualFileSystem({ onChange: (next) => { state = next; } });
    vfs.writeFile('C:\\STATE.TXT', 'saved');
    const restored = new VirtualFileSystem({ state });
    assert.equal(restored.readFile('C:\\STATE.TXT'), 'saved');
  });
});
