#!/usr/bin/env python3
"""Run full z2m (fake coordinator, 62 devices, HA + frontend + availability) under many runtime configs."""
import json, os, re, shutil, subprocess, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
DENO = "/home/user/engines/node_modules/.bin/deno"
NODE24 = "/home/user/native/tools/node24/bin/node"
SECS, RATE = os.environ.get("SECS", "90"), os.environ.get("RATE", "50")
S = "fake-run.cjs"
CONFIGS = {
  "node22":                          ({}, ["node", S]),
  "node22 semi=1":                   ({}, ["node", "--max-semi-space-size=1", S]),
  "node22 semi=1 lite":              ({}, ["node", "--max-semi-space-size=1", "--lite-mode", S]),
  "node22 optimize-for-size":        ({}, ["node", "--optimize-for-size", S]),
  "node22 semi=1 jitless":           ({}, ["node", "--max-semi-space-size=1", "--jitless", S]),
  "node22 semi=1 old=64 lite":       ({}, ["node", "--max-semi-space-size=1", "--max-old-space-size=64", "--lite-mode", S]),
  "node22 semi=1 lite single-thr":   ({}, ["node", "--max-semi-space-size=1", "--lite-mode", "--single-threaded", S]),
  "node22 compile-cache":            ({"NODE_COMPILE_CACHE": "/tmp/claude-0/node-cc"}, ["node", S]),
  "node22 compile-cache semi=1 lite":({"NODE_COMPILE_CACHE": "/tmp/claude-0/node-cc"}, ["node", "--max-semi-space-size=1", "--lite-mode", S]),
  "node24":                          ({}, [NODE24, S]),
  "node24 semi=1 lite":              ({}, [NODE24, "--max-semi-space-size=1", "--lite-mode", S]),
  "bun":                             ({}, ["bun", S]),
  "bun --smol":                      ({}, ["bun", "--smol", S]),
  "bun JIT off":                     ({"BUN_JSC_useJIT": "0"}, ["bun", S]),
  "bun --smol JIT off":              ({"BUN_JSC_useJIT": "0"}, ["bun", "--smol", S]),
  "bun forceRAMSize=64M":            ({"BUN_JSC_forceRAMSize": str(64 << 20)}, ["bun", S]),
  "bun --smol forceRAMSize=64M JIT off": ({"BUN_JSC_forceRAMSize": str(64 << 20), "BUN_JSC_useJIT": "0"}, ["bun", "--smol", S]),
  "deno":                            ({}, [DENO, "run", "-A", "--unstable-detect-cjs", S]),
  "deno semi=1 lite":                ({}, [DENO, "run", "-A", "--unstable-detect-cjs", "--v8-flags=--max-semi-space-size=1,--lite-mode", S]),
  "deno semi=1 jitless":             ({}, [DENO, "run", "-A", "--unstable-detect-cjs", "--v8-flags=--max-semi-space-size=1,--jitless", S]),
}
EXTRA = json.load(open(os.path.join(HERE, "extra-configs.json"))) if os.path.exists(os.path.join(HERE, "extra-configs.json")) else {}
for k, (env, argv) in EXTRA.items(): CONFIGS[k] = (env, argv)
only = sys.argv[1:]
results = {}
for name, (env, argv) in CONFIGS.items():
    if only and not any(o == name or (o.endswith("*") and name.startswith(o[:-1])) for o in only): continue
    data = f"/tmp/claude-0/z2m-run-{os.getpid()}"
    shutil.rmtree(data, ignore_errors=True); shutil.copytree(os.path.join(HERE, "data-template"), data)
    cmd = [a for a in argv] + ([data, SECS, RATE] if S in argv or any(a.endswith(S) for a in argv) else [data, SECS, RATE])
    t = time.time()
    p = subprocess.run(cmd, cwd=HERE, env={**os.environ, **env}, capture_output=True, text=True, timeout=int(SECS) + 240)
    out = p.stdout + p.stderr
    m = re.search(r"\[bench\] RESULT (\{.*\})", out); st = re.search(r"\[bench\] started ms (\d+) (\{.*\})", out)
    if m:
        r = json.loads(m.group(1)); r["start_ms"] = int(st.group(1)); r["rss_after_start"] = json.loads(st.group(2))["VmRSS"]
    else:
        r = {"error": [l for l in out.splitlines() if "rror" in l or "FAIL" in l][:3] or out[-300:]}
    results[name] = r
    print(f"{name:40} {json.dumps(r)[:260]}", flush=True)
json.dump(results, open(os.path.join(HERE, f"matrix-{int(time.time())}.json"), "w"), indent=1)
