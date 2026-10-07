import { getSortedMetadata } from "./metadata.js";

import { findMediaFile } from "./media.js";

// ============================================================
// GALLERY SYNC
// ============================================================

export function getSyncGallery() {
    return getSortedMetadata();
}

// ============================================================
// MEDIA SYNC
// ============================================================

export function findSyncMedia(filename) {
    return findMediaFile(filename);
}
