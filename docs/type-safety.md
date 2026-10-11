# Code quality: ขั้นตอน 1–3

ขั้นตอน 1–2 เพิ่มการทดสอบและชนิดข้อมูล และเผยแพร่แล้วใน commit `c3b638f` ส่วนขั้นตอน 3 แยกชั้นข้อมูลตามกลุ่มงาน ไม่เปลี่ยนเส้นทาง URL สายอนุมัติ แบบพิมพ์ หรือฐานข้อมูลจริง งานขั้นตอน 3 ยังไม่ได้ push/deploy

## ขั้นตอน 1: ป้องกันพฤติกรรมเดิม

- เพิ่ม regression tests สำหรับการแนบเอกสาร POL-01/POL-02: session หมดอายุ, อัปโหลดล้มเหลว, บันทึกรายการไฟล์ล้มเหลว, ลองใหม่ และรักษาไฟล์ต้นฉบับ
- บันทึก snapshot ข้อมูลก่อนพิมพ์ POL-01/POL-02/ว119 จากข้อมูลสมมติ ก่อนปรับ production code ห้ามอัปเดต snapshot เพียงเพื่อทำให้ test ผ่าน
- ใช้ชุดทดสอบเดิมสำหรับคืนคำขอ/แก้ไข/ส่งใหม่ และทดสอบ SQL ด้วย PGlite ซึ่งเป็นฐานข้อมูลชั่วคราวในหน่วยความจำ ไม่มีการเขียนข้อมูลจริง
- เพิ่มกรณี nullable file metadata และการรักษา timestamp ของฉบับแก้ไข เพื่อไม่ข้ามกลไกป้องกันแก้ข้อมูลชนกัน
- Snapshot นี้ตรวจข้อมูล ไม่ใช่การตรวจหน้าตา PDF หรือ browser end-to-end

## ขั้นตอน 2: ชนิดข้อมูลอ้างอิงฐานข้อมูลจริง

`lib/supabase/database.types.ts` อ้างอิง metadata ของ public schema ที่อ่านจากโครงการ Supabase `jwklnuzrewkrdtebvaid` วันที่ 11 ตุลาคม 2026: 22 ตาราง และ 21 ฟังก์ชันที่ไม่ใช่ trigger

อ่านด้วย SELECT ตาม `scripts/database-type-metadata.sql` ผ่าน SQL Editor ที่เข้าสู่ระบบอยู่ ไม่อ่านแถวข้อมูลผู้ใช้ ไม่อ่านเนื้อหาฟังก์ชัน ไม่เปลี่ยน schema และไม่ใช้ service-role key ใน browser

เนื่องจากสภาพแวดล้อมนี้ไม่มี CLI authentication สำหรับสร้าง types จึงใช้ตัวแปลง metadata ภายใน `scripts/generate-database-types.mjs` ไม่ใช่ผลลัพธ์จาก Supabase CLI โดยตรง ตัวแปลงตรวจรูปแบบข้อมูลด้วย Zod และหยุดเมื่อพบชนิดข้อมูล/ฟังก์ชันซ้ำที่ไม่รองรับ แทนการใช้ `any`

สิ่งที่ types ครอบคลุม:

- Row (ข้อมูลอ่าน), Insert (ข้อมูลสร้าง), Update (ข้อมูลแก้), nullable/default/generated columns
- ความสัมพันธ์ foreign key ภายใน public schema และ enum ของสถานะ/บทบาท
- ชื่อและพารามิเตอร์ RPC (ฟังก์ชันในฐานข้อมูลที่เรียกจากแอป)
- ใช้กับ browser/server/proxy clients ทั้งสามจุด
- PaymentRecord ใช้ชนิดจากตารางจริงแทนการประกาศชนิดซ้ำ และ query หลักไม่ต้องบังคับ `as unknown as`
- ย้าย RequestStatus ออกจาก mock-data ไป `app/requests/status.types.ts` โดยคงข้อความเดิม ไม่ลบข้อมูลตัวอย่าง

JSON ของฟอร์มยังต้องตรวจด้วย Zod/ตัวอ่านข้อมูลเดิม เพราะชนิด `Json` บอกได้เพียงว่าเก็บเป็น JSON ได้ ไม่ได้ยืนยันว่าข้อมูลครบตามแบบฟอร์ม ส่วน `unknown` ใช้ตรงจุดรับข้อมูลที่ยังไม่ได้ตรวจสอบได้ ไม่ใช่ข้อผิดพลาด

เมื่อ metadata ไฟล์เดิมไม่มีขนาดไฟล์ จะไม่เดาหรือข้ามการตรวจวงเงินขนาดไฟล์: แจ้งให้ตรวจสอบก่อนแนบ TOR/ส่ง POL-02 และเก็บไฟล์เดิมไว้ ส่วน MIME ที่ว่างสามารถตรวจจากนามสกุลตามกติกาเดิมได้

## สร้าง types ใหม่เมื่อ schema เปลี่ยน

1. อ่าน metadata ด้วย SQL ข้างต้นในโครงการที่ถูกต้อง แล้ว Export เป็น CSV แบบคอลัมน์เดียวชื่อ `schema_metadata` หรือ JSON เก็บไว้นอก Git
2. รัน `node scripts/generate-database-types.mjs "<metadata-export.csv>"` โปรแกรมส่ง TypeScript ไป stdout เท่านั้น ไม่เขียนฐานข้อมูลหรือไฟล์เอง
3. ตรวจ output แล้วนำไปแทน `lib/supabase/database.types.ts` และจัดรูปแบบด้วย Prettier
4. ตรวจ diff เทียบ migration โดยเฉพาะ nullable, generated columns, enum, foreign keys และ RPC แล้วรันชุดตรวจทั้งหมด

ขอบเขตตัวแปลงนี้คือ schema ปัจจุบัน: ยังไม่รองรับ views, custom composite types, overloaded RPC หรือชนิด PostgreSQL พิเศษ เช่น geometry หากเพิ่มสิ่งเหล่านี้ ให้ปรับตัวแปลงพร้อม tests หรือใช้ Supabase CLI ที่ยืนยันตัวตนแล้ว อย่าสร้าง type ที่กว้างขึ้นเพื่อปิดข้อผิดพลาด

ชนิด return ของ SQL function ไม่อาจยืนยัน NOT NULL ได้จาก signature เพียงอย่างเดียว และ types ไม่ยืนยันสิทธิ์ RLS หรือความถูกต้องของ JSON จึงต้องคงการตรวจ runtime และ SQL tests ไว้ด้วย

## คำสั่งตรวจ

```powershell
npm run verify
$env:PGLITE_MODULE = [System.Uri]::new((Resolve-Path '.impeccable/sql-runtime/node_modules/@electric-sql/pglite/dist/index.js').Path).AbsoluteUri
node tests/sql/payment-flow.mjs
```

`verify` รัน lint, TypeScript, unit tests, format check และ production build ส่วน SQL test ต้องมี PGlite runtime ตาม path ข้างต้น (เป็น local tool ที่ไม่ได้ commit) หรือกำหนด `PGLITE_MODULE` ไปยัง runtime ที่ติดตั้งแล้ว การจัด dependency/CI ให้อัตโนมัติเป็นงานระยะถัดไป

`tests/types/database.contract.ts` เป็น compile-only checks ไม่เรียกฐานข้อมูล ยืนยันว่าตาราง/สถานะ/RPC ผิดต้องคอมไพล์ไม่ผ่าน และ client ทั้งสองฝั่งยังคงชนิดข้อมูลที่กำหนด

## ขั้นตอน 3: แยกข้อมูลและกฎของงานออกจากหน้าจอ

โครงสร้างใหม่เพิ่มเฉพาะส่วนที่มีงานใช้งานจริง:

```text
features/
  auth/
    server/queries.ts       สิทธิ์เปิดแบบฟอร์มและสถานะเข้าสู่ระบบ
    profile.client.ts       ข้อมูลชื่อ/บทบาทสำหรับเมนู ผ่าน session ของ browser
  requests/
    server/                 อ่านข้อมูล สร้าง แก้ไข ส่งใหม่ พิจารณา และลบเอกสาร
    schemas.ts              ตรวจข้อมูล POL-01/ว119
    decision-schema.ts      ตรวจคำสั่งอนุมัติ/ส่งกลับ
    edit-mapper.ts          แปลงข้อมูลเดิมเป็นข้อมูลสำหรับแก้ไข
    external-print-data.ts  เตรียมข้อมูลแบบพิมพ์ POL- ภายนอก
    types.ts                ข้อมูลรายการที่รายงาน/หน้ารายการใช้ร่วมกัน
  payments/
    server/                 query, Server Actions และข้อมูลพร้อมใช้สำหรับหน้าฟอร์ม
    schemas.ts              ตรวจข้อมูลเบิกจ่าย
    mappers.ts              แปลงคำขอต้นทางและยอดที่ใช้ไปเป็นข้อมูลหน้าฟอร์ม
    model.ts                คืนค่าฟอร์มและเตรียมข้อมูลพิมพ์จากคำขอที่บันทึกแล้ว
    types.ts                ชนิดข้อมูลฟอร์มและข้อมูลแก้ไข
  catalog/
    server/                 ค้นหา บันทึก และอัปโหลดรูป พร้อมตรวจสิทธิ์เดิม
    schema.ts               รูปแบบข้อมูลแค็ตตาล็อกกลาง
    admin-schema.ts         รูปแบบข้อมูลสำหรับจัดการ
    selection.ts            แปลงรายการอ้างอิงเป็นรายการคำขอ
  settings/
    server/                 query และการบันทึกที่ตรวจสิทธิ์ admin
    schemas.ts              กฎตรวจการตั้งค่า
```

หลักการใช้:

- หน้าเว็บเรียกฟังก์ชันใน `features/*/server` แทนการเขียน Supabase query เอง; query แบบอ่านอย่างเดียวมี `import "server-only"` เพื่อกันการนำไปใช้ใน browser ผิดฝั่ง
- Server Actions ใน `app` ยังคง `"use server"` และเป็น async functions ที่เรียก handlers ใน `features/*/server` ซึ่งมี `server-only` การตรวจข้อมูล/สิทธิ์ด้วย session client และ RPC/RLS เดิมอยู่ใน handler ทุกครั้ง ไม่ย้ายการอนุมัติสิทธิ์ไปเชื่อค่าจากหน้าเว็บ และไม่เปิด handler เป็น public action ซ้ำ
- `getPaymentForEditing` คืน `not_found`, `forbidden` หรือข้อมูล `ready` ให้หน้าจอเลือกการแสดงผล โดยตรวจเจ้าของ/สถานะก่อนอ่านยอดเบิกอื่น คงเงื่อนไขส่งกลับขั้นตอนเดิม
- `getSettingsWorkspace` ไม่อ่านข้อมูลผู้ใช้/ตั้งค่าจนกว่าจะยืนยันว่าเป็น admin ที่เปิดใช้งาน และไม่ส่ง session/token ไปหน้าจอ
- DTO คือข้อมูลที่คัดและจัดรูปแบบสำหรับหน้าจอ ไม่ใช่การส่ง client ฐานข้อมูลหรือ session ทั้งชุดไป browser
- ตัวแปลงข้อมูลเป็นฟังก์ชันที่ทดสอบแยกได้ ไม่เขียนฐานข้อมูลและไม่แก้ข้อมูลต้นทาง เช่น เรียงรายการบนสำเนา array รักษารหัสงบประมาณที่ขึ้นต้นด้วยศูนย์
- ไฟล์เดิมใน `app` ที่ย้ายแล้วเป็น compatibility entry point หรือทางเรียกต่อไปยัง implementation ใหม่ ไม่มี business logic ซ้ำ ช่วยให้ import เดิมและ regression tests ยังใช้งานได้ ค่อยย้ายทางเรียกเมื่อแตะส่วนหน้าจอในระยะถัดไป ส่วน Server Actions ใช้ async wrappers ไม่ใช้ re-export โดยตรง เพราะ Next.js รุ่นที่ติดตั้งไม่รองรับรูปแบบหลังในไฟล์ `"use server"`
- `RequestRow` เป็นของ feature requests แล้ว รายงานและ process ไม่ต้องนำ type จากไฟล์ UI ส่วน catalog administration ไม่พึ่ง schema ของหน้าสร้างคำขออีก
- โมเดลเฉพาะเอกสารที่แยกจาก UI อยู่แล้ว เช่น TOR/checklist/loan agreement ยังอยู่ใกล้ route เดิม ไม่ย้ายทุกไฟล์พร้อมกัน และยังไม่รวมกฎเอกสารต่างประเภท

การตรวจเพิ่มเติม: `data-boundaries`, `feature-mappers`, `payment-form-queries`, `settings-query` ทดสอบขอบเขตโมดูล การคงข้อมูลเดิม การปฏิเสธสิทธิ์ การกรองยอดเบิก และกรณีฐานข้อมูลอ่านไม่สำเร็จ ไม่ใช่การทดสอบกับข้อมูล production หรือ browser end-to-end

Vitest มี alias ของ `server-only` ไปยังไฟล์ว่างสำหรับการทดสอบใน Node เท่านั้น Production build ของ Next.js ยังใช้ตัวตรวจฝั่ง server จริง และ lint เพิ่มโฟลเดอร์ `features` ให้ถูกตรวจด้วย ไม่ได้เพิ่ม dependency ใหม่

## ยังไม่เริ่ม: ขั้นตอน 4–7

ยังไม่แยกฟอร์มขนาดใหญ่/ย้าย state และ hooks ไม่เปลี่ยน business defaults ไม่รวมตัวช่วยที่ต่างกฎ ไม่เพิ่ม pagination หรือ CI ต้องขออนุมัติงานระยะถัดไปก่อน
