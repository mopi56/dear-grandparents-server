import express from "express";
import path from "path";

import { config } from "../config/config.js";

import { requireGalleryAuth } from "./auth.js";

import { getSortedMetadata } from "../services/metadata.js";

const router = express.Router();

// ============================================================
// GALLERY PAGE
// ============================================================

router.get("/gallery", requireGalleryAuth, (req, res) => {
    res.sendFile(path.join(config.paths.private, "gallery.html"));
});

// ============================================================
// GALLERY CSS
// ============================================================

router.get("/css/gallery.css", requireGalleryAuth, (req, res) => {
    res.sendFile(path.join(config.paths.private, "css", "gallery.css"));
});

// ============================================================
// GALLERY JAVASCRIPT
// ============================================================

router.get("/js/gallery.js", requireGalleryAuth, (req, res) => {
    res.sendFile(path.join(config.paths.private, "js", "gallery.js"));
});

// ============================================================
// GALLERY API
// ============================================================

router.get("/api/gallery", requireGalleryAuth, (req, res) => {
    try {
        const metadata = getSortedMetadata();

        return res.json(metadata);
    } catch (error) {
        console.error("Erreur lecture galerie:", error);

        return res.status(500).json({
            error: "Impossible de lire la galerie",
        });
    }
});

export default router;
