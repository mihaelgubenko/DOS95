# Разработка и тестирование

## Среда

Проект закреплён на Node.js 24 и npm 11 через `.node-version`, `engines` и `packageManager`.

```powershell
npm ci
npm run test:setup
npm start
```

Сервер читает `.env` из каталога runtime. Тесты принудительно отключают внешний OpenAI, поэтому не расходуют пользовательский API-ключ.

## Структура

```text
commands/       parser, DOS-команды, ELIZA и guardrails
filesystem/     VFS, persistence и instance identity
public/         DOS/Windows 95 интерфейс и API client
scripts/        checksum, EXE smoke и подпись
test/unit/      модульные тесты
test/integration/ HTTP API
test/e2e/       Playwright Chromium
server.js       Express app и запуск процесса
```

## Команды проверки

```powershell
npm run lint
npm test
npm run test:coverage
npm run test:e2e
npm run verify
npm audit
```

Порог покрытия: 85% строк, 85% функций, 75% ветвей. Интеграционные/E2E тесты должны использовать временные каталоги и не изменять `%LOCALAPPDATA%\DOS95`.

## Правила изменений

- Не использовать `eval` для CALC или команд.
- Пользовательский текст вставлять через `textContent`/`value`, не через HTML-шаблон.
- Все browser mutation requests отправлять через `window.dos95Api.fetch`.
- Новые API mutation routes должны требовать process token, валидировать типы/размеры и иметь тесты ошибок.
- Операции VFS должны оставаться атомарными: не терять источник при неудачном move/save.
- Не читать реальный диск через DOS-команды и не передавать модели tools.
- При изменении публичного поведения обновлять тест, документацию и `CHANGELOG.md`.

## Release-проверка

```powershell
npm run release:check
```

Команда пересобирает EXE. Подпись выполняется отдельно после сборки, иначе повторный build её уничтожит.
