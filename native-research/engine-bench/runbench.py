#!/usr/bin/env python3
"""Peak-RSS benchmark: run each engine on empty/load/work scripts, 3 runs, median."""
import os, threading, resource, subprocess, sys, time, json, statistics
E = "/home/user/engines"
ENGINES = {
  # name: argv prefix (script path appended), or callable
  "node (V8)":                 ["node"],
  "node + flags":              ["node", "--max-semi-space-size=1", "--lite-mode"],
  "node --jitless":            ["node", "--jitless", "--max-semi-space-size=1"],
  "deno (V8)":                 [f"{E}/node_modules/.bin/deno", "run", "-A", "--quiet"],
  "deno + flags":              [f"{E}/node_modules/.bin/deno", "run", "-A", "--quiet", "--v8-flags=--max-semi-space-size=1,--lite-mode"],
  "bun (JSC)":                 ["bun", "run"],
  "bun --smol (JSC)":          ["bun", "--smol", "run"],
  "quickjs-ng":                ["/home/user/native/quickjs-ng/build/qjs", "--script"],
  "quickjs (Bellard)":         [f"{E}/quickjs/qjs", "--script"],
  "hermes":                    [f"{E}/hbuild/bin/hermes", "-w"],
  "hermes -lazy":              [f"{E}/hbuild/bin/hermes", "-w", "-lazy"],
  "hermes (bytecode .hbc)":    [f"{E}/hbuild/bin/hermes", "{mode}.hbc"],
  "quickjs-ng (bytecode, -ss)": ["/home/user/engines/bench/qjs-{mode}"],
  "xs (Moddable, xst default)": [f"{E}/xst-default", "-s"],
  "xs (Moddable, small heap)": [f"{E}/xst-small", "-s"],
  "escargot":                  [f"{E}/escargot/build/escargot"],
  "jerryscript (ES2017 syntax)": [f"{E}/jerryscript/build-big/bin/jerry"],
  "boa":                       [f"{E}/boa/target/release/boa"],
  "nova":                      ["/home/user/native/nova/target/release/nova_cli", "eval"],
}
only = sys.argv[1:]
res = {}
for name, argv in ENGINES.items():
    if only and not any(o.lower() in name.lower() for o in only): continue
    if not os.path.exists(argv[0].replace("{mode}","load")) and "/" in argv[0]: res[name] = {"error": "not built"}; continue
    row = {}
    for mode in ["empty", "load", "work"]:
        rss, secs, out = [], [], ""
        for _ in range(3):
            t = time.time()
            script = f"{mode}-es2017.js" if "ES2017" in name else f"{mode}.js"
            cmd = [a.replace("{mode}", mode) for a in argv] if any("{mode}" in a for a in argv) else argv + [script]
            p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
            timer = threading.Timer(1800, p.kill); timer.start()
            o = p.stdout.read(); _, st, ru = os.wait4(p.pid, 0); timer.cancel(); p.returncode = st
            secs.append(time.time() - t); out = o.decode(errors="replace")
            rss.append(ru.ru_maxrss / 1024)
            ok = ("EMPTY" in out) if mode == "empty" else ("LOADED" in out and (mode == "load" or "WORK" in out))
            if not ok: break
        row[mode] = {"ok": ok, "out": out.strip().splitlines()[-3:] if not ok else [l for l in out.splitlines() if l.startswith(("LOADED", "WORK"))], "secs": round(statistics.median(secs), 2), "rss_mb": round(statistics.median(rss), 1)}
        if not ok: break
    res[name] = row
    print(name, json.dumps(row)[:400], flush=True)
json.dump(res, open(f"results-{int(time.time())}.json", "w"), indent=1)
