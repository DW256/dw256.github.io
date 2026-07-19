export function mdToHtml(md) {
    return DOMPurify.sanitize(marked.parse(md));
}
