import localFont from "next/font/local";

export const sarabunPsk = localFont({
  src: [
    { path: "./fonts/THSarabunPSK.ttf", weight: "400", style: "normal" },
    { path: "./fonts/THSarabunPSK-Bold.ttf", weight: "700", style: "normal" },
  ],
  display: "swap",
  fallback: ["serif"],
  adjustFontFallback: false,
});
