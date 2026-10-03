// Uses zigbee-herdsman's own SerialPort wrapper (same code path as the ember/zstack adapters).
const {SerialPort} = require("zigbee-herdsman/dist/adapter/serialPort");
const path = process.argv[2];
const port = new SerialPort({path, baudRate: 115200, autoOpen: false});
const t = setTimeout(() => { console.log("SERIAL FAIL timeout"); process.exit(1); }, 5000);
port.open((err) => {
    if (err) { console.log("SERIAL FAIL open", err.message); process.exit(1); }
    port.on("data", (d) => { console.log("SERIAL OK got", JSON.stringify(d.toString())); clearTimeout(t); port.close(() => process.exit(0)); });
    port.write(Buffer.from("ping"));
});
