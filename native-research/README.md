# Нативная сборка Zigbee2MQTT: исследование AOT-компиляторов TypeScript/JS

Дата: 2026-10-02. Ревизия z2m: `a8171a5` (2.13.0-dev, zigbee-herdsman 10.8.1, zigbee-herdsman-converters 26.91.0).
Стенд: Linux x86-64, 4 vCPU, ~15 ГБ RAM (лимит cgroup), Node 22/24, clang 18.

## TL;DR

- **Скомпилировать z2m целиком удалось только Perry**: все 652 модуля (z2m + herdsman + converters + mqtt + winston + ajv + ws…) → один ELF-бинарник **~210 МБ**. Понадобились: пересборка рантайма Perry из исходников (для `node:net`), выключение одной оптимизации (`PERRY_PTR_SHAPE_THIS=0`, баг кодогенерации), ~1.5–1.8 ч компиляции и до **12 ГБ RAM** в один поток.
- Бинарник **запускается, но пока не работает**: сначала падает на загрузке нативного аддона `@serialport/bindings-cpp` (ожидаемый блокер A1), а с заглушкой вместо аддона — segfault в рантайме Perry во время инициализации модулей (см. ниже).
- **scriptc, geatsc, Porffor** — далеко: 0/8, 0/8 и 1/8 базовых проб соответственно; на полном z2m не продвигаются дальше анализа. **TypeScriptCompiler (tslang)** не имеет Node-совместимого рантайма вообще (нет `fs`/`net`/таймеров/`EventEmitter`, `JSON.parse` — TODO) — для z2m неприменим без написания всего рантайма.
- **Вывод: в принципе возможно, но не «скомпилировать как есть».** Реалистичный путь — Perry + доработки z2m/herdsman/converters (serial без N-API, статическая таблица устройств, ajv standalone, отказ/изоляция внешних JS-расширений) + исправление багов Perry. Остальные кандидаты на сегодня непригодны.

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

| Компилятор | Результат на `nativeEntry.ts` (весь z2m) |
|---|---|
| **Perry** | ✅ **Собран бинарник** (652 модуля, 210 МБ, ~1 ч 45 мин, пик RSS 12.4 ГБ) после: пересборки рантайма с `net`, `PERRY_PTR_SHAPE_THIS=0`, однопоточной кодогенерации. ❌ Запуск: `Cannot find module …@serialport+bindings-cpp.glibc.node`; с заглушкой аддона — SIGSEGV при инициализации модулей. |
| scriptc | ❌ Сборка останавливается на первой ошибке (`node:process` не поддерживается); `coverage` — см. ниже; npm-зависимости только через QuickJS (`--dynamic`). |
| geatsc | ❌ Падение компилятора (`EISDIR`); после патча — preflight не уложился в 25 мин / 8 ГБ. |
| Porffor | ❌ На бандле (esbuild, 7 МБ) не завершился за 15 мин; `node:*` не поддерживается в принципе. |
| tslang | ⛔ Не собран (LLVM/MLIR из исходников); Node API отсутствует. |

Эталон под Node (тот же конфиг, MQTT-брокер aedes, адаптер `ember` по `tcp://127.0.0.1:6638` без координатора): загрузка настроек → миграция v4→v5 → старт herdsman → TCP-подключение → `ECONNREFUSED` → корректный выход. Нативный бинарник до этой точки пока не доходит.

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

#### Perry — самый близкий к цели

Что сработало:
- полная JS-семантика (динамические объекты, `any`, `for-in`, `delete`, прототипы) — ему не важно, насколько строго типизирован код; CommonJS-пакеты из `node_modules` компилируются как есть (652 модуля);
- Node API: `fs`, `net`, `crypto` (включая `createCipheriv`), `events`, `Buffer` (включая BigInt-чтения), таймеры, `setImmediate`/`queueMicrotask` — все 8 проб байт-в-байт с Node.

Блокеры/проблемы, найденные на z2m:
- **P1. `node:net` нет в npm-сборке.** `libperry_ext_net.a` отсутствует в пакете; нужен checkout исходников того же тега, `PERRY_WORKSPACE_ROOT`, nightly Rust и пересборка рантайма (`cargo build -p perry-runtime-static -p perry-stdlib-static -p perry-ext-net`). Сборка из git-checkout ставит штамп `git:<sha>`, а npm-компилятор ждёт `src:<hash>` → «runtime library does not match»; обход — собрать без `.git` (тогда штамп совпадает).
- **P2. Баг кодогенерации `$pshape`.** В `Controller.stop()` Perry девиртуализирует `extension.stop()` по всем 20 подклассам `Extension` и ссылается на клон `Availability.stop$pshape`, который модуль `availability` не создаёт → `use of undefined value` в LLVM IR. Не лечится ни `as any`, ни `Reflect.apply`, ни rest-параметром; лечится только `PERRY_PTR_SHAPE_THIS=0` (выключение оптимизации глобально).
- **P3. Ресурсы компиляции.** 652 модуля, ~1.5–1.8 ч на 4 ядрах при `PERRY_MODULE_JOBS=1 PERRY_CODEGEN_UNIT_JOBS=1`; пик RSS 12.4 ГБ. При параллелизме по умолчанию компилятор дважды убит OOM (8.9 и 11.6 ГБ). Главный виновник — `zspec/zcl/definition/cluster.js`: функция-инициализатор ~1 млн LLVM-инструкций → 16 млн после RS4GC. Изменение одного файла часто инвалидирует почти весь кеш.
- **P4. Размер:** 210 МБ (без устройств converters!), hello world ~14–17 МБ при полном stdlib.
- **P5. Вычисляемый `import()` (устройства converters) пропускается молча** — без ошибки и предупреждения при компиляции.
- **P6. N-API аддоны:** `require` `.node` → `Cannot find module …bindings-cpp.glibc.node` при старте (подтверждено запуском).
- **P7. Падение рантайма:** с заглушкой вместо serialport-аддона бинарник падает (SIGSEGV, чтение заголовка объекта `cmpb $0x2,-0x8(%rdi)` по невалидному указателю) на глубине ~180 кадров ещё во время инициализации модулей, до первой строки лога. Локализовать не удалось: сборка с `--debug-symbols` убивается OOM на `cluster.js` (13.8 ГБ RSS при лимите стенда ~15 ГБ) — для отладки нужна машина с ≥32 ГБ RAM.

#### scriptc

- Архитектура «статический TS + QuickJS-островок»: все npm-зависимости z2m (herdsman, converters, mqtt, winston, ajv, js-yaml, fast-deep-equal, debounce, fflate…) уходят в встроенный QuickJS. Нативно компилировалась бы только «обвязка» z2m, а основная работа (herdsman, converters) — в интерпретаторе, т. е. выигрыш по сравнению с Node сомнителен.
- Нет поддержки legacy-декораторов, глобальных `.d.ts` без явного `reference`, своих типов `ws` (`WebSocket.Server`).
- Coverage по `lib/nativeEntry.ts`: статически 225 из 339 проанализированных утверждений (66%) + 55 функций не проанализированы; с `--dynamic` — 477/798 (59%) статически, 211 (26%) в QuickJS. Анализ обрывается каскадом блокеров в `settings.ts`.
- Блокеры статического ядра (агрегировано по 35 модулям, см. `scriptc-blockers-aggregated.txt`): `Array.isArray`, `Object.keys/entries`, `for-in` по `KeyValue`, `Set<Extension>` (элементы — только числа/строки), `instanceof` с внешними классами, наследование от классов из npm, `__dirname` в ESM, `import()` с атрибутами и вычисляемыми путями, generator-методы, мульти-декларации в `for`, `.test()` на `/g`-регулярках, `replace` с функцией, `==` с объектами, `child_process.exec`, `crypto.createHash` с алгоритмом, `writeFileSync` с 3 аргументами, `node:process` как модуль, `srvx` → `node:http2` (не шимится).
- Даже в `--dynamic` нативный QuickJS-островок не умеет `.node`-аддоны (serialport), `node:dgram`, `node:http2`.

#### geatsc (GeaStack)

- Компилятор упал на собственном баге (`EISDIR` в `declaration-overlay-transform.js` при попытке прочитать каталог как `.d.ts`); после локального патча preflight полного z2m не завершился за 25 мин при 8 ГБ RAM.
- `node-compat` — рантайм под HTTP-серверы (Hono, `node:http`, cluster); у `fs` нет синхронного API, у `Buffer` — `writeUInt16LE/BE` и BigInt-методов, `EventEmitter` не generic, нет `setImmediate`, `createCipheriv`, `os.tmpdir`, `process.platform`; TCP-клиент (`net.connect`) упирается в ошибку конверсии внутри их `stream.ts`.
- Динамический код (`Record<string, any>`, `reduce` по `any`) порождает невалидный C++.

#### Porffor

- Модули `node:*` запрещены в принципе (`porffor: node builtin modules are not supported`), нет `Buffer`, нет event loop/таймеров (p4 выводит пустоту), компилятор падает на p1.
- На бандле z2m (7 МБ JS) не завершился за 15 мин.
- Чистая логика в стиле конвертеров (p8) работает корректно.

#### TypeScriptCompiler (tslang)

- Релизные бинарники со стенда недоступны; сборка требует LLVM/MLIR 22.1.8 из исходников (запущена, не завершилась в отведённое время).
- Стандартная библиотека (`TypeScriptCompilerDefaultLib`, ~1.9 тыс. строк) не содержит ни Node API, ни event loop: нет `fs`, `net`, `setTimeout`, `EventEmitter`, `Buffer`; `JSON.parse` помечен TODO. Модель «TS как системный язык + C-биндинги». Для z2m пришлось бы написать весь Node-слой и переписать зависимости — по сути, новый проект.

## Возможно ли это вообще?

**Коротко: технически возможно, но только с одним из протестированных компиляторов (Perry) и только как отдельный инженерный проект, а не «собрать текущий код».**

Аргументы «за»:
- Perry уже сейчас переваривает весь граф модулей z2m без переписывания исходников (кроме тривиальных обходов) и проходит все базовые пробы на Node API — язык и стандартная библиотека не являются фундаментальной стеной.
- Большинство блокеров z2m локализованы и механически устранимы: таблица устройств (A4), ajv standalone (A5), `@bind` (A6), версии/JSON-импорты (A9), фронтенд-статика (A11).

Аргументы «против» / что делает задачу большой:
1. **Serial-порт без N-API (A1)** — придётся написать и поддерживать реализацию последовательного порта в рантайме выбранного компилятора (Linux/macOS/Windows), иначе остаются только TCP-координаторы.
2. **Внешние конвертеры/расширения (A3)** — у AOT-бинарника их не будет без встроенного интерпретатора; это ломает часть пользовательских сценариев.
3. **Зрелость Perry** — найдено минимум два бага уровня «не собирается/падает» (P2, P7) только на старте; компилятор не даёт стектрейсов без пересборки, итерация занимает 1.5–2 часа и 12 ГБ RAM.
4. **Выигрыш неочевиден**: бинарник 210 МБ без определений устройств (Node + z2m ≈ 100–150 МБ на диске), а z2m — I/O-bound приложение, где JIT V8 не узкое место. Реальная польза — один файл без Node и, возможно, меньший RSS, но это нужно измерять после того, как бинарник заработает.

Рекомендуемый порядок, если продолжать:
1. Довести Perry-бинарник до старта с TCP-координатором (заглушка serial, `PERRY_PTR_SHAPE_THIS=0`), локализовать и зарепортить P7 (сборка с `--debug-symbols` требует ≥32 ГБ RAM); параллельно — зарепортить P2/P3 в PerryTS/perry.
2. Сгенерировать статическую таблицу импортов устройств converters и ajv standalone-валидатор.
3. Реализовать serial через FFI/рантайм Perry (`termios`).
4. Только после этого мерить RSS/CPU/размер против Node и решать, стоит ли поддерживать нативную сборку.

Альтернатива с гораздо меньшим риском, если цель — «один бинарник без установленного Node»: Node SEA / `bun build --compile` / `deno compile` (встроенный JS-движок, совместимость близка к 100%, N-API аддоны поддерживаются). Это не AOT, но решает задачу дистрибуции сразу.

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
