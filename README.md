# Procurement Control Center

ต้นแบบ UI สำหรับระบบบริหารจัดการคำขอการจัดซื้อจัดจ้างและการบริหารพัสดุ อ้างอิงรายละเอียดจาก `PRD.md`

## Tech stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS 4
- Supabase SDK (เตรียม dependency และ factory ไว้ แต่ยังไม่เชื่อมต่อระบบจริง)

## เริ่มใช้งาน

```bash
npm install
npm run dev
```

เปิด `http://localhost:3000`

## หน้าจอที่มีในต้นแบบ

- Dashboard และสายงานอนุมัติ
- คำขอของฉัน
- งานรอตรวจสอบ
- สร้างคำขอแบบหลายขั้นตอน
- Workspace ตรวจสอบและอนุมัติ
- ภาพรวมกระบวนการ
- รายงาน
- ตั้งค่าระบบ

ข้อมูลทั้งหมดเป็น mock data สำหรับออกแบบ UI ไม่มีการบันทึกข้อมูลจริง และยังไม่เรียก Supabase API
