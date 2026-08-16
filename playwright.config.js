'use strict';

const path = require('node:path');
const os = require('node:os');
const { defineConfig } = require('@playwright/test');

const dataDirectory = path.join(os.tmpdir(), `dos95-e2e-${process.pid}`);

module.exports = defineConfig({
  testDir: './test/e2e',
  timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:31995', headless: true },
  webServer: {
    command: 'node server.js',
    url: 'http://127.0.0.1:31995/api/health',
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      ...process.env,
      PORT: '31995',
      DOS95_AUTO_OPEN: '0',
      DOS95_DATA_DIR: dataDirectory,
      OPENAI_API_KEY: '',
      GPT_MODEL: 'gpt-5.6-terra'
    }
  }
});
