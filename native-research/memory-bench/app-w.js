import * as std from "qjs:std";
import * as os from "qjs:os";
globalThis.setTimeout = os.setTimeout; globalThis.clearTimeout = os.clearTimeout;
globalThis.console = {log() {}, debug() {}, info() {}, warn() {}, error() {}, warning() {}};
import "./w-bundle.js";
const rss = () => std.loadFile("/proc/self/status").match(/VmRSS:\s+(\d+)/)[1] / 1024;
print("after load rss MB", rss().toFixed(1));
const r = __workload(__mods, 200000); print(JSON.stringify(r), "rss MB", rss().toFixed(1), "hwm", (std.loadFile("/proc/self/status").match(/VmHWM:\s+(\d+)/)[1] / 1024).toFixed(1));
