# Creates a pty pair, prints the slave path, echoes everything written by the client back with a prefix.
import os, pty, select, sys, tty
m, s = pty.openpty(); tty.setraw(m); tty.setraw(s)
print(os.ttyname(s), flush=True)
while True:
    r, _, _ = select.select([m], [], [], 30)
    if not r: break
    d = os.read(m, 1024)
    os.write(m, b"echo:" + d)
