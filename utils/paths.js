import path from "path";

import { config } from "../config/config.js";

function isPathInsideDirectory(filePath, directory) {
    const resolvedFile = path.resolve(filePath);
    const resolvedDirectory = path.resolve(directory);

    return (
        resolvedFile === resolvedDirectory ||
        resolvedFile.startsWith(`${resolvedDirectory}${path.sep}`)
    );
}

export function getThumbnailPath(filename) {
    const id = path.basename(filename, path.extname(filename));

    const filePath = path.join(config.paths.thumbnails, `${id}.jpg`);

    if (!isPathInsideDirectory(filePath, config.paths.thumbnails)) {
        return null;
    }

    return filePath;
}

export function getMediaPath(filename, type) {
    let directory;

    if (type === "photo") {
        directory = config.paths.photos;
    } else if (type === "video") {
        directory = config.paths.videos;
    } else {
        return null;
    }

    const filePath = path.resolve(directory, filename);

    if (!isPathInsideDirectory(filePath, directory)) {
        return null;
    }

    return filePath;
}
