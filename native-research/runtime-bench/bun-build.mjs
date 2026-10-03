// usage: bun bun-build.mjs <outdir> <static-devices:0|1> [compile:0|1]
import fs from "node:fs";
import path from "node:path";
const [outdir, staticDevices = "1", compile = "0"] = process.argv.slice(2);
const ZHC = fs.realpathSync("/home/user/zigbee2mqtt/node_modules/zigbee-herdsman-converters/dist");
const devices = fs.readdirSync(path.join(ZHC, "devices")).filter((f) => f.endsWith(".js") && f !== "index.js");
const external = ["@serialport/*", "unix-dgram", "zigbee2mqtt-windfront", "zigbee2mqtt-frontend"];
if (staticDevices !== "1") external.push("zigbee-herdsman-converters");
const shimPlugin = {name: "compile-shims", setup(b) {
    b.onResolve({filter: /^@serialport\/bindings-cpp$/}, () => ({path: path.resolve("shims/serialport-bindings.cjs")}));
    b.onResolve({filter: /^zigbee2mqtt-windfront$/}, () => ({path: path.resolve("shims/windfront.cjs")}));
}};
const plugins = staticDevices === "1" ? [{
    name: "static-zhc-devices",
    setup(b) {
        b.onLoad({filter: /zigbee-herdsman-converters\/dist\/index\.js$/}, async (a) => {
            let src = await Bun.file(a.path).text();
            const needle = "Promise.resolve(`${`./devices/${moduleName.slice(0, -3)}`}`).then(s => __importStar(require(s)))";
            if (!src.includes(needle)) throw new Error("dynamic import pattern not found");
            const cases = devices.map((f) => `case ${JSON.stringify(f.slice(0, -3))}: return require("./devices/${f.slice(0, -3)}");`).join("\n");
            src = src.replace(needle, "Promise.resolve(__importStar(__zhcDevice(moduleName.slice(0, -3))))");
            src += `\nfunction __zhcDevice(n) { switch (n) {\n${cases}\n} throw new Error("unknown device module " + n); }\n`;
            return {contents: src, loader: "js"};
        });
    },
}] : [];
if (compile === "1") { plugins.push(shimPlugin); external.splice(0, external.length, "unix-dgram", "zigbee2mqtt-frontend"); }
const r = await Bun.build({
    entrypoints: ["fake-run.cjs"], outdir, target: "bun", format: "cjs", bytecode: true, external, plugins,
    ...(compile === "1" ? {compile: {outfile: path.join(outdir, "z2m-fake")}} : {}),
});
if (!r.success) { console.error(r.logs); process.exit(1); }
for (const o of r.outputs) console.log(o.path, (o.size / 1048576).toFixed(1), "MB");
