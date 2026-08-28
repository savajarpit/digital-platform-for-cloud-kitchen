export type ShareToast = { showToast: (message: string, type?: "success" | "error" | "info") => void };

/** Shares plain text (+ an optional link) through the OS share sheet — pick
 * an app (WhatsApp, etc.), then a contact, then send. Falls back to copying
 * everything to the clipboard where Web Share isn't available (most desktop
 * browsers). Shared by every "Share ___" button so they all behave and fail
 * identically instead of each reimplementing this. */
export async function shareOrCopy(
  data: { title: string; text: string; url?: string },
  toast: ShareToast,
): Promise<void> {
  if (typeof navigator === "undefined") return;

  if (navigator.share) {
    try {
      await navigator.share(data);
    } catch (err) {
      // AbortError = the user closed the native share sheet — not a failure.
      if (err instanceof Error && err.name !== "AbortError") {
        toast.showToast("Couldn't open share sheet.", "error");
      }
    }
    return;
  }

  try {
    await navigator.clipboard.writeText(data.url ? `${data.text}\n${data.url}` : data.text);
    toast.showToast("Copied to clipboard", "success");
  } catch {
    toast.showToast("Couldn't copy.", "error");
  }
}
