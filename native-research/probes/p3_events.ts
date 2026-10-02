import {EventEmitter} from "node:events";
interface Events { message: [topic: string, payload: string]; close: []; }
class Client extends EventEmitter<Events> {
    publish(t: string, p: string): void { this.emit("message", t, p); }
}
const c = new Client();
c.on("message", (t, p) => console.log("got", t, p));
c.once("close", () => console.log("closed once"));
c.publish("zigbee2mqtt/lamp", '{"state":"ON"}');
c.emit("close"); c.emit("close");
console.log("listeners", c.listenerCount("message"));
c.removeAllListeners(); console.log("after", c.listenerCount("message"));
