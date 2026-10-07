import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { after, before, test } from "node:test";

process.env.FAMILY_CODE ||= "test-family-code";
process.env.SYNC_TOKEN ||= "test-sync-token";
process.env.GALLERY_PASSWORD_HASH ||= "test-password-hash";
process.env.SESSION_SECRET ||= "test-session-secret";

const { createUploadStorage } = await import("../utils/upload-storage.js");
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "dgp-upload-test-"));
const photosDir = path.join(tempRoot, "photos");
const videosDir = path.join(tempRoot, "videos");

await fs.mkdir(photosDir);
await fs.mkdir(videosDir);

const jpegSignature = Buffer.from(
    "ffd8ffe000104a46494600010100000100010000",
    "hex"
);
const pngSignature = Buffer.from("89504e470d0a1a0a", "hex");
const mp4Header = Buffer.alloc(24);
mp4Header.writeUInt32BE(24, 0);
mp4Header.write("ftyp", 4);
mp4Header.write("isom", 8);
mp4Header.write("isom", 16);

function runStorage(storage, { chunks, mimetype, originalname }) {
    const req = {};
    const file = {
        stream: Readable.from(chunks),
        mimetype,
        originalname,
    };

    return new Promise((resolve, reject) => {
        storage._handleFile(req, file, (error, storedFile) => {
            if (error) {
                reject(error);
                return;
            }

            resolve(storedFile);
        });
    });
}

async function filesIn(directory) {
    return fs.readdir(directory);
}

before(() => {
    assert.ok(photosDir.startsWith(tempRoot));
});

after(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
});

test("recognizes a photo even when its stream arrives in small chunks", async () => {
    const contents = Buffer.concat([jpegSignature, Buffer.alloc(5000, 7)]);
    const chunks = [];

    for (let offset = 0; offset < contents.length; offset += 127) {
        chunks.push(contents.subarray(offset, offset + 127));
    }

    const storage = createUploadStorage({ photosDir, videosDir });
    const saved = await runStorage(storage, {
        chunks,
        mimetype: "image/jpeg",
        originalname: "photo.jpg",
    });

    assert.equal(saved.size, contents.length);
    assert.deepEqual(await fs.readFile(saved.path), contents);
    await fs.unlink(saved.path);
});

test("accepts a video using its detected signature", async () => {
    const storage = createUploadStorage({ photosDir, videosDir });
    const saved = await runStorage(storage, {
        chunks: [mp4Header.subarray(0, 5), mp4Header.subarray(5)],
        mimetype: "video/mp4",
        originalname: "video.mp4",
    });

    assert.equal(saved.size, mp4Header.length);
    assert.deepEqual(await fs.readFile(saved.path), mp4Header);
    await fs.unlink(saved.path);
});

test("rejects a large photo whose client claims it is a video", async () => {
    const contents = Buffer.alloc(20 * 1024 * 1024 + 1, 0);
    pngSignature.copy(contents);
    const storage = createUploadStorage({ photosDir, videosDir });

    await assert.rejects(
        runStorage(storage, {
            chunks: [contents],
            mimetype: "video/mp4",
            originalname: "photo.mp4",
        }),
        { code: "INVALID_FILE_TYPE" }
    );

    assert.deepEqual(await filesIn(videosDir), []);
});

test("enforces the photo limit using the detected image type", async () => {
    const contents = Buffer.alloc(20 * 1024 * 1024 + 1, 0);
    jpegSignature.copy(contents);
    const storage = createUploadStorage({ photosDir, videosDir });

    await assert.rejects(
        runStorage(storage, {
            chunks: [contents],
            mimetype: "image/jpeg",
            originalname: "large-photo.jpg",
        }),
        { code: "LIMIT_FILE_SIZE" }
    );

    assert.deepEqual(await filesIn(photosDir), []);
});

test("enforces the total upload limit while streaming", async () => {
    const storage = createUploadStorage({
        photosDir,
        videosDir,
        maxTotalSize: 100,
    });

    await assert.rejects(
        runStorage(storage, {
            chunks: [Buffer.concat([jpegSignature, Buffer.alloc(100)])],
            mimetype: "image/jpeg",
            originalname: "over-total-limit.jpg",
        }),
        { code: "LIMIT_FILE_SIZE" }
    );

    assert.deepEqual(await filesIn(photosDir), []);
});
