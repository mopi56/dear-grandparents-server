import path from "path";

import { config } from "../config/config.js";

import { sanitizeText } from "../utils/validation.js";

import { cleanUploadedFiles } from "../utils/filesystem.js";

import { generateThumbnail } from "./thumbnails.js";

import { appendMetadata } from "./metadata.js";

import { validateUploadedFile } from "../utils/file-validation.js";

/**
 * Traite les fichiers uploadés.
 *
 * Cette fonction contient la logique métier de l'upload.
 * Elle ne dépend pas d'Express.
 */
export async function processUpload(files, data) {
    const code = sanitizeText(data.code, 100);

    const sender = sanitizeText(data.sender, config.upload.maxSenderLength);

    const comment = sanitizeText(data.comment, config.upload.maxCommentLength);

    /*
     * Vérification du code famille
     */
    if (code !== config.auth.familyCode) {
        cleanUploadedFiles(files);

        return {
            success: false,
            status: 403,
            error: "Code famille incorrect",
        };
    }

    /*
     * Vérification de la présence de fichiers
     */
    if (!files.length) {
        return {
            success: false,
            status: 400,
            error: "Aucun fichier reçu",
        };
    }

    /*
     * Vérification des fichiers
     *
     * On vérifie :
     * - la taille
     * - le type réel du fichier
     * - la cohérence entre le MIME déclaré et le fichier réel
     */
    const invalidFiles = [];
    const validatedFiles = [];

    for (const file of files) {
        const isDeclaredPhoto = file.mimetype.startsWith("image/");
        const isDeclaredVideo = file.mimetype.startsWith("video/");

        if (isDeclaredPhoto && file.size > config.upload.maxPhotoSize) {
            invalidFiles.push(`${file.originalname} dépasse 20 Mo`);
            continue;
        }

        if (isDeclaredVideo && file.size > config.upload.maxVideoSize) {
            invalidFiles.push(`${file.originalname} dépasse 1 Go`);
            continue;
        }

        const validation = await validateUploadedFile(file);

        if (!validation.valid) {
            invalidFiles.push(`${file.originalname} : ${validation.error}`);
            continue;
        }

        /*
         * On conserve le résultat de la validation afin
         * de ne pas analyser le fichier une seconde fois.
         */
        validatedFiles.push({
            file,
            validation,
        });
    }

    if (invalidFiles.length) {
        cleanUploadedFiles(files);

        return {
            success: false,
            status: 400,
            error: invalidFiles.join("\n"),
        };
    }

    const newMetadata = [];

    /*
     * Traitement de chaque fichier validé
     */
    for (const { file, validation } of validatedFiles) {
        const type = validation.type;

        const id = path.basename(file.filename, path.extname(file.filename));

        const item = {
            id,
            type,
            filename: file.filename,
            thumbnail: `${id}.jpg`,
            sender: sender || "Anonyme",
            comment: comment || "",
            uploadedAt: new Date().toISOString(),
            size: file.size,
            mime: validation.mime,
        };

        /*
         * Génération du thumbnail
         */
        await generateThumbnail(item);

        /*
         * Ajout aux metadata
         */
        newMetadata.push(item);
    }

    await appendMetadata(newMetadata);

    return {
        success: true,
        files: validatedFiles.length,
    };
}
