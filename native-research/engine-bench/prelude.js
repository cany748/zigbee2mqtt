var __g = globalThis;
var __origLog = (typeof console !== "undefined" && console.log) ? console.log.bind(console) : null;
var __out = typeof __g.print === "function" ? __g.print : function (s) { __origLog(s); };
var __noop = function () {};
__g.console = {log: __noop, debug: __noop, info: __noop, warn: __noop, error: __noop, warning: __noop, trace: __noop};
if (typeof __g.setTimeout !== "function") { __g.setTimeout = function () { return 0; }; __g.clearTimeout = __noop; }
if (typeof __g.setInterval !== "function") { __g.setInterval = function () { return 0; }; __g.clearInterval = __noop; }
if (typeof __g.queueMicrotask !== "function") { __g.queueMicrotask = function (f) { Promise.resolve().then(f); }; }
var __t0 = Date.now();
