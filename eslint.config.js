'use strict';

const nodeGlobals = {
  Buffer: 'readonly', URL: 'readonly', __dirname: 'readonly', console: 'readonly', fetch: 'readonly',
  module: 'readonly', process: 'readonly', require: 'readonly', setImmediate: 'readonly',
  setInterval: 'readonly', setTimeout: 'readonly', clearInterval: 'readonly'
};

const browserGlobals = {
  alert: 'readonly', confirm: 'readonly', console: 'readonly', document: 'readonly',
  fetch: 'readonly', getComputedStyle: 'readonly', globalThis: 'readonly', Headers: 'readonly', Map: 'readonly', Math: 'readonly',
  prompt: 'readonly', setInterval: 'readonly', setTimeout: 'readonly', window: 'readonly',
  win95Manager: 'readonly'
};

module.exports = [
  { ignores: ['node_modules/**', 'dist/**', 'coverage/**', 'playwright-report/**', 'test-results/**'] },
  {
    files: ['*.js', 'commands/**/*.js', 'filesystem/**/*.js', 'scripts/**/*.js', 'test/**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'commonjs', globals: nodeGlobals },
    rules: { 'no-eval': 'error', 'no-undef': 'error', 'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }] }
  },
  {
    files: ['public/**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'script', globals: browserGlobals },
    rules: { 'no-eval': 'error', 'no-undef': 'error', 'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }] }
  }
];
