export function mdToHtml(md) {
    if (!globalThis.DOMPurify || !globalThis.marked) {
        const error = new Error("Markdown libraries are unavailable. Please reload when your connection is restored.");
        error.code = "MARKDOWN_UNAVAILABLE";
        throw error;
    }
    return globalThis.DOMPurify.sanitize(globalThis.marked.parse(md));
}
