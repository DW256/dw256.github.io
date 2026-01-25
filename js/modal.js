import { extractImagesFromMarkdown, removeImagesFromMarkdown } from "./markdown.js";

const modalRoot = document.getElementById("modal-root");
const modalBackdrop = document.getElementById("modal-backdrop");
const modalPanel = document.getElementById("modal-panel");
const modalTitle = document.getElementById("modal-title");
const modalBody = document.getElementById("modal-body");
const modalClose = document.getElementById("modal-close");

let lastFocusedElement = null;
let currentSlide = 0;
let slideImages = [];
let autoplayInterval = null;
let resumeTimeout = null;

const AUTOPLAY_DELAY = 4000;
const RESUME_DELAY = 3000;
const SWIPE_THRESHOLD = 30;

/* ---------- focus helpers ---------- */
function getFocusableElements() {
    return modalPanel.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
}

function trapFocus(e) {
    if (e.key !== "Tab") return;
    const focusables = getFocusableElements();
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
    }
}

/* ---------- carousel helpers ---------- */
function startAutoplay() {
    stopAutoplay();
    if (slideImages.length <= 1) return;
    autoplayInterval = setInterval(() => showSlide(currentSlide + 1), AUTOPLAY_DELAY);
}

function stopAutoplay() {
    if (autoplayInterval) clearInterval(autoplayInterval);
    autoplayInterval = null;
}

function stopAutoplayTemporarily() {
    stopAutoplay();
    if (resumeTimeout) clearTimeout(resumeTimeout);
    resumeTimeout = setTimeout(() => startAutoplay(), RESUME_DELAY);
}

function createCarousel(images) {
    if (!images || !images.length) return null;

    const wrapper = document.createElement("div");
    wrapper.className = "relative w-full overflow-hidden mb-4 select-none";
    wrapper.setAttribute("role", "region");
    wrapper.setAttribute("aria-label", "Project screenshots carousel");
    wrapper.setAttribute("aria-live", "polite");

    const track = document.createElement("div");
    track.className = "flex transition-transform duration-500 ease-in-out";
    track.id = "carousel-track";

    images.forEach(({ src, caption, fullSrc }, idx) => {
        const container = document.createElement("div");
        container.className = "relative w-full flex-shrink-0 carousel-slide h-64"; // fixed height
        container.setAttribute("role", "group");
        container.setAttribute("aria-roledescription", "slide");
        container.setAttribute("aria-label", `${idx + 1} of ${images.length}`);

        // Skeleton placeholder
        const skeleton = document.createElement("div");
        skeleton.className = "absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg";
        container.appendChild(skeleton);

        // Image
        const img = document.createElement("img");
        img.src = src || "assets/images/fallback.png";
        img.dataset.fullSrc = fullSrc || src || "assets/images/fallback.png";
        img.loading = "lazy";
        img.className = "w-full h-full object-contain rounded-lg transition-opacity duration-500 opacity-0 relative";
        img.onload = () => {
            img.style.opacity = 1;
            skeleton.remove();
        };
        img.onerror = () => {
            img.src = "assets/images/fallback.png";
            skeleton.style.opacity = 1; // keep a visible placeholder
        };
        img.onclick = () => toggleFullscreen(container);
        container.appendChild(img);

        // Caption
        if (caption) {
            const capEl = document.createElement("div");
            capEl.className = "absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 dark:bg-gray-900/60 text-white text-xs px-2 py-1 rounded";
            capEl.textContent = caption;
            container.appendChild(capEl);
        }

        track.appendChild(container);
    });

    wrapper.appendChild(track);

    if (images.length > 1) {
        wrapper.className = "carousel-wrapper relative w-full overflow-hidden mb-4 select-none";
        const prev = createButton("‹", () => stopAutoplayTemporarily() || showSlide(currentSlide - 1), "left-2");
        const next = createButton("›", () => stopAutoplayTemporarily() || showSlide(currentSlide + 1), "right-2");
        prev.classList.add("carousel-nav");
        next.classList.add("carousel-nav");
        wrapper.append(prev, next);

        const dots = document.createElement("div");
        dots.className = "flex justify-center mt-2 gap-2";
        dots.id = "carousel-dots";

        images.forEach((_, idx) => {
            const dot = document.createElement("button");
            dot.className = "w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 transition-colors";
            dot.setAttribute("aria-label", `Go to slide ${idx + 1}`);
            dot.onclick = () => stopAutoplayTemporarily() || showSlide(idx);
            dots.appendChild(dot);
        });
        wrapper.appendChild(dots);
        addHoverPause(wrapper);
    }

    addSwipe(wrapper, track);
    return wrapper;
}

function createButton(label, onClick, positionClass) {
    const btn = document.createElement("button");
    btn.innerHTML = label;
    btn.className = `absolute top-1/2 -translate-y-1/2 bg-white/70 dark:bg-gray-800/70 rounded-full p-2 ${positionClass} hover:bg-white dark:hover:bg-gray-700 transition`;
    btn.onclick = onClick;
    return btn;
}

function addHoverPause(wrapper) {
    wrapper.addEventListener("mouseenter", stopAutoplay);
    wrapper.addEventListener("mouseleave", startAutoplay);
}

function addSwipe(wrapper, track) {
    let startX = 0, isDragging = false;
    wrapper.addEventListener("touchstart", e => { startX = e.touches[0].clientX; isDragging = true; stopAutoplayTemporarily(); });
    wrapper.addEventListener("touchmove", e => {
        if (!isDragging) return;
        const dx = e.touches[0].clientX - startX;
        track.style.transform = `translateX(${-currentSlide * 100 + dx / wrapper.offsetWidth * 100}%)`;
    });
    wrapper.addEventListener("touchend", e => {
        if (!isDragging) return;
        const dx = e.changedTouches[0].clientX - startX;
        if (dx > SWIPE_THRESHOLD) showSlide(currentSlide - 1);
        else if (dx < -SWIPE_THRESHOLD) showSlide(currentSlide + 1);
        else showSlide(currentSlide);
        isDragging = false;
    });
}

function toggleFullscreen(container) {
    if (!document.fullscreenElement) container.requestFullscreen();
    else document.exitFullscreen();
}

function showSlide(index) {
    const track = document.getElementById("carousel-track");
    const dots = document.getElementById("carousel-dots");
    if (!track) return;

    const slides = track.children;
    const total = slides.length;
    currentSlide = (index + total) % total;

    const activeImg = slides[currentSlide].querySelector("img");
    if (activeImg && activeImg.src !== activeImg.dataset.fullSrc) activeImg.src = activeImg.dataset.fullSrc;

    Array.from(slides).forEach((slide, idx) => slide.classList.toggle("active", idx === currentSlide));
    track.style.transform = `translateX(-${currentSlide * 100}%)`;

    if (dots) {
        Array.from(dots.children).forEach((dot, idx) => {
            dot.classList.toggle("bg-gray-900", idx === currentSlide);
            dot.classList.toggle("bg-gray-400", idx !== currentSlide);
            dot.classList.toggle("dark:bg-gray-200", idx === currentSlide);
            dot.classList.toggle("dark:bg-gray-500", idx !== currentSlide);
        });
    }

    Array.from(slides).forEach((slide, idx) => {
        slide.setAttribute("aria-hidden", idx !== currentSlide ? "true" : "false");
    });
}

/* ---------- modal API ---------- */
export function openModal(projectData, markdownBody) {
    lastFocusedElement = document.activeElement;
    modalTitle.textContent = projectData.title;
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
    mdContent.innerHTML = marked.parse(markdownWithoutImages);

    // Remove <h3>Screenshots</h3> if it exists
    const h3 = mdContent.querySelector("h3");
    if (h3 && h3.textContent === "Screenshots") h3.remove();

    modalBody.appendChild(mdContent);

    if (projectData.links && Object.keys(projectData.links).length) {
        const linksDiv = document.createElement("div");
        linksDiv.className = "mt-6 flex flex-wrap gap-3 border-t border-gray-200 dark:border-gray-700 pt-4";

        Object.entries(projectData.links).forEach(([key, url]) => {
            const a = document.createElement("a");
            a.href = url;
            a.target = "_blank";
            a.rel = "noopener";
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
        modalBody.appendChild(linksDiv);
    }

    modalRoot.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
        const focusables = getFocusableElements();
        (focusables[0] || modalPanel).focus();
    });
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

export function closeModal() {
    modalRoot.classList.add("hidden");
    modalBody.innerHTML = "";
    document.body.style.overflow = "";
    slideImages = [];
    currentSlide = 0;
    stopAutoplay();

    if (lastFocusedElement) {
        lastFocusedElement.focus();
        lastFocusedElement = null;
    }

    // Dispatch a custom event for app.js to handle URL/state
    modalRoot.dispatchEvent(new CustomEvent("modalClosed", { bubbles: true }));
}

export function clearProjectFromURL() {
    const params = new URLSearchParams(window.location.search);
    params.delete("project");

    history.replaceState(
        null,
        "",
        window.location.pathname + (params.toString() ? "?" + params : "")
    );
}

/* ---------- keyboard legend ---------- */
let keyboardUsed = false;
function showKeyboardLegend() {
    const legend = document.createElement("div");
    legend.textContent = "← → arrows: navigate slides, Esc: close, F: fullscreen";
    legend.className = "fixed bottom-4 left-1/2 -translate-x-1/2 bg-black/70 dark:bg-gray-900/70 text-white text-xs px-3 py-1 rounded opacity-0 transition-opacity duration-300 z-50";
    document.body.appendChild(legend);

    requestAnimationFrame(() => legend.style.opacity = 1);
    setTimeout(() => legend.remove(), 3000);
}

/* ---------- bindings ---------- */
modalClose.onclick = closeModal;
modalBackdrop.onclick = closeModal;

document.addEventListener("keydown", e => {
    if (!modalRoot.classList.contains("hidden")) {
        trapFocus(e);
        if (e.key === "Escape") closeModal();
        if (["ArrowLeft", "ArrowRight"].includes(e.key)) stopAutoplayTemporarily();
        if (e.key === "ArrowLeft") showSlide(currentSlide - 1);
        if (e.key === "ArrowRight") showSlide(currentSlide + 1);
        if (e.key.toLowerCase() === "f") {
            const activeSlide = document.querySelector(`#carousel-track .carousel-slide:nth-child(${currentSlide + 1}) img`);
            if (activeSlide) toggleFullscreen(activeSlide.parentElement);
        }
        if (e.key === " ") e.preventDefault() && (autoplayInterval ? stopAutoplay() : startAutoplay());
        if (!keyboardUsed) {
            keyboardUsed = true;
            showKeyboardLegend();
        }
    }
});
