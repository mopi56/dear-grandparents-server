import express from "express";
import path from "path";

import uploadRouter from "./routes/upload.js";

import authRouter, { getCookie } from "./routes/auth.js";

import { isValidSessionToken } from "./services/auth.js";

import galleryRouter from "./routes/gallery.js";
import mediaRouter from "./routes/media.js";
import syncRouter from "./routes/sync.js";

import { config } from "./config/config.js";

import { checkAndGenerateMissingThumbnails } from "./services/thumbnails.js";

import { ensureDirectories, ensureMetadataFile } from "./utils/filesystem.js";

// ================== INIT ==================

const app = express();

app.disable("x-powered-by");

app.use(express.json());

// ================== ROUTES ==================

app.use(authRouter);
app.use(galleryRouter);
app.use(mediaRouter);
app.use(syncRouter);
app.use(uploadRouter);

// ================== STATIC ==================

app.use(
    express.static(config.paths.public, {
        index: false,
    })
);

// IMPORTANT : le dossier private/ n'est PAS exposé
// par express.static.

// ================== FILESYSTEM ==================

ensureDirectories();
ensureMetadataFile();

// ================== FRONT ==================

app.get("/", (req, res) => {
    res.sendFile(path.join(config.paths.public, "upload.html"));
});

app.get("/login", (req, res) => {
    const token = getCookie(req, "gallery_session");

    if (isValidSessionToken(token)) {
        return res.redirect("/gallery");
    }

    res.sendFile(path.join(config.paths.public, "login.html"));
});

// ================== ERROR HANDLER ==================

app.use((err, req, res, _next) => {
    console.error(err);

    if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
            error: "Fichier trop volumineux",
        });
    }

    res.status(500).json({
        error: "Erreur serveur",
    });
});

// ================== START ==================

async function startServer() {
    try {
        /*
         * Avant de commencer à accepter
         * des requêtes, on vérifie tous
         * les médias déjà présents.
         */

        await checkAndGenerateMissingThumbnails();

        app.listen(config.server.port, "0.0.0.0", () => {
            console.log(
                `Upload server listening on http://localhost:${config.server.port}`
            );
        });
    } catch (error) {
        console.error("Erreur lors de l'initialisation des thumbnails:", error);

        process.exit(1);
    }
}

startServer();
