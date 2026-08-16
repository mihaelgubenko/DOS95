# Локальный HTTP API

API предназначен для встроенного браузерного клиента и слушает только `127.0.0.1`. Это не внешний сетевой API и не стабильный интерфейс для сторонних интеграций.

UI-маршруты: `/`, `/dos`, `/index.html` загружают DOS; `/win95`, `/win95.html` загружают Windows 95. Команда `WIN95` возвращает совместимое поле `openWindow: "/win95"`, которое штатный клиент обрабатывает как переход в текущей вкладке.

## Общие правила

- JSON-запросы используют `Content-Type: application/json`.
- `sessionId` обязателен для команд и файловых операций: 1–128 символов `[A-Za-z0-9_-]`.
- Все `POST` требуют заголовок `X-DOS95-Token`.
- Токен получают через `GET /api/bootstrap`; ответ имеет `Cache-Control: no-store`.
- Host и Origin должны указывать на фактический локальный адрес и порт процесса.
- Общий лимит — 120 API-запросов в минуту на IP; сообщения активного DOCTOR дополнительно ограничены 12 в минуту на сессию.
- JSON body и содержимое файла ограничены 256 КБ, строка команды — 2048 символами.

## Служебные маршруты

### `GET /api/health`

```json
{ "status": "ok", "version": "1.1.0" }
```

### `GET /api/bootstrap`

```json
{ "apiToken": "<случайное значение процесса>", "shutdownEnabled": true }
```

### `GET /api/runtime`

Возвращает только `shutdownEnabled`. Секреты и токен в runtime-ответ не включаются.

### `GET /api/commands`

Возвращает сгруппированный справочник доступных команд.

### `POST /api/shutdown`

Доступен только автономной сборке, требует process token. При запуске обычного `node server.js` возвращает `404`.

## Выполнение команды

`POST /api/command`:

```json
{ "command": "DIR", "sessionId": "browser-uuid" }
```

Успешный ответ содержит `success`, `output`, `currentDir`, `doctorMode`; отдельные команды могут добавить `clear`, `openWindow` или `guardrail`. История сервера не сохраняет текст сообщений DOCTOR.

## Файловые операции

`POST /api/file` принимает:

```json
{
  "action": "write",
  "path": "C:\\NOTES.TXT",
  "content": "текст",
  "sessionId": "browser-uuid"
}
```

Поддерживаются `list`, `read`, `create`, `write`, `delete`, `rename`, `move`, `copy`, `mkdir`, `rmdir`. Для `rename`, `move`, `copy` требуется `newPath`; для рекурсивного `rmdir` — `recursive: true`.

Коды: `200` — успех, `400` — неверный запрос, `403` — Host/Origin/token, `404` — объект или маршрут отсутствует, `409` — конфликт файловой операции, `429` — rate limit, `500` — внутренняя ошибка без утечки деталей.
