import "dotenv/config";

import crypto from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(crypto.scrypt);

const password = process.env.GALLERY_PASSWORD;

if (!password) {
    console.error("Erreur : GALLERY_PASSWORD est absent du fichier .env");

    process.exit(1);
}

const N = 65536;
const r = 8;
const p = 1;

const salt = crypto.randomBytes(16);

const keyLength = 64;

const derivedKey = await scryptAsync(password, salt, keyLength, {
    N,
    r,
    p,
    maxmem: 128 * 1024 * 1024,
});

const hash = [
    "scrypt",
    N,
    r,
    p,
    salt.toString("hex"),
    Buffer.from(derivedKey).toString("hex"),
].join("$");

console.log("");
console.log("GALLERY_PASSWORD_HASH=");
console.log(hash);
console.log("");
