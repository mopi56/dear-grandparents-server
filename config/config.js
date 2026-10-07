import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";

// ============================================================
// ENV
// ============================================================

function getRequiredEnv(name) {
    const value = process.env[name];

    if (!value) {
        throw new Error(`Variable d'environnement manquante : ${name}`);
    }

    return value;
}

// ============================================================
// PATHS
// ============================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// config/ -> projet/
const ROOT_DIR = path.join(__dirname, "..");

const UPLOAD_DIR = path.join(ROOT_DIR, "uploads");
const PHOTO_DIR = path.join(UPLOAD_DIR, "photos");
const VIDEO_DIR = path.join(UPLOAD_DIR, "videos");
const THUMBNAIL_DIR = path.join(UPLOAD_DIR, "thumbnails");

const DATA_DIR = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : ROOT_DIR;
const META_FILE = path.join(DATA_DIR, "metadata.json");

const PUBLIC_DIR = path.join(ROOT_DIR, "public");

const PRIVATE_DIR = path.join(ROOT_DIR, "private");

// ============================================================
// SERVER
// ============================================================

const PORT = 3000;

// ============================================================
// AUTHENTICATION
// ============================================================

const FAMILY_CODE = getRequiredEnv("FAMILY_CODE");
const SYNC_TOKEN = getRequiredEnv("SYNC_TOKEN");
const GALLERY_PASSWORD_HASH = getRequiredEnv("GALLERY_PASSWORD_HASH");
const SESSION_SECRET = getRequiredEnv("SESSION_SECRET");
const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";
// Durée d'une session navigateur : 12 heures
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

// ============================================================
// UPLOAD LIMITS
// ============================================================

const MAX_PHOTO_SIZE = 20 * 1024 * 1024;
const MAX_VIDEO_SIZE = 1000 * 1024 * 1024;
const MAX_TOTAL_UPLOAD_SIZE = 1000 * 1024 * 1024;

const MAX_FILES = 100;

const MAX_COMMENT_LENGTH = 500;
const MAX_SENDER_LENGTH = 50;

// ============================================================
// THUMBNAILS
// ============================================================

const THUMBNAIL_WIDTH = 500;
const THUMBNAIL_HEIGHT = 500;

// ============================================================
// EXPORT
// ============================================================

export const config = {
    server: {
        port: PORT,
    },

    auth: {
        familyCode: FAMILY_CODE,
        syncToken: SYNC_TOKEN,
        galleryPasswordHash: GALLERY_PASSWORD_HASH,
        sessionSecret: SESSION_SECRET,
        sessionTtlMs: SESSION_TTL_MS,
        cookieSecure: COOKIE_SECURE,
    },

    upload: {
        maxPhotoSize: MAX_PHOTO_SIZE,
        maxVideoSize: MAX_VIDEO_SIZE,
        maxTotalSize: MAX_TOTAL_UPLOAD_SIZE,
        maxFiles: MAX_FILES,
        maxCommentLength: MAX_COMMENT_LENGTH,
        maxSenderLength: MAX_SENDER_LENGTH,
    },

    thumbnails: {
        width: THUMBNAIL_WIDTH,
        height: THUMBNAIL_HEIGHT,
    },

    paths: {
        root: ROOT_DIR,
        data: DATA_DIR,
        upload: UPLOAD_DIR,
        photos: PHOTO_DIR,
        videos: VIDEO_DIR,
        thumbnails: THUMBNAIL_DIR,
        metadata: META_FILE,
        public: PUBLIC_DIR,
        private: PRIVATE_DIR,
    },
};
