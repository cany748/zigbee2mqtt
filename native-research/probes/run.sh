#!/bin/bash
# usage: run.sh <compiler> ; builds each probe, runs it, diffs against node output
C=$1; T=/home/user/native/tools; export PATH=$T/node24/bin:$PATH
mkdir -p out/$C bin/$C
for p in p*.ts; do n=${p%.ts}; b=bin/$C/$n; log=out/$C/$n.build.txt
  case $C in
    scriptc) timeout 600 $T/node_modules/.bin/scriptc build $p -o $b >$log 2>&1 ;;
    scriptc-dyn) timeout 600 $T/node_modules/.bin/scriptc build $p --dynamic -o $b >$log 2>&1 ;;
    perry) timeout 900 $T/node_modules/.bin/perry compile $p -o $b >$log 2>&1 ;;
    porffor) timeout 600 $T/node_modules/.bin/porf native -t $p -o $b >$log 2>&1 ;;
    geatsc) d=bin/$C/$n.d; rm -rf $d; timeout 900 $T/node_modules/.bin/geatsc $p --no-project --emit >$log 2>&1; ;;
    tslang) timeout 600 /home/user/native/TypeScriptCompiler/__build/tslang/bin/tslang --emit=exe $p -o=$b >$log 2>&1 ;;
  esac
  brc=$?
  if [ -x $b ]; then timeout 20 $b > out/$C/$n.txt 2>&1; rrc=$?
     if diff -q out/$C/$n.txt out/node/$n.txt >/dev/null; then r=PASS; else r="DIFF(rc=$rrc)"; fi
  else r="BUILD_FAIL(rc=$brc)"; fi
  echo "$C $n $r"
done
