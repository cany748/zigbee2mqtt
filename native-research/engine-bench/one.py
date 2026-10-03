import os, subprocess, sys, time
t=time.time(); p=subprocess.Popen(sys.argv[1:], stdout=subprocess.PIPE, stderr=subprocess.STDOUT); o=p.stdout.read(); _,st,ru=os.wait4(p.pid,0)
print(f"rss_mb={ru.ru_maxrss/1024:.1f} secs={time.time()-t:.1f}", [l for l in o.decode(errors='replace').splitlines() if l.startswith(("LOADED","WORK"))] or o.decode(errors='replace')[-200:])
