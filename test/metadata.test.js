import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "dgp-metadata-test-"));

process.env.DATA_DIR = tempRoot;
process.env.FAMILY_CODE ||= "test-family-code";
process.env.SYNC_TOKEN ||= "test-sync-token";
process.env.GALLERY_PASSWORD_HASH ||= "test-password-hash";
process.env.SESSION_SECRET ||= "test-session-secret";

const { appendMetadata, readMetadata } =
    await import("../services/metadata.js");

after(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
});

test("serializes concurrent metadata appends without dropping entries", async () => {
    const updates = Array.from({ length: 40 }, (_, index) =>
        appendMetadata([{ id: `item-${index}` }])
    );

    await Promise.all(updates);

    const metadata = readMetadata();
    const ids = new Set(metadata.map((item) => item.id));

    assert.equal(metadata.length, 40);
    assert.equal(ids.size, 40);
});

test("writes metadata as valid JSON through atomic replacement", async () => {
    const metadataPath = path.join(tempRoot, "metadata.json");
    const contents = await fs.readFile(metadataPath, "utf8");

    assert.deepEqual(JSON.parse(contents), readMetadata());
    assert.deepEqual(
        (await fs.readdir(tempRoot)).filter((name) => name.endsWith(".tmp")),
        []
    );
});
