import express from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";

import { config } from "../config/config.js";

import { cleanUploadedFiles } from "../utils/filesystem.js";
import { createUploadStorage } from "../utils/upload-storage.js";

import { processUpload } from "../services/upload.js";
import { requireFamilyCode } from "../services/auth.js";

const router = express.Router();
const uploadRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        error: "Trop de tentatives d'upload. Réessayez plus tard.",
    },
});

// ============================================================
// MULTER
// ============================================================

const storage = createUploadStorage();

const upload = multer({
    storage,

    limits: {
        files: config.upload.maxFiles,
        fileSize: config.upload.maxVideoSize,
        fields: 10,
        fieldSize: 16 * 1024,
        parts: config.upload.maxFiles + 10,
    },

    fileFilter(req, file, cb) {
        if (
            file.mimetype.startsWith("image/") ||
            file.mimetype.startsWith("video/")
        ) {
            return cb(null, true);
        }

        cb(new Error("Format de fichier non supporté"));
    },
});

// ============================================================
// POST /upload
// ============================================================

router.post("/upload", uploadRateLimiter, requireFamilyCode, (req, res) => {
    upload.fields([
        {
            name: "files",
            maxCount: config.upload.maxFiles,
        },
    ])(req, res, async (err) => {
        const files = req.files?.files || [];

        // ====================================================
        // ERREUR MULTER
        // ====================================================

        if (err) {
            cleanUploadedFiles(files);

            console.error("Erreur upload:", err);

            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(413).json({
                    error: "Limite dépassée : 20 Mo par photo, 1 Go par vidéo et 1 Go par requête.",
                });
            }

            if (err.code === "LIMIT_FILE_COUNT") {
                return res.status(400).json({
                    error: `Maximum ${config.upload.maxFiles} fichiers.`,
                });
            }

            return res.status(400).json({
                error: err.message || "Fichier non valide",
            });
        }

        // ====================================================
        // TRAITEMENT MÉTIER
        // ====================================================

        try {
            /*
             * Le code famille a déjà été validé par
             * requireFamilyCode() AVANT Multer.
             *
             * On le transmet au service métier afin de
             * conserver une défense en profondeur.
             */
            req.body.code = req.get("X-Family-Code");

            const result = await processUpload(files, req.body);

            return res.status(result.status || 200).json(result);
        } catch (error) {
            console.error("Erreur serveur:", error);

            cleanUploadedFiles(files);

            return res.status(500).json({
                error: "Erreur serveur pendant l'enregistrement",
            });
        }
    });
});

export default router;
