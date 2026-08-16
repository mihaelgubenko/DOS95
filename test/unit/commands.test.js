'use strict';

const assert = require('node:assert/strict');
const { beforeEach, describe, it } = require('node:test');
const { CommandHandler } = require('../../commands/handler');
const systemCommands = require('../../commands/systemCommands');
const { version } = require('../../package.json');
const { VirtualFileSystem } = require('../../filesystem/virtualFS');
const { initSession } = require('../../server');

let handler;
let session;
let vfs;

beforeEach(() => {
  vfs = new VirtualFileSystem();
  handler = new CommandHandler({ vfs });
  session = initSession();
});

describe('DOS commands', () => {
  it('covers the file lifecycle and navigation commands', async () => {
    assert.equal((await handler.execute('CD', session)).output, 'C:\\\n');
    assert.equal((await handler.execute('MD "My Folder"', session)).success, true);
    assert.equal((await handler.execute('CD "My Folder"', session)).success, true);
    assert.equal(session.currentDir, 'C:\\MY FOLDER');
    assert.equal((await handler.execute('ECHO first > source.txt', session)).success, true);
    assert.match((await handler.execute('TYPE source.txt', session)).output, /first/);
    assert.equal((await handler.execute('COPY source.txt copy.txt', session)).success, true);
    assert.equal((await handler.execute('REN copy.txt renamed.txt', session)).success, true);
    assert.equal((await handler.execute('MOVE renamed.txt C:\\TEMP\\moved.txt', session)).success, true);
    assert.equal((await handler.execute('DEL source.txt', session)).success, true);
    assert.equal((await handler.execute('CD \\', session)).success, true);
    assert.equal((await handler.execute('RD "My Folder"', session)).success, true);
    assert.match((await handler.execute('DIR C:\\TEMP', session)).output, /MOVED.TXT/);
  });

  it('reports invalid file operations and handles recursive folders', async () => {
    const failures = [
      'TYPE', 'COPY only-one', 'COPY missing.txt target.txt', 'DEL', 'MD',
      'RD', 'RD /S', 'REN one', 'MOVE one', 'ATTRIB', 'MORE'
    ];
    for (const command of failures) assert.equal((await handler.execute(command, session)).success, false, command);

    await handler.execute('MD TEST', session);
    await handler.execute('ECHO data > TEST\\a.txt', session);
    assert.equal((await handler.execute('RD TEST', session)).success, false);
    assert.equal((await handler.execute('RD /S TEST', session)).success, true);
    assert.equal((await handler.execute('CD README.TXT', session)).success, false);
    assert.equal((await handler.execute('CD MISSING', session)).success, false);
    assert.equal((await handler.execute('TREE README.TXT', session)).success, false);
  });

  it('renders directory trees, attributes and paged file output', async () => {
    await handler.execute('MD A', session);
    await handler.execute('MD A\\B', session);
    assert.match((await handler.execute('TREE', session)).output, /└──|├──/);
    assert.match((await handler.execute('ATTRIB README.TXT', session)).output, /^A/);
    const lines = Array.from({ length: 22 }, (_, index) => `line ${index}`).join('\n');
    vfs.writeFile('C:\\LONG.TXT', lines);
    assert.match((await handler.execute('MORE LONG.TXT', session)).output, /-- Ещё --/);
  });

  it('executes every system command and mutates session environment', async () => {
    const commands = ['CLS', 'HELP', 'HELP DIR', 'HELP UNKNOWN', 'VER', 'DATE', 'TIME',
      'ECHO hello world', 'PROMPT', 'PROMPT $N$G', 'SET', 'SET USER=MIHAEL', 'SET USER',
      'PATH', 'PATH C:\\CUSTOM', 'VOL', 'MEM', 'EXIT', 'CALC', 'BANNER', 'BANNER DOS95',
      'FORTUNE', 'WIN95'];
    for (const command of commands) {
      const result = await handler.execute(command, session);
      assert.equal(result.success, true, command);
      assert.equal(typeof result.output, 'string', command);
    }
    assert.equal(session.env.PROMPT, '$N$G');
    assert.equal(session.env.USER, 'MIHAEL');
    assert.equal(session.env.PATH, 'C:\\CUSTOM');
    assert.match((await handler.execute('VER', session)).output, new RegExp(`Version ${version.replaceAll('.', '\\.')}\\b`, 'u'));
  });

  it('handles parser aliases and malformed redirects', async () => {
    assert.equal((await handler.execute('', session)).success, true);
    assert.equal((await handler.execute(42, session)).success, false);
    assert.equal((await handler.execute('ECHO hi >', session)).success, false);
    assert.equal((await handler.execute('ECHO "unterminated', session)).success, false);
    assert.equal((await handler.execute('CD..', session)).success, true);
    assert.equal((await handler.execute('C:', session)).success, true);
    assert.equal((await handler.execute('CLEAR', session)).clear, true);
    assert.equal((await handler.execute('?', session)).success, true);
  });

  it('exercises calculator unary operators and syntax failures', () => {
    assert.equal(systemCommands.evaluateExpression('-(2 + +3) * 2'), -10);
    assert.throws(() => systemCommands.evaluateExpression('(2 + 3'), /скобка/);
    assert.throws(() => systemCommands.evaluateExpression('2 2'), /Недопустимое/);
    assert.throws(() => systemCommands.evaluateExpression(''), /Недопустимое/);
  });
});
