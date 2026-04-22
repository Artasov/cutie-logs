<div align="center">
  <h1>cutie-logs</h1>
  <img src="./docs/images/poster.png" alt="English">
  <a href="./README.md">
    <img src="https://img.shields.io/badge/English-blue?style=for-the-badge" alt="English">
  </a>
  <a href="./docs/README.ru.md">
    <img src="https://img.shields.io/badge/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-red?style=for-the-badge" alt="Russian">
  </a>
</div>

Маленькая библиотека для красивого логирования Axios и WebSocket в консоль.

## Установка

```bash
npm install cutie-logs
```

Для Axios-логгера `axios` должен быть установлен в приложении:

```bash
npm install axios
```

## Axios

```ts
import axios from 'axios';
import {attachAxiosLogger} from 'cutie-logs/axios';

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
});

attachAxiosLogger(api, {
  enabled: process.env.NEXT_PUBLIC_API_LOGGING !== 'false',
  label: 'API',
  maxPayloadKB: 100,
  logRequestsDelay: true,
  logRequestsTime: true,
  stripUrlPrefixes: ['http://localhost:8000', 'https://xlartas.com'],
});
```

## WebSocket

WebSocket логируется вручную: так меньше магии и проще контролировать, что именно попадает в консоль.

```ts
import {createWsLogger} from 'cutie-logs/ws';

const wsLogger = createWsLogger({
  enabled: process.env.NEXT_PUBLIC_API_LOGGING !== 'false',
  label: 'WS',
  stripUrlPrefixes: ['ws://localhost:8000', 'wss://xlartas.com'],
});

wsLogger.connecting('/ws/chat/', url);
const ws = new WebSocket(url);

ws.onopen = () => wsLogger.open('/ws/chat/', url);
ws.onclose = (event) => wsLogger.close('/ws/chat/', event.code, event.reason);
ws.onerror = (event) => wsLogger.error('/ws/chat/', event);
ws.onmessage = (event) => {
  const payload = JSON.parse(event.data);
  wsLogger.message('/ws/chat/', payload.event ?? 'message', payload);
};
```

## Опции

- `enabled` - включает или выключает логирование.
- `label` - подпись в консоли, например `API`, `WS`, `LLM`.
- `maxPayloadKB` - ограничение размера payload. По умолчанию `null`, то есть без ограничения.
- `redactFields` - поля, которые нужно скрывать. По умолчанию скрываются `password`, `access`, `refresh`, `token`, `authorization`, `api_key`, `secret` и похожие.
- `stripUrlPrefixes` - префиксы URL, которые нужно убрать из логов, например `http://localhost:8000`.
- `logRequestsDelay` - показывает время выполнения ответа/ошибки, например `[124ms]`. По умолчанию выключено.
- `logRequestsTime` - показывает текущее время в таймзоне браузера. По умолчанию включено.
- `timestampFormatter` - позволяет полностью переопределить формат времени.
- `timeLocale` - локаль времени, по умолчанию `ru-RU`.
- `colors` - переопределение цветов.

## Что экспортируется

```ts
import {attachAxiosLogger} from 'cutie-logs/axios';
import {createWsLogger} from 'cutie-logs/ws';
import {sanitizePayload, formatPayload} from 'cutie-logs';
```

## Разработка

```bash
npm ci
npm run check
npm test
npm run build
npm run pack:dry-run
```

## Релизы

См. [Release Guide](./RELEASE_GUIDE.md).
