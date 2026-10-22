// Copying the draft into the 公众号 editor: rich HTML with a plain-text fallback. ClipboardItem is the
// supported path; the hidden contentEditable + execCommand is the fallback older browsers need.
export async function copyRich(html: string, text: string): Promise<boolean> {
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
      return true;
    }
  } catch {
    // Fall through to the selection-based path.
  }
  const holder = document.createElement("div");
  holder.contentEditable = "true";
  holder.innerHTML = html;
  holder.style.position = "fixed";
  holder.style.left = "-9999px";
  holder.style.top = "0";
  document.body.appendChild(holder);
  const range = document.createRange();
  range.selectNodeContents(holder);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } finally {
    selection?.removeAllRanges();
    holder.remove();
  }
  if (!copied) await navigator.clipboard?.writeText(text);
  return copied;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
