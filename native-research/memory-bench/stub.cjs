// Generic stub for node builtins / herdsman runtime parts not needed by converters
function F() {}
const handler = { get(t, k) { if (k === "__esModule") return false; if (!(k in t)) t[k] = new Proxy(F, handler2); return t[k]; } };
const handler2 = { get(t, k) { if (k === "prototype") return F.prototype; return new Proxy(F, handler2); }, apply() { return new Proxy(F, handler2); }, construct() { return new Proxy({}, handler); } };
module.exports = new Proxy({}, handler);
