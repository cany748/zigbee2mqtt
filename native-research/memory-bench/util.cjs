exports.inspect = (v) => { try { return JSON.stringify(v); } catch { return String(v); } };
exports.format = (...a) => a.map(String).join(" "); exports.promisify = (f) => (...a) => new Promise((r, j) => f(...a, (e, v) => (e ? j(e) : r(v))));
exports.isDeepStrictEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b); exports.types = {}; exports.inherits = (c, p) => Object.setPrototypeOf(c.prototype, p.prototype);
