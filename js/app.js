import {
    loadMeta,
    loadIntro,
    loadSkills,
    loadExperienceTimeline,
    loadCertification,
} from "./contentLoader.js";

import {
    fetchMarkdown,
    parseFrontmatter,
    resolveImagePaths,
} from "./markdown.js";

import { showToast } from "./toast.js";
import { validateManifest } from "./projectValidation.js";
import {
    openModal,
    setModalBody,
    setModalError,
    closeModal,
    clearProjectFromURL,
} from "./modal.js";

let allProjects = [];
let activeFilters = getFiltersFromURL();
let allTechs = [];
let projectsLoaded = false;
let renderedFilterKey = null;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const projectGrid = document.getElementById("project-grid");
const filterContainer = document.getElementById("project-filters");
const modalRoot = document.getElementById("modal-root");

let isSyncingFromPopstate = false;
let pendingFocusProject = null;

/* ---------- helpers ---------- */

function isModalOpen() {
    return !modalRoot.classList.contains("hidden");
}

function getProjectFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("project");
}

function setProjectToURL(projectId) {
    const params = new URLSearchParams(window.location.search);
    params.set("project", projectId);

    history.pushState(
        { project: projectId },
        "",
        window.location.pathname + "?" + params.toString() + window.location.hash
    );
}

function reportLoadError(section, err) {
    console.error(`[Portfolio] Failed to load ${section}:`, err);
    showToast(`Failed to load ${section}`, { type: "error" });
}

async function getProjectBody(id) {
    const mdPath = `./content/projects/${id}.md`;
    let raw = await fetchMarkdown(mdPath);
    raw = resolveImagePaths(raw, mdPath);
    return parseFrontmatter(raw).body;
}

async function showProject(data) {
    openModal(data);
    try {
        const body = await getProjectBody(data.id);
        setModalBody(data.id, body);
    } catch (err) {
        console.error(`[Portfolio] Failed to load project ${data.id}:`, err);
        setModalError(data.id);
    }
}

function resolveProjectFromURL() {
    const projectId = getProjectFromURL();
    if (!projectId) return;

    const match = allProjects.find((p) => p.id === projectId);

    if (!match) {
        showToast("Project not found", { type: "error" });
        // Important: do not create new history entries here; just clean the URL
        clearProjectFromURL();
        // Close modal if it was open showing something else
        if (isModalOpen()) closeModal({ silent: true });
        return;
    }

    showProject(match);
}

/**
 * Sync modal strictly from current URL.
 * - If URL has valid project -> open modal
 * - If URL has no project -> close modal
 *
 * fromPopstate:
 * - true  => DO NOT modify URL/history while syncing
 * - false => used after initial load
 */
function syncModalWithURL({ fromPopstate = false } = {}) {
    if (fromPopstate) isSyncingFromPopstate = true;

    try {
        const projectId = getProjectFromURL();

        // If projects aren't loaded yet, defer: loadProjects() will call sync again.
        if (!projectsLoaded) return;

        if (!projectId) {
            // URL clean => ensure modal is closed (silently if popstate)
            if (isModalOpen()) {
                closeModal({ silent: fromPopstate });
            }
            return;
        }

        // URL has project => open modal if valid
        resolveProjectFromURL();
    } finally {
        if (fromPopstate) isSyncingFromPopstate = false;
    }
}

/* ---------- project grid skeleton ---------- */

function showGridSkeleton(count = 6) {
    projectGrid.innerHTML = "";
    for (let i = 0; i < count; i++) {
        const skeletonCard = document.createElement("div");
        skeletonCard.className =
            "border rounded-xl p-5 animate-pulse bg-gray-100 dark:bg-gray-700";
        skeletonCard.style.height = "200px";
        projectGrid.appendChild(skeletonCard);
    }
}

/* ---------- projects ---------- */

async function loadProjects() {
    renderedFilterKey = null;
    showGridSkeleton(6);

    let manifest;
    try {
        const res = await fetch("./data/projects.json");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        manifest = validateManifest(await res.json());
    } catch (err) {
        console.error("[Portfolio] Failed to load projects:", err);
        projectGrid.innerHTML = "";
        const msg = document.createElement("div");
        msg.textContent = "Unable to load projects. Please try again later.";
        msg.className =
            "text-center text-neutral-500 dark:text-neutral-400 py-10";
        msg.setAttribute("role", "status");
        projectGrid.appendChild(msg);
        showToast("Failed to load projects", { type: "error" });
        return;
    }

    allProjects = manifest.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    projectsLoaded = true;
    allTechs = [...new Set(allProjects.flatMap((p) => p.tech))].sort();
    syncFiltersWithURL();

    // After projects are loaded, sync modal from URL (direct link support)
    syncModalWithURL({ fromPopstate: false });
}

/* ---------- filters ---------- */

function renderFilters(techs) {
    const filters = ["All", ...techs];

    filters.forEach((tech) => {
        const isActive = activeFilters.includes(tech);

        let btn = Array.from(filterContainer.children).find((el) => el.dataset.tech === tech);
        if (!btn) {
            btn = document.createElement("button");
            btn.type = "button";
            btn.dataset.tech = tech;
            filterContainer.appendChild(btn);
        }
        btn.textContent = tech;
        btn.setAttribute("aria-pressed", String(isActive));
        btn.className = `
      px-3 py-1.5 text-sm border rounded-full transition
      hover:bg-neutral-100 dark:hover:bg-gray-700 focus:ring
      ${isActive
                ? "bg-neutral-900 text-white dark:bg-gray-600 dark:text-white"
                : "bg-white dark:bg-gray-800 text-neutral-900 dark:text-neutral-100"
            }
    `;

        btn.onclick = () => {
            if (tech === "All") activeFilters = ["All"];
            else {
                activeFilters = activeFilters.filter((f) => f !== "All");
                activeFilters.includes(tech)
                    ? (activeFilters = activeFilters.filter((f) => f !== tech))
                    : activeFilters.push(tech);
                if (activeFilters.length === 0) activeFilters = ["All"];
            }

            setFiltersToURL(activeFilters);
            renderFilters(techs);
            renderProjects();
        };

    });
}

/* ---------- projects rendering ---------- */

function renderProjects() {
    const filterKey = JSON.stringify([...activeFilters].sort());
    // Modal-only history changes must not rebuild cards or replay their entrance animation.
    if (filterKey === renderedFilterKey) return;
    const focusedProject = document.activeElement?.dataset?.project;
    const gridHadFocus = document.activeElement === projectGrid;
    const fragment = document.createDocumentFragment();
    const filteredProjects = allProjects.filter(
        (p) =>
            activeFilters.includes("All") ||
            activeFilters.some((f) => p.tech.includes(f))
    );

    filteredProjects.forEach((p) => {
        const card = renderProjectCard(p);
        fragment.appendChild(card);
        if (!reduceMotion.matches) {
            card.animate([{ opacity: 0, transform: "scale(0.95)" }, { opacity: 1, transform: "scale(1)" }], {
                duration: 300, easing: "ease-out",
            });
        }
    });

    if (filteredProjects.length === 0) {
        const msg = document.createElement("div");
        msg.textContent = "No projects found";
        msg.className =
            "text-center text-neutral-500 dark:text-neutral-400 py-10";
        msg.setAttribute("role", "status");
        msg.setAttribute("aria-live", "polite");
        fragment.appendChild(msg);
    }
    projectGrid.replaceChildren(fragment);
    renderedFilterKey = filterKey;
    if ((focusedProject || gridHadFocus) && !projectGrid.closest('[inert]')) {
        const replacement = Array.from(projectGrid.children).find((el) => el.dataset.project === focusedProject);
        (replacement || projectGrid).focus();
    }
}

function renderProjectCard(data) {
    const card = document.createElement("button");
    card.type = "button";
    card.dataset.project = data.id;
    card.className =
        "text-left border rounded-xl p-5 transition hover:border-neutral-400 dark:hover:border-gray-500 hover:shadow-sm focus:outline-none focus:ring bg-white dark:bg-gray-800 text-neutral-900 dark:text-neutral-100";

    const imgWrapper = document.createElement("div");
    imgWrapper.className = "relative w-full h-40 mb-4";

    const skeleton = document.createElement("div");
    skeleton.className =
        "absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg";
    imgWrapper.appendChild(skeleton);

    const img = document.createElement("img");
    img.src = data.thumbnail;
    img.alt = `${data.title} thumbnail`;
    img.loading = "lazy";
    img.className = "w-full h-40 object-cover rounded-lg";
    img.onload = () => skeleton.remove();
    img.onerror = () => {
        img.onerror = null;
        img.src = "assets/images/fallback.png";
    };

    imgWrapper.appendChild(img);
    card.appendChild(imgWrapper);

    const title = document.createElement("h3");
    title.className = "font-semibold text-base mb-1";
    title.textContent = data.title;

    const summary = document.createElement("p");
    summary.className =
        "text-sm text-neutral-600 dark:text-neutral-300 leading-snug mb-3";
    summary.textContent = data.summary;

    const tech = document.createElement("div");
    tech.className = "text-xs text-neutral-500 dark:text-neutral-400";
    tech.textContent = data.tech.join(" · ");

    card.appendChild(title);
    card.appendChild(summary);
    card.appendChild(tech);

    card.onclick = () => {
        // Push URL first so Back closes modal naturally
        setProjectToURL(data.id);
        showProject(data);
    };

    return card;
}

/* ---------- URL filters ---------- */

function getFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("tech");
    if (!raw) return ["All"];
    return raw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
}

function setFiltersToURL(filters) {
    const params = new URLSearchParams(window.location.search);
    if (filters.includes("All") || filters.length === 0) params.delete("tech");
    else params.set("tech", filters.join(","));
    const newUrl =
        window.location.pathname + (params.toString() ? `?${params}` : "") + window.location.hash;
    history.replaceState(history.state, "", newUrl);
}

function syncFiltersWithURL() {
    if (!projectsLoaded) return;
    const requested = getFiltersFromURL();
    const valid = [...new Set(requested.filter((filter) => allTechs.includes(filter)))];
    activeFilters = requested.includes("All") || !valid.length ? ["All"] : valid;
    setFiltersToURL(activeFilters);
    renderFilters(allTechs);
    renderProjects();
}

/* ---------- Theme Toggle (Light / Dark / System) ---------- */

const themeContainer = document.getElementById("theme-toggle");

const themes = [
    { value: "light", iconClass: "fa-solid fa-sun", label: "Light" },
    { value: "dark", iconClass: "fa-solid fa-moon", label: "Dark" },
    { value: "system", iconClass: "fa-solid fa-desktop", label: "System" },
];

themes.forEach(({ value, iconClass, label }) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.title = label;
    btn.setAttribute("aria-label", `${label} theme`);
    btn.dataset.theme = value;

    const iconEl = document.createElement("i");
    iconEl.className = `${iconClass} text-lg`;
    btn.appendChild(iconEl);

    btn.addEventListener("click", () => {
        try {
            if (value === "system") localStorage.removeItem("theme");
            else localStorage.setItem("theme", value);
        } catch {
            // Storage can be denied; content loading must remain independent of it.
        }

        applyTheme();
        updateButtons();
    });

    themeContainer.appendChild(btn);
});

function getStoredTheme() {
    try {
        const value = localStorage.getItem("theme");
        return ["light", "dark"].includes(value) ? value : null;
    } catch {
        return null;
    }
}

function getEffectiveTheme() {
    const stored = getStoredTheme();
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return stored === "dark" || (!stored && prefersDark) ? "dark" : "light";
}

function applyTheme() {
    document.documentElement.classList.toggle("dark", getEffectiveTheme() === "dark");
}

function updateButtons() {
    const stored = getStoredTheme() || "system";
    const effective = getEffectiveTheme();

    themeContainer.querySelectorAll("button").forEach((btn) => {
        const isSelected = btn.dataset.theme === stored;
        btn.setAttribute("aria-pressed", String(isSelected));

        btn.className =
            "p-2 rounded-full transition-all duration-200 flex items-center justify-center";

        if (isSelected) btn.classList.add("ring-2", "ring-blue-500");

        if (effective === "dark") {
            btn.classList.add("bg-gray-700", "text-gray-100", "hover:bg-gray-600");
        } else {
            btn.classList.add("bg-gray-200", "text-gray-900", "hover:bg-gray-300");
        }
    });
}

applyTheme();
updateButtons();
window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
        if (!getStoredTheme()) {
            applyTheme();
            updateButtons();
        }
    });

/* ---------- bootstrap ---------- */

loadMeta("./content/meta.md").catch((err) => reportLoadError("meta", err));
loadIntro("./content/intro.md").catch((err) => reportLoadError("intro", err));
loadProjects();
loadSkills("skills-content", "./content/skills.md").catch((err) =>
    reportLoadError("skills", err)
);
loadExperienceTimeline("experience-content", "./content/experience.md").catch((err) =>
    reportLoadError("experience", err)
);
loadCertification("certifications-content", "./content/certification.md").catch((err) =>
    reportLoadError("certifications", err)
);

/* ---------- modal events ---------- */

// Modal closure from UI
modalRoot.addEventListener("modalClosed", () => {
    // If we're syncing due to Back/Forward, do nothing (URL already changed)
    if (isSyncingFromPopstate) return;

    const projectId = getProjectFromURL();
    if (!projectId) return;

    // If we opened the modal via pushState, closing should go back (so forward re-opens)
    if (history.state && history.state.project === projectId) {
        pendingFocusProject = projectId;
        history.back();
    } else {
        // Direct-linked modal open (no state) -> just clean URL
        clearProjectFromURL();
    }
});

// Back/Forward navigation drives modal
window.addEventListener("popstate", () => {
    syncFiltersWithURL();
    syncModalWithURL({ fromPopstate: true });
    if (pendingFocusProject && !isModalOpen()) {
        const card = Array.from(projectGrid.children).find((el) => el.dataset.project === pendingFocusProject);
        (card || projectGrid).focus();
    }
    pendingFocusProject = null;
});
