import subprocess, sys, time
p = subprocess.Popen(sys.argv[1:], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
mx = {"RssAnon": 0, "RssFile": 0, "VmRSS": 0}
while p.poll() is None:
    try:
        for l in open(f"/proc/{p.pid}/status"):
            k = l.split(":")[0]
            if k in mx: mx[k] = max(mx[k], int(l.split()[1]) // 1024)
    except Exception: pass
    time.sleep(0.005)
print(f"{' '.join(sys.argv[1:])[-60:]:60} peak VmRSS={mx['VmRSS']} anon={mx['RssAnon']} file={mx['RssFile']} MB")
