import crypto from "crypto";
import fs from "fs";
import path from "path";
import { unlink } from "fs/promises";
import { Transform } from "stream";
import { pipeline } from "stream/promises";
import { fileTypeFromBuffer } from "file-type";

import { config } from "../config/config.js";

const FILE_TYPE_SNIFF_BYTES = 4100;

function createUploadError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

/**
 * Creates a Multer storage engine that checks file signatures
 * before writing file content to disk.
 */
export function createUploadStorage({
    photosDir = config.paths.photos,
    videosDir = config.paths.videos,
    maxPhotoSize = config.upload.maxPhotoSize,
    maxVideoSize = config.upload.maxVideoSize,
    maxTotalSize = config.upload.maxTotalSize,
} = {}) {
    return {
        _handleFile(req, file, cb) {
            const isPhoto = file.mimetype.startsWith("image/");
            const destination = isPhoto ? photosDir : videosDir;
            const filename =
                crypto.randomUUID() +
                path.extname(file.originalname).toLowerCase();
            const filePath = path.join(destination, filename);
            let fileSize = 0;
            let maxFileSize;
            let typeIdentified = false;
            let sniffedBytes = 0;
            let sniffBufferParts = [];

            const identifyFileType = async () => {
                const detected = await fileTypeFromBuffer(
                    Buffer.concat(sniffBufferParts, sniffedBytes)
                );

                if (
                    !detected ||
                    detected.mime !== file.mimetype ||
                    (!detected.mime.startsWith("image/") &&
                        !detected.mime.startsWith("video/"))
                ) {
                    throw createUploadError(
                        "INVALID_FILE_TYPE",
                        "Le contenu du fichier ne correspond pas à son type déclaré."
                    );
                }

                maxFileSize = detected.mime.startsWith("image/")
                    ? maxPhotoSize
                    : maxVideoSize;
                typeIdentified = true;

                if (fileSize > maxFileSize) {
                    throw createUploadError(
                        "LIMIT_FILE_SIZE",
                        "La taille maximale autorisée pour ce type de fichier est dépassée."
                    );
                }
            };

            const sizeLimiter = new Transform({
                transform(chunk, _encoding, callback) {
                    const nextTotalSize = (req.uploadBytes || 0) + chunk.length;

                    if (nextTotalSize > maxTotalSize) {
                        callback(
                            createUploadError(
                                "LIMIT_FILE_SIZE",
                                "La taille maximale cumulée par requête est dépassée."
                            )
                        );
                        return;
                    }

                    fileSize += chunk.length;
                    req.uploadBytes = nextTotalSize;

                    if (typeIdentified) {
                        if (fileSize > maxFileSize) {
                            callback(
                                createUploadError(
                                    "LIMIT_FILE_SIZE",
                                    "La taille maximale autorisée pour ce type de fichier est dépassée."
                                )
                            );
                            return;
                        }

                        callback(null, chunk);
                        return;
                    }

                    const bytesNeeded = FILE_TYPE_SNIFF_BYTES - sniffedBytes;
                    const sniffPart = chunk.subarray(0, bytesNeeded);
                    const remainingPart = chunk.subarray(sniffPart.length);
                    sniffBufferParts.push(sniffPart);
                    sniffedBytes += sniffPart.length;

                    if (sniffedBytes < FILE_TYPE_SNIFF_BYTES) {
                        callback(null, Buffer.alloc(0));
                        return;
                    }

                    identifyFileType().then(() => {
                        const sniffedContent = Buffer.concat(
                            sniffBufferParts,
                            sniffedBytes
                        );
                        sniffBufferParts = [];
                        callback(
                            null,
                            Buffer.concat([sniffedContent, remainingPart])
                        );
                    }, callback);
                },

                flush(callback) {
                    if (typeIdentified) {
                        callback();
                        return;
                    }

                    identifyFileType().then(() => {
                        const sniffedContent = Buffer.concat(
                            sniffBufferParts,
                            sniffedBytes
                        );
                        sniffBufferParts = [];
                        this.push(sniffedContent);
                        callback();
                    }, callback);
                },
            });

            pipeline(file.stream, sizeLimiter, fs.createWriteStream(filePath))
                .then(() => {
                    cb(null, {
                        destination,
                        filename,
                        path: filePath,
                        size: fileSize,
                    });
                })
                .catch(async (error) => {
                    try {
                        await unlink(filePath);
                    } catch (unlinkError) {
                        if (unlinkError.code !== "ENOENT") {
                            error.cleanupError = unlinkError;
                        }
                    }

                    cb(error);
                });
        },

        _removeFile(_req, file, cb) {
            unlink(file.path).then(() => cb(null), cb);
        },
    };
}
