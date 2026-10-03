function assert(v, m) { if (!v) throw new Error(m || "Assertion failed"); }
assert.ok = assert; assert.strictEqual = (a, b, m) => assert(a === b, m); assert.equal = (a, b, m) => assert(a == b, m);
assert.deepStrictEqual = (a, b, m) => assert(JSON.stringify(a) === JSON.stringify(b), m); assert.notStrictEqual = (a, b, m) => assert(a !== b, m);
assert.fail = (m) => { throw new Error(m); };
module.exports = assert; module.exports.default = assert;
