const ITEMS_PER_PAGE = 10;

const gallery = document.getElementById("gallery");
const count = document.getElementById("count");
const refresh = document.getElementById("refresh");
const pagination = document.getElementById("pagination");
const paginationWrapper = document.getElementById("paginationWrapper");
const paginationInfo = document.getElementById("paginationInfo");
const lightbox = document.getElementById("lightbox");
const lightContent = document.getElementById("lightContent");
const lightMeta = document.getElementById("lightMeta");

let allItems = [];
let currentPage = 1;

function formatDate(value) {
    if (!value) {
        return "";
    }

    const d = new Date(value);

    if (Number.isNaN(d.getTime())) {
        return "";
    }

    return d.toLocaleString("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

async function load() {
    const response = await fetch("/api/gallery", {
        credentials: "same-origin",
    });

    if (response.status === 401) {
        location.href = "/login";
        return;
    }

    if (!response.ok) {
        throw new Error("Erreur galerie");
    }

    const items = await response.json();

    allItems = items.slice().reverse();

    count.textContent = allItems.length;

    refresh.textContent =
        "Mis à jour à " +
        new Date().toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
        });

    currentPage = 1;

    renderPage();
}

function renderPage() {
    gallery.replaceChildren();

    if (!allItems.length) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = "Aucun souvenir partagé pour le moment.";

        gallery.appendChild(empty);

        paginationWrapper.style.display = "none";

        return;
    }

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = Math.min(start + ITEMS_PER_PAGE, allItems.length);

    const pageItems = allItems.slice(start, end);

    pageItems.forEach((item) => {
        const element = document.createElement("article");

        element.className = "item";

        // Le média original n'est chargé qu'à l'ouverture du lightbox.
        const mediaUrl = "/media/" + encodeURIComponent(item.filename);

        // Le thumbnail est utilisé pour la prévisualisation.
        const thumbnailFilename =
            item.thumbnail ||
            (item.filename ? item.filename.replace(/\.[^/.]+$/, ".jpg") : "");

        const thumbnailUrl = thumbnailFilename
            ? "/thumbnails/" + encodeURIComponent(thumbnailFilename)
            : "";

        // Photo et vidéo utilisent le même thumbnail dans la galerie.
        const preview = document.createElement("img");

        preview.src = thumbnailUrl;
        preview.loading = "lazy";
        preview.decoding = "async";
        preview.alt = "";

        preview.addEventListener(
            "error",
            () => {
                preview.style.opacity = "0";
            },
            { once: true }
        );

        element.appendChild(preview);

        element.addEventListener("click", () => {
            openItem(item, mediaUrl);
        });

        /*
         * Métadonnées
         *
         * Important :
         * Les données provenant de metadata.json sont ajoutées
         * avec textContent et jamais avec innerHTML.
         *
         * Cela empêche l'exécution de HTML/JavaScript injecté
         * dans sender ou comment.
         */
        const meta = document.createElement("div");
        meta.className = "meta";

        const sender = document.createElement("div");
        sender.className = "sender";
        sender.textContent = item.sender || "Anonyme";

        meta.appendChild(sender);

        if (item.comment) {
            const comment = document.createElement("div");
            comment.className = "comment";
            comment.textContent = item.comment;

            meta.appendChild(comment);
        }

        const date = document.createElement("div");
        date.className = "date";
        date.textContent = formatDate(item.uploadedAt);

        meta.appendChild(date);

        element.appendChild(meta);

        gallery.appendChild(element);
    });

    renderPagination(allItems.length);
}

function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    pagination.replaceChildren();

    if (totalPages <= 1) {
        paginationWrapper.style.display = "none";
        return;
    }

    paginationWrapper.style.display = "flex";

    const previous = document.createElement("button");

    previous.type = "button";
    previous.textContent = "←";
    previous.title = "Page précédente";
    previous.disabled = currentPage === 1;

    previous.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderPage();
            scrollToGallery();
        }
    });

    pagination.appendChild(previous);

    const pages = getPaginationPages(currentPage, totalPages);

    pages.forEach((page) => {
        if (page === "...") {
            const ellipsis = document.createElement("span");

            ellipsis.className = "ellipsis";
            ellipsis.textContent = "…";

            pagination.appendChild(ellipsis);

            return;
        }

        const button = document.createElement("button");

        button.type = "button";
        button.textContent = page;

        if (page === currentPage) {
            button.classList.add("active");
        }

        button.addEventListener("click", () => {
            if (currentPage === page) {
                return;
            }

            currentPage = page;

            renderPage();

            scrollToGallery();
        });

        pagination.appendChild(button);
    });

    const next = document.createElement("button");

    next.type = "button";
    next.textContent = "→";
    next.title = "Page suivante";
    next.disabled = currentPage === totalPages;

    next.addEventListener("click", () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderPage();
            scrollToGallery();
        }
    });

    pagination.appendChild(next);

    const firstItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const lastItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

    paginationInfo.textContent = `${firstItem}–${lastItem} sur ${totalItems} souvenirs`;
}

function getPaginationPages(current, total) {
    if (total <= 7) {
        return Array.from(
            {
                length: total,
            },
            (_, i) => i + 1
        );
    }

    const pages = [];

    pages.push(1);

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    if (start > 2) {
        pages.push("...");
    }

    for (let i = start; i <= end; i++) {
        pages.push(i);
    }

    if (end < total - 1) {
        pages.push("...");
    }

    pages.push(total);

    return pages;
}

function scrollToGallery() {
    const top = gallery.getBoundingClientRect().top + window.scrollY - 20;

    window.scrollTo({
        top,
        behavior: "smooth",
    });
}

function openItem(item, url) {
    lightContent.replaceChildren();

    if (item.type === "photo") {
        const img = document.createElement("img");

        img.src = url;
        img.alt = "";

        lightContent.appendChild(img);
    } else {
        const video = document.createElement("video");

        video.src = url;
        video.controls = true;
        video.autoplay = true;
        video.playsInline = true;

        // Le thumbnail reste visible comme poster pendant le chargement.
        const thumbnailFilename =
            item.thumbnail ||
            (item.filename ? item.filename.replace(/\.[^/.]+$/, ".jpg") : "");

        if (thumbnailFilename) {
            video.poster =
                "/thumbnails/" + encodeURIComponent(thumbnailFilename);
        }

        lightContent.appendChild(video);
    }

    /*
     * textContent est utilisé ici afin que sender/comment
     * restent toujours du texte et ne puissent pas être
     * interprétés comme du HTML.
     */
    lightMeta.textContent =
        (item.sender || "Anonyme") + (item.comment ? " · " + item.comment : "");

    lightbox.classList.add("open");
}

function closeLightbox() {
    lightContent.replaceChildren();
    lightMeta.textContent = "";
    lightbox.classList.remove("open");
}

document.getElementById("close").addEventListener("click", closeLightbox);

lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
        closeLightbox();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeLightbox();
    }
});

document.getElementById("logout").addEventListener("click", async () => {
    try {
        await fetch("/logout", {
            method: "POST",
            credentials: "same-origin",
        });
    } finally {
        location.href = "/login";
    }
});

load().catch((error) => {
    console.error(error);

    gallery.replaceChildren();

    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Impossible de charger la galerie.";

    gallery.appendChild(empty);

    paginationWrapper.style.display = "none";
});
