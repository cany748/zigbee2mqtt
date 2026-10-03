const v8=require("v8"); const mb=(n)=>(n/1048576).toFixed(1);
const fs=require("fs"),p=require("path");
(async()=>{
  require("zigbee-herdsman"); require("zigbee-herdsman-converters"); await import("../../dist/controller.js");
  const dir=p.join(p.dirname(require.resolve("zigbee-herdsman-converters")),"devices");
  
  // simulate steady state work a bit
  for (let i=0;i<200000;i++) JSON.stringify({state:"ON",brightness:i,color:{x:i/1e6}});
  await new Promise(r=>setTimeout(r,500));
  const sp=Object.fromEntries(v8.getHeapSpaceStatistics().map(s=>[s.space_name.replace("_space",""),mb(s.space_size)]));
  console.log("rss", mb(process.memoryUsage().rss), "heapUsed", mb(process.memoryUsage().heapUsed), JSON.stringify(sp));
})();
