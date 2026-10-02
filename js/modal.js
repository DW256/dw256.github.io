import { extractImagesFromMarkdown, removeImagesFromMarkdown } from "./markdown.js";
import { mdToHtml } from "./sanitize.js";
import { getFocusableElements, trapFocus, makeBackgroundInert, restoreFocus } from "./dialogFocus.js";
import { renderLoadError } from "./loadError.js";

const modalRoot = document.getElementById("modal-root");
const modalBackdrop = document.getElementById("modal-backdrop");
const modalPanel = document.getElementById("modal-panel");
const modalTitle = document.getElementById("modal-title");
const modalBody = document.getElementById("modal-body");
const modalClose = document.getElementById("modal-close");

let lastFocusedElement = null;
let currentProject = null;
let currentSlide = 0;
let slideImages = [];
let autoplayInterval = null;
let userPaused = false;
let hoverPaused = false;
let restoreBackground = null;
let restoreLightboxBackground = null;
let lightboxFocus = null;
let savedPagePosition = null;
let bodyReady = false;
const projectPositions = new Map();

function rememberProjectPosition() {
    if (!currentProject || !bodyReady) return;
    projectPositions.set(currentProject.id, {
        scrollTop: modalBody.scrollTop,
        details: Array.from(modalBody.querySelectorAll("details"), (el) => el.open),
    });
}

function lockPageScroll() {
    const properties = ["position", "top", "left", "width", "overflow"];
    savedPagePosition = {
        x: window.scrollX, y: window.scrollY,
        styles: Object.fromEntries(properties.map((key) => [key, document.body.style[key]])),
    };
    Object.assign(document.body.style, {
        position: "fixed", top: `${-savedPagePosition.y}px`, left: `${-savedPagePosition.x}px`,
        width: "100%", overflow: "hidden",
    });
}

function unlockPageScroll() {
    if (!savedPagePosition) return;
    const { x, y, styles } = savedPagePosition;
    Object.assign(document.body.style, styles);
    savedPagePosition = null;
    window.scrollTo(x, y);
}

const AUTOPLAY_DELAY = 4000;
const SWIPE_THRESHOLD = 30;

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

/* ---------- carousel helpers ---------- */
function updateAutoplayControl() {
    const button = document.getElementById("carousel-autoplay");
    if (button) {
        const label = userPaused ? "Play slideshow" : "Pause slideshow";
        let icon = button.querySelector("i");
        if (!icon) {
            icon = document.createElement("i");
            icon.setAttribute("aria-hidden", "true");
            button.appendChild(icon);
        }
        icon.className = userPaused ? "fa-solid fa-play" : "fa-solid fa-pause";
        button.setAttribute("aria-label", label);
        button.setAttribute("aria-pressed", String(!userPaused));
        button.disabled = reduceMotion.matches;
        button.title = reduceMotion.matches ? "Automatic playback is disabled by your reduced-motion preference." : label;
    }
    document.getElementById("carousel-track")?.setAttribute("aria-live", autoplayInterval ? "off" : "polite");
}

function startAutoplay() {
    stopAutoplay();
    const carousel = document.getElementById("carousel-track")?.closest('[role="region"]');
    const focusPaused = carousel?.contains(document.activeElement) && document.activeElement.id !== "carousel-autoplay";
    if (userPaused || hoverPaused || focusPaused || lightboxEl || document.hidden || !currentProject) return;
    if (reduceMotion.matches || slideImages.length <= 1) return;
    autoplayInterval = setInterval(() => showSlide(currentSlide + 1), AUTOPLAY_DELAY);
    updateAutoplayControl();
}

function stopAutoplay() {
    if (autoplayInterval) clearInterval(autoplayInterval);
    autoplayInterval = null;
    updateAutoplayControl();
}

function pauseAutoplay() {
    userPaused = true;
    stopAutoplay();
}

function createCarousel(images) {
    if (!images || !images.length) return null;

    const wrapper = document.createElement("div");
    wrapper.className = "relative w-full overflow-hidden mb-4 select-none";
    wrapper.setAttribute("role", "region");
    wrapper.setAttribute("aria-label", "Project screenshots carousel");

    const track = document.createElement("div");
    track.className = "flex transition-transform duration-500 ease-in-out";
    track.id = "carousel-track";

    images.forEach(({ src, caption, alt }, idx) => {
        const container = document.createElement("div");
        container.className = "relative w-full flex-shrink-0 carousel-slide h-64";
        container.setAttribute("role", "group");
        container.setAttribute("aria-roledescription", "slide");
        container.setAttribute("aria-label", `${idx + 1} of ${images.length}`);

        const skeleton = document.createElement("div");
        skeleton.className =
            "absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg";
        container.appendChild(skeleton);

        const img = document.createElement("img");
        img.src = src || "assets/images/fallback.png";
        img.alt = alt || caption || "";
        img.loading = "lazy";
        img.className =
            "w-full h-full object-contain rounded-lg transition-opacity duration-500 opacity-0 relative";
        img.onload = () => {
            img.style.opacity = 1;
            skeleton.remove();
        };
        img.onerror = () => {
            img.onerror = null;
            img.src = "assets/images/fallback.png";
            skeleton.style.opacity = 1;
        };
        const expand = document.createElement("button");
        expand.type = "button";
        expand.className = "carousel-expand w-full h-full";
        expand.setAttribute("aria-label", `Expand image ${idx + 1}: ${alt || caption || 'Project screenshot'}`);
        expand.onclick = () => openLightbox(idx);
        expand.appendChild(img);
        container.appendChild(expand);

        if (caption) {
            const capEl = document.createElement("div");
            capEl.className =
                "absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 dark:bg-gray-900/60 text-white text-xs px-2 py-1 rounded";
            capEl.textContent = caption;
            container.appendChild(capEl);
        }

        track.appendChild(container);
    });

    const viewport = document.createElement("div");
    viewport.className = "carousel-viewport";
    viewport.appendChild(track);
    wrapper.appendChild(viewport);

    if (images.length > 1) {
        wrapper.className = "carousel-wrapper relative w-full overflow-hidden mb-4 select-none";
        const prev = createButton("fa-chevron-left", () => (pauseAutoplay(), showSlide(currentSlide - 1)), "left-2", "Previous image");
        const next = createButton("fa-chevron-right", () => (pauseAutoplay(), showSlide(currentSlide + 1)), "right-2", "Next image");
        viewport.append(prev, next);

        const dots = document.createElement("div");
        dots.className = "carousel-dots";
        dots.id = "carousel-dots";

        images.forEach((_, idx) => {
            const dot = document.createElement("button");
            dot.type = "button";
            dot.className = "carousel-dot";
            dot.setAttribute("aria-label", `Go to slide ${idx + 1}`);
            dot.onclick = () => (pauseAutoplay(), showSlide(idx));
            dots.appendChild(dot);
        });
        wrapper.appendChild(dots);
        const play = document.createElement("button");
        play.type = "button";
        play.id = "carousel-autoplay";
        play.className = "carousel-play";
        play.onclick = () => {
            userPaused = !userPaused;
            // An explicit Play action overrides a stale pointer hover pause.
            if (!userPaused) hoverPaused = false;
            userPaused ? stopAutoplay() : startAutoplay();
        };
        viewport.appendChild(play);
        addHoverPause(wrapper);
    }

    addSwipe(wrapper, track);
    return wrapper;
}

function createButton(iconClass, onClick, positionClass, accessibleLabel) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", accessibleLabel);
    btn.title = accessibleLabel;
    const icon = document.createElement("i");
    icon.className = `fa-solid ${iconClass}`;
    icon.setAttribute("aria-hidden", "true");
    btn.appendChild(icon);
    btn.className = `carousel-nav ${positionClass}`;
    btn.onclick = onClick;
    return btn;
}

function addHoverPause(wrapper) {
    wrapper.addEventListener("mouseenter", () => { hoverPaused = true; stopAutoplay(); });
    wrapper.addEventListener("mouseleave", () => { hoverPaused = false; startAutoplay(); });
    wrapper.addEventListener("focusin", stopAutoplay);
    wrapper.addEventListener("focusout", () => queueMicrotask(startAutoplay));
}

function addSwipe(wrapper, track) {
    let startX = 0,
        isDragging = false;

    wrapper.addEventListener("touchstart", (e) => {
        if (e.target.closest('button:not(.carousel-expand), a')) return;
        startX = e.touches[0].clientX;
        isDragging = true;
        pauseAutoplay();
    });

    wrapper.addEventListener("touchmove", (e) => {
        if (!isDragging) return;
        const dx = e.touches[0].clientX - startX;
        track.style.transform = `translateX(${-currentSlide * 100 + (dx / wrapper.offsetWidth) * 100}%)`;
    });

    wrapper.addEventListener("touchend", (e) => {
        if (!isDragging) return;
        const dx = e.changedTouches[0].clientX - startX;
        if (dx > SWIPE_THRESHOLD) showSlide(currentSlide - 1);
        else if (dx < -SWIPE_THRESHOLD) showSlide(currentSlide + 1);
        else showSlide(currentSlide);
        isDragging = false;
    });
    wrapper.addEventListener("touchcancel", () => {
        isDragging = false;
        showSlide(currentSlide);
    });
}

/* ---------- lightbox ---------- */
let lightboxEl = null;

function openLightbox(index) {
    closeLightbox();
    lightboxFocus = document.activeElement;
    currentSlide = (index + slideImages.length) % slideImages.length;

    lightboxEl = document.createElement("div");
    lightboxEl.className = "lightbox";
    lightboxEl.setAttribute("role", "dialog");
    lightboxEl.setAttribute("aria-modal", "true");
    lightboxEl.setAttribute("aria-label", "Image viewer");
    lightboxEl.tabIndex = -1;

    const backdrop = document.createElement("div");
    backdrop.className = "lightbox-backdrop";
    backdrop.onclick = closeLightbox;

    const figure = document.createElement("figure");
    figure.className = "lightbox-figure";

    const img = document.createElement("img");
    img.className = "lightbox-img";

    const cap = document.createElement("figcaption");
    cap.className = "lightbox-caption";

    figure.append(img, cap);

    const closeBtn = document.createElement("button");
    closeBtn.className = "lightbox-close";
    closeBtn.innerHTML = "&times;";
    closeBtn.setAttribute("aria-label", "Close image viewer");
    closeBtn.onclick = closeLightbox;

    lightboxEl.append(backdrop, figure, closeBtn);

    if (slideImages.length > 1) {
        const prev = document.createElement("button");
        prev.className = "lightbox-nav lightbox-prev";
        prev.innerHTML = "&#8249;";
        prev.setAttribute("aria-label", "Previous image");
        prev.onclick = () => lightboxNav(currentSlide - 1);

        const next = document.createElement("button");
        next.className = "lightbox-nav lightbox-next";
        next.innerHTML = "&#8250;";
        next.setAttribute("aria-label", "Next image");
        next.onclick = () => lightboxNav(currentSlide + 1);

        lightboxEl.append(prev, next);
    }

    document.body.appendChild(lightboxEl);
    restoreLightboxBackground = makeBackgroundInert(lightboxEl);
    updateLightboxContent();
    showSlide(currentSlide);
    stopAutoplay();
    closeBtn.focus();
}

function updateLightboxContent() {
    if (!lightboxEl) return;
    const { src, caption, alt } = slideImages[currentSlide];
    const img = lightboxEl.querySelector(".lightbox-img");
    const cap = lightboxEl.querySelector(".lightbox-caption");
    img.src = src || "assets/images/fallback.png";
    img.alt = alt || caption || "";
    cap.textContent = caption || "";
    cap.style.display = caption ? "" : "none";
}

function lightboxNav(index) {
    if (!lightboxEl) return;
    currentSlide = (index + slideImages.length) % slideImages.length;
    updateLightboxContent();
    showSlide(currentSlide);
    stopAutoplay();
}

function closeLightbox({ restore = true } = {}) {
    if (lightboxEl) {
        restoreLightboxBackground?.();
        restoreLightboxBackground = null;
        lightboxEl.remove();
        lightboxEl = null;
        if (restore) restoreFocus(lightboxFocus, modalClose);
        lightboxFocus = null;
        startAutoplay();
    }
}

function showSlide(index) {
    const track = document.getElementById("carousel-track");
    const dots = document.getElementById("carousel-dots");
    if (!track || !track.children.length) return;

    const slides = track.children;
    const total = slides.length;
    currentSlide = (index + total) % total;

    Array.from(slides).forEach((slide, idx) => slide.classList.toggle("active", idx === currentSlide));
    track.style.transform = `translateX(-${currentSlide * 100}%)`;

    if (dots) {
        Array.from(dots.children).forEach((dot, idx) => {
            dot.setAttribute("aria-current", String(idx === currentSlide));
        });
    }

    Array.from(slides).forEach((slide, idx) => {
        slide.setAttribute("aria-hidden", idx !== currentSlide ? "true" : "false");
        slide.inert = idx !== currentSlide;
    });
}

/* ---------- modal body rendering ---------- */
function renderBody(projectData, markdownBody) {
    modalBody.innerHTML = "";

    slideImages = extractImagesFromMarkdown(markdownBody);
    const markdownWithoutImages = removeImagesFromMarkdown(markdownBody);

    if (slideImages.length) {
        currentSlide = 0;

        const carouselWrapper = document.createElement("div");
        carouselWrapper.setAttribute("role", "region");
        carouselWrapper.setAttribute("aria-label", "Project screenshots");
        carouselWrapper.className = "carousel-wrapper mb-6";

        const carouselEl = createCarousel(slideImages);
        if (carouselEl) carouselWrapper.appendChild(carouselEl);
        modalBody.appendChild(carouselWrapper);

        showSlide(0);
        startAutoplay();
    }

    const mdContent = document.createElement("div");
    mdContent.className = "prose dark:prose-invert max-w-none mt-4";
    mdContent.innerHTML = mdToHtml(markdownWithoutImages);

    mdContent.querySelectorAll("h2, h3").forEach((h) => {
        if (h.textContent.trim().toLowerCase() === "screenshots") h.remove();
    });

    modalBody.appendChild(mdContent);

    if (projectData.links && Object.keys(projectData.links).length) {
        const linksDiv = document.createElement("div");
        linksDiv.className = "mt-6 flex flex-wrap gap-3 border-t border-gray-200 dark:border-gray-700 pt-4";

        Object.entries(projectData.links).forEach(([key, url]) => {
            if (!/^https?:\/\//i.test(url)) return;

            const a = document.createElement("a");
            a.href = url;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.className =
                "px-4 py-2 border rounded-md text-sm flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 focus:ring";

            const icon = document.createElement("i");
            icon.className = `${getLinkIconClass(key)}`;
            a.appendChild(icon);

            const span = document.createElement("span");
            span.textContent = key.charAt(0).toUpperCase() + key.slice(1);
            a.appendChild(span);

            linksDiv.appendChild(a);
        });

        if (linksDiv.children.length) modalBody.appendChild(linksDiv);
    }
}

/* ---------- modal API ---------- */
export function openModal(projectData) {
    rememberProjectPosition();
    if (modalRoot.classList.contains("hidden")) {
        lastFocusedElement = document.activeElement;
        lockPageScroll();
        restoreBackground = makeBackgroundInert(modalRoot);
    }
    closeLightbox({ restore: false });
    stopAutoplay();
    slideImages = [];
    userPaused = reduceMotion.matches;
    hoverPaused = false;
    currentProject = projectData;
    bodyReady = false;

    modalTitle.textContent = projectData.title;
    modalBody.innerHTML = "";
    modalBody.scrollTop = 0;
    modalBody.setAttribute("aria-busy", "true");

    const spinner = document.createElement("div");
    spinner.id = "modal-loading";
    spinner.className = "flex justify-center py-10";
    spinner.setAttribute("role", "status");
    spinner.setAttribute("aria-label", "Loading project details");

    const spinnerDot = document.createElement("div");
    spinnerDot.className =
        "w-8 h-8 rounded-full border-4 border-neutral-300 dark:border-neutral-600 border-t-blue-500 animate-spin";
    spinner.appendChild(spinnerDot);
    modalBody.appendChild(spinner);

    modalRoot.classList.remove("hidden");

    requestAnimationFrame(() => {
        if (modalRoot.classList.contains("hidden")) return;
        const focusables = getFocusableElements(modalPanel);
        (focusables[0] || modalPanel).focus();
    });
}

export function setModalBody(projectId, markdownBody) {
    if (!currentProject || currentProject.id !== projectId) return;
    if (modalRoot.classList.contains("hidden")) return;
    renderBody(currentProject, markdownBody);
    bodyReady = true;
    modalBody.setAttribute("aria-busy", "false");
    const position = projectPositions.get(projectId);
    if (position) {
        modalBody.querySelectorAll("details").forEach((el, index) => { el.open = position.details[index] ?? false; });
    }
    const project = currentProject;
    requestAnimationFrame(() => {
        if (currentProject === project && bodyReady && !modalRoot.classList.contains("hidden")) {
            modalBody.scrollTop = position?.scrollTop ?? 0;
        }
    });
}

export function setModalError(projectId, error, retry) {
    if (!currentProject || currentProject.id !== projectId) return;
    if (modalRoot.classList.contains("hidden")) return;

    stopAutoplay();
    bodyReady = false;
    modalBody.setAttribute("aria-busy", "false");
    renderLoadError(modalBody, "project details", error, retry);
}

function getLinkIconClass(key) {
    switch (key.toLowerCase()) {
        case "playstore": return "fa-brands fa-google-play";
        case "appstore": return "fa-brands fa-apple";
        case "video": return "fa-solid fa-video";
        case "repo": return "fa-brands fa-git-alt";
        case "itch": return "fa-brands fa-itch-io";
        default: return "fa-link";
    }
}

/**
 * silent: when true, does NOT dispatch modalClosed.
 * Use this when closing due to popstate syncing (Back/Forward).
 */
export function closeModal({ silent = false } = {}) {
    rememberProjectPosition();
    closeLightbox({ restore: false });
    modalRoot.classList.add("hidden");
    modalBody.innerHTML = "";
    unlockPageScroll();
    restoreBackground?.();
    restoreBackground = null;
    slideImages = [];
    currentSlide = 0;
    currentProject = null;
    bodyReady = false;
    modalBody.setAttribute("aria-busy", "false");
    stopAutoplay();

    if (lastFocusedElement) {
        const replacement = Array.from(document.querySelectorAll('[data-project]'))
            .find((el) => el.dataset.project === lastFocusedElement.dataset?.project);
        restoreFocus(lastFocusedElement, replacement || document.getElementById("project-grid"));
        lastFocusedElement = null;
    }

    if (!silent) {
        modalRoot.dispatchEvent(new CustomEvent("modalClosed", { bubbles: true }));
    }
}

export function clearProjectFromURL() {
    const params = new URLSearchParams(window.location.search);
    params.delete("project");

    history.replaceState(
        null,
        "",
        window.location.pathname + (params.toString() ? "?" + params : "") + window.location.hash
    );
}

/* ---------- keyboard legend ---------- */
let keyboardUsed = false;
function showKeyboardLegend() {
    const legend = document.createElement("div");
    legend.textContent = "← → arrows: navigate slides, Esc: close, F: expand image";
    legend.className =
        "fixed bottom-4 left-1/2 -translate-x-1/2 bg-black/70 dark:bg-gray-900/70 text-white text-xs px-3 py-1 rounded opacity-0 transition-opacity duration-300 z-50";
    document.body.appendChild(legend);

    requestAnimationFrame(() => (legend.style.opacity = 1));
    setTimeout(() => legend.remove(), 3000);
}

/* ---------- bindings ---------- */
modalClose.onclick = () => closeModal();
modalBackdrop.onclick = () => closeModal();

document.addEventListener("keydown", (e) => {
    if (lightboxEl) {
        trapFocus(e, lightboxEl);
        if (["ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
        if (e.key === "Escape") closeLightbox();
        if (e.key === "ArrowLeft") lightboxNav(currentSlide - 1);
        if (e.key === "ArrowRight") lightboxNav(currentSlide + 1);
        return;
    }

    if (!modalRoot.classList.contains("hidden")) {
        trapFocus(e, modalPanel);

        if (e.key === "Escape") {
            closeModal();
            return;
        }

        if (e.target.closest('input, textarea, select, [contenteditable="true"]') || e.altKey || e.ctrlKey || e.metaKey) return;
        if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
            e.preventDefault();
            pauseAutoplay();
        }
        if (e.key === "ArrowLeft") showSlide(currentSlide - 1);
        if (e.key === "ArrowRight") showSlide(currentSlide + 1);

        if (e.key.toLowerCase() === "f" && slideImages.length) {
            openLightbox(currentSlide);
        }

        if (e.key === " ") {
            const el = document.activeElement;
            const onInteractive =
                el && el !== document.body && el !== modalPanel &&
                el.closest("a, button, input, textarea, select, summary");
            if (!onInteractive) {
                e.preventDefault();
                userPaused = !userPaused;
                userPaused ? stopAutoplay() : startAutoplay();
            }
        }

        if (!keyboardUsed) {
            keyboardUsed = true;
            showKeyboardLegend();
        }
    }
});

reduceMotion.addEventListener("change", () => {
    if (reduceMotion.matches) pauseAutoplay();
    else updateAutoplayControl();
});
document.addEventListener("visibilitychange", () => document.hidden ? stopAutoplay() : startAutoplay());
