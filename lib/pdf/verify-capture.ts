/** Small antialiasing flecks are not sufficient evidence that text was drawn. */
export function hasVisibleInk(pixels: Uint8ClampedArray): boolean {
  let ink = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (
      pixels[i + 3] > 128 &&
      Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) < 200 &&
      ++ink >= 8
    )
      return true;
  }
  return false;
}

/** Opt-in verification for labelled, nonempty text/emblem regions (not borders). */
export function requiredContentIsRendered(canvas: HTMLCanvasElement, page: HTMLElement): boolean {
  const required = page.querySelectorAll<HTMLElement>("[data-pdf-required-content]");
  if (!required.length) return true;
  const context = canvas.getContext("2d");
  if (!context) return false;
  const bounds = page.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return false;
  const scaleX = canvas.width / bounds.width;
  const scaleY = canvas.height / bounds.height;
  return Array.from(required).every((element) => {
    const rect = element.getBoundingClientRect();
    const x = Math.max(0, Math.floor((rect.left - bounds.left) * scaleX));
    const y = Math.max(0, Math.floor((rect.top - bounds.top) * scaleY));
    const right = Math.min(canvas.width, Math.ceil((rect.right - bounds.left) * scaleX));
    const bottom = Math.min(canvas.height, Math.ceil((rect.bottom - bounds.top) * scaleY));
    return (
      right > x &&
      bottom > y &&
      hasVisibleInk(context.getImageData(x, y, right - x, bottom - y).data)
    );
  });
}

/** Do not offer a silently incomplete PDF if the browser drops a paint layer. */
export async function captureCompletePage(
  capture: () => Promise<HTMLCanvasElement>,
  page: HTMLElement,
  nextPaint: () => Promise<void>,
): Promise<HTMLCanvasElement> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const canvas = await capture();
    if (requiredContentIsRendered(canvas, page)) return canvas;
    if (attempt < 2) await nextPaint();
  }
  throw new Error("PDF capture omitted required document content");
}
