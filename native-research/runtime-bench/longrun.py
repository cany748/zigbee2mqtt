#!/usr/bin/env python3
"""5-minute runs in parallel: RSS trajectory + CPU time (user+sys) per config."""
import json, os, re, shutil, subprocess, sys, time, threading
DENO = "/home/user/engines/node_modules/.bin/deno"
SECS, RATE = os.environ.get("SECS", "300"), os.environ.get("RATE", "50")
CFG = {
  "node22 default": ({}, ["node", "fake-run.cjs"]),
  "node22 semi=1 ofs no-opt/maglev": ({}, ["node", "--max-semi-space-size=1", "--optimize-for-size", "--no-opt", "--no-maglev", "fake-run.cjs"]),
  "bun JIT off": ({"BUN_JSC_useJIT": "0"}, ["bun", "fake-run.cjs"]),
  "deno semi=1 lite": ({}, [DENO, "run", "-A", "--unstable-detect-cjs", "--v8-flags=--max-semi-space-size=1,--lite-mode", "fake-run.cjs"]),
}
res = {}
def run(i, name, env, argv):
    d = f"/tmp/claude-0/z2m-long-{i}"; shutil.rmtree(d, ignore_errors=True); shutil.copytree("data-template", d)
    c = open(f"{d}/configuration.yaml").read().replace("port: 18080", f"port: {18100 + i}"); open(f"{d}/configuration.yaml", "w").write(c)
    p = subprocess.Popen(argv + [d, SECS, RATE], env={**os.environ, **env}, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    traj = []; t0 = time.time()
    def sample():
        while p.poll() is None:
            try: traj.append(int(re.search(r"VmRSS:\s+(\d+)", open(f"/proc/{p.pid}/status").read()).group(1)) // 1024)
            except Exception: pass
            time.sleep(30)
    threading.Thread(target=sample, daemon=True).start()
    out = p.stdout.read().decode(errors="replace"); _, st, ru = os.wait4(p.pid, 0)
    m = re.search(r"\[bench\] RESULT (\{.*\})", out)
    res[name] = {**(json.loads(m.group(1)) if m else {"error": out[-300:]}), "cpu_s": round(ru.ru_utime + ru.ru_stime, 1), "rss_every_30s": traj}
ths = [threading.Thread(target=run, args=(i, n, e, a)) for i, (n, (e, a)) in enumerate(CFG.items())]
[t.start() for t in ths]; [t.join() for t in ths]
for k, v in res.items(): print(f"{k:34} {json.dumps(v)}")
json.dump(res, open(f"longrun-{int(time.time())}.json", "w"), indent=1)
