import express from "express";
import rateLimit from "express-rate-limit";
import { config } from "../config/config.js";

import {
    authenticateGallery,
    createGallerySession,
    isValidSessionToken,
    isValidSyncToken,
} from "../services/auth.js";

const router = express.Router();
export const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        error: "Trop de tentatives de connexion. Réessayez plus tard.",
    },
});
export function requireSyncToken(req, res, next) {
    const token = req.get("x-sync-token");

    if (!isValidSyncToken(token)) {
        return res.status(401).json({
            error: "Unauthorized",
        });
    }

    next();
}
export function requireMediaAuth(req, res, next) {
    /*
     * ========================================================
     * 1. Synchronisation RPi
     * ========================================================
     */

    const syncToken = req.get("x-sync-token");

    if (isValidSyncToken(syncToken)) {
        return next();
    }

    /*
     * ========================================================
     * 2. Galerie web
     * ========================================================
     */

    const cookieHeader = req.get("cookie");

    if (cookieHeader) {
        const cookies = Object.fromEntries(
            cookieHeader
                .split(";")
                .map((cookie) => cookie.trim())
                .filter(Boolean)
                .map((cookie) => {
                    const separatorIndex = cookie.indexOf("=");

                    if (separatorIndex === -1) {
                        return [cookie, ""];
                    }

                    const key = cookie.slice(0, separatorIndex);
                    const value = cookie.slice(separatorIndex + 1);

                    return [key, decodeURIComponent(value)];
                })
        );

        const sessionToken = cookies.gallery_session;

        if (isValidSessionToken(sessionToken)) {
            return next();
        }
    }

    return res.status(401).json({
        error: "Unauthorized",
    });
}
// ============================================================
// COOKIES
// ============================================================

export function getCookie(req, name) {
    const cookies = req.headers.cookie || "";

    for (const part of cookies.split(";")) {
        const [key, ...value] = part.trim().split("=");

        if (key === name) {
            return decodeURIComponent(value.join("="));
        }
    }

    return null;
}

function setSessionCookie(res, token) {
    const secure = config.auth.cookieSecure ? "; Secure" : "";

    res.setHeader(
        "Set-Cookie",
        `gallery_session=${encodeURIComponent(token)}; Max-Age=${Math.floor(
            config.auth.sessionTtlMs / 1000
        )}; Path=/; HttpOnly; SameSite=Strict${secure}`
    );
}

function clearSessionCookie(res) {
    res.setHeader(
        "Set-Cookie",
        "gallery_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict"
    );
}

// ============================================================
// GALLERY AUTH MIDDLEWARE
// ============================================================

export function requireGalleryAuth(req, res, next) {
    const token = getCookie(req, "gallery_session");

    if (!isValidSessionToken(token)) {
        if (req.path === "/gallery") {
            return res.redirect("/login");
        }

        return res.status(401).json({
            error: "Authentification requise",
        });
    }

    next();
}

// ============================================================
// LOGIN
// ============================================================

router.post("/login", loginRateLimiter, async (req, res) => {
    const password =
        typeof req.body?.password === "string" ? req.body.password : "";

    try {
        const valid = await authenticateGallery(password);

        if (!valid) {
            return res.status(401).json({
                error: "Mot de passe incorrect",
            });
        }

        const token = createGallerySession();

        setSessionCookie(res, token);

        return res.json({
            success: true,
        });
    } catch (error) {
        console.error("Erreur authentification:", error);

        return res.status(500).json({
            error: "Erreur serveur pendant l'authentification",
        });
    }
});

// ============================================================
// LOGOUT
// ============================================================

router.post("/logout", (req, res) => {
    clearSessionCookie(res);

    res.json({
        success: true,
    });
});

export default router;
