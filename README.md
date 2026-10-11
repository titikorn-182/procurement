# Procurement Control Center

ระบบบริหารจัดการคำขอการจัดซื้อจัดจ้างและการบริหารพัสดุ อ้างอิง [PRODUCT.md](PRODUCT.md) และ [PRD.md](PRD.md) ปัจจุบันมีการอ่าน/บันทึกข้อมูลผ่าน Supabase Auth, PostgreSQL RPC และ Storage จริงเมื่อกำหนด environment และฐานข้อมูลครบ ไม่ใช่ระบบ mock-only

## Tech stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS 4
- Supabase Auth, PostgreSQL/RLS, RPC และ Storage

## เริ่มใช้งาน

1. ติดตั้ง dependency ตาม lockfile ด้วย `npm ci`
2. สร้าง `.env.local` จากชื่อค่าที่ระบุใน [.env.example](.env.example) และกรอกค่าของ environment ที่ได้รับอนุญาต: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`
3. เตรียม schema/migrations, Storage policies, บัญชีและ profile/สิทธิ์ให้ตรงกับโค้ดก่อนทดลองบันทึก

```bash
npm run dev
```

เปิด `http://localhost:3000` ค่า Supabase ที่จำเป็นหายไปจะทำให้แอปแจ้ง configuration error ไม่มีการสลับเป็นข้อมูลจำลองอัตโนมัติ ห้าม commit `.env.local` หรือใส่ service-role key ในตัวแปร `NEXT_PUBLIC_*`

## หน้าจอและขอบเขต

- Dashboard และสายงานอนุมัติ
- คำขอหลักการ POL-01: รายการ สร้าง รายละเอียด ทำฉบับร่างต่อ แก้ไขรายการที่ส่งกลับ และพิมพ์
- คำขอเบิกจ่าย POL-02: รายการ สร้าง รายละเอียด แก้ไข/ส่งใหม่ พิจารณา และพิมพ์ข้อมูลที่บันทึกแล้ว
- งานรอตรวจสอบ
- สร้างคำขอแบบหลายขั้นตอน
- Workspace ตรวจสอบและอนุมัติ
- ภาพรวมกระบวนการ
- รายงาน
- ตั้งค่าระบบ
- ค้นหาข้าม POL-01/POL-02 และรายการที่ต้องติดตามตามสิทธิ์
- แบบฟอร์มเฉพาะ ว119, POL ภายนอก, TOR และคลังข้อมูลจัดซื้อจัดจ้าง

ว804 และข้อ 79 วรรค 2 ยังคงเป็นงานจัดเตรียมเอกสาร ไม่ได้เพิ่มสายอนุมัติอัตโนมัติ การค้นหาอ่านไม่เกิน 1,000 รายการล่าสุดที่บัญชีมีสิทธิ์เห็นต่อประเภท; รายงานสรุป POL-01 ไม่เกิน 1,000 รายการล่าสุดและส่งออก CSV ไม่ใช่ไฟล์ Excel `.xlsx`

การเชื่อมต่อ SSO บุคลากร งบประมาณ อีเมล/LINE และผู้ให้บริการลายเซ็นดิจิทัลยังต้องมี API/credentials และการเชื่อมต่อเพิ่มเติม หน้า activity ไม่ใช่บริการส่งแจ้งเตือนภายนอก

## ตรวจสอบและนำขึ้นใช้งาน

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

การทดสอบ SQL แบบแยกส่วนอยู่ที่ [tests/sql/README.md](tests/sql/README.md) ใช้ข้อมูลสังเคราะห์ ไม่เชื่อมฐานข้อมูลจริง

สำหรับรอบปรับปรุง flow วันที่ 11 ตุลาคม 2569 ต้อง review และทดลอง migrations `202610110003_payment_revision_flow.sql` และ `202610110004_resume_procurement_drafts.sql` ใน staging ตามลำดับ หลัง migrations ก่อนหน้า แล้วจึง deploy โค้ดที่ตรงกัน ทดสอบอย่างน้อยสองบัญชีเพื่อยืนยันสิทธิ์ผู้ยื่น/ผู้พิจารณาและการกันข้อมูลข้ามบัญชี งานรอบนี้ยังไม่ได้เปลี่ยนฐานข้อมูล production, push หรือ deploy

ดู [คู่มือ POL-02](app/payments/README.md), [ผลตรวจ flow และข้อจำกัด](docs/flow-audit-2026-10-11.md) และ [ระบบออกแบบเดิม](DESIGN.md) ผลทดสอบในเครื่องไม่ใช่การรับรอง production หรือ WCAG
