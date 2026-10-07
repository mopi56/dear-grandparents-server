import fs from "fs";
import path from "path";
import crypto from "crypto";

import { config } from "../config/config.js";

let metadataUpdateQueue = Promise.resolve();

export function readMetadata() {
    try {
        const data = JSON.parse(fs.readFileSync(config.paths.metadata, "utf8"));

        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

export function writeMetadata(metadata) {
    const metadataPath = config.paths.metadata;
    const temporaryPath = path.join(
        path.dirname(metadataPath),
        `.${path.basename(metadataPath)}.${process.pid}.${crypto.randomUUID()}.tmp`
    );

    try {
        fs.writeFileSync(temporaryPath, JSON.stringify(metadata, null, 2), {
            flag: "wx",
        });
        fs.renameSync(temporaryPath, metadataPath);
    } catch (error) {
        try {
            fs.unlinkSync(temporaryPath);
        } catch (cleanupError) {
            if (cleanupError.code !== "ENOENT") {
                error.cleanupError = cleanupError;
            }
        }

        throw error;
    }
}

/**
 * Ajoute des éléments sans perdre les écritures concurrentes
 * effectuées dans ce processus.
 */
export function appendMetadata(items) {
    const update = metadataUpdateQueue.then(() => {
        const metadata = readMetadata();
        metadata.push(...items);
        writeMetadata(metadata);
    });

    // Une erreur sur une mise à jour ne doit pas bloquer les suivantes.
    metadataUpdateQueue = update.catch(() => {});

    return update;
}

/**
 * Retourne les metadata dans l'ordre
 * chronologique des uploads.
 */
export function getSortedMetadata() {
    const metadata = readMetadata();

    metadata.sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));

    return metadata;
}
