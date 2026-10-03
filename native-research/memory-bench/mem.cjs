const mb = (n) => (n / 1048576).toFixed(1);
function snap(label) { global.gc?.(); global.gc?.(); const m = process.memoryUsage(); console.log(label.padEnd(34), "rss", mb(m.rss), "heapUsed", mb(m.heapUsed), "heapTotal", mb(m.heapTotal), "ext", mb(m.external + m.arrayBuffers)); }
(async () => {
  snap("node empty");
  const what = process.argv[2];
  if (what === "zh" || what === "all") { require("zigbee-herdsman"); snap("+ zigbee-herdsman"); }
  if (what === "zhc" || what === "all") {
    const zhc = require("zigbee-herdsman-converters"); snap("+ zhc (index only)");
    const defs = []; for await (const d of zhc.definitionsIterator?.() ?? []) defs.push(d);
    if (!defs.length) { const fs=require("fs"),p=require("path"); const dir=p.join(p.dirname(require.resolve("zigbee-herdsman-converters")),"devices"); for (const f of fs.readdirSync(dir).filter(f=>f.endsWith(".js"))) { const m=require(p.join(dir,f)); if (m.definitions) defs.push(...m.definitions);} }
    snap(`+ all ${defs.length} definitions loaded`);
  }
  if (what === "all") { await import("../../dist/controller.js"); snap("+ z2m controller + extensions"); }
})();
