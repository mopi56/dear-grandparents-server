import crypto from "crypto";
import { promisify } from "util";

import { config } from "../config/config.js";

const scryptAsync = promisify(crypto.scrypt);

// ============================================================
// PASSWORD
// ============================================================

const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_MAX_MEMORY = 128 * 1024 * 1024;

/**
 * Parse un hash scrypt stocké au format :
 *
 * scrypt$N$r$p$salt$hash
 */
function parsePasswordHash(value) {
    if (typeof value !== "string") {
        return null;
    }

    const parts = value.split("$");

    if (parts.length !== 6) {
        return null;
    }

    const [algorithm, NRaw, rRaw, pRaw, saltHex, hashHex] = parts;

    if (algorithm !== "scrypt") {
        return null;
    }

    const N = Number(NRaw);
    const r = Number(rRaw);
    const p = Number(pRaw);

    if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
        return null;
    }

    if (N <= 1 || (N & (N - 1)) !== 0 || r <= 0 || p <= 0) {
        return null;
    }

    if (!/^[a-f0-9]+$/i.test(saltHex) || !/^[a-f0-9]+$/i.test(hashHex)) {
        return null;
    }

    let salt;
    let hash;

    try {
        salt = Buffer.from(saltHex, "hex");
        hash = Buffer.from(hashHex, "hex");
    } catch {
        return null;
    }

    if (salt.length < 16 || hash.length !== SCRYPT_KEY_LENGTH) {
        return null;
    }

    return {
        N,
        r,
        p,
        salt,
        hash,
    };
}

/**
 * Vérifie un mot de passe contre
 * le hash scrypt configuré.
 */
export async function authenticateGallery(password) {
    if (typeof password !== "string") {
        return false;
    }

    const stored = parsePasswordHash(config.auth.galleryPasswordHash);

    if (!stored) {
        console.error("GALLERY_PASSWORD_HASH est invalide.");
        return false;
    }

    const derivedKey = await scryptAsync(
        password,
        stored.salt,
        SCRYPT_KEY_LENGTH,
        {
            N: stored.N,
            r: stored.r,
            p: stored.p,
            maxmem: SCRYPT_MAX_MEMORY,
        }
    );

    return crypto.timingSafeEqual(Buffer.from(derivedKey), stored.hash);
}

// ============================================================
// SESSION
// ============================================================

function createSessionToken() {
    const expiresAt = Date.now() + config.auth.sessionTtlMs;

    const payload = `${expiresAt}.${crypto.randomBytes(32).toString("hex")}`;

    const signature = crypto
        .createHmac("sha256", config.auth.sessionSecret)
        .update(payload)
        .digest("hex");

    return `${payload}.${signature}`;
}

export function createGallerySession() {
    return createSessionToken();
}

export function isValidSessionToken(token) {
    if (typeof token !== "string") {
        return false;
    }

    const parts = token.split(".");

    if (parts.length !== 3) {
        return false;
    }

    const [expiresAtRaw, nonce, signature] = parts;

    const expiresAt = Number(expiresAtRaw);

    if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
        return false;
    }

    if (!/^[a-f0-9]{64}$/i.test(nonce)) {
        return false;
    }

    if (!/^[a-f0-9]{64}$/i.test(signature)) {
        return false;
    }

    const payload = `${expiresAt}.${nonce}`;

    const expected = crypto
        .createHmac("sha256", config.auth.sessionSecret)
        .update(payload)
        .digest("hex");

    return crypto.timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(expected, "hex")
    );
}

// ============================================================
// FAMILY CODE
// ============================================================

/**
 * Vérifie le code famille fourni par un client d'upload.
 *
 * La comparaison est effectuée à temps constant afin d'éviter
 * une comparaison directe avec === sur un secret.
 */
export function isValidFamilyCode(code) {
    if (typeof code !== "string" || !code || !config.auth.familyCode) {
        return false;
    }

    const provided = Buffer.from(code, "utf8");
    const expected = Buffer.from(config.auth.familyCode, "utf8");

    if (provided.length !== expected.length) {
        return false;
    }

    return crypto.timingSafeEqual(provided, expected);
}

/**
 * Middleware d'authentification du code famille.
 *
 * IMPORTANT :
 * Ce middleware doit être exécuté AVANT Multer.
 *
 * Cela permet de rejeter une requête avant que le multipart
 * contenant potentiellement plusieurs centaines de Mo ou Go
 * ne soit écrit sur disque.
 */
export function requireFamilyCode(req, res, next) {
    const code = req.get("X-Family-Code");

    if (!isValidFamilyCode(code)) {
        return res.status(403).json({
            error: "Code famille incorrect",
        });
    }

    next();
}

// ============================================================
// SYNC TOKEN
// ============================================================

/**
 * Vérifie le token utilisé par le client de synchronisation.
 */
export function isValidSyncToken(token) {
    if (typeof token !== "string") {
        return false;
    }

    if (!token || !config.auth.syncToken) {
        return false;
    }

    const provided = Buffer.from(token, "utf8");
    const expected = Buffer.from(config.auth.syncToken, "utf8");

    if (provided.length !== expected.length) {
        return false;
    }

    return crypto.timingSafeEqual(provided, expected);
}
