// Binary frame handling as in zigbee-herdsman (ZCL/EZSP/ZNP frames)
const b = Buffer.alloc(8);
b.writeUInt8(0xfe, 0); b.writeUInt16LE(0x1234, 1); b.writeUInt32BE(0xdeadbeef, 3); b.writeInt8(-2, 7);
console.log(b.toString("hex"), b.readUInt16LE(1).toString(16), b.readUInt32BE(3).toString(16), b.readInt8(7));
const c = Buffer.concat([b.subarray(0, 2), Buffer.from([1, 2, 3]), Buffer.from("hi", "utf8")]);
console.log(c.length, c.toString("hex"), Buffer.from("AQID", "base64").toString("hex"));
const bi = Buffer.alloc(8); bi.writeBigUInt64LE(0x00124b0012345678n); console.log(bi.toString("hex"), bi.readBigUInt64LE().toString(16));
let crc = 0; for (const x of c) crc ^= x; console.log("xor", crc);
const dv = new DataView(new ArrayBuffer(4)); dv.setFloat32(0, 1.5, true); console.log(new Uint8Array(dv.buffer).join(","));
console.log(b.equals(Buffer.from(b)), b.indexOf(0x34), Buffer.isBuffer(b));
