/// <reference path="./types/types.d.ts" />
/// <reference path="./types/dom.shim.d.ts" />
/// <reference path="./types/unix-dgram.d.ts" />
/// <reference path="./types/zigbee2mqtt-frontend.d.ts" />
import {Controller} from "./controller";

let controller: Controller | undefined;

async function exit(code: number, restart = false): Promise<void> {
    if (!restart) {
        process.exit(code);
    }
}

async function restart(): Promise<void> {
    await controller?.stop(true);
    await start();
}

async function start(): Promise<void> {
    controller = new Controller(restart, exit);
    await controller.start();
}

process.on("SIGINT", () => void controller?.stop(false));
process.on("SIGTERM", () => void controller?.stop(false));
void start();
