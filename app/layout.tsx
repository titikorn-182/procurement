import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-sarabun",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "ระบบการบริหารจัดการคำขอการจัดซื้อจัดจ้างและสารสนเทศการบริหารงานพัสดุ",
    template: "%s | ระบบบริหารงานพัสดุ",
  },
  description: "ระบบการบริหารจัดการคำขอการจัดซื้อจัดจ้างและสารสนเทศการบริหารงานพัสดุ",
  openGraph: {
    title: "ระบบจัดซื้อจัดจ้าง",
    description: "ทุกคำขอ เดินทางอย่างตรวจสอบได้",
    images: [{ url: "/og.png", width: 1734, height: 909, alt: "ระบบจัดซื้อจัดจ้าง" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ระบบจัดซื้อจัดจ้าง",
    description: "ทุกคำขอ เดินทางอย่างตรวจสอบได้",
    images: ["/og.png"],
  },
};

const directionContract = `<!--
THESIS: ทุกคำขอเป็นงานควบคุมที่มีผู้รับผิดชอบและทางเดินชัดเจน ไม่ใช่ dashboard การ์ดลอยทั่วไป.
OWN-WORLD: แผ่นป้าย graphite, พื้นกระดาษอุ่น, เส้นกริดตรง, safety orange สำหรับงานปัจจุบันและเร่งด่วน, แถบเตือน 45 องศาใช้เฉพาะเกินกำหนด.
STORY: ผู้ใช้เห็นงานที่ต้องทำ เหตุผล ลำดับอนุมัติ และลงมือกับเอกสารโดยไม่หลงบริบท.
FIRST VIEWPORT: A นำ dashboard ด้วยสายอนุมัติ, B จัดโต๊ะตรวจสามส่วน, C แสดง process wall; ปุ่มหลักอยู่ขวาบนของบริบทงาน.
FORM: Document Control Center, mixed A+B+C, challenger chosen; seed c8707b00.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={sarabun.variable}>
      <body>
        <template dangerouslySetInnerHTML={{ __html: directionContract }} />
        {children}
      </body>
    </html>
  );
}
