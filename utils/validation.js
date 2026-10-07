const MEDIA_FILENAME_REGEX =
    /^[a-f0-9-]+\.(jpg|jpeg|png|gif|webp|heic|heif|mp4|mov|avi|mkv|webm|m4v)$/i;

const THUMBNAIL_FILENAME_REGEX = /^[a-f0-9-]+\.jpg$/i;

/**
 * Nettoie une chaîne de caractères
 * et limite sa longueur.
 */
export function sanitizeText(value, maxLength) {
    if (typeof value !== "string") {
        return "";
    }

    return value.trim().slice(0, maxLength);
}

/**
 * Vérifie qu'un nom de fichier média
 * correspond au format généré par SundayBox.
 */
export function isValidFilename(filename) {
    return typeof filename === "string" && MEDIA_FILENAME_REGEX.test(filename);
}

/**
 * Vérifie qu'un nom de thumbnail
 * correspond au format généré par SundayBox.
 */
export function isValidThumbnailFilename(filename) {
    return (
        typeof filename === "string" && THUMBNAIL_FILENAME_REGEX.test(filename)
    );
}
