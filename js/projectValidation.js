const isString = (value) => typeof value === 'string' && value.trim().length > 0;
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export function validateProjectMetadata(data) {
    if (!isObject(data)) return ['project must be an object'];
    const errors = [];
    for (const key of ['id', 'title', 'summary', 'thumbnail']) {
        if (!isString(data[key])) errors.push(`\`${key}\` must be a non-empty string`);
    }
    if (isString(data.id) && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.id)) {
        errors.push('`id` must be a lowercase, hyphen-separated slug');
    }
    if (!Array.isArray(data.tech) || !data.tech.every(isString)) {
        errors.push('`tech` must be an array of non-empty strings');
    }
    if (data.order !== undefined && (typeof data.order !== 'number' || !Number.isFinite(data.order))) {
        errors.push('`order` must be a finite number');
    }
    if (data.links !== undefined) {
        if (!isObject(data.links)) errors.push('`links` must be an object');
        else for (const [key, value] of Object.entries(data.links)) {
            try {
                if (!isString(value) || !['https:', 'http:'].includes(new URL(value).protocol)) throw new Error();
            } catch {
                errors.push(`link \`${key}\` must be an HTTP(S) URL`);
            }
        }
    }
    return errors;
}

export function validateManifest(manifest) {
    if (!Array.isArray(manifest)) throw new Error('Project manifest must be an array');
    const ids = new Set();
    for (const project of manifest) {
        const errors = validateProjectMetadata(project);
        if (ids.has(project?.id)) errors.push('duplicate project ID');
        if (errors.length) throw new Error(`Invalid project manifest: ${errors.join('; ')}`);
        ids.add(project.id);
    }
    return manifest;
}
