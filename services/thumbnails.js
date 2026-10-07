import fs from "fs";
import path from "path";

import sharp from "sharp";
import { execFile } from "child_process";
import { promisify } from "util";

import { config } from "../config/config.js";
import { readMetadata } from "./metadata.js";

import { getThumbnailPath, getMediaPath } from "../utils/paths.js";

const execFileAsync = promisify(execFile);

/**
 * Retourne le chemin du thumbnail correspondant
 * à un fichier média.
 */

/**
 * Retourne le chemin du média en fonction de son type.
 */

/**
 * Vérifie si le thumbnail existe déjà.
 */
export function thumbnailExists(filename) {
    return fs.existsSync(getThumbnailPath(filename));
}

/**
 * Génère le thumbnail d'une image.
 */
async function generatePhotoThumbnail(sourcePath, thumbnailPath) {
    await sharp(sourcePath)
        .rotate()
        .resize({
            width: config.thumbnails.width,
            height: config.thumbnails.height,
            fit: "cover",
        })
        .jpeg({
            quality: 82,
            progressive: true,
        })
        .toFile(thumbnailPath);
}

/**
 * Génère le thumbnail d'une vidéo.
 *
 * On essaie d'abord à 1 seconde afin d'éviter
 * une éventuelle frame noire au début de la vidéo.
 *
 * Si la vidéo dure moins d'une seconde,
 * on retente avec la première frame.
 */
async function generateVideoThumbnail(sourcePath, thumbnailPath) {
    const videoFilter = `scale=${config.thumbnails.width}:${config.thumbnails.height}:force_original_aspect_ratio=decrease`;

    try {
        await execFileAsync(
            "ffmpeg",
            [
                "-y",
                "-ss",
                "00:00:01",
                "-i",
                sourcePath,
                "-frames:v",
                "1",
                "-vf",
                videoFilter,
                "-q:v",
                "3",
                thumbnailPath,
            ],
            {
                timeout: 30_000,
                killSignal: "SIGKILL",
            }
        );

        return;
    } catch {
        try {
            await execFileAsync(
                "ffmpeg",
                [
                    "-y",
                    "-i",
                    sourcePath,
                    "-frames:v",
                    "1",
                    "-vf",
                    videoFilter,
                    "-q:v",
                    "3",
                    thumbnailPath,
                ],
                {
                    timeout: 30_000,
                    killSignal: "SIGKILL",
                }
            );
        } catch (secondError) {
            throw new Error(
                `FFmpeg impossible pour ${path.basename(
                    sourcePath
                )} : ${secondError.message}`,
                {
                    cause: secondError,
                }
            );
        }
    }
}

/**
 * Génère le thumbnail correspondant à un média.
 */
export async function generateThumbnail(item) {
    const sourcePath = getMediaPath(item.filename, item.type);

    const thumbnailPath = getThumbnailPath(item.filename);

    if (!sourcePath) {
        throw new Error(`Type de média inconnu : ${item.type}`);
    }

    if (!fs.existsSync(sourcePath)) {
        throw new Error(`Fichier source introuvable : ${item.filename}`);
    }

    if (item.type === "photo") {
        await generatePhotoThumbnail(sourcePath, thumbnailPath);
    } else if (item.type === "video") {
        await generateVideoThumbnail(sourcePath, thumbnailPath);
    } else {
        throw new Error(`Type de média inconnu : ${item.type}`);
    }

    return thumbnailPath;
}

/**
 * Vérifie tous les médias présents dans metadata.json
 * et génère les thumbnails manquants.
 */
export async function checkAndGenerateMissingThumbnails() {
    console.log("==========================================");

    console.log("Vérification des thumbnails...");

    console.log("==========================================");

    const metadata = readMetadata();

    let alreadyPresent = 0;
    let generated = 0;
    let errors = 0;

    for (const item of metadata) {
        if (!item.filename || !item.type) {
            console.warn("Métadonnée invalide, thumbnail ignoré :", item);

            continue;
        }

        if (thumbnailExists(item.filename)) {
            alreadyPresent++;

            continue;
        }

        console.log(`Thumbnail manquant : ${item.filename}`);

        try {
            await generateThumbnail(item);

            generated++;

            console.log(`✓ Thumbnail généré : ${item.filename}`);
        } catch (error) {
            errors++;

            console.error(
                `✗ Impossible de générer le thumbnail pour ${item.filename}:`,
                error.message
            );
        }
    }

    console.log("==========================================");

    console.log(`Thumbnails déjà présents : ${alreadyPresent}`);

    console.log(`Thumbnails générés        : ${generated}`);

    console.log(`Erreurs                   : ${errors}`);

    console.log("Vérification terminée.");

    console.log("==========================================");
}
