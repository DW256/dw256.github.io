import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validateProjectMetadata } from "./js/projectValidation.js";
import { extractImagesFromMarkdown } from "./js/markdown.js";

function validateAsset(src, baseDir, root) {
    try {
        if (/^https?:\/\//i.test(src)) {
            new URL(src);
            return null;
        }
        if (/^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith('//')) return `unsupported asset URL: ${src}`;
        const base = pathToFileURL(path.join(src.startsWith('/') ? root : baseDir, '_base'));
        const asset = fileURLToPath(new URL(src.replace(/^\//, ''), base));
        const relative = path.relative(root, asset);
        if (relative.startsWith('..') || path.isAbsolute(relative)) return `asset is outside site root: ${src}`;
        if (!fs.existsSync(asset) || !fs.statSync(asset).isFile()) return `missing asset: ${src}`;
        return null;
    } catch {
        return `invalid asset path: ${src}`;
    }
}

export function collectProjects(root = process.cwd()) {
    root = path.resolve(root);
    const projectsDir = path.join(root, 'content/projects');
    const files = fs.readdirSync(projectsDir)
        .filter((file) => file.endsWith('.md') && !file.endsWith('.draft.md')).sort();
    const projects = [];
    const errors = [];
    const ids = new Set();

    files.forEach((file, idx) => {
        try {
            const { data, content } = matter(fs.readFileSync(path.join(projectsDir, file), 'utf-8'));
            const issues = validateProjectMetadata(data);
            if (data.id !== path.basename(file, '.md')) issues.push('`id` must match the Markdown filename');
            if (ids.has(data.id)) issues.push(`duplicate ID: ${data.id}`);
            ids.add(data.id);
            if (typeof data.thumbnail === 'string') {
                const issue = validateAsset(data.thumbnail, root, root);
                if (issue) issues.push(issue);
            }
            for (const image of extractImagesFromMarkdown(content)) {
                const issue = validateAsset(image.src, projectsDir, root);
                if (issue) issues.push(issue);
            }
            if (issues.length) {
                errors.push(`${file}:\n- ${issues.join('\n- ')}`);
                return;
            }
            projects.push({
                id: data.id, title: data.title, summary: data.summary, tech: data.tech,
                thumbnail: data.thumbnail, order: data.order ?? idx + 1, links: data.links ?? {},
            });
        } catch (err) {
            errors.push(`${file}: ${err.message}`);
        }
    });
    if (errors.length) throw new Error(`Invalid project content:\n${errors.join('\n')}`);
    return projects.sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function generateProjects(root = process.cwd(), { validate = false, check = false } = {}) {
    const projects = collectProjects(root);
    const outputFile = path.resolve(root, 'data/projects.json');
    const output = JSON.stringify(projects, null, 2);
    if (check) {
        if (!fs.existsSync(outputFile) || fs.readFileSync(outputFile, 'utf-8').replace(/\r\n/g, '\n') !== output) {
            throw new Error('data/projects.json is stale; run npm run build:projects');
        }
    } else if (!validate) {
        fs.writeFileSync(outputFile, output, 'utf-8');
    }
    return projects;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    try {
        const projects = generateProjects(process.cwd(), {
            validate: process.argv.includes('--validate'), check: process.argv.includes('--check'),
        });
        console.log(`Successfully ${process.argv.includes('--validate') || process.argv.includes('--check') ? 'validated' : 'generated'} ${projects.length} projects`);
    } catch (err) {
        console.error(`[Portfolio] ${err.message}`);
        process.exitCode = 1;
    }
}
