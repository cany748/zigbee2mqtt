// Single-file esbuild bundle of fake-run + z2m + deps, with zhc device modules wired statically (same as bun-build.mjs).
import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
const ZHC = fs.realpathSync("/home/user/zigbee2mqtt/node_modules/zigbee-herdsman-converters/dist");
const devices = fs.readdirSync(path.join(ZHC, "devices")).filter((f) => f.endsWith(".js") && f !== "index.js");
await esbuild.build({
    entryPoints: ["fake-run.cjs"], bundle: true, platform: "node", format: "cjs", outfile: "node-bundle/fake-run.cjs", logLevel: "warning",
    external: ["@serialport/*", "unix-dgram", "zigbee2mqtt-windfront", "zigbee2mqtt-frontend"],
    plugins: [{name: "static-zhc-devices", setup(b) {
        b.onLoad({filter: /zigbee-herdsman-converters\/dist\/index\.js$/}, async (a) => {
            let src = await fs.promises.readFile(a.path, "utf8");
            const needle = "Promise.resolve(`${`./devices/${moduleName.slice(0, -3)}`}`).then(s => __importStar(require(s)))";
            if (!src.includes(needle)) throw new Error("pattern not found");
            src = src.replace(needle, "Promise.resolve(__importStar(__zhcDevice(moduleName.slice(0, -3))))");
            src += `\nfunction __zhcDevice(n) { switch (n) {\n${devices.map((f) => `case ${JSON.stringify(f.slice(0, -3))}: return require("./devices/${f.slice(0, -3)}");`).join("\n")}\n} throw new Error("unknown " + n); }\n`;
            return {contents: src, loader: "js", resolveDir: path.dirname(a.path)};
        });
    }}],
});
