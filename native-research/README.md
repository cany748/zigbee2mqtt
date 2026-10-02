# Нативная сборка Zigbee2MQTT: исследование AOT-компиляторов TypeScript/JS

Дата: 2026-10-02. Ревизия z2m: `a8171a5` (2.13.0-dev, zigbee-herdsman 10.8.1, zigbee-herdsman-converters 26.91.0).
Стенд: Linux x86-64, 4 vCPU, ~15 ГБ RAM (лимит cgroup), Node 22/24, clang 18.

## TL;DR

__TLDR__

## Что тестировалось

| Проект | Версия | Подход | Как установлен |
|---|---|---|---|
| [PerryTS/perry](https://github.com/PerryTS/perry) | 0.5.1520 | TS/JS → (SWC) → HIR → LLVM, свой рантайм на Rust (tokio), GC | npm `@perryts/perry`; рантайм с `net` пересобран из исходников тега v0.5.1520 |
| [vercel-labs/scriptc](https://github.com/vercel-labs/scriptc) | 0.0.32 | TS → нативный код по типам; всё нетипизированное и npm-зависимости — во встроенный QuickJS-ng («island», `--dynamic`) | npm `scriptc` (нужен Node ≥ 24) |
| [geastack](https://github.com/geastack) (`geatsc` + `node-compat`) | compiler 1.0.21, node-compat 1.0.15 | TS → C++ (через типы TS), Node-API реализованы на TS + C++-реакторе | npm `@geastack/compiler`, `@geastack/node-compat` |
| [CanadaHonk/porffor](https://github.com/CanadaHonk/porffor) | alpha 13 | JS/TS → IR → C (или Wasm), свой рантайм | npm `porffor` |
| [ASDAlexander77/TypeScriptCompiler](https://github.com/ASDAlexander77/TypeScriptCompiler) (`tslang`) | HEAD `af7b150` | TS → MLIR → LLVM | готовых бинарников нет (GitHub Releases недоступны со стенда); сборка требует LLVM/MLIR 22 из исходников |

Методика:

1. **Полный z2m.** Точка входа `workarounds/nativeEntry.ts` (аналог `index.js` без пересборки/хеша/watchdog), которая создаёт `Controller` и вызывает `start()`. Компилируется весь граф: `lib/**` + все npm-зависимости.
2. **Пробы** (`probes/p1..p8`): 8 маленьких программ, каждая покрывает возможности, без которых z2m не работает — язык (классы, `#private`, генераторы, async, spread/rest, `for-in`, BigInt, RegExp), `Buffer` (кадры EZSP/ZNP/ZCL), `EventEmitter`, таймеры, TCP (`net` — MQTT и сетевые координаторы), `fs`, `crypto`, «динамический» код в стиле конвертеров (`Record<string, any>`). Вывод сравнивается байт-в-байт с Node 24 (`probes/expected`).
3. **Статический анализ** z2m и зависимостей (размеры, `any`, Node API, нативные аддоны, динамическая загрузка кода).

## Результаты по пробам

| Проба | Perry | scriptc | scriptc `--dynamic` | geatsc/node-compat | Porffor | tslang |
|---|---|---|---|---|---|---|
| p1 язык | ✅ | ❌ компиляция | ❌ компиляция | ❌ компиляция (`Array.prototype.flat`) | ❌ падение компилятора | — |
| p2 Buffer | ✅ | ❌ нет `read/writeBigUInt64LE` | ❌ | ❌ нет `writeUInt16LE` и др. | ❌ `Buffer is not defined` | — |
| p3 EventEmitter | ✅ | ❌ `EventEmitter` не generic | ❌ | ❌ то же | ❌ `node:events` не поддерживается | — |
| p4 таймеры | ✅ | ❌ `then(ok, err)` | ❌ | ❌ нет `setImmediate` | ❌ пустой вывод (нет event loop) | — |
| p5 TCP | ✅ (рантайм из исходников) | ❌ `net.AddressInfo` | ❌ | ❌ ошибка конверсии в stream.ts | ❌ `node:net` не поддерживается | — |
| p6 fs | ✅ | ❌ `typeof` на типизированном значении | ❌ | ❌ нет `readFileSync/writeFileSync/mkdirSync…` | ❌ `node:fs` | — |
| p7 crypto | ✅ | ❌ нет `createCipheriv` | ❌ | ❌ нет `createCipheriv` | ❌ `node:crypto` | — |
| p8 dynamic | ✅ | ❌ `Record<string, …>` нет статического представления | ❌ `Object.assign`, `console.log(any)` | ❌ ошибка в сгенерированном C++ | ✅ (семантика верна) | — |
| **Итого** | **8/8** | 0/8 | 0/8 | 0/8 | 1/8 | не собран |

Дополнительно для scriptc: упрощённые версии (TCP-эхо, EventEmitter без дженериков, таймеры, `Buffer.writeUInt16LE`) **собираются и работают** (бинарь ~480 КБ) — рантайм есть, но покрытие языка/типов слишком узкое для идиоматичного кода.

## Результаты на полном z2m

__FULL_Z2M__

## Блокеры

### A. Блокеры на стороне самого z2m (не зависят от компилятора)

| # | Блокер | Где | Масштаб | Что делать |
|---|---|---|---|---|
| A1 | **Нативный аддон `@serialport/bindings-cpp`** (N-API, `.node`) — весь UART-обмен с координаторами | `zigbee-herdsman/dist/adapter/serialPort.js`, используют все адаптеры (ember, ezsp, zstack, deconz, zigate, zboss, zoh) | критично: без этого работает только TCP-координатор | реализовать serial-порт в рантайме компилятора (open + `termios`/`tcsetattr` + неблокирующий read через reactor) или через FFI (`perry native`, `scriptc --ffi`); API небольшой: open/close/read/write/set/get/flush/drain |
| A2 | **Нативный аддон `unix-dgram`** | `lib/util/sd-notify.ts` (systemd notify) | низкий | заменить на встроенный Unix datagram сокет рантайма или выключить |
| A3 | **Загрузка пользовательского JS в рантайме**: external converters, external extensions (`import()` временного файла), `frontend.package` из настроек | `lib/extension/externalJS.ts`, `externalConverters.ts`, `externalExtensions.ts`, `frontend.ts` | архитектурный: AOT по определению не может исполнить произвольный JS, приходящий в рантайме | (а) отказаться от фичи в нативной сборке; (б) встроить интерпретатор (QuickJS) только для внешних расширений — со стабильным мостом к API z2m; (в) собирать внешние конвертеры вместе с бинарником на этапе сборки |
| A4 | **Ленивая загрузка 381 модуля устройств по вычисляемому пути** `await import(\`./devices/${moduleName}\`)` | `zigbee-herdsman-converters/src/index.ts` (`getDefinitions`) | высокий: без этого z2m не узнает ни одного устройства. Perry молча пропускает такой `import()`, scriptc отказывает (`SC1090`), geatsc/porffor тоже | сгенерировать статическую таблицу `switch(moduleName) { case "ikea.ts": return import("./devices/ikea"); … }` (скриптом при сборке; модулей 381, ~182 тыс. строк) |
| A5 | **`ajv` компилирует JSON Schema через `new Function`** | `lib/util/settings.ts` (валидация `settings.schema.json`) | средний | ajv standalone: сгенерировать валидатор заранее (`ajv/dist/standalone`) и импортировать как обычный модуль |
| A6 | **Legacy-декораторы `@bind`** (`experimentalDecorators`, 57 мест) | `lib/**` | низкий, механический | заменить на стрелочные поля класса или ручной `bind` в конструкторе; scriptc/geatsc не поддерживают legacy-декораторы |
| A7 | **Сплошная динамическая типизация** `KeyValue = Record<string, any>` (~1100 употреблений в converters, ~190 `any` в herdsman), `for-in`, `delete`, spread объектов, `Object.entries` по произвольным объектам | converters, herdsman, `lib/**` | критично для «типо-ориентированных» компиляторов (scriptc, geatsc, tslang) — на этом они и останавливаются; для Perry (полноценная JS-семантика) не проблема | либо компилятор с полной динамической семантикой JS (Perry), либо многолетний рефакторинг converters в строгие типы — нереалистично |
| A8 | **Гигантские литералы данных** (`zspec/zcl/definition/cluster.js`, файлы устройств) | herdsman, converters | компиляция: функция инициализации cluster.js в Perry разворачивается в ~1 млн LLVM-инструкций (→16 млн после GC-переписывания), пик памяти компилятора 12 ГБ | генерировать данные как JSON/бинарь и парсить при старте, или компилятор должен уметь «холодные» data-инициализаторы |
| A9 | Динамические `import()` с атрибутами `with {type: "json"}` и `import(\`${depend}/package.json\`)` для версий | `lib/util/utils.ts`, `index.js` | низкий | вшить версии при сборке |
| A10 | Широкая поверхность Node API | см. ниже | средний | у Perry почти всё есть; у остальных — дыры |
| A11 | Встроенный фронтенд: статика из npm-пакета `zigbee2mqtt-windfront` + `ws` + `http`/`srvx` (`srvx` импортирует `node:http2`) | `lib/extension/frontend.ts`, `onboarding.ts` | средний | вшить статику (`perry --embed`), `node:http2` убрать/заглушить |
| A12 | `child_process.exec` (git hash), `worker_threads` (в `fflate`), mDNS через `dgram` multicast (`bonjour-service`) | разное | низкий | вырезать или заглушить в нативной сборке |

Используемые Node-модули (по бандлу z2m): `assert, events, fs, fs/promises, stream, stream/promises, path, buffer, util, os, net, tls, crypto, http, https, dgram, dns, zlib, url, tty, child_process, worker_threads, string_decoder, perf_hooks, process`, плюс глобальные `fetch` (OTA), `AbortController`, `setImmediate`, `queueMicrotask`, `Intl` (часовые пояса в логгере).

Объём кода: z2m — 13 тыс. строк TS; zigbee-herdsman — 84 тыс.; zigbee-herdsman-converters — 238 тыс. (из них устройства — 182 тыс.); плюс ~80 npm-пакетов. В бандле ≈7 МБ JS без устройств, с устройствами ≈15 МБ.

### B. Блокеры по компиляторам

__PER_COMPILER__

## Возможно ли это вообще?

__VERDICT__

## Как воспроизвести

```bash
# компиляторы
npm i scriptc @perryts/perry porffor @geastack/compiler @geastack/node-compat   # scriptc требует Node >= 24
# z2m
pnpm install --frozen-lockfile && pnpm run build
# рабочая копия с обходами
cp -r lib /tmp/z2m-work/lib && cd /tmp/z2m-work && patch -p0 < native-research/workarounds/z2m-lib.patch
# пробы
cd native-research/probes && ./run.sh perry   # scriptc | scriptc-dyn | porffor
```

Файлы:

- `probes/` — пробы, ожидаемый вывод Node (`expected/`), раннер `run.sh`;
- `workarounds/nativeEntry.ts` — точка входа для компиляторов;
- `workarounds/z2m-lib.patch` — обходы в `lib/` (удаление `@bind`, `/// <reference>` на глобальные типы для scriptc, `WebSocketServer`, обход бага Perry с `$pshape`);
- `scriptc-*.txt` — отчёты `scriptc coverage` (статический, `--dynamic`, агрегированные блокеры по всем 35 модулям).
