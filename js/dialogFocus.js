/* Shared by the project dialog and its nested image viewer. */
function isHiddenByDetails(element) {
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        if (parent.tagName === 'DETAILS' && !parent.open &&
            !parent.querySelector(':scope > summary')?.contains(element)) return true;
    }
    return false;
}

export function getFocusableElements(root) {
    return Array.from(root.querySelectorAll(
        'a[href], button, input, textarea, select, summary, [tabindex]'
    )).filter((el) => el.tabIndex >= 0 && !el.matches(':disabled') &&
        !el.closest('[inert], [hidden], [aria-hidden="true"]') &&
        !isHiddenByDetails(el) &&
        el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden');
}

export function trapFocus(event, root) {
    if (event.key !== 'Tab') return;
    const elements = getFocusableElements(root);
    const first = elements[0];
    const last = elements[elements.length - 1];
    if (!first) {
        event.preventDefault();
        root.focus();
    } else if (!elements.includes(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}

export function makeBackgroundInert(dialog) {
    const previous = Array.from(document.body.children)
        .filter((el) => el !== dialog && !el.matches('script'))
        .map((el) => [el, el.inert]);
    previous.forEach(([el]) => { el.inert = true; });
    return () => previous.forEach(([el, inert]) => { el.inert = inert; });
}

export function restoreFocus(element, fallback) {
    if (element?.isConnected && (element.tabIndex >= 0 || element.hasAttribute('tabindex')) &&
        !element.matches(':disabled') && !element.closest('[inert]') &&
        !isHiddenByDetails(element) && element.getClientRects().length) {
        element.focus({ preventScroll: true });
    } else {
        fallback?.focus({ preventScroll: true });
    }
}
