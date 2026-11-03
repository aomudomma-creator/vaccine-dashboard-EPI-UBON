# แดชบอร์ดงานวัคซีน จังหวัดอุบลราชธานี

งานวัคซีน กลุ่มงานควบคุมโรคติดต่อ สำนักงานสาธารณสุขจังหวัดอุบลราชธานี

เว็บไซต์: https://aomudomma-creator.github.io/vaccine-dashboard-EPI-UBON/

## โครงสร้าง
- `index.html` หน้าแดชบอร์ด
- `app.js` การคำนวณ กราฟ ตาราง และตัวกรอง
- `data/` ข้อมูลสรุป (CSV/JSON) — อัปเดตตัวเลขที่นี่ หน้าเว็บจะคำนวณใหม่เอง

## ข้อมูล
เก็บเฉพาะยอดสรุประดับอำเภอและหน่วยบริการ ไม่มีข้อมูลรายบุคคล
- `mmr2_ubon_2569.csv` HDC สสจ.อุบลราชธานี
- `flu_ubon_2569.csv`, `flu_groups.csv`, `flu_subunits.csv` สปสช. (medata D2-V11/V12)
- `polio_coverage_th.csv`, `vpd_situation.csv`, `schedule.csv` กรมควบคุมโรค
- `references.csv`, `vaccine_knowledge.json` คลังความรู้และแหล่งอ้างอิง

PM: นางสาวหัทยา อุดมมา พยาบาลวิชาชีพปฏิบัติการ
