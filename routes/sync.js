import express from "express";

import { requireSyncToken } from "./auth.js";

import { isValidFilename } from "../utils/validation.js";

import { getSyncGallery, findSyncMedia } from "../services/sync.js";

const router = express.Router();

// ============================================================
// SYNC AUTH
// ============================================================

// ============================================================
// GALLERY SYNC
// ============================================================

router.get("/gallery-sync", requireSyncToken, (req, res) => {
    try {
        const metadata = getSyncGallery();

        return res.json(metadata);
    } catch (error) {
        console.error("Erreur synchronisation galerie:", error);

        return res.status(500).json({
            error: "Impossible de lire la galerie",
        });
    }
});

// ============================================================
// MEDIA SYNC
// ============================================================

router.get("/media-sync/:filename", requireSyncToken, (req, res) => {
    const { filename } = req.params;

    if (!isValidFilename(filename)) {
        return res.status(400).json({
            error: "Nom de fichier invalide",
        });
    }

    const media = findSyncMedia(filename);

    if (!media) {
        return res.status(404).json({
            error: "Fichier introuvable",
        });
    }

    return res.sendFile(media.path);
});

export default router;
