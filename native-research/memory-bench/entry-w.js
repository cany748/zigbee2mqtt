import "./workload.js";
import * as zhc from "/home/user/zigbee2mqtt/node_modules/zigbee-herdsman-converters/dist/index.js";
import * as ikea from "/home/user/zigbee2mqtt/node_modules/zigbee-herdsman-converters/dist/devices/ikea.js";
import * as philips from "/home/user/zigbee2mqtt/node_modules/zigbee-herdsman-converters/dist/devices/philips.js";
import * as tuya from "/home/user/zigbee2mqtt/node_modules/zigbee-herdsman-converters/dist/devices/tuya.js";
import * as sonoff from "/home/user/zigbee2mqtt/node_modules/zigbee-herdsman-converters/dist/devices/sonoff.js";
import * as lumi from "/home/user/zigbee2mqtt/node_modules/zigbee-herdsman-converters/dist/devices/lumi.js";
globalThis.__mods = [ikea, philips, tuya, sonoff, lumi];
