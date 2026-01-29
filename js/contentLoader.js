import { fetchMarkdown } from "./markdown.js";

/* ---------- Load meta ---------- */
export async function loadMeta(path) {
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

/* ---------- Load intro & contacts ---------- */
export async function loadIntro(path) {
    const container = document.getElementById("intro");
    const md = await fetchMarkdown(path);
    const html = marked.parse(md);

    const temp = document.createElement("div");
    temp.innerHTML = html;
    container.innerHTML = "";

    const h1 = temp.querySelector("h1");
    const p = temp.querySelector("p");

    const h1El = document.createElement("h1");
    h1El.className = "text-4xl font-bold mb-4";
    h1El.textContent = h1?.textContent ?? "";

    const pEl = document.createElement("p");
    pEl.className = "text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl";
    pEl.textContent = p?.textContent ?? "";

    container.append(h1El, pEl);

    // contacts & download handled here (same as in app.js)
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
        contactsDiv.className = "flex flex-wrap gap-x-6 gap-y-2 mt-6 text-sm text-neutral-700 dark:text-neutral-300";

        Array.from(contactsUl.querySelectorAll("a")).forEach(a => {
            const href = a.getAttribute("href");
            const text = a.textContent.trim();

            const iconClass = (() => {
                if (href.startsWith("mailto:")) return "fa-solid fa-envelope";
                if (href.includes("github.com")) return "fa-brands fa-github";
                if (href.includes("linkedin.com")) return "fa-brands fa-linkedin";
                if (href.includes("itch.io")) return "fa-brands fa-itch-io";
                if (href.includes("wa.me") || href.includes("whatsapp")) return "fa-brands fa-whatsapp";
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

    // Download buttons
    if (downloadUl) {
        const ctaWrapper = document.createElement("div");
        ctaWrapper.className = "flex flex-wrap gap-4 mt-6";

        Array.from(downloadUl.querySelectorAll("a")).forEach((a, index) => {
            const href = a.getAttribute("href");
            const label = a.textContent.trim();

            const btn = document.createElement("a");
            btn.href = href;
            btn.target = "_blank";
            btn.rel = "noopener noreferrer";

            btn.className =
                index === 0
                    ? "inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold rounded-xl " +
                    "bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition"
                    : "inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold rounded-xl " +
                    "border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition";

            const iconEl = document.createElement("i");
            iconEl.className = "fa-solid fa-angles-down";

            const span = document.createElement("span");
            span.textContent = label;

            btn.append(iconEl, span);
            ctaWrapper.appendChild(btn);
        });

        container.appendChild(ctaWrapper);
    }
}

/* ---------- Load skills ---------- */
export async function loadSkills(id, path) {
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
        if (node.tagName === "H3") {
            currentBlock = document.createElement("div");
            currentBlock.className = "mb-4 last:mb-0";

            const title = document.createElement("h3");
            title.className = "text-lg font-semibold tracking-tight mb-4 text-neutral-900 dark:text-neutral-100";
            title.textContent = node.textContent;

            currentBlock.appendChild(title);
            wrapper.appendChild(currentBlock);
        }

        if (node.tagName === "UL" && currentBlock) {
            const list = document.createElement("ul");
            list.className = "flex flex-wrap gap-3";

            Array.from(node.children).forEach(li => {
                const pill = document.createElement("li");
                pill.className = "px-3 py-1 rounded-full text-sm font-medium bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200";
                pill.textContent = li.textContent;
                list.appendChild(pill);
            });

            currentBlock.appendChild(list);
        }
    });

    container.appendChild(wrapper);
}

/* ---------- Load experience timeline ---------- */
export async function loadExperienceTimeline(id, path) {
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

            let isPresent = false;
            let next = node.nextElementSibling;
            while (next && !["H2", "H3"].includes(next.tagName)) {
                if (next.textContent.includes("Present")) { isPresent = true; break; }
                next = next.nextElementSibling;
            }

            const dotWrapper = document.createElement("span");
            dotWrapper.className = "absolute -left-3 top-1.5 w-6 h-6 flex items-center justify-center";

            const dotInner = document.createElement("span");
            dotInner.className = "w-3 h-3 rounded-full bg-blue-500 dark:bg-blue-400";
            dotWrapper.appendChild(dotInner);

            if (isPresent) {
                const ring = document.createElement("span");
                ring.className = "absolute w-6 h-6 rounded-full border-2 border-blue-300 dark:border-blue-500 animate-ping";
                dotWrapper.appendChild(ring);
            }

            entry.appendChild(dotWrapper);

            const title = document.createElement("h3");
            title.className = "font-semibold text-lg";
            title.innerHTML = node.innerHTML;
            entry.appendChild(title);

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

/* ---------- Load certifications ---------- */
const FALLBACK_ICON = "/icons/certificate.png";

export async function loadCertification(id, path) {
    const container = document.getElementById(id);
    const md = await fetchMarkdown(path);

    const blocks = md.split(/^### /gm).filter(Boolean);
    container.innerHTML = "";

    for (const block of blocks) {
        const lines = block.split("\n").map(l => l.trim()).filter(Boolean);

        const title = lines[0];

        const iconMatch = lines.find(l => l.startsWith("![icon]"))?.match(/\((.*?)\)/);
        const icon = iconMatch ? iconMatch[1] : FALLBACK_ICON;

        const meta = lines.find(l => !l.startsWith("![icon]") && !l.startsWith("[") && !l.startsWith("Skills:") && l !== title) ?? "";

        const skillsLine = lines.find(l => l.startsWith("Skills:"));
        const skills = skillsLine
            ? skillsLine.replace("Skills:", "").split(",").map(s => s.trim())
            : [];

        const links = [...block.matchAll(/\[(.*?)\]\((.*?)\)/g)]
            .map(m => ({ label: m[1], url: m[2] }));

        const credential = links.find(l => !l.label.toLowerCase().includes("pdf"))?.url;
        const pdf = links.find(l => l.label.toLowerCase().includes("pdf"))?.url;

        const card = document.createElement("div");
        card.className = "cert-card";

        card.innerHTML = `
            <img class="cert-icon"
                 src="${icon}"
                 onerror="this.src='${FALLBACK_ICON}'" />

            <div class="cert-body">
                <h3>${title}</h3>
                <div class="cert-meta">${meta}</div>

                ${skills.length ? `
                    <div class="flex flex-wrap gap-2 mt-2">
                        ${skills.map(s =>
                        `<span class=" px-2.5 py-0.5 text-xs font-medium rounded-full bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">${s}</span>`
                        ).join("")}
                    </div>
                ` : ""}

                <div class="cert-links">
                    ${credential ? `<a href="${credential}" target="_blank">Credential</a>` : ""}
                    ${pdf ? `<a href="${pdf}" target="_blank">PDF</a>` : ""}
                </div>
            </div>
        `;

        container.appendChild(card);
    }
}