import fs from "fs";

import { getMediaPath, getThumbnailPath } from "../utils/paths.js";

/**
 * Détermine si un fichier est une photo.
 */
function isPhotoFilename(filename) {
    return /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(filename);
}

/**
 * Retourne le chemin complet d'un média.
 *
 * Retourne null si le fichier n'existe pas.
 */
export function findMediaFile(filename) {
    const type = isPhotoFilename(filename) ? "photo" : "video";

    const filePath = getMediaPath(filename, type);

    if (!filePath) {
        return null;
    }

    if (!fs.existsSync(filePath)) {
        return null;
    }

    return {
        path: filePath,
        type,
    };
}

/**
 * Retourne le chemin complet d'un thumbnail.
 *
 * Retourne null si le fichier n'existe pas.
 */
export function findThumbnailFile(filename) {
    const filePath = getThumbnailPath(filename);

    if (!fs.existsSync(filePath)) {
        return null;
    }

    return filePath;
}
