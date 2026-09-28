# STEP 2 — Read-only Feishu Base Audit

## เป้าหมาย
เพิ่ม Audit Engine ฝั่ง Backend เพื่ออ่านข้อมูลจาก Feishu Base จริง โดยไม่ใช้ Feishu AI และไม่ทำ destructive changes.

## สิ่งที่เพิ่ม
- `backend/src/audit.js` ตรวจ duplicate key และ orphan references
- `backend/src/server.js` เพิ่ม `GET /api/audit`
- `frontend/audit.html` หน้าตรวจ Audit และ Export JSON

## Rules ปัจจุบัน
### Canonical tables
1. Companies
2. Departments
3. Positions
4. Employees
5. AttendanceSummary
6. Payroll
7. PayrollItems
8. Payslips

### Duplicate checks
ระบบเลือก key field จากชื่อมาตรฐาน เช่น EmployeeID, PayrollID, PayslipID ก่อนตรวจค่าซ้ำ

### Orphan checks
ตรวจ reference หลักระหว่าง Employee / Company / Department / Position / Payroll / Payslip / PayrollItems / AttendanceSummary ตาม field ที่มีอยู่จริง

## ข้อจำกัด
นี่คือ read-only audit engine. ยังไม่มีการลบ, merge, rename หรือ overwrite สูตรใน Feishu Base.

## วิธีใช้
1. อัปโหลดไฟล์ชุดนี้ทับ path เดิมใน GitHub
2. Deploy backend
3. ตั้ง `PAYROLL_API_URL` ให้หน้า `frontend/audit.html` ชี้ไป backend
4. เปิดหน้า Audit แล้วกด **Run Audit**
5. ส่งไฟล์ `MAC-FEISHU-PAYROLL-BASE-AUDIT.json` กลับมาเพื่อทำ schema normalization ต่อ
