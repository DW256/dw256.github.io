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
    validateProjectFrontmatter,
    resolveImagePaths,
} from "./markdown.js";

import { showToast } from "./toast.js";
import { openModal, closeModal, clearProjectFromURL } from "./modal.js";

const allProjects = [];
let activeFilters = getFiltersFromURL();

const projectGrid = document.getElementById("project-grid");
const filterContainer = document.getElementById("project-filters");
const modalRoot = document.getElementById("modal-root");

let isSyncingFromPopstate = false;

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
        window.location.pathname + "?" + params.toString()
    );
}

function resolveProjectFromURL() {
    const projectId = getProjectFromURL();
    if (!projectId) return;

    const match = allProjects.find((p) => p.data.id === projectId);

    if (!match) {
        showToast("Project not found", { type: "error" });
        // Important: do not create new history entries here; just clean the URL
        clearProjectFromURL();
        // Close modal if it was open showing something else
        if (isModalOpen()) closeModal({ silent: true });
        return;
    }

    openModal(match.data, match.body);
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
        if (allProjects.length === 0) return;

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
    showGridSkeleton(6);

    const res = await fetch("./data/projects.json");
    const manifest = await res.json();

    for (const entry of manifest.sort((a, b) => a.order - b.order)) {
        const mdPath = `./content/projects/${entry.id}.md`;
        let raw = await fetchMarkdown(mdPath);
        raw = resolveImagePaths(raw, mdPath);
        const { data, body } = parseFrontmatter(raw);
        if (!validateProjectFrontmatter(data, entry.id)) return;
        allProjects.push({ data, body });
    }

    const allTechs = [...new Set(allProjects.flatMap((p) => p.data.tech))].sort();
    activeFilters = activeFilters.filter((f) => f === "All" || allTechs.includes(f));
    if (activeFilters.length === 0) {
        activeFilters = ["All"];
        setFiltersToURL(activeFilters);
    }

    renderFilters(allTechs);
    renderProjects();

    // After projects are loaded, sync modal from URL (direct link support)
    syncModalWithURL({ fromPopstate: false });
}

/* ---------- filters ---------- */

function renderFilters(techs) {
    filterContainer.innerHTML = "";

    const filters = ["All", ...techs];

    filters.forEach((tech) => {
        const isActive = activeFilters.includes(tech);

        const btn = document.createElement("button");
        btn.textContent = tech;
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

        filterContainer.appendChild(btn);
    });
}

/* ---------- projects rendering ---------- */

function renderProjects() {
    const oldCards = Array.from(projectGrid.children);

    oldCards.forEach((card) => {
        card.style.transition = "opacity 0.3s, transform 0.3s";
        card.style.opacity = 0;
        card.style.transform = "scale(0.95)";
        setTimeout(() => card.remove(), 300);
    });

    const filteredProjects = allProjects.filter(
        (p) =>
            activeFilters.includes("All") ||
            activeFilters.some((f) => p.data.tech.includes(f))
    );

    filteredProjects.forEach((p) => {
        const card = renderProjectCard(p.data, p.body);
        card.style.opacity = 0;
        card.style.transform = "scale(0.95)";
        projectGrid.appendChild(card);

        requestAnimationFrame(() => {
            card.style.transition = "opacity 0.3s, transform 0.3s";
            card.style.opacity = 1;
            card.style.transform = "scale(1)";
        });
    });

    if (filteredProjects.length === 0) {
        const msg = document.createElement("div");
        msg.textContent = "No projects found";
        msg.className =
            "text-center text-neutral-500 dark:text-neutral-400 py-10 opacity-0 transition-opacity duration-300";
        msg.setAttribute("role", "status");
        msg.setAttribute("aria-live", "polite");
        projectGrid.appendChild(msg);
        requestAnimationFrame(() => (msg.style.opacity = 1));
    }
}

function renderProjectCard(data, body) {
    const card = document.createElement("button");
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
    img.loading = "lazy";
    img.className = "w-full h-40 object-cover rounded-lg";
    img.onload = () => skeleton.remove();
    img.onerror = () => (img.src = "assets/images/fallback.png");

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
        openModal(data, body);
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
        window.location.pathname + (params.toString() ? `?${params}` : "");
    history.replaceState(null, "", newUrl);
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
    btn.dataset.theme = value;

    const iconEl = document.createElement("i");
    iconEl.className = `${iconClass} text-lg`;
    btn.appendChild(iconEl);

    btn.addEventListener("click", () => {
        if (value === "system") localStorage.removeItem("theme");
        else localStorage.theme = value;

        applyTheme();
        updateButtons();
    });

    themeContainer.appendChild(btn);
});

function getEffectiveTheme() {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return stored === "dark" || (!stored && prefersDark) ? "dark" : "light";
}

function applyTheme() {
    document.documentElement.classList.toggle("dark", getEffectiveTheme() === "dark");
}

function updateButtons() {
    const stored = localStorage.getItem("theme") || "system";
    const effective = getEffectiveTheme();

    themeContainer.querySelectorAll("button").forEach((btn) => {
        const isSelected = btn.dataset.theme === stored;

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
        if (!localStorage.getItem("theme")) {
            applyTheme();
            updateButtons();
        }
    });

/* ---------- bootstrap ---------- */

loadMeta("./content/meta.md");
loadIntro("./content/intro.md");
loadProjects();
loadSkills("skills-content", "./content/skills.md");
loadExperienceTimeline("experience-content", "./content/experience.md");
loadCertification("certifications-content","./content/certification.md");

/* ---------- modal events ---------- */

// Modal closure from UI
modalRoot.addEventListener("modalClosed", () => {
    // If we're syncing due to Back/Forward, do nothing (URL already changed)
    if (isSyncingFromPopstate) return;

    const projectId = getProjectFromURL();
    if (!projectId) return;

    // If we opened the modal via pushState, closing should go back (so forward re-opens)
    if (history.state && history.state.project === projectId) {
        history.back();
    } else {
        // Direct-linked modal open (no state) -> just clean URL
        clearProjectFromURL();
    }
});

// Back/Forward navigation drives modal
window.addEventListener("popstate", () => {
    syncModalWithURL({ fromPopstate: true });
});
