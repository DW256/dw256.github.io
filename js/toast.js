let toastTimer;

export function showToast(message, options = {}) {
    const {
        duration = 3500,
        type = "default", // "default" | "error"
    } = options;

    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = message;

    toast.classList.remove("toast--error");
    if (type === "error") {
        toast.classList.add("toast--error");
    }

    toast.classList.add("toast--visible");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove("toast--visible");
    }, duration);
}
