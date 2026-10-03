for (const k of ["log","debug","info","warn","error"]) console[k]=()=>{}; require("./w-bundle.js");
const p=(s)=>process.stdout.write(s+"\n"); const rss=()=>(process.memoryUsage().rss/1048576).toFixed(1);
p("after load rss MB "+rss()); const r=__workload(__mods,200000); p(JSON.stringify(r)+" rss MB "+rss()+" hwm "+(process.resourceUsage().maxRSS/1024).toFixed(1));
