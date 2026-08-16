'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { resolveDataDirectory } = require('./storage');

function getSafetyIdentifier(dataDirectory) {
  const directory = resolveDataDirectory(dataDirectory);
  const identityPath = path.join(directory, 'instance-id');
  fs.mkdirSync(directory, { recursive: true });
  let identity = null;
  try {
    identity = fs.readFileSync(identityPath, 'utf8').trim();
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (!/^[0-9a-f-]{36}$/iu.test(identity || '')) {
    identity = crypto.randomUUID();
    fs.writeFileSync(identityPath, `${identity}\n`, { encoding: 'utf8', mode: 0o600 });
  }
  return crypto.createHash('sha256').update(identity).digest('hex');
}

module.exports = { getSafetyIdentifier };
