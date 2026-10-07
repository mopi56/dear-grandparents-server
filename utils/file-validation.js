import { fileTypeFromFile } from "file-type";

const ALLOWED_TYPES = {
    photo: {
        mime: new Set([
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "image/heic",
            "image/heif",
        ]),
        extensions: new Set([
            "jpg",
            "jpeg",
            "png",
            "gif",
            "webp",
            "heic",
            "heif",
        ]),
    },

    video: {
        mime: new Set([
            "video/mp4",
            "video/quicktime",
            "video/webm",
            "video/x-matroska",
            "video/x-msvideo",
        ]),
        extensions: new Set(["mp4", "mov", "webm", "mkv", "avi", "m4v"]),
    },
};

export async function validateUploadedFile(file) {
    const detected = await fileTypeFromFile(file.path);

    if (!detected) {
        return {
            valid: false,
            error: "Type de fichier impossible à déterminer",
        };
    }

    const extension = file.originalname.split(".").pop()?.toLowerCase();

    const declaredMime = file.mimetype.toLowerCase();

    let type = null;

    for (const [candidateType, rules] of Object.entries(ALLOWED_TYPES)) {
        if (rules.mime.has(detected.mime) && rules.extensions.has(extension)) {
            type = candidateType;
            break;
        }
    }

    if (!type) {
        return {
            valid: false,
            error: "Type de fichier non autorisé",
        };
    }

    if (declaredMime !== detected.mime) {
        return {
            valid: false,
            error: "Le type MIME déclaré ne correspond pas au fichier",
        };
    }

    return {
        valid: true,
        type,
        mime: detected.mime,
        extension,
    };
}
