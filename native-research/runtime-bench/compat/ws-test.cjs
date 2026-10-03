// Connects to the z2m frontend: HTTP GET / and WebSocket /api, expects bridge/state + device messages.
const http = require("node:http");
const WebSocket = require("ws");
const port = Number(process.argv[2]);
http.get({host: "127.0.0.1", port, path: "/"}, (res) => {
    let n = 0; res.on("data", (d) => (n += d.length)); res.on("end", () => console.log("HTTP", res.statusCode, n, "bytes"));
}).on("error", (e) => console.log("HTTP FAIL", e.message));
const ws = new WebSocket(`ws://127.0.0.1:${port}/api`);
const topics = new Set();
ws.on("message", (m) => { try { topics.add(JSON.parse(m.toString()).topic.split("/")[0]); } catch {} });
ws.on("error", (e) => console.log("WS FAIL", e.message));
setTimeout(() => { console.log("WS topics", topics.size, [...topics].slice(0, 5).join(",")); process.exit(0); }, 4000);
