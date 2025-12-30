import fs from "fs";
import path from "path";
import matter from "gray-matter";

const projectsDir = path.resolve("./content/projects");
const outputFile = path.resolve("./data/projects.json");

// Read all markdown files
const files = fs.readdirSync(projectsDir).filter(f => f.endsWith(".md"));

// Generate projects array
const projects = files.map((file, idx) => {
    const fullPath = path.join(projectsDir, file);
    const raw = fs.readFileSync(fullPath, "utf-8");
    const { data } = matter(raw);

    // Parse frontmatter fields
    const id = data.id || path.basename(file, ".md");
    const title = data.title || "Untitled";
    const tech = data.tech || [];
    const thumbnail = data.thumbnail || "";
    const order = data.order ?? idx + 1;

    // Optional fields for future use:
    // const summary = data.summary || "";
    // const links = data.links || {};
    // const screenshots = data.screenshots || [];

    return {
        id,
        title,
        tech,
        thumbnail,
        order,
        // summary,
        // links,
        // screenshots
    };
});

// Sort by order
projects.sort((a, b) => a.order - b.order);

// Write to JSON
fs.writeFileSync(outputFile, JSON.stringify(projects, null, 2), "utf-8");
console.log(`Generated ${projects.length} projects to ${outputFile}`);
