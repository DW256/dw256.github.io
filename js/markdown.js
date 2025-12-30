const mdCache = new Map();

export async function fetchMarkdown(path) {
    if (mdCache.has(path)) return mdCache.get(path);

    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}`);

    const text = await res.text();
    mdCache.set(path, text);
    return text;
}

export function parseFrontmatter(md) {
    const match = md.match(/^---([\s\S]*?)---([\s\S]*)$/);
    if (!match) return { data: {}, body: md };

    const lines = match[1].split("\n");
    const body = match[2].trim();

    const data = {};
    let currentKey = null;

    function cleanValue(val) {
        if (!val) return "";
        val = val.trim();
        if ((val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))) {
            return val.slice(1, -1);
        }
        return val;
    }

    let i = 0;
    while (i < lines.length) {
        let line = lines[i];
        if (!line.trim()) {
            i++;
            continue;
        }

        if (line.startsWith("  -") && currentKey) {
            data[currentKey].push(cleanValue(line.replace("  -", "").trim()));
            i++;
            continue;
        }

        if (line.startsWith("  ") && currentKey && typeof data[currentKey] === "object") {
            const kv = line.trim().split(":");
            const key = kv[0].trim();
            const val = kv.slice(1).join(":").trim();
            data[currentKey][key] = cleanValue(val);
            i++;
            continue;
        }

        const [key, ...rest] = line.split(":");
        const value = rest.join(":").trim();

        if (!value) {
            currentKey = key.trim();
            data[currentKey] = currentKey === "links" ? {} : [];
        } else {
            currentKey = null;
            data[key.trim()] = cleanValue(value);
        }

        i++;
    }

    return { data, body };
}

export function validateProjectFrontmatter(data, sourceId) {
    const errors = [];

    if (!data.id) errors.push("missing `id`");
    if (!data.title) errors.push("missing `title`");
    if (!data.summary) errors.push("missing `summary`");
    if (!Array.isArray(data.tech)) errors.push("`tech` must be an array");
    if (!data.thumbnail) errors.push("missing `thumbnail`");

    if (data.links && typeof data.links !== "object") {
        errors.push("`links` must be an object");
    }

    if (errors.length) {
        console.warn(
            `[Portfolio] Invalid frontmatter in ${sourceId}:\n- ${errors.join("\n- ")}`
        );
        return false;
    }

    return true;
}

export function extractImagesFromMarkdown(md) {
    const regex = /!\[(.*?)\]\((.*?)\s*(?:"(.*?)")?\)/g;
    const images = [];
    let match;
    while ((match = regex.exec(md)) !== null) {
        images.push({ src: match[2], caption: match[3] || "" });
    }
    return images;
}

export function removeImagesFromMarkdown(md) {
    return md.replace(/!\[.*?\]\(.*?\)/g, "");
}

export function resolveImagePaths(mdRaw, mdPath) {
    // Ensure relative paths point correctly relative to the Markdown file
    return mdRaw.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, src) => {
        if (src.startsWith("http") || src.startsWith("/")) return match;
        const basePath = mdPath.substring(0, mdPath.lastIndexOf("/") + 1);
        return `![${alt}](${basePath}${src})`;
    });
}