import * as crypto from "node:crypto";
console.log(crypto.createHash("sha256").update("zigbee").digest("hex"));
console.log(crypto.createHash("md5").update("zigbee").digest("hex"));
console.log(crypto.randomBytes(16).length);
const key = Buffer.alloc(16, 1); const iv = Buffer.alloc(16, 0);
const c = crypto.createCipheriv("aes-128-ecb", key, null); console.log(Buffer.concat([c.update(iv), c.final()]).toString("hex").slice(0, 32));
