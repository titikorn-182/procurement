import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchRequestBundleAttachment } from "../../lib/pdf/download-request-bundle";
import { maxAttachmentSizeBytes } from "../../app/lib/request-attachments";

const attachment = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "ใบเสนอราคา.pdf",
  mimeType: "application/pdf",
  sizeBytes: 100,
};

afterEach(() => vi.unstubAllGlobals());

describe("authenticated bundle attachment download", () => {
  it("uses the existing per-file authorization route without caching", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3])));
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchRequestBundleAttachment(attachment)).toEqual(new Uint8Array([1, 2, 3]));
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/request-attachments/${attachment.id}`,
      expect.objectContaining({
        credentials: "same-origin",
        cache: "no-store",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it.each([401, 403, 404, 500])(
    "rejects HTTP %i without downloading incomplete documents",
    async (status) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private error", { status })));
      await expect(fetchRequestBundleAttachment(attachment)).rejects.toThrow(
        status === 401 ? "เข้าสู่ระบบใหม่" : "ใบเสนอราคา.pdf",
      );
    },
  );

  it("rejects an oversized response before reading its body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("test", {
          headers: { "content-length": String(maxAttachmentSizeBytes + 1) },
        }),
      ),
    );
    await expect(fetchRequestBundleAttachment(attachment)).rejects.toThrow("20 MB");
  });

  it("handles network and timeout errors with an actionable message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("private URL", "AbortError")),
    );
    await expect(fetchRequestBundleAttachment(attachment)).rejects.toThrow(
      "อินเทอร์เน็ตและสิทธิ์เข้าถึง",
    );
  });

  it("does not accept arbitrary paths as attachment IDs", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      fetchRequestBundleAttachment({ ...attachment, id: "../../settings" }),
    ).rejects.toThrow("ข้อมูลเอกสารแนบไม่ถูกต้อง");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
