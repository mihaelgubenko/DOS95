'use strict';

const MAX_INPUT_LENGTH = 2000;
const MAX_OUTPUT_LENGTH = 2000;
const MAX_HISTORY_CHARACTERS = 12000;
const MAX_HISTORY_MESSAGES = 12;

const SAFE_MESSAGES = Object.freeze({
  blocked: 'Я не могу выполнять инструкции по смене роли, раскрытию настроек или запуску команд. Мы можем продолжить безопасный разговор о том, что вас беспокоит.',
  moderated: 'Я не могу продолжить эту тему в таком виде. Переформулируйте сообщение без опасных или вредоносных инструкций.',
  invalid: 'Сообщение пустое, слишком длинное или содержит недопустимые управляющие символы.',
  crisis: 'Мне очень жаль, что вам сейчас так тяжело. Если опасность непосредственная, обратитесь в местную экстренную службу или к человеку, которому доверяете, и не оставайтесь в одиночестве.'
});

const CRISIS_PATTERN = /(?:суицид|самоубийств|убить\s+себя|покончить\s+с\s+собой|не\s+хочу\s+жить|suicid|kill\s+myself|end\s+my\s+life)/iu;

const INJECTION_PATTERNS = [
  /(?:ignore|disregard|forget|override).{0,80}(?:previous|prior|system|developer|instruction|prompt|rules?)/iu,
  /(?:игнорируй|игнорировать|забудь|отмени|обойди).{0,80}(?:инструкц|правил|системн|промпт|роль)/iu,
  /(?:show|reveal|print|repeat|leak|expose).{0,80}(?:system|developer|prompt|instruction|api\s*key|environment)/iu,
  /(?:покажи|раскрой|выведи|повтори|напечатай).{0,80}(?:системн|промпт|инструкц|ключ|переменн.{0,10}окруж)/iu,
  /^\s*(?:system|developer|assistant)\s*:/imu,
  /<\/?(?:system|developer|assistant|tool)>/iu,
  /(?:run|execute|launch).{0,80}(?:powershell|cmd(?:\.exe)?|shell|bash|terminal|code)/iu,
  /(?:запусти|выполни|исполняй).{0,80}(?:powershell|cmd(?:\.exe)?|shell|bash|терминал|команд|код)/iu,
  /(?:OPENAI_API_KEY|process\.env|\.env\b|DOCTOR_SYSTEM_PROMPT)/u,
  /(?:base64|rot13).{0,60}(?:decode|instruction|prompt|декод|инструкц|промпт)/iu
];

const OUTPUT_LEAK_PATTERNS = [
  /sk-(?:proj-)?[A-Za-z0-9_-]{16,}/u,
  /OPENAI_API_KEY|DOCTOR_SYSTEM_PROMPT|process\.env/iu,
  /(?:system|developer)\s+(?:prompt|message)\s*:/iu,
  /(?:системный|developer)\s+промпт\s*:/iu
];

function normalizeMessage(value) {
  if (typeof value !== 'string') return '';
  return value.normalize('NFKC').replace(/[\u200B-\u200D\u2060\uFEFF]/gu, '').trim();
}

function hasInvalidControls(value) {
  return /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value);
}

function assessMessage(value) {
  const message = normalizeMessage(value);
  if (!message || message.length > MAX_INPUT_LENGTH || hasInvalidControls(message)) {
    return { allowed: false, guardrail: 'blocked', message: SAFE_MESSAGES.invalid };
  }
  if (CRISIS_PATTERN.test(message)) {
    return { allowed: false, guardrail: 'crisis', message: SAFE_MESSAGES.crisis };
  }
  if (INJECTION_PATTERNS.some((pattern) => pattern.test(message))) {
    return { allowed: false, guardrail: 'blocked', message: SAFE_MESSAGES.blocked };
  }
  return { allowed: true, message };
}

function sanitizeOutput(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.normalize('NFKC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, '').trim();
  if (!normalized || normalized.length > MAX_OUTPUT_LENGTH) return null;
  if (OUTPUT_LEAK_PATTERNS.some((pattern) => pattern.test(normalized))) return null;
  return normalized;
}

function trimHistory(history) {
  const candidates = history
    .filter((entry) => entry && ['user', 'assistant'].includes(entry.role) && typeof entry.content === 'string')
    .map((entry) => ({ role: entry.role, content: normalizeMessage(entry.content).slice(0, MAX_INPUT_LENGTH) }))
    .filter((entry) => entry.content)
    .slice(-MAX_HISTORY_MESSAGES);

  const result = [];
  let total = 0;
  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const entry = candidates[index];
    if (total + entry.content.length > MAX_HISTORY_CHARACTERS) break;
    result.unshift(entry);
    total += entry.content.length;
  }
  return result;
}

function isModerationFlagged(response) {
  return Boolean(response?.results?.[0]?.flagged);
}

function isSelfHarmFlagged(response) {
  const categories = response?.results?.[0]?.categories || {};
  return Object.entries(categories).some(([name, flagged]) => flagged && name.startsWith('self-harm'));
}

module.exports = {
  MAX_INPUT_LENGTH,
  SAFE_MESSAGES,
  assessMessage,
  isModerationFlagged,
  isSelfHarmFlagged,
  normalizeMessage,
  sanitizeOutput,
  trimHistory
};
