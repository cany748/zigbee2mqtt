import os, re, shutil, subprocess, sys
env_kv, argv = sys.argv[1], sys.argv[2:]
env = dict(kv.split("=", 1) for kv in env_kv.split(",") if kv)
d = "/tmp/claude-0/z2m-cpu"; shutil.rmtree(d, ignore_errors=True); shutil.copytree("data-template", d)
c = open(f"{d}/configuration.yaml").read().replace("port: 18080", "port: 18120"); open(f"{d}/configuration.yaml", "w").write(c)
p = subprocess.Popen(argv + [d, "60", "50"], env={**os.environ, **env}, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
out = p.stdout.read().decode(errors="replace"); _, st, ru = os.wait4(p.pid, 0)
m = re.search(r"RESULT (\{.*\})", out)
print(f"{' '.join(argv)[:40]:40} env={env_kv:22} cpu_user={ru.ru_utime:.1f}s cpu_sys={ru.ru_stime:.1f}s", m.group(1)[:90] if m else out[-150:])
