const t0=Date.now(); require("./zhc-bundle.js"); global.gc(); global.gc();
const m=process.memoryUsage(); console.log("defs", globalThis.__defs, "ms", Date.now()-t0, "rss", (m.rss/1048576).toFixed(1), "heap", (m.heapUsed/1048576).toFixed(1));
