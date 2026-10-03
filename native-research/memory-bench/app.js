import * as std from "qjs:std";
import * as os from "qjs:os";
globalThis.setTimeout = os.setTimeout; globalThis.clearTimeout = os.clearTimeout;
globalThis.setInterval = (f, ms) => os.setTimeout(f, ms); globalThis.clearInterval = os.clearTimeout;
import "./zhc-bundle.js";
print("defs loaded:", globalThis.__defs);
print(std.loadFile("/proc/self/status").split("\n").filter(l => /VmRSS|VmHWM/.test(l)).join(" | "));
