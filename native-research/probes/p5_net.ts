// TCP: MQTT broker connection and network coordinators (ember/zstack over TCP)
import * as net from "node:net";
const server = net.createServer((sock) => {
    sock.on("data", (d) => { sock.write(Buffer.concat([Buffer.from("echo:"), d])); });
});
server.listen(0, "127.0.0.1", () => {
    const addr = server.address() as net.AddressInfo;
    const cli = net.connect(addr.port, "127.0.0.1", () => { cli.write(Buffer.from("ping")); });
    cli.on("data", (d) => { console.log("client got", d.toString()); cli.end(); server.close(); });
    cli.on("error", (e) => console.log("err", e.message));
});
