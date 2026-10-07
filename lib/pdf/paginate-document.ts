/** Lay out complete blocks/rows before either printing or capturing an A4 page. */
export function paginateDocument(source: HTMLElement, destination: HTMLElement): void {
  const template = source.querySelector<HTMLElement>("[data-page-template]");
  const content = source.querySelector<HTMLElement>("[data-document-content]");
  if (!template || !content) throw new Error("Missing document template");

  destination.replaceChildren();
  let body!: HTMLElement;
  let activeTable: HTMLTableElement | null = null;
  let hasContent = false;

  function newPage() {
    const page = template!.firstElementChild?.cloneNode(true) as HTMLElement | undefined;
    const pageBody = page?.querySelector<HTMLElement>("[data-page-body]");
    if (!page || !pageBody) throw new Error("Missing page body");
    page.setAttribute("data-pdf-page", "");
    body = pageBody;
    destination.append(page);
    activeTable = null;
    hasContent = false;
  }

  function overflows() {
    return body.scrollHeight > body.clientHeight + 1;
  }

  function placeBlock(block: HTMLElement) {
    body.append(block);
    if (overflows() && hasContent) {
      block.remove();
      newPage();
      body.append(block);
    }
    if (overflows()) throw new Error("Document block exceeds one page");
    activeTable = null;
    hasContent = true;
  }

  function placeRow(row: HTMLTableRowElement, table: HTMLTableElement) {
    function append() {
      if (!activeTable) {
        activeTable = table.cloneNode(false) as HTMLTableElement;
        for (const child of Array.from(table.children)) {
          if (child.tagName !== "TBODY") activeTable.append(child.cloneNode(true));
        }
        activeTable.createTBody();
        body.append(activeTable);
      }
      activeTable.tBodies[0].append(row);
    }
    append();
    if (overflows() && hasContent) {
      row.remove();
      if (activeTable && activeTable.tBodies[0].rows.length === 0) activeTable.remove();
      newPage();
      append();
    }
    if (overflows()) throw new Error("Item row exceeds one page");
    hasContent = true;
  }

  newPage();
  for (const child of Array.from(content.children)) {
    if (!(child instanceof HTMLElement)) continue;
    if (child instanceof HTMLTableElement) {
      activeTable = null;
      for (const row of Array.from(child.tBodies[0].rows)) {
        placeRow(row.cloneNode(true) as HTMLTableRowElement, child);
      }
    } else if (child.hasAttribute("data-flow-text")) {
      // Thai prose has no spaces between many words; use graphemes so even a
      // 5,000-character rationale can continue without losing combining marks.
      const segments = Array.from(
        new Intl.Segmenter("th", { granularity: "grapheme" }).segment(child.textContent ?? ""),
        ({ segment }) => segment,
      );
      while (segments.length) {
        const part = child.cloneNode(false) as HTMLElement;
        body.append(part);
        let low = 0;
        let high = segments.length;
        while (low < high) {
          const mid = Math.ceil((low + high) / 2);
          part.textContent = segments.slice(0, mid).join("");
          if (overflows()) high = mid - 1;
          else low = mid;
        }
        part.textContent = segments.splice(0, low).join("");
        if (!low) part.remove();
        if (!low && !hasContent) throw new Error("No space for document text");
        if (segments.length) newPage();
        else hasContent = true;
      }
      activeTable = null;
    } else {
      placeBlock(child.cloneNode(true) as HTMLElement);
    }
  }

  const pages = destination.querySelectorAll<HTMLElement>("[data-pdf-page]");
  pages.forEach((page, index) => {
    const number = page.querySelector("[data-page-number]");
    if (number) number.textContent = `หน้า ${index + 1} / ${pages.length}`;
  });
}
