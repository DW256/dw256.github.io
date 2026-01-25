import {
    fetchMarkdown,
    parseFrontmatter,
    validateProjectFrontmatter,
    resolveImagePaths
} from "./markdown.js";

import { showToast } from "./toast.js";
import { openModal, clearProjectFromURL } from "./modal.js";

const allProjects = [];
let activeFilters = getFiltersFromURL();

const projectGrid = document.getElementById("project-grid");
const filterContainer = document.getElementById("project-filters");

/* ---------- helpers ---------- */

function renderLinks(links) {
    if (!links || Object.keys(links).length === 0) return "";

    return `
    <div class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-3">
      ${Object.entries(links).map(([key, url]) => `
        <a href="${url}" target="_blank" rel="noopener"
           class="px-4 py-2 border rounded-md text-sm hover:bg-neutral-100 dark:hover:bg-gray-700 focus:ring">
          ${key.charAt(0).toUpperCase() + key.slice(1)}
        </a>
      `).join("")}
    </div>
  `;
}

function resolveProjectFromURL({ replaceState = true } = {}) {
    const projectId = getProjectFromURL();
    if (!projectId) return;

    const match = allProjects.find(p => p.data.id === projectId);

    if (!match) {
        showToast("Project not found", { type: "error" });
        clearProjectFromURL();
        return;
    }

    openModal(match.data, match.body, { replaceState });
}

/* ---------- project grid skeleton ---------- */

function showGridSkeleton(count = 6) {
    projectGrid.innerHTML = "";
    for (let i = 0; i < count; i++) {
        const skeletonCard = document.createElement("div");
        skeletonCard.className = "border rounded-xl p-5 animate-pulse bg-gray-100 dark:bg-gray-700";
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

    const allTechs = [...new Set(allProjects.flatMap(p => p.data.tech))].sort();
    activeFilters = activeFilters.filter(f => f === 'All' || allTechs.includes(f));
    if (activeFilters.length === 0) {
        activeFilters = ['All'];
        setFiltersToURL(activeFilters);
    }

    renderFilters(allTechs);
    renderProjects();

    resolveProjectFromURL({ replaceState: true });
}

/* ---------- filters ---------- */

function renderFilters(techs) {
    filterContainer.innerHTML = "";

    const filters = ['All', ...techs];

    filters.forEach(tech => {
        const isActive = activeFilters.includes(tech);

        const btn = document.createElement("button");
        btn.textContent = tech;
        btn.className = `
            px-3 py-1.5 text-sm border rounded-full transition
            hover:bg-neutral-100 dark:hover:bg-gray-700 focus:ring
            ${isActive ? 'bg-neutral-900 text-white dark:bg-gray-600 dark:text-white' : 'bg-white dark:bg-gray-800 text-neutral-900 dark:text-neutral-100'}
        `;

        btn.onclick = () => {
            if (tech === 'All') activeFilters = ['All'];
            else {
                activeFilters = activeFilters.filter(f => f !== 'All');
                activeFilters.includes(tech)
                    ? activeFilters = activeFilters.filter(f => f !== tech)
                    : activeFilters.push(tech);
                if (activeFilters.length === 0) activeFilters = ['All'];
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

    oldCards.forEach(card => {
        card.style.transition = "opacity 0.3s, transform 0.3s";
        card.style.opacity = 0;
        card.style.transform = "scale(0.95)";
        setTimeout(() => card.remove(), 300);
    });

    const filteredProjects = allProjects.filter(p =>
        activeFilters.includes('All') ||
        activeFilters.some(f => p.data.tech.includes(f))
    );

    filteredProjects.forEach(p => {
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
        msg.className = "text-center text-neutral-500 dark:text-neutral-400 py-10 opacity-0 transition-opacity duration-300";
        msg.setAttribute("role", "status");
        msg.setAttribute("aria-live", "polite");
        projectGrid.appendChild(msg);
        requestAnimationFrame(() => msg.style.opacity = 1);
    }
}

function renderProjectCard(data, body) {
    const card = document.createElement("button");
    card.className =
        "text-left border rounded-xl p-5 transition hover:border-neutral-400 dark:hover:border-gray-500 hover:shadow-sm focus:outline-none focus:ring bg-white dark:bg-gray-800 text-neutral-900 dark:text-neutral-100";

    const imgWrapper = document.createElement("div");
    imgWrapper.className = "relative w-full h-40 mb-4";

    const skeleton = document.createElement("div");
    skeleton.className = "absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg";
    imgWrapper.appendChild(skeleton);

    const img = document.createElement("img");
    img.src = data.thumbnail;
    img.loading = "lazy";
    img.className = "w-full h-40 object-cover rounded-lg";
    img.onload = () => skeleton.remove();
    img.onerror = () => img.src = "assets/images/fallback.png";

    imgWrapper.appendChild(img);
    card.appendChild(imgWrapper);

    const title = document.createElement("h3");
    title.className = "font-semibold text-base mb-1";
    title.textContent = data.title;

    const summary = document.createElement("p");
    summary.className = "text-sm text-neutral-600 dark:text-neutral-300 leading-snug mb-3";
    summary.textContent = data.summary;

    const tech = document.createElement("div");
    tech.className = "text-xs text-neutral-500 dark:text-neutral-400";
    tech.textContent = data.tech.join(" · ");

    card.appendChild(title);
    card.appendChild(summary);
    card.appendChild(tech);

    card.onclick = () => {
        setProjectToURL(data.id);
        openModal(data, body);
    };


    return card;
}

/* ---------- URL filters ---------- */

function getFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("tech");
    if (!raw) return ['All'];
    return raw.split(",").map(t => t.trim()).filter(Boolean);
}

function setFiltersToURL(filters) {
    const params = new URLSearchParams(window.location.search);
    if (filters.includes('All') || filters.length === 0) params.delete("tech");
    else params.set("tech", filters.join(","));
    const newUrl = window.location.pathname + (params.toString() ? `?${params}` : "");
    history.replaceState(null, "", newUrl);
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


/* ---------- Theme Toggle (Light / Dark / System) ---------- */

const themeContainer = document.getElementById("theme-toggle");

const themes = [
    { value: "light", iconClass: "fa-solid fa-sun", label: "Light" },
    { value: "dark", iconClass: "fa-solid fa-moon", label: "Dark" },
    { value: "system", iconClass: "fa-solid fa-desktop", label: "System" },
];

// Create buttons
themes.forEach(({ value, iconClass, label }) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.title = label;
    btn.dataset.theme = value;

    // Icon element
    const iconEl = document.createElement("i");
    iconEl.className = `${iconClass} text-lg`; // adjust size with text-lg
    btn.appendChild(iconEl);

    btn.addEventListener("click", () => {
        if (value === "system") localStorage.removeItem("theme");
        else localStorage.theme = value;

        applyTheme();
        updateButtons();
    });

    themeContainer.appendChild(btn);
});

// Get the current effective theme
function getEffectiveTheme() {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return stored === "dark" || (!stored && prefersDark) ? "dark" : "light";
}

// Apply theme (toggle dark class)
function applyTheme() {
    document.documentElement.classList.toggle("dark", getEffectiveTheme() === "dark");
}

// Update all buttons: color according to effective theme, ring for selected
function updateButtons() {
    const stored = localStorage.getItem("theme") || "system";
    const effective = getEffectiveTheme();

    themeContainer.querySelectorAll("button").forEach(btn => {
        const isSelected = btn.dataset.theme === stored;

        btn.className = `p-2 rounded-full transition-all duration-200 flex items-center justify-center`;

        // Ring if selected
        if (isSelected) btn.classList.add("ring-2", "ring-blue-500");

        // Theme background/text
        if (effective === "dark") {
            btn.classList.add("bg-gray-700", "text-gray-100", "hover:bg-gray-600");
        } else {
            btn.classList.add("bg-gray-200", "text-gray-900", "hover:bg-gray-300");
        }
    });
}

// Initialize
applyTheme();
updateButtons();
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (!localStorage.getItem("theme")) {
        applyTheme();
        updateButtons();
    }
});

/* ---------- parse sections ---------- */

async function loadStatic(id, path) {
    const el = document.getElementById(id);
    const md = await fetchMarkdown(path);
    el.innerHTML = marked.parse(md);
}

async function loadIntro(path) {
    const container = document.getElementById("intro");
    const md = await fetchMarkdown(path);
    const html = marked.parse(md);

    const temp = document.createElement("div");
    temp.innerHTML = html;

    container.innerHTML = "";

    // Title + subtitle
    const h1 = temp.querySelector("h1");
    const p = temp.querySelector("p");

    const h1El = document.createElement("h1");
    h1El.className = "text-4xl font-bold mb-4";
    h1El.textContent = h1?.textContent ?? "";

    const pEl = document.createElement("p");
    pEl.className = "text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl";
    pEl.textContent = p?.textContent ?? "";

    container.append(h1El, pEl);

    // Contacts
    const allUls = Array.from(temp.querySelectorAll("ul"));
    const downloadHeader = Array.from(temp.querySelectorAll("h2"))
        .find(h => /^download$/i.test(h.textContent.trim()));

    const downloadUl = downloadHeader
        ? downloadHeader.nextElementSibling?.tagName === "UL"
            ? downloadHeader.nextElementSibling
            : null
        : null;

    const contactsUl = allUls.find(ul => ul !== downloadUl);

    if (contactsUl) {
        const contactsDiv = document.createElement("div");
        contactsDiv.className =
            "flex flex-wrap gap-x-6 gap-y-2 mt-6 text-sm text-neutral-700 dark:text-neutral-300";

        Array.from(contactsUl.querySelectorAll("a")).forEach(a => {
            const href = a.getAttribute("href");
            const text = a.textContent.trim();

            const iconClass = (() => {
                if (href.startsWith("mailto:")) return "fa-solid fa-envelope";
                if (href.includes("github.com")) return "fa-brands fa-github";
                if (href.includes("linkedin.com")) return "fa-brands fa-linkedin";
                if (href.includes("itch.io")) return "fa-brands fa-itch-io";
                if (href.includes("wa.me" || "whatsapp")) return "fa-brands fa-whatsapp";
                return "fa-solid fa-link";
            })();

            const linkEl = document.createElement("a");
            linkEl.href = href;
            linkEl.target = "_blank";
            linkEl.rel = "noopener noreferrer";
            linkEl.className = "hover:underline flex items-center gap-2";

            const iconEl = document.createElement("i");
            iconEl.className = iconClass + " text-base";

            const span = document.createElement("span");
            span.textContent = text;

            linkEl.append(iconEl, span);
            contactsDiv.appendChild(linkEl);
        });

        container.appendChild(contactsDiv);
    }

    // Download section buttons
    if (downloadUl) {
        const ctaWrapper = document.createElement("div");
        ctaWrapper.className = "flex flex-wrap gap-4 mt-6";

        Array.from(downloadUl.querySelectorAll("a")).forEach((a, index) => {
            const href = a.getAttribute("href");
            const text = a.textContent.trim();

            const btn = document.createElement("a");
            btn.href = href;
            btn.target = "_blank";
            btn.rel = "noopener noreferrer";
            btn.textContent = text;

            btn.className =
                index === 0
                    ? "inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl " +
                    "bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition"
                    : "inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl " +
                    "border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition";

            ctaWrapper.appendChild(btn);
        });

        container.appendChild(ctaWrapper);
    }
}

async function loadMeta(path) {
    const md = await fetchMarkdown(path);
    const temp = document.createElement("div");
    temp.innerHTML = marked.parse(md);

    const h1 = temp.querySelector("h1");
    if (h1) document.title = h1.textContent;

    const p = temp.querySelector("p");
    if (p) {
        let descEl = document.querySelector("meta[name='description']");
        if (!descEl) {
            descEl = document.createElement("meta");
            descEl.name = "description";
            document.head.appendChild(descEl);
        }
        descEl.content = p.textContent;
    }
}

async function loadSkills(id, path) {
    const container = document.getElementById(id);
    if (!container) return;

    const raw = await fetchMarkdown(path);
    const html = marked.parse(raw);

    const temp = document.createElement("div");
    temp.innerHTML = html;

    container.innerHTML = "";

    const wrapper = document.createElement("div");

    let currentBlock = null;

    Array.from(temp.children).forEach(node => {
        // Category title
        if (node.tagName === "H3") {
            currentBlock = document.createElement("div");
            currentBlock.className = "mb-4 last:mb-0";

            const title = document.createElement("h3");
            title.className =
                "text-lg font-semibold tracking-tight mb-4 " +
                "text-neutral-900 dark:text-neutral-100";
            title.textContent = node.textContent;

            currentBlock.appendChild(title);
            wrapper.appendChild(currentBlock);
        }

        // Skills list
        if (node.tagName === "UL" && currentBlock) {
            const list = document.createElement("ul");
            list.className = "flex flex-wrap gap-3";

            Array.from(node.children).forEach(li => {
                const pill = document.createElement("li");
                pill.className =
                    "px-3 py-1 rounded-full text-sm font-medium " +
                    "bg-neutral-100 text-neutral-800 " +
                    "dark:bg-neutral-700 dark:text-neutral-200";

                pill.textContent = li.textContent;
                list.appendChild(pill);
            });

            currentBlock.appendChild(list);
        }
    });

    container.appendChild(wrapper);
}

async function loadExperienceTimeline(id, path) {
    const container = document.getElementById(id);
    const raw = await fetchMarkdown(path);

    const html = marked.parse(raw);
    const temp = document.createElement("div");
    temp.innerHTML = html;

    container.innerHTML = "";
    const timeline = document.createElement("div");
    timeline.className = "relative border-l-2 border-gray-300 dark:border-gray-600 ml-6 space-y-8";

    Array.from(temp.children).forEach(node => {
        if (node.tagName === "H2" || node.tagName === "H3") {
            const entry = document.createElement("div");
            entry.className = "relative pl-6";

            // Determine if entry is current/present
            let isPresent = false;
            let next = node.nextElementSibling;
            while (next && !["H2", "H3"].includes(next.tagName)) {
                if (next.textContent.includes("Present")) {
                    isPresent = true;
                    break;
                }
                next = next.nextElementSibling;
            }

            // Dot marker
            // Dot marker wrapper
            const dotWrapper = document.createElement("span");
            dotWrapper.className = "absolute -left-3 top-1.5 w-6 h-6 flex items-center justify-center";

            // Inner dot
            const dotInner = document.createElement("span");
            dotInner.className = "w-3 h-3 rounded-full bg-blue-500 dark:bg-blue-400";
            dotWrapper.appendChild(dotInner);

            // Pulsing ring for present
            if (isPresent) {
                const ring = document.createElement("span");
                ring.className = "absolute w-6 h-6 rounded-full border-2 border-blue-300 dark:border-blue-500 animate-ping";
                dotWrapper.appendChild(ring);
            }

            entry.appendChild(dotWrapper);

            // Title
            const title = document.createElement("h3");
            title.className = "font-semibold text-lg";
            title.innerHTML = node.innerHTML;
            entry.appendChild(title);

            // Description
            const descNodes = [];
            let descNext = node.nextElementSibling;
            while (descNext && !["H2", "H3"].includes(descNext.tagName)) {
                descNodes.push(descNext.cloneNode(true));
                descNext = descNext.nextElementSibling;
            }

            const desc = document.createElement("div");
            desc.className = "mt-1 text-neutral-700 dark:text-neutral-300 space-y-1";
            descNodes.forEach(n => desc.appendChild(n));
            entry.appendChild(desc);

            timeline.appendChild(entry);
        }
    });

    container.appendChild(timeline);
}

/* ---------- bootstrap ---------- */

loadMeta("./content/meta.md");
loadIntro("./content/intro.md");
loadProjects();
loadSkills("skills-content", "./content/skills.md");
loadExperienceTimeline("experience-content", "./content/experience.md");

window.addEventListener("popstate", () => {
    if (!getProjectFromURL()) {
        closeModal();
        return;
    }

    resolveProjectFromURL({ replaceState: true });
});