# ฐานข้อมูล POL UBU Smart Procurement

ออกแบบจาก Excel ที่ผู้ใช้ให้และโค้ด/migrations ณ 11 ตุลาคม 2569 ก่อนแก้หน้าเว็บแค็ตตาล็อก งานนี้เป็นการเพิ่มโครงสร้าง ไม่ลบหรือสร้างฐานข้อมูลคำขอเดิมใหม่ เอกสารนี้แยกสิ่งที่มีอยู่ สิ่งที่จะเพิ่ม และข้อเสนอในอนาคตอย่างชัดเจน ไม่ใช่การรับรองระเบียบจัดซื้อหรือยืนยัน schema ของ production ที่ยังไม่ได้ตรวจโดยตรง

## 1. แหล่งข้อมูลและผลตรวจ Excel

ต้นฉบับ: `ฐานข้อมูลราคากลางพัสดุ คณะรัฐศาสตร์ POL UBU Smart Procurement Database.xlsx`

SHA-256: `c90b519c07654f125fd19ff2ff989d599d345ec739fb9c64abb0818e6b8c17e3`

อ่านต้นฉบับโดยไม่แก้ไข ค่า null ไม่ใช่ศูนย์ ลำดับไม่ใช่รหัสพัสดุ วันที่นำเข้าไม่ใช่วันที่สืบราคา

| ชีต                       | ช่วงข้อมูล             | จำนวนรายการจริง | ความหมาย                                                 |
| ------------------------- | ---------------------- | --------------: | -------------------------------------------------------- |
| ฐานข้อมูลพัสดุMaster Data | A2:K8                  |               7 | รหัส ชื่อ คุณลักษณะ หน่วย ราคาอ้างอิง แหล่งราคา หมายเหตุ |
| ปีงบ 68                   | A4:D43 (ไม่นับหัวหมวด) |              37 | ประวัติซื้อปี 2568                                       |
| ปีงบ 67                   | A4:D64 (ไม่นับหัวหมวด) |              58 | ประวัติซื้อปี 2567                                       |
| ปีงบ 66                   | A4:D75 (ไม่นับหัวหมวด) |              69 | ประวัติซื้อปี 2566                                       |
| ปีงบ 65                   | A4:D90 (ไม่นับหัวหมวด) |              84 | ประวัติซื้อปี 2565                                       |
| ปีงบ 64                   | A4:D51 (ไม่นับหัวหมวด) |              46 | ประวัติซื้อปี 2564                                       |

- Master มี 7 รหัสไม่ซ้ำ ราคาบวกครบทั้ง 7 แถว หน่วย 3 แบบ หมวดย่อย 2 แบบ ไม่มีวันที่อ้างอิง/วันหมดอายุ/ผู้รับรอง/สถานะ VAT/เลขใบเสนอราคา ค่าเซลล์ K ว่าง แต่มี **รูปภาพ PNG ฝังแบบ drawing 7 ภาพ** anchor ที่ K2:K8; importer เก็บ archive member และ hash ของภาพ ไม่ตีความว่าไม่มีภาพ และไม่เผยแพร่ภาพอัตโนมัติ
- A28:B32 เป็นคำอธิบายรหัสหมวด OFF, COM, ELE, KIT ไม่ใช่สินค้า ห้ามนำไปสร้างรายการราคา; แถว 9–27 ว่าง
- ประวัติ 294 แถวมีวันที่ซื้อและจำนวนพร้อมหน่วย แต่ไม่มีราคา ยอดเงิน ผู้ขาย หรือหลักฐานใบเสนอราคา ห้ามคำนวณราคากลาง/ยอดใช้จ่ายจากแถวเหล่านี้
- ไม่พบสูตร รหัส Master ซ้ำ หรือแถวประวัติซ้ำทุกช่อง (ไม่นับลำดับ) ภายในชีตเดียวกัน วันที่ทั้ง 294 แถวอยู่ในปีงบประมาณของชีต
- รหัส Master เช่น `OFF-001-03` ต่างระบบกับรหัส UBUFMIS เช่น `010101003` ต้องเก็บเป็น text เพื่อรักษาศูนย์นำหน้า เครื่องหมายจุดและขีด ไม่จับคู่จากชื่อใกล้เคียงอัตโนมัติ
- คุณลักษณะบางแถวมีช่องว่างนำหน้า: trim เฉพาะค่าค้นหา/แสดงผล แต่เก็บ raw cells เดิมไว้
- ตัวอย่างที่ต้องตรวจสอบเชิงเนื้อหา: `ปีงบ 66!B73:D73` ระบุขนาด 1 ลิตร แต่หน่วยซื้อเป็นแกลลอน; ไม่แก้หรือแปลงหน่วยเอง

**คำยืนยันผู้ใช้:** อนุญาตให้ใช้ราคาใน Excel เป็นราคาอ้างอิง พร้อมแสดงว่ายังไม่ยืนยันวันที่และการรับรอง ไม่ถือว่าเป็นราคาที่รับรองหรือเป็นราคาปัจจุบัน

## 2. ฟีเจอร์และ requirement ของเว็บไซต์

ตรวจจาก routes, server actions, `app/lib/live-data.ts`, `PRODUCT.md` และ migration ทั้งหมด ไม่ใช้รายการความต้องการเป็นหลักฐานว่าเชื่อมต่อจริงแล้ว

| ส่วนระบบ                        | ความสามารถที่มีในโค้ด                                            | ข้อมูล/ข้อกำหนด                                                                                                                   |
| ------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Login / Auth callback           | Supabase session และ profile active/role                         | `auth.users`, `profiles`, `departments`; ตรวจสิทธิ์ server + RLS                                                                  |
| Dashboard / requests / process  | รายการคำขอ สถานะ งานค้าง ภาพรวม workflow                         | `procurement_requests`, tasks/actions; ปัจจุบัน getRequests จำกัด 50 รายการ ต้องเพิ่ม pagination/aggregate ก่อนใช้เป็นรายงานทุกปี |
| POL-01 `/requests/new`          | 5 ขั้นตอน ข้อมูลคำขอ รายการ งบ เอกสาร/checklist ตรวจสอบส่ง       | request/items/form_data/attachments; ช่องราคากลางมีแล้ว แต่แค็ตตาล็อกยังเป็น empty state                                          |
| รายละเอียด / ตีกลับแก้ไข        | ตรวจเจ้าของและสถานะ เก็บรายการ/เอกสาร ส่งใหม่                    | RPC draft/resubmit, audit trail; ห้ามกระทบรายการเก่าเมื่อปรับ catalog                                                             |
| ว119                            | แบบบันทึกข้อความ รายการ งบ เอกสาร สัญญายืมเงิน                   | `form_data` แบบ w119 + request_items ใช้ตารางคำขอเดิม                                                                             |
| POL-ภายนอก                      | 5 ขั้นตอน โครงการภายนอกและสายอนุมัติ POL-01 เดิม                 | `form_data.externalPol01`; ไม่สร้าง workflow แยก                                                                                  |
| ว804                            | รายงานขอซื้อ/TOR สรุปผล ส่งใช้เงินยืม ดาวน์โหลด draft JSON/พิมพ์ | จัดทำเอกสาร ยังไม่เข้าฐานคำขอหรือสายอนุมัติ ตามที่ผู้ใช้ยืนยัน                                                                    |
| POL-02                          | ใบเบิกจ่าย รายการหลักฐาน/checklist ส่งตรวจ                       | payment_requests/items/attachments/tasks/actions; เชื่อมคำขอหลักการ                                                               |
| Tasks                           | approve/return/reject/budget control ตามขั้นตอน                  | private permissions/step definitions; RPC เปลี่ยนสถานะและบันทึกผู้กระทำ                                                           |
| Print/PDF                       | แบบเอกสารและรวมไฟล์แนบ                                           | metadata + private Storage; การรวมสำเนาไม่ใช่การรับรองลายเซ็นดิจิทัลใหม่                                                          |
| Settings                        | ผู้ใช้ บทบาท หน่วยงาน ผู้ประกอบการ ตั้งค่าระบบ                   | admin-only server checks/RLS; vendor directory มีการค้นหาและเพิ่มชื่อ                                                             |
| Reports                         | สรุป/ส่งออกจากคำขอที่ผู้ใช้มีสิทธิ์                              | ต้องระบุข้อจำกัด 50 แถวข้างต้น ไม่ถือเป็นบัญชีรายจ่ายครบถ้วน                                                                      |
| สารสนเทศพัสดุ                   | ฝัง Looker Studio                                                | external report ไม่ใช่การ sync เข้าฐานข้อมูลนี้                                                                                   |
| SSO/งบประมาณ/อีเมล/LINE/ลายเซ็น | บางส่วนเป็น requirement/settings ใน PRODUCT.md                   | ยังไม่มีหลักฐาน integration production ครบ ไม่สร้างข้อมูลจำลองแทน                                                                 |

**ขอบเขตแก้เว็บรอบนี้:** แค็ตตาล็อกในขั้นตอนรายการ POL-01 เท่านั้น ส่วนอื่นเป็นผลวิเคราะห์และข้อเสนอ ไม่เปลี่ยนสายอนุมัติหรือคัดลอกประวัติซื้อเป็นคำขอใหม่

## 3. โครงสร้างเดิมที่คงไว้

ชนิดด้านล่างอ้างจาก migrations ใน repository; `uuid` PK default gen_random_uuid, `timestamptz` ใช้ now ตาม migration, `?` หมายถึง nullable. ตารางภายใต้ public เว้นแต่ระบุ private

| ตาราง                              | ฟิลด์และชนิดข้อมูล                                                                                                                                                                                                                                                                                                                                                                   | ความสัมพันธ์/ข้อกำหนดสำคัญ                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| departments                        | id uuid PK; code text unique; name_th text; active boolean; created_at timestamptz                                                                                                                                                                                                                                                                                                   | profiles และ requests อ้างหน่วยงาน                                                                                     |
| profiles                           | id uuid PK/FK; employee_code text? unique; full_name text; department_id uuid?; role app_role; position_title text?; active boolean; created_at/updated_at timestamptz                                                                                                                                                                                                               | id → auth.users; department_id → departments                                                                           |
| procurement_requests               | id uuid PK; request_no text unique; requester_id/department_id uuid; kind request_kind; title/rationale text; required_date date?; budget_year integer; fund_source text; plan_name/expense_category text?; estimated_amount numeric(14,2); status request_status; current_step smallint; submitted_at/completed_at timestamptz?; created_at/updated_at timestamptz; form_data jsonb | requester → profiles, department → departments; title 3–300, ปี 2500–2700; POL-01/ว119/ภายนอกใช้ร่วมกัน                |
| request_items                      | id uuid PK; request_id uuid; line_no integer; description text; quantity numeric(12,2); unit text; unit_price numeric(14,2); total_amount numeric(14,2) generated; market_price numeric(14,2)?; price_source text?                                                                                                                                                                   | request → procurement_requests; unique(request_id,line_no); total = quantity × unit_price ไม่ใช้ market_price คำนวณยอด |
| request_attachments                | id uuid PK; request_id uuid; storage_path text unique; file_name text; mime_type text?; size_bytes bigint?; uploaded_by uuid; created_at timestamptz                                                                                                                                                                                                                                 | request → procurement_requests; uploaded_by → profiles; private Storage                                                |
| workflow_tasks                     | id uuid PK; request_id uuid; step_no smallint; step_name text; required_role app_role; assignee_id uuid?; status task_status; due_at/completed_at timestamptz?; created_at timestamptz                                                                                                                                                                                               | request → procurement_requests; assignee → profiles; unique(request_id,step_no)                                        |
| workflow_actions                   | id uuid PK; request_id uuid; task_id uuid?; actor_id uuid; action workflow_action; comment text?; metadata jsonb; created_at timestamptz                                                                                                                                                                                                                                             | request/task/actor → requests/tasks/profiles; comment ≤2000                                                            |
| payment_requests                   | id uuid PK; payment_no text unique; procurement_request_id/requester_id uuid; invoice_no text; invoice_date date; subtotal/vat_amount numeric(14,2); total_amount numeric(14,2) generated; delivery_detail text; status payment_status; current_step smallint; submitted_at timestamptz?; created_at/updated_at timestamptz; idempotency_key uuid?; form_data jsonb                  | procurement_request → requests; requester → profiles; total = subtotal + VAT; form_data object ≤50000 bytes            |
| payment_items                      | id uuid PK; payment_request_id uuid; line_no integer; description/attachment_type text; document_no text?; quantity numeric(12,2); unit_price numeric(14,2); total_amount numeric(14,2) generated                                                                                                                                                                                    | payment → payment_requests; unique(payment,line_no); line 1–100                                                        |
| payment_attachments                | id uuid PK; payment_request_id uuid; storage_path text unique; file_name text; mime_type text?; size_bytes bigint?; uploaded_by uuid; created_at timestamptz                                                                                                                                                                                                                         | payment → payment_requests; uploaded_by → profiles                                                                     |
| payment_workflow_tasks             | id uuid PK; payment_request_id uuid; step_no smallint; step_name text; required_role app_role; assignee_id uuid?; status task_status; due_at/completed_at timestamptz?; created_at timestamptz                                                                                                                                                                                       | payment/assignee → payment_requests/profiles; unique(payment,step)                                                     |
| payment_workflow_actions           | id uuid PK; payment_request_id uuid; task_id uuid?; actor_id uuid; action workflow_action; comment text?; metadata jsonb; created_at timestamptz                                                                                                                                                                                                                                     | payment/task/actor → payment_requests/payment_workflow_tasks/profiles                                                  |
| vendors                            | id uuid PK; display_name/search_name text; active boolean; created_at/updated_at timestamptz                                                                                                                                                                                                                                                                                         | รายชื่อผู้ประกอบการไม่ใช่หลักฐานราคาที่รับรอง; ห้ามสร้าง vendor จากชื่อแหล่งราคาอัตโนมัติ                              |
| system_settings                    | key text PK; value jsonb; updated_by uuid?; updated_at timestamptz                                                                                                                                                                                                                                                                                                                   | updated_by → profiles; admin only                                                                                      |
| private.role_permissions           | role app_role; permission text                                                                                                                                                                                                                                                                                                                                                       | composite PK(role,permission), active profile ตรวจผ่าน private.has_permission                                          |
| private.procurement_workflow_steps | step_no smallint PK; step_name text; required_role app_role; due_days smallint                                                                                                                                                                                                                                                                                                       | แม่แบบงาน POL-01 ขั้น 2–11 ไม่ใช่แถวงานผู้ใช้                                                                          |
| private.payment_workflow_steps     | step_no smallint PK; step_name text; required_role app_role; due_days smallint                                                                                                                                                                                                                                                                                                       | แม่แบบงาน POL-02 ขั้น 2–8                                                                                              |

Enums: app_role = user/procurement_staff/finance_staff/head_procurement/deputy_secretary/deputy_finance/dean/head_office/admin; request_kind = purchase/hire; task_status = pending/completed/returned/rejected/cancelled; workflow_action = submit/approve/return/reject/budget_control/complete/cancel. request_status และ payment_status คงรายการเดิมตาม `202608030001_initial_procurement.sql` ไม่ปรับในงานนี้

form_data เป็น metadata มี schema แยกตามแบบฟอร์ม (approval details, budget codes, vendor snapshot, checklist, loan agreement, external project) ไม่ใช้แทนตารางรายการสินค้า/ราคาใหม่

## 4. ฐานข้อมูลแค็ตตาล็อกใหม่ (additive)

ออกแบบแยกสินค้า ราคาแต่ละรุ่น แหล่งนำเข้า และประวัติ UBUFMIS ไม่มีราคาจำลอง ไม่มีการแปลงหน่วยที่ยังไม่ทราบความหมาย

### catalog_imports

| ฟิลด์       | ชนิด/เงื่อนไข                      | หน้าที่                                                              |
| ----------- | ---------------------------------- | -------------------------------------------------------------------- |
| id          | uuid PK                            | รอบนำเข้า                                                            |
| file_name   | text NOT NULL                      | ชื่อไฟล์ต้นฉบับ ไม่เก็บ absolute path เครื่องผู้ใช้                  |
| file_sha256 | text NOT NULL unique, 64 hex       | ตรวจซ้ำและสอบย้อนต้นฉบับ                                             |
| imported_at | timestamptz NOT NULL default now() | เวลานำเข้า ไม่ใช่วันที่ราคา                                          |
| imported_by | uuid? FK profiles                  | ผู้นำเข้าเมื่อทราบ; SQL operator ไม่มี auth.uid ให้ null ไม่ปลอมชื่อ |
| summary     | jsonb object NOT NULL              | จำนวนรายการ/ประวัติ/ข้อสังเกตของ import                              |

### catalog_source_rows

| ฟิลด์      | ชนิด/เงื่อนไข                           | หน้าที่                                           |
| ---------- | --------------------------------------- | ------------------------------------------------- |
| import_id  | uuid FK catalog_imports NOT NULL        | เจ้าของข้อมูล                                     |
| sheet_name | text NOT NULL                           | ชีตต้นฉบับ                                        |
| row_number | integer >0 NOT NULL                     | แถว Excel                                         |
| row_kind   | text NOT NULL: header/note/item/history | แยกหัวตาราง/หมายเหตุออกจาก record                 |
| raw_cells  | jsonb array NOT NULL                    | ค่าต้นฉบับและ null ภายในแถว ไม่ trim/แก้ชื่อ/รหัส |

PK(import_id,sheet_name,row_number). เก็บทุกแถวที่มีข้อมูล ไม่สร้าง record ให้แถวว่าง และเก็บไฟล์เดิมเป็นหลักฐานนอก Git

### catalog_categories

| ฟิลด์ | ชนิด/เงื่อนไข        | หน้าที่                           |
| ----- | -------------------- | --------------------------------- |
| code  | text PK              | OFF/COM/ELE/KIT ตามหมายเหตุ Excel |
| name  | text NOT NULL unique | ชื่อหมวดหลักเดิม                  |

### catalog_items

| ฟิลด์                               | ชนิด/เงื่อนไข                       | หน้าที่                                                                                               |
| ----------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| id                                  | uuid PK                             | surrogate key                                                                                         |
| item_code                           | text NOT NULL unique                | รหัสสินค้า Master ห้ามใช้ numeric                                                                     |
| category_code                       | text NOT NULL FK catalog_categories | หมวดหลัก                                                                                              |
| subcategory                         | text NOT NULL                       | หมวดย่อยตามไฟล์ ไม่มีรหัสหมวดย่อยให้เดา                                                               |
| name / specification / unit / notes | text NOT NULL                       | ชื่อ สเปก หน่วยขาย/อ้างอิง หมายเหตุ; notes ว่างได้                                                    |
| image_reference                     | text?                               | locator `xlsx:<source SHA-256>#xl/media/...` จากภาพฝัง หรือข้อมูลเซลล์ K; ไม่ fetch/publish อัตโนมัติ |
| active                              | boolean NOT NULL default true       | ปิดการเลือกโดยไม่ลบประวัติ                                                                            |
| created_at                          | timestamptz NOT NULL default now()  | เวลาสร้าง                                                                                             |

คงชื่อหน่วยตามต้นฉบับ (อัน/รีม/แพ็ค) ไม่มีตาราง conversion จนกว่าจะได้อัตราที่ตรวจสอบได้ หากรหัสเดิมเปลี่ยนสเปก/หน่วย importer ต้องหยุดให้ตรวจ ไม่ overwrite เงียบ ๆ

### catalog_prices

| ฟิลด์                               | ชนิด/เงื่อนไข                                               | หน้าที่                                                 |
| ----------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------- |
| id                                  | uuid PK                                                     | เวอร์ชันราคา                                            |
| item_id                             | uuid NOT NULL FK catalog_items                              | สินค้า                                                  |
| import_id / sheet_name / row_number | uuid/text/integer NOT NULL composite FK catalog_source_rows | หลักฐานแถว; unique ทั้งสามฟิลด์                         |
| reference_price                     | numeric(14,2) NOT NULL ≥0                                   | ราคาในคอลัมน์ H ไม่ใช่ราคาซื้อจริง                      |
| source_name                         | text NOT NULL                                               | ชื่อแหล่งราคาจากคอลัมน์ I (snapshot ไม่ FK vendors)     |
| reference_date / valid_until        | date?                                                       | วันที่สืบราคา/สิ้นสุดใช้; imported_at ห้ามทดแทน         |
| status                              | text NOT NULL default unverified                            | unverified/verified/withdrawn                           |
| verified_by / verified_at           | uuid? FK profiles / timestamptz?                            | ผู้ตรวจและเวลา                                          |
| evidence_reference                  | text?                                                       | เลขที่/ตำแหน่งหลักฐานที่ตรวจสอบได้                      |
| created_at                          | timestamptz NOT NULL default now()                          | ใช้เลือกรุ่นนำเข้าล่าสุด ไม่สื่อว่าเป็นราคาล่าสุดในตลาด |

verified ต้องมี reference_date, verified_by, verified_at และ evidence_reference ครบ; valid_until ≥ reference_date เมื่อทั้งสองค่ามีอยู่ การรับรอง/ถอนราคาให้เจ้าหน้าที่มีอำนาจจัดการผ่านกระบวนการหน่วยงาน ไม่อนุญาต requester รับรองเอง

### catalog_purchase_history

| ฟิลด์                               | ชนิด/เงื่อนไข                                               | หน้าที่                                                 |
| ----------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------- |
| id                                  | uuid PK                                                     | หนึ่งแถวประวัติซื้อ                                     |
| import_id / sheet_name / row_number | uuid/text/integer NOT NULL composite FK catalog_source_rows | unique ชุดนี้ ป้องกันซ้ำเมื่อนำเข้าไฟล์เดิม             |
| fiscal_year                         | integer 2500–2700 NOT NULL                                  | พ.ศ.จากชีต                                              |
| category_code                       | text NOT NULL FK catalog_categories                         | หัวหมวดที่อยู่เหนือแถว                                  |
| fmis_item_code                      | text NOT NULL                                               | รหัส UBUFMIS แยกจากชื่อและรักษา 0 นำหน้า                |
| description                         | text NOT NULL                                               | ข้อความชื่อสินค้าเดิมหลังรหัส                           |
| purchased_on                        | date NOT NULL                                               | แปลงวัน/เดือน/พ.ศ. เป็น ISO ค.ศ. ตรวจวันจริงและช่วงปีงบ |
| quantity                            | numeric(12,2) >0 NOT NULL                                   | แยกจากจำนวนพร้อมหน่วย เช่น `2 อัน`                      |
| unit                                | text NOT NULL                                               | หน่วยจากประวัติ ไม่แปลงให้เท่าหน่วย Master              |
| catalog_item_id                     | uuid? FK catalog_items                                      | null จนกว่าจะมีการยืนยัน mapping                        |

ไม่มี unit_price หรือ amount ที่สร้างขึ้นใหม่ เพราะ Excel ไม่มีข้อมูลเหล่านี้

### ความสัมพันธ์

```text
auth.users ─1:1─ profiles ─N:1─ departments
profiles ─1:N─ procurement_requests ─1:N─ request_items / attachments / tasks / actions
procurement_requests ─1:N─ payment_requests ─1:N─ payment_items / attachments / tasks / actions

catalog_imports ─1:N─ catalog_source_rows ─1:0..1─ catalog_prices
                                         └1:0..1─ catalog_purchase_history
catalog_categories ─1:N─ catalog_items ─1:N─ catalog_prices
catalog_categories ─1:N─ catalog_purchase_history
catalog_purchase_history ─N:0..1─ catalog_items (จับคู่เมื่อยืนยันเท่านั้น)
```

การเลือกรายการเข้าคำขอใช้ **snapshot** description/specification, unit, market_price, price_source ใน request_items เดิม ไม่ใช่ join ราคาแบบสดที่ทำให้เอกสารเก่าเปลี่ยนตาม catalog. price_source เก็บรหัสสินค้า/แถว/รหัส import และคำเตือนด้วย ยังไม่มี FK จาก request_items ไป catalog_prices ในรอบนี้; หากต้องทำรายงานการใช้สินค้าแบบ relational เพิ่ม catalog_price_id พร้อมแก้ draft/resubmit RPC แบบ atomic และ backfill เฉพาะรายการที่ยืนยันได้ในงานถัดไป ไม่เดารายการย้อนหลัง

## 5. Excel ↔ DB ↔ หน้าเว็บ

| Excel Master    | ตาราง/ฟิลด์                          | การใช้ใน /requests/new                     |
| --------------- | ------------------------------------ | ------------------------------------------ |
| A ลำดับ         | raw_cells เท่านั้น                   | ไม่ใช้เป็น identity                        |
| B รหัส          | catalog_items.item_code              | ค้นหา/แสดง/อ้างอิงแหล่งที่มา               |
| C หมวดหลัก      | catalog_categories → category_code   | ตัวกรองหมวด                                |
| D หมวดย่อย      | catalog_items.subcategory            | ค้นหา/แสดง                                 |
| E ชื่อ / F สเปก | name/specification                   | รวมอย่างอ่านได้ในรายการคำขอ                |
| G หน่วย         | unit                                 | เติมหน่วย; ไม่เติมจำนวน                    |
| H ราคา          | catalog_prices.reference_price       | เติมเฉพาะราคากลาง ไม่แทนราคาต่อหน่วย       |
| I แหล่ง         | catalog_prices.source_name           | แสดงแหล่งเดิม + provenance ใน price_source |
| J หมายเหตุ      | notes                                | แสดงข้อมูลเดิม ไม่บังคับยี่ห้อในชื่อคำขอ   |
| K ภาพ           | image_reference                      | ว่างได้ ไม่แสดงภาพสมมุติ                   |
| ชีตปีงบ A–D     | catalog_purchase_history + raw_cells | ไม่ปะปนเป็นรายการราคาที่เลือกได้           |

สถานะหน้าเว็บ: loading, error พร้อมลองใหม่, ไม่มี import/ไม่มีสินค้า, ค้นหาไม่พบ, ผลลัพธ์แบ่งหน้า, ราคาไม่รับรอง, ราคามีวันหมดอายุ, เลือกสำเร็จ, รายการครบ 200. ค้นชื่อ/รหัส/สเปก/หมวดย่อยได้ ปุ่มเลือกเติมแถวว่างจริงก่อนเพิ่มแถวใหม่ ไม่ทับข้อมูลที่ผู้ใช้เริ่มกรอก แค็ตตาล็อกผิดพลาดไม่ล้างข้อมูลคำขอ และไม่ fallback mock

## 6. ความปลอดภัยและการใช้งานจริง

- ตารางใหม่ทุกตารางเปิด RLS; authenticated ไม่อ่าน raw import/history โดยตรง; admin active เท่านั้นจัดการตารางได้ การนำเข้ารอบนี้ใช้ SQL operator ที่ได้รับอนุญาต ไม่ส่ง service key ไป browser
- RPC `search_procurement_catalog` เป็น read-only security definer, search_path ว่าง, ตรวจ `private.has_permission('request.create')`; revoke PUBLIC/anon, grant authenticated เท่านั้น คืนเฉพาะ DTO ที่หน้าเว็บต้องใช้ ไม่คืน raw workbook/history
- Server action ตรวจ session และ active profile ก่อน RPC อีกชั้น ตรวจขนาด query/เลขหน้า เลือกเฉพาะ active items และรุ่นล่าสุดที่ไม่ withdrawn; หากรุ่นล่าสุดถูกถอน ไม่ย้อนกลับไปใช้รุ่นเก่าโดยไม่แจ้ง
- unique item_code, unique SHA-256, unique source row, FK และ checks ป้องกันรหัส/แถวซ้ำ; index category + item active, price(item,created_at DESC), history(fiscal_year,category_code)
- Import ทำ transaction เดียว อ้างอิงไฟล์ด้วย hash; ไฟล์เดิมรันซ้ำได้ไม่เพิ่มซ้ำ แต่ไฟล์ใหม่เป็น import ใหม่ เก็บราคาเก่าไว้; สเปก/หน่วย/ชื่อรหัสเดิมเปลี่ยนต้องหยุดตรวจ ห้าม overwrite ของเก่า
- ไม่รวม raw workbook หรือ SQL ที่มีข้อมูลจริงใน Git/public assets; เก็บ generated import/audit ใน `supabase/private/catalog/` ซึ่งถูก ignore อยู่แล้ว
- ไม่ใช้รายการราคาจากไฟล์เป็นข้อบังคับผู้ประกอบการ ไม่สร้าง vendor อัตโนมัติ ไม่เพิ่ม integration หรือการรับรองทางกฎหมายที่ไม่มีหลักฐาน

## 7. รายการข้อมูลที่ควรแก้/เพิ่ม/ตัดออก

**ควรเพิ่มก่อนรับรองราคา:** วันที่สืบราคา, URL/เลขใบเสนอราคาหรือไฟล์หลักฐาน, ผู้ตรวจสอบ/วันรับรอง, วันสิ้นสุดใช้, VAT รวม/ไม่รวม/ไม่ทราบ, ค่าขนส่ง, จำนวนต่อบรรจุภัณฑ์และหน่วยที่ราคาอ้างอิง, หน่วยงานเจ้าของ catalog และรอบทบทวน ไม่ใส่ค่าเริ่มต้นแทนข้อเท็จจริงที่ไม่ทราบ

**ควรตรวจ/แก้:** หน่วยกับขนาดสินค้าบางรายการประวัติ, รูปแบบชื่อ/ยี่ห้อ/คำย่อ, รหัสเชื่อม UBUFMIS ↔ Master ที่อนุมัติแล้ว, เพิ่ม Master สำหรับ COM/ELE/KIT (ปัจจุบันมีเพียงชื่อหมวด), ตรวจว่า 7 ราคาใช้ ณ วันใดและยังใช้ได้หรือไม่

**ไม่นำเข้าเป็นสินค้า:** แถวว่าง หัวชีต หัวหมวด และคำอธิบายรหัส; เก็บเป็น raw provenance เท่าที่มีข้อมูล ไม่ลบจาก Excel. ช่องรูปภาพเป็น optional ไม่จำเป็นต้องตัดคอลัมน์ต้นฉบับ

**ข้อเสนอระบบนอกขอบเขตรอบนี้:** admin review/import UI, price-review audit events, catalog_price_id แบบ FK ใน request_items, multi-department catalog, budget ledger พร้อมข้อจำกัดจริง, report pagination/aggregation, verified integrations. ต้องมี requirement และสิทธิ์ใหม่ก่อนดำเนินการ ไม่ประกาศว่ามีแล้ว

## 8. แผนดำเนินการและการยืนยัน

1. จัดทำเอกสารนี้ก่อนแก้ UI (เสร็จในขั้นออกแบบ)
2. เพิ่ม migration `202610110001_procurement_catalog.sql` และ script อ่าน Excel แบบ read-only `scripts/prepare-procurement-catalog.py` สร้าง import SQL/audit แยกจาก schema
3. ทดสอบ row counts = 7 + 294, วันที่/หน่วย/รหัส/ราคา, duplicate protection, active permissions, no mock fallback, selection ไม่แตะ quantity/unit_price, desktop/mobile/keyboard
4. ก่อนใช้งาน production: สำรองฐานข้อมูล ทดสอบ migration/import ใน staging ด้วย role จริง ตรวจ RLS และใช้ transaction นำเข้าตามลำดับ migration → import → ตรวจยอด จากนั้นจึง deploy
5. การย้อน UI ทำได้โดย rollback deployment; schema additive เก็บไว้ได้ หากต้องหยุดราคาให้ปิด active/withdraw ไม่ลบหลักฐานหรือ cascade ลบคำขอ

**สถานะ ณ การออกแบบ:** ยังไม่ได้รัน migration/import กับ Supabase production และยังไม่ได้ deploy; การตรวจ schema เดิมอ้าง repository ไม่ใช่ introspection production

## 9. ไฟล์ที่พัฒนาและวิธีตรวจ/นำเข้า

- Schema: `supabase/migrations/202610110001_procurement_catalog.sql` (6 ตารางใหม่ + RPC อ่านข้อมูล)
- ตัวเตรียมข้อมูล: `scripts/prepare-procurement-catalog.py` ต้องมี Python + openpyxl; runtime ที่ใช้ทดสอบคือ Python ที่ bundled มากับ Codex ไม่ได้เพิ่ม package ให้เว็บ
- ผลลัพธ์ส่วนตัว: `supabase/private/catalog/import.sql` และ `audit.json` (ignored; ไม่อยู่ใน Git) ไฟล์ SQL มีข้อมูลจริง ผู้ดูแลต้องตรวจและเก็บเป็นหลักฐานภายใน
- UI/DTO/Server: `app/requests/new/catalog-picker.tsx`, `catalog-schema.ts`, `catalog-actions.ts`; จุดเชื่อมใน `page.tsx`

```powershell
python scripts/prepare-procurement-catalog.py "ฐานข้อมูลราคากลางพัสดุ คณะรัฐศาสตร์ POL UBU Smart Procurement Database.xlsx"
python -m unittest discover -s tests/python -v
npm run verify
```

ตรวจ `audit.json` ก่อนใช้: items=7, history=294, raw_rows=336, embedded_images=7, ราคาที่ไม่รับรองและขาดวันที่=7. ไฟล์ต้นฉบับ SHA-256 ต้องตรงข้อ 1 และยังไม่ถูกแก้ไข

ขั้นนำเข้าของผู้ดูแล (แนวทางสำหรับการนำเข้าครั้งต่อไป):

1. สำรองฐานข้อมูล ทดสอบใน staging ที่มี migrations เดิมครบ
2. ใช้ migration ใหม่ผ่านระบบ migration ของโครงการ
3. รัน private import.sql ด้วยผู้ดูแลฐานข้อมูลใน transaction (ไม่ใช่ browser/requester token); ตรวจยอดท้าย SQL เป็น prices=7 และ history=294
4. เปิดหน้าเว็บด้วยผู้ใช้ active จริง ตรวจค้นหา `A4`, `OFF-001-03`, หมวด COM ที่ยังไม่มี Master และตรวจ error เมื่อสิทธิ์ไม่ผ่าน
5. ตรวจสิทธิ์อีกครั้งบน Supabase จริงก่อน deploy; ทดสอบในเครื่องไม่ทดแทนการยืนยัน environment production

ผลทดสอบในเครื่อง: migration/import SQL รันบน PostgreSQL/WASM (PGlite) แยก ไม่เชื่อม Supabase; นำเข้าไฟล์เดิมสองครั้งได้ 1 import/7 items/7 prices/294 history/336 raw rows. ผ่าน RLS สำหรับ user/admin/inactive/anon, validation ของ verified, expiry/withdrawal และ transaction rollback เมื่อ metadata รหัสเดิมเปลี่ยน. ทดสอบใช้ schema/auth fixture ที่จำเป็นและฟังก์ชัน `private.has_permission` จริงจาก migration เดิม ไม่อ้างว่าได้รัน migration ทุกตัวหรือ auth infrastructure ของ Supabase ในเครื่อง

ตัวทดสอบ SQL ที่เรียกซ้ำได้หลังติดตั้ง PGlite ในตำแหน่งทดสอบแยก:

```powershell
node scripts/test-procurement-catalog-db.mjs output/pdf/catalog-runtime/node_modules/@electric-sql/pglite supabase/private/catalog/import.sql
```

ทดสอบ UI โดยใช้ DTO จาก import จริงในเครื่อง: search/category/no results/error/retry, snapshot ไม่เติมจำนวนหรือราคาซื้อจริง, keyboard Escape/focus restoration, คำขอเดิมไม่หายเมื่อโหลดราคาไม่สำเร็จ และความกว้าง 320/390/768/844/1600px ไม่ล้น viewport. ลบ QA routes ชั่วคราวแล้ว ไม่เผยแพร่ fixture ข้อมูลจริงเป็น public route

Impeccable finish review: **ship**; ไม่มี material fixes ค้าง ใช้ระบบหน้าตาเดิม ไม่แก้ DESIGN.md. ตัว detector แจ้ง warning เดิมที่ ternary สี step indicator แต่ตรวจแล้วเป็นการจับคู่ข้าม branch (emerald กับ emerald, slate กับ slate) ไม่ใช่ปัญหาในแค็ตตาล็อก

ข้อจำกัดที่คงไว้โดยตั้งใจ: ภาพฝังเก็บ locator/hash ยังไม่ publish; history ยังไม่ map เข้าสินค้าอัตโนมัติ; source ใน request_items เป็นข้อความ snapshot ที่ผู้ใช้แก้ได้ ไม่ใช่หลักฐานรับรองอัตโนมัติ; ยังต้องพัฒนา audit/admin review UI หากจะให้เจ้าหน้าที่เปลี่ยนการรับรองผ่านเว็บ

**ผลตรวจก่อน deploy:** `npm run verify` ผ่าน lint, typecheck, 387 tests/39 files, Prettier และ production build; Python parser tests ผ่าน 6 ข้อ; SQL integration และ UI checks ข้างต้นผ่านทั้งหมด. ไม่มี QA routes ใน production build. SHA-256 ของ Excel ต้นฉบับหลังทำงานตรงกับก่อนทำงาน

## 10. ผล deploy และตรวจ production — 11 ตุลาคม 2569

- Push โค้ด `fa41eef` ขึ้น `main`; Vercel ยืนยัน Production deployment สำเร็จ และตรวจที่ `https://procurement-six-gamma.vercel.app/requests/new`
- ตรวจ Supabase โครงการ `jwklnuzrewkrdtebvaid` แล้วพบ schema/RPC อยู่ก่อนนำเข้า จึงไม่รัน migration ซ้ำ ตรวจ source ของ RPC ตรงกับ migration ใน repository, security definer ใช้ search_path ว่าง, anon ไม่มีสิทธิ์ execute, authenticated มีสิทธิ์ผ่านการตรวจ permission ภายใน
- ตรวจพบ RLS เปิดครบ 6 ตาราง และ admin policies 18 รายการที่ตรวจ `system.manage` ก่อนนำเข้า โดยข้อมูลทั้ง 5 ชุดตรวจนับเริ่มต้นเป็นศูนย์
- รัน private import SQL ใน transaction สำเร็จ หลัง commit ตรวจได้ 1 import, 7 items, 7 prices, 294 history และ 336 source rows; ราคาทั้ง 7 ยังเป็น unverified และไม่มี reference_date ตาม Excel จริง
- ตรวจผ่านเว็บ production ด้วยบัญชีที่เข้าสู่ระบบ: โหลดครบ 7 รายการ, ค้นหา A4 ได้ 2 รายการ, เลือกกระดาษ A4 แล้วเติมชื่อ/คุณลักษณะ/หน่วย/ราคากลาง 119 บาท/แหล่งอ้างอิง พร้อมคำเตือนยังไม่รับรอง โดยจำนวนและราคาต่อหน่วยซื้อจริงยังว่าง ไม่ได้ส่งหรือบันทึกคำขอทดสอบ
- ไม่แก้ข้อมูลคำขอเดิม ไม่เผยแพร่ Excel/private import SQL ใน Git และไม่ได้เปลี่ยนสิทธิ์ฐานข้อมูลระหว่าง deploy นี้ การทดสอบ user/inactive role เชิงลึกยังอ้างผล isolated SQL integration; การตรวจเว็บ production ครั้งนี้ใช้บัญชีผู้ดูแลระบบจริง
