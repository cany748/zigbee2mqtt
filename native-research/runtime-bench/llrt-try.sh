L=/home/user/engines/llrt/target/x86_64-unknown-linux-gnu/release/llrt
cd /home/user/zigbee2mqtt/native-research/runtime-bench
sed '16s/.*/var __commonJS = (cb, mod) => function __require() { if (!mod) globalThis.__last = Object.keys(cb)[0];/' llrt-bundle/fake-run.cjs > llrt-bundle/dbg2.cjs
(cat shims/llrt-polyfill.cjs; echo 'try {'; cat llrt-bundle/dbg2.cjs; echo '} catch (e) { console.log("TOPLEVEL", String(e), "LAST", globalThis.__last); }') > llrt-bundle/dbg.cjs
rm -rf /tmp/claude-0/z2m-ll && cp -r data-template /tmp/claude-0/z2m-ll && sed -i 's/port: 18080/port: 18093/' /tmp/claude-0/z2m-ll/configuration.yaml
timeout ${T:-40} $L llrt-bundle/dbg.cjs /tmp/claude-0/z2m-ll ${S:-10} 20 2>&1 | grep -vE "^\s+at " | head -${N:-8} | cut -c1-300
