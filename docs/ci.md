# CI: การตรวจคุณภาพอัตโนมัติ

CI (Continuous Integration) คือการให้เครื่องทดสอบการเปลี่ยนโค้ดซ้ำโดยอัตโนมัติ ก่อนผู้ดูแลพิจารณารวมงาน ไม่ใช่การอนุมัติคำขอจัดซื้อหรือการ deploy

## การทำงาน

ไฟล์ `.github/workflows/ci.yml` ทำงานเมื่อ push ไป `main` หรือ `codex/**`, เปิด/อัปเดต Pull Request ไป `main` และเมื่อสั่ง Run workflow ด้วยตนเองใน GitHub Actions หลังไฟล์อยู่บน default branch ใช้ Ubuntu 24.04; งานใหม่ยกเลิกงานเก่าที่ยังรันบน ref เดียวกัน

| Check                      | สิ่งที่ตรวจ                                                                 | คำสั่งหลัก                                                      |
| -------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Code quality and build     | ESLint, Next route types + TypeScript, Vitest, Prettier, production build   | `npm run verify`                                                |
| Synthetic PostgreSQL tests | migration และสิทธิ์ RLS ของ payment workflow/รายการแบ่งหน้า ด้วยข้อมูลสมมติ | `npm run test:sql`                                              |
| Excel parser tests         | ตัวอ่าน Excel, วันที่, จำนวนเงิน และการตรวจข้อมูลผิด ด้วย fixture สมมติ     | `python -m unittest discover -s tests/python -p "test_*.py" -v` |

Node ใช้รุ่นที่บันทึกใน `.node-version`; `npm ci` ติดตั้งตาม `package-lock.json` ไม่อัปเดต dependency โดยอัตโนมัติ Python ใช้ 3.12 และ dependencies ตรึงรุ่นใน `tests/python/requirements.txt` Cache เก็บเฉพาะแพ็กเกจ npm/pip ไม่เก็บ credentials, ข้อมูลหน่วยงาน หรือ build output เพื่อ deploy

`typecheck` สร้าง route types ด้วย `next typegen` ก่อน `tsc --noEmit` จึงไม่ต้องพึ่งไฟล์ `.next` จากเครื่องผู้พัฒนา ส่วน build อาจต้องเข้าถึง Google Fonts ตามการตั้งค่าเดิมของแอป

## ความปลอดภัยและข้อมูล

- ไม่ต้องเพิ่ม GitHub Secrets: ใช้ Supabase URL/key สมมติสำหรับ build เท่านั้น ไม่ติดต่อ production และไม่ deploy ผล build นี้
- SQL ใช้ PGlite ในหน่วยความจำ ไม่ใช้ service role และไม่รัน migration กับ Supabase จริง
- ไม่อัปโหลด Excel ต้นฉบับ ไฟล์ `supabase/private`, `.env.local` หรือเอกสารแนบเข้า CI
- GitHub token มีสิทธิ์ `contents: read` เท่านั้น และ checkout ไม่เก็บ token ไว้ใน Git config
- Actions ตรึง full commit SHA พร้อม comment รุ่น ต้องตรวจต้นทางและทดสอบก่อนอัปเดต SHA
- ใช้ event `pull_request` ไม่ใช้ `pull_request_target` เพื่อรันโค้ด PR ด้วยสิทธิ์สูง; PR จาก fork อาจต้องให้ผู้ดูแลอนุมัติการรันตามนโยบาย GitHub

หลักการอ้างอิง: [GitHub Actions security](https://docs.github.com/en/actions/reference/security/secure-use) และ [การ build/test Node.js](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs)

## ทดสอบในเครื่อง

```sh
npm ci
npm run verify
npm run test:sql
python -m pip install -r tests/python/requirements.txt
python -m unittest discover -s tests/python -p "test_*.py" -v
```

แนะนำ Python virtual environment เพื่อไม่กระทบแพ็กเกจงานอื่น และใช้ค่า public environment ที่ถูกต้องหรือค่า CI สมมติเมื่อ build ไม่ต้องใช้ service role หากใช้ `PGLITE_MODULE` สำหรับ runtime ชั่วคราว ให้ยกเลิกตัวแปรนี้เพื่อทดสอบ dependency ที่ติดตั้งจาก lockfile

## ก่อนเปิดใช้บน GitHub และ deploy

1. Commit/push เมื่อผู้ใช้สั่ง แล้วตรวจทั้งสาม checks ในแท็บ Actions; ผลตรวจในเครื่องไม่ใช่หลักฐานว่า hosted runner ผ่านแล้ว
2. หลังเห็น checks ครั้งแรก ผู้ดูแลอาจตั้ง branch protection/ruleset ของ `main` ให้ต้องผ่าน checks ทั้งสามก่อน merge และใช้ PR แทน direct push งานนี้ **ยังไม่ได้ตั้งค่า** ดังกล่าว
3. Vercel Git integration ยังทำงานตามเดิม CI **ไม่ได้กั้นการ deploy โดยอัตโนมัติ** และอาจทำงานพร้อม Vercel หากต้องการให้ CI เป็นเงื่อนไข deploy ต้องอนุมัติและตั้งค่านโยบายแยกต่างหาก
4. งานขั้นตอน 6 ที่อยู่ร่วมกันต้อง apply `supabase/migrations/202610110005_paginated_request_lists.sql` และตรวจ grants/RLS **ก่อน push ที่ทำให้ Vercel deploy โค้ดแบ่งหน้า** ไม่ใช่รอให้ CI รัน migration ให้
5. ตรวจด้วยบัญชีจริงที่ได้รับอนุญาตบน staging/ระบบเป้าหมาย รวมถึงหน้า requests/payments, ค้นหา, แบ่งหน้า และ export ก่อนรับมอบ production

## ข้อจำกัด

CI นี้ยังไม่ใช่ browser end-to-end, visual/PDF regression หรือการทดสอบ Supabase Auth/Storage จริง ไม่ยืนยันข้อมูลราคาจาก Excel จริง การทดสอบแค็ตตาล็อก SQL ใน `scripts/test-procurement-catalog-db.mjs` และ `scripts/test-catalog-management-db.mjs` ยังต้องใช้ private import จึงไม่ใส่ใน CI; คงเป็นการตรวจในเครื่องที่ได้รับอนุญาต ห้ามนำข้อมูลส่วนตัวเข้าระบบ CI เพื่อให้ tests เหล่านั้นผ่าน

หาก check ล้มเหลว ให้เปิด job/step ที่ผิด รันคำสั่งเดียวกันในเครื่อง แก้แล้ว push ใหม่ ไม่ปิด check หรือข้าม tests เพื่อให้ merge ได้

## ผลตรวจในเครื่องสำหรับขั้นตอน 7

- สำเนา source ที่ไม่คัดลอก `.env.local`, `node_modules`, `.next` หรือ generated route types: `npm ci` และ `npm run verify` ผ่าน ด้วยค่า public environment สมมติที่ตรงกับ workflow (Windows, Node 24.20.0)
- ESLint, `next typegen` + TypeScript, Vitest 667 กรณีใน 60 ไฟล์, Prettier และ production build ผ่าน
- `npm run test:sql` ผ่านทั้ง payment workflow และ pagination โดยใช้ PGlite จาก development dependency
- Python 3.12 พร้อม dependencies รุ่นเดียวกับ requirements: parser tests ผ่าน 6 กรณี
- ตรวจ YAML syntax, jobs ทั้งสาม, read-only permission, PR event, timeout และ action SHA ครบ
- ยังไม่ได้ push หรือรันบน GitHub-hosted Ubuntu จึงต้องตรวจผล hosted runner หลัง push ครั้งแรก; ไม่มีการแก้ branch protection, deploy configuration หรือฐานข้อมูลจริง

## ข้อสังเกตด้าน dependency จากการติดตั้งขั้นตอน 7

`npm audit` วันที่ 11 ตุลาคม 2026 รายงาน 10 packages ระดับ high ใน dependency tree เดิม รวมทั้ง Next.js และ sharp ตัวเลขนี้เป็นจำนวนแพ็กเกจที่ audit รายงาน ไม่ใช่จำนวนจุดโจมตีที่ยืนยันแล้วในแอป การตรวจ lockfile ยืนยันว่าขั้นตอนนี้เพิ่มเพียง PGlite 0.3.14 โดยไม่ได้เปลี่ยนรุ่นแพ็กเกจเดิม และ audit ไม่ได้ระบุ PGlite ในรายการดังกล่าว

ควรแยกงานประเมินผลกระทบและอัปเดต dependency โดยเฉพาะ runtime ก่อน deploy รอบถัดไป ห้ามใช้ `npm audit fix --force` โดยไม่ทดสอบ เพราะข้อเสนออัตโนมัติบางรายการลดรุ่น eslint-config-next ข้าม major ชุด CI นี้ยังไม่ได้ใช้ audit เป็น merge gate ดังนั้นผล tests/build ผ่านไม่ได้แปลว่าผ่าน security audit

## Production preflight ก่อน push ขั้นตอน 6–7

ตรวจ Supabase project `jwklnuzrewkrdtebvaid` แบบ read-only เมื่อ 11 ตุลาคม 2026 พบ views ทั้งสองมีนิยามตรงกับ migration `202610110005_paginated_request_lists.sql` แล้ว และใช้ `security_invoker=true` บน PostgreSQL 17.6 จึงไม่ได้รัน migration ซ้ำ ยืนยัน authenticated อ่านได้แต่เขียนไม่ได้, anon อ่านไม่ได้, indexes ทั้งสาม valid และ RLS เปิดอยู่บนตารางต้นทางทั้งห้า การตรวจนี้ไม่ใช่การทดสอบทุกบทบาทผ่านหน้าเว็บจริง
