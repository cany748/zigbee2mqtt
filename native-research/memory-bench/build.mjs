import * as esbuild from "esbuild";
import {builtinModules} from "node:module";
const stubbed = new Set([...builtinModules, ...builtinModules.map((m) => "node:" + m)]);
await esbuild.build({
  entryPoints: ["entry.js"], bundle: true, format: "iife", platform: "neutral", outfile: "zhc-bundle.js", inject: ["shims.js"],
  mainFields: ["main", "module"], logLevel: "warning", metafile: true, nodePaths: ["/home/user/zigbee2mqtt/node_modules"],
  plugins: [{name: "stub", setup(b) {
    b.onResolve({filter: /.*/}, (a) => {
      const p = a.path.replace(/^node:/, "");
      if (stubbed.has(a.path) && p !== "buffer" && p !== "assert" && p !== "util") return {path: "/home/user/native/qjs-bench/stub.cjs"};
      if (p === "assert") return {path: "/home/user/native/qjs-bench/assert.cjs"};
      if (p === "util") return {path: "/home/user/native/qjs-bench/util.cjs"};
      if (p === "buffer") return {path: "/home/user/native/qjs-bench/node_modules/buffer/index.js"};
      if (a.path === "zigbee-herdsman") return {path: "/home/user/native/qjs-bench/herdsman-slim.cjs"};
      if (/@serialport|controller\/(controller|helpers\/ota)|adapter\//.test(a.path) && a.path !== "zigbee-herdsman") return {path: "/home/user/native/qjs-bench/stub.cjs"};
      if (/@serialport|serialport|zigbee-on-host|bonjour|unix-dgram|^mqtt|^ws$|winston/.test(a.path)) return {path: "/home/user/native/qjs-bench/stub.cjs"};
    });
  }}],
});
