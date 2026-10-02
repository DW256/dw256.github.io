export function mdToHtml(md) {
    if (!globalThis.DOMPurify || !globalThis.marked) {
        throw new Error("Markdown libraries are unavailable. Please reload when your connection is restored.");
    }
    return globalThis.DOMPurify.sanitize(globalThis.marked.parse(md));
}
