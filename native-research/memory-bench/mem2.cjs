const mb = (n) => (n / 1048576).toFixed(1);
const fs=require("fs"),p=require("path");
function heap(){ global.gc(); global.gc(); return process.memoryUsage().heapUsed; }
(async()=>{
  require("zigbee-herdsman"); const zhc=require("zigbee-herdsman-converters");
  await import("../../dist/controller.js");
  const m0=process.memoryUsage(); global.gc(); console.log("z2m+zh+zhc, no device modules: rss", mb(process.memoryUsage().rss), "heap", mb(heap()));
  const dir=p.join(p.dirname(require.resolve("zigbee-herdsman-converters")),"devices");
  const res=[]; for (const f of fs.readdirSync(dir).filter(f=>f.endsWith(".js")&&f!=="index.js")) { const h=heap(); const m=require(p.join(dir,f)); res.push([f,(heap()-h), (m.definitions||[]).length]); }
  res.sort((a,b)=>b[1]-a[1]); for (const r of res.slice(0,12)) console.log(r[0].padEnd(24), mb(r[1]),"MB", r[2],"defs");
  const typical=["ikea.js","philips.js","xiaomi.js","tuya.js","sonoff.js","aqara.js","lumi.js"].filter(f=>fs.existsSync(p.join(dir,f)));
  console.log("typical set", typical.join(","), mb(res.filter(r=>typical.includes(r[0])).reduce((a,r)=>a+r[1],0)),"MB");
  console.log("final rss", mb(process.memoryUsage().rss));
})();
