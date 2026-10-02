export function loadErrorMessage(section, error) {
    const prefix = `Unable to load ${section}.`;
    if (error?.code === "MARKDOWN_UNAVAILABLE") {
        return `${prefix} The Markdown libraries did not load. Check your connection and reload the page.`;
    }
    if (globalThis.navigator?.onLine === false) {
        return `${prefix} You appear to be offline. Reconnect and try again.`;
    }
    if (error?.status >= 500) return `${prefix} The server is temporarily unavailable. Please retry.`;
    if (error instanceof TypeError) return `${prefix} Check your connection and try again.`;
    return `${prefix} Please try again.`;
}

export function renderLoadError(container, section, error, retry) {
    const wrapper = document.createElement("div");
    wrapper.className = "load-error";
    const message = document.createElement("p");
    message.textContent = loadErrorMessage(section, error);
    message.setAttribute("role", "status");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "load-retry";
    const reload = error?.code === "MARKDOWN_UNAVAILABLE";
    button.textContent = reload ? "Reload page" : "Retry";
    button.setAttribute("aria-label", reload ? "Reload page" : `Retry ${section}`);
    button.onclick = () => {
        button.disabled = true;
        if (reload) window.location.reload();
        else retry();
    };
    wrapper.append(message, button);
    container.replaceChildren(wrapper);
    return button;
}
