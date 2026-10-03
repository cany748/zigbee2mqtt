import {Buffer} from "buffer";
globalThis.Buffer = Buffer;
globalThis.process = globalThis.process || {env: {}, platform: "linux", nextTick: (f, ...a) => Promise.resolve().then(() => f(...a)), versions: {}};
if (!globalThis.setTimeout && typeof os !== "undefined") { globalThis.setTimeout = os.setTimeout; globalThis.clearTimeout = os.clearTimeout; }
globalThis.__dirname = "/home/user/zigbee2mqtt/dist"; globalThis.__filename = "/x.js";
