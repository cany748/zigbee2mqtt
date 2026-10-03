// Node APIs z2m's dependency tree needs that LLRT lacks (collected iteratively).
const u = require("util");
if (!u.deprecate) u.deprecate = (fn) => fn;
if (!u.formatWithOptions) u.formatWithOptions = (_o, ...a) => u.format(...a);
for (const [k, fd, out] of [["stdout", 1, console.log], ["stderr", 2, console.error]]) {
    if (!process[k]) process[k] = {fd, isTTY: false, write: (s) => (out(String(s).replace(/\n$/, "")), true), on() {}, once() {}};
}
