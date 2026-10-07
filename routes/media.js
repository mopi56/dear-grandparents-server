import express from "express";
import { requireMediaAuth } from "./auth.js";

import {
    isValidFilename,
    isValidThumbnailFilename,
} from "../utils/validation.js";

import { findMediaFile, findThumbnailFile } from "../services/media.js";

const router = express.Router();

// ============================================================
// MEDIA
// ============================================================

router.get("/media/:filename", requireMediaAuth, (req, res) => {
    const { filename } = req.params;

    if (!isValidFilename(filename)) {
        return res.status(400).json({
            error: "Nom de fichier invalide",
        });
    }

    const media = findMediaFile(filename);

    if (!media) {
        return res.status(404).json({
            error: "Fichier introuvable",
        });
    }

    res.sendFile(media.path);
});

// ============================================================
// THUMBNAILS
// ============================================================

router.get("/thumbnails/:filename", requireMediaAuth, (req, res) => {
    const { filename } = req.params;

    if (!isValidThumbnailFilename(filename)) {
        return res.status(400).json({
            error: "Nom de thumbnail invalide",
        });
    }

    const thumbnail = findThumbnailFile(filename);

    if (!thumbnail) {
        return res.status(404).json({
            error: "Thumbnail introuvable",
        });
    }

    res.sendFile(thumbnail);
});

export default router;
