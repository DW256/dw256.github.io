import fs from "fs";
import path from "path";
import matter from "gray-matter";

const projectsDir = path.resolve("./content/projects");
const outputFile = path.resolve("./data/projects.json");

function validateProject(data, sourceId) {
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

const files = fs.readdirSync(projectsDir).filter(f => f.endsWith(".md"));

const projects = [];

files.forEach((file, idx) => {
    const fullPath = path.join(projectsDir, file);
    const raw = fs.readFileSync(fullPath, "utf-8");
    const { data } = matter(raw);

    const project = {
        id: data.id || path.basename(file, ".md"),
        title: data.title || "Untitled",
        summary: data.summary || "",
        tech: data.tech || [],
        thumbnail: data.thumbnail || "",
        order: data.order ?? idx + 1,
        links: data.links || {},
    };

    if (!validateProject(project, project.id)) return;
    projects.push(project);
});

projects.sort((a, b) => a.order - b.order);

fs.writeFileSync(outputFile, JSON.stringify(projects, null, 2), "utf-8");
console.log(`Generated ${projects.length} projects to ${outputFile}`);
