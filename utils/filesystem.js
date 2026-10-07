import fs from "fs";

import { config } from "../config/config.js";
import { getThumbnailPath } from "./paths.js";

/**
 * Crée les répertoires nécessaires à l'application.
 */
export function ensureDirectories() {
    const directories = [
        config.paths.data,
        config.paths.upload,
        config.paths.photos,
        config.paths.videos,
        config.paths.thumbnails,
        config.paths.private,
    ];

    for (const dir of directories) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, {
                recursive: true,
            });
        }
    }
}

/**
 * Initialise metadata.json s'il n'existe pas.
 */
export function ensureMetadataFile() {
    if (!fs.existsSync(config.paths.metadata)) {
        fs.writeFileSync(config.paths.metadata, "[]");
    }
}

/**
 * Supprime les fichiers uploadés ainsi que
 * leurs thumbnails associés.
 */
export function cleanUploadedFiles(files) {
    for (const file of files) {
        try {
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }

            const thumbnailPath = getThumbnailPath(file.filename);

            if (fs.existsSync(thumbnailPath)) {
                fs.unlinkSync(thumbnailPath);
            }
        } catch (err) {
            console.error("Impossible de supprimer", file.path, err);
        }
    }
}
