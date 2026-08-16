'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const executable = path.resolve(__dirname, '..', 'dist', 'DOS95.exe');
const checksumFile = `${executable}.sha256`;
const checksum = crypto.createHash('sha256').update(fs.readFileSync(executable)).digest('hex');
fs.writeFileSync(checksumFile, `${checksum}  DOS95.exe\n`, 'utf8');
console.log(`SHA-256: ${checksum}`);
