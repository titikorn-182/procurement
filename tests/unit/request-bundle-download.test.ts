import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchRequestBundleAttachment,
  loadRequestBundleAttachment,
} from "../../lib/pdf/download-request-bundle";
import { toLocalBundleAttachments } from "../../lib/pdf/bundle-attachments";
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

describe("unsent W119 attachment selections", () => {
  it("reads the selected file locally, without uploading or contacting the server", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "ใบเสนอราคา.pdf");
    const selections = [{ id: attachment.id, file }];
    const [input] = toLocalBundleAttachments(selections);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(input.mimeType).toBe("application/pdf");
    expect(input.file).toBe(file);
    expect(await loadRequestBundleAttachment(input)).toEqual(new Uint8Array([1, 2, 3]));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(selections[0].file).toBe(file);
  });

  it("keeps saved attachments on the authenticated route", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(new Uint8Array([4, 5])));
    vi.stubGlobal("fetch", fetchMock);
    expect(await loadRequestBundleAttachment(attachment)).toEqual(new Uint8Array([4, 5]));
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/request-attachments/${attachment.id}`,
      expect.objectContaining({ credentials: "same-origin", cache: "no-store" }),
    );
  });

  it("rejects mismatched local-file metadata before reading", async () => {
    const file = new File(["sample"], "ใบเสนอราคา.pdf", { type: "application/pdf" });
    const read = vi.spyOn(file, "arrayBuffer");
    await expect(loadRequestBundleAttachment({ ...attachment, file })).rejects.toThrow(
      "ข้อมูลไฟล์ “ใบเสนอราคา.pdf” ไม่ตรงกัน",
    );
    expect(read).not.toHaveBeenCalled();
  });

  it("names unreadable local files without exposing internal errors", async () => {
    const file = new File(["sample"], "ใบเสนอราคา.pdf");
    vi.spyOn(file, "arrayBuffer").mockRejectedValue(new Error("private local path"));
    const [input] = toLocalBundleAttachments([{ id: attachment.id, file }]);
    await expect(loadRequestBundleAttachment(input)).rejects.toThrow(
      "อ่านไฟล์ “ใบเสนอราคา.pdf” ไม่สำเร็จ กรุณาเลือกไฟล์แนบใหม่",
    );
  });

  it("preserves selection order and refuses local Word/Excel files", async () => {
    const inputs = toLocalBundleAttachments([
      { id: attachment.id, file: new File(["sample"], "ใบเสนอราคา.pdf") },
      {
        id: "22222222-2222-4222-8222-222222222222",
        file: new File(["sample"], "รายละเอียด.xlsx"),
      },
    ]);
    expect(inputs.map((input) => input.name)).toEqual(["ใบเสนอราคา.pdf", "รายละเอียด.xlsx"]);
    await expect(loadRequestBundleAttachment(inputs[1])).rejects.toThrow(
      "กรุณาแปลง Word/Excel เป็น PDF",
    );
  });
});
