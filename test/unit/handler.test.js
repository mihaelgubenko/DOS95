'use strict';

const assert = require('node:assert/strict');
const { beforeEach, describe, it } = require('node:test');
const { CommandHandler } = require('../../commands/handler');
const defaultDoctor = require('../../commands/doctorCommand');
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

describe('CommandHandler', () => {
  it('supports quoted names and output redirection', async () => {
    assert.equal((await handler.execute('ECHO Привет > "my file.txt"', session)).success, true);
    assert.equal(vfs.readFile('C:\\MY FILE.TXT'), 'Привет\n');
    assert.equal((await handler.execute('ECHO Мир >> "my file.txt"', session)).success, true);
    assert.equal(vfs.readFile('C:\\MY FILE.TXT'), 'Привет\nМир\n');
  });

  it('does not interpret a quoted greater-than sign as redirection', async () => {
    const result = await handler.execute('ECHO "1 > 0"', session);
    assert.equal(result.output, '1 > 0\n');
  });

  it('returns explicit failures and preserves WIN95 metadata', async () => {
    assert.equal((await handler.execute('MISSING', session)).success, false);
    assert.equal((await handler.execute('DEL MISSING.TXT', session)).success, false);
    const win = await handler.execute('WIN95', session);
    assert.equal(win.success, true);
    assert.equal(win.openWindow, '/win95');
  });

  it('evaluates arithmetic without eval and rejects invalid input', async () => {
    assert.match((await handler.execute('CALC (2 + 3) * 4', session)).output, /= 20/);
    assert.equal((await handler.execute('CALC 2a + 2', session)).success, false);
    assert.equal((await handler.execute('CALC 1 / 0', session)).success, false);
  });

  it('falls back to local ELIZA when an OpenAI request fails', async () => {
    const doctor = defaultDoctor.createDoctorCommand({
      client: {
        moderations: { create: async () => ({ results: [{ flagged: false, categories: {} }] }) },
        responses: { create: async () => { throw new Error('offline'); } }
      },
      random: () => 0,
      model: 'gpt-5.6-terra',
      logger: { warn() {} }
    });
    handler = new CommandHandler({ vfs, doctorCommand: doctor });
    await handler.execute('DOCTOR', session);
    const result = await handler.execute('Мне грустно', session);
    assert.equal(result.success, true);
    assert.match(result.output, /классическая ELIZA/);
    assert.match(result.output, /DOCTOR>/);
  });
});
