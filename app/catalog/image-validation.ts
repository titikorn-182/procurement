import {
  CATALOG_IMAGE_MAX_BYTES,
  CATALOG_IMAGE_MAX_DIMENSION,
  CATALOG_IMAGE_MAX_PIXELS,
} from "./schema";

type ImageDetails = {
  contentType: "image/png" | "image/jpeg" | "image/webp";
  extension: "png" | "jpg" | "webp";
  width: number;
  height: number;
};
type ImageResult = { image: ImageDetails; error: null } | { image: null; error: string };

function pngDimensions(bytes: Uint8Array): [number, number] | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    bytes.length < 45 ||
    ![137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value) ||
    view.getUint32(8) !== 13 ||
    String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR"
  )
    return null;
  let offset = 8;
  let imageData = false;
  let ended = false;
  while (offset + 12 <= bytes.length) {
    const size = view.getUint32(offset);
    if (size > bytes.length - offset - 12) return null;
    const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
    // Animated images and their extra frames are outside this upload contract.
    if (type === "acTL") return null;
    if (type === "IDAT" && size > 0) imageData = true;
    offset += size + 12;
    if (type === "IEND") {
      ended = size === 0 && offset === bytes.length;
      break;
    }
  }
  return imageData && ended ? [view.getUint32(16), view.getUint32(20)] : null;
}

function jpegDimensions(bytes: Uint8Array): [number, number] | null {
  if (
    bytes.length < 12 ||
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8 ||
    bytes.at(-2) !== 0xff ||
    bytes.at(-1) !== 0xd9
  )
    return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes[offset++] !== 0xff) return null;
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xda || marker === 0xd9) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) return null;
    const size = view.getUint16(offset);
    if (size < 2 || offset + size > bytes.length) return null;
    if (
      [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
        marker,
      )
    ) {
      if (size < 8) return null;
      return [view.getUint16(offset + 5), view.getUint16(offset + 3)];
    }
    offset += size;
  }
  return null;
}

function webpDimensions(bytes: Uint8Array): [number, number] | null {
  if (bytes.length < 30) return null;
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    ascii(0, 4) !== "RIFF" ||
    ascii(8, 12) !== "WEBP" ||
    view.getUint32(4, true) + 8 !== bytes.length
  )
    return null;
  let dimensions: [number, number] | null = null;
  let imageData = false;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const type = ascii(offset, offset + 4);
    const size = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (size > bytes.length - start) return null;
    if (type === "ANIM" || type === "ANMF") return null;
    if (type === "VP8X") {
      if (size !== 10 || (bytes[start] & 2) !== 0) return null;
      const uint24 = (index: number) =>
        bytes[index] + bytes[index + 1] * 256 + bytes[index + 2] * 65536;
      dimensions = [uint24(start + 4) + 1, uint24(start + 7) + 1];
    } else if (type === "VP8 ") {
      if (
        size < 10 ||
        bytes[start + 3] !== 0x9d ||
        bytes[start + 4] !== 0x01 ||
        bytes[start + 5] !== 0x2a
      )
        return null;
      const encoded: [number, number] = [
        view.getUint16(start + 6, true) & 0x3fff,
        view.getUint16(start + 8, true) & 0x3fff,
      ];
      if (dimensions && (dimensions[0] !== encoded[0] || dimensions[1] !== encoded[1])) return null;
      dimensions = encoded;
      imageData = true;
    } else if (type === "VP8L") {
      if (size < 5 || bytes[start] !== 0x2f) return null;
      const bits = view.getUint32(start + 1, true);
      if (bits >>> 29 !== 0) return null;
      const encoded: [number, number] = [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
      if (dimensions && (dimensions[0] !== encoded[0] || dimensions[1] !== encoded[1])) return null;
      dimensions = encoded;
      imageData = true;
    }
    offset = start + size + (size % 2);
  }
  return imageData && offset === bytes.length ? dimensions : null;
}

/** Never trust filename/extension or the client MIME type to identify image bytes. */
export function validateCatalogImage(bytes: Uint8Array, claimedType: string): ImageResult {
  if (bytes.length === 0 || bytes.length > CATALOG_IMAGE_MAX_BYTES)
    return { image: null, error: "กรุณาเลือกรูปภาพขนาดไม่เกิน 2 MB" };
  let dimensions: [number, number] | null = null;
  let contentType: ImageDetails["contentType"];
  let extension: ImageDetails["extension"];
  if ((dimensions = pngDimensions(bytes))) {
    contentType = "image/png";
    extension = "png";
  } else if ((dimensions = jpegDimensions(bytes))) {
    contentType = "image/jpeg";
    extension = "jpg";
  } else if ((dimensions = webpDimensions(bytes))) {
    contentType = "image/webp";
    extension = "webp";
  } else
    return {
      image: null,
      error: "ไฟล์รูปภาพไม่ถูกต้อง รองรับ PNG, JPG และ WebP แบบภาพนิ่งเท่านั้น",
    };
  if (claimedType !== contentType)
    return {
      image: null,
      error: "ชนิดไฟล์ไม่ตรงกับข้อมูลรูปภาพ กรุณาบันทึกรูปใหม่เป็น PNG, JPG หรือ WebP",
    };
  const [width, height] = dimensions;
  if (
    width < 1 ||
    height < 1 ||
    width > CATALOG_IMAGE_MAX_DIMENSION ||
    height > CATALOG_IMAGE_MAX_DIMENSION ||
    width * height > CATALOG_IMAGE_MAX_PIXELS
  )
    return {
      image: null,
      error: "รูปภาพต้องไม่เกิน 6,000 พิกเซลต่อด้าน และไม่เกิน 16 ล้านพิกเซล กรุณาลดขนาดรูป",
    };
  return { image: { contentType, extension, width, height }, error: null };
}
