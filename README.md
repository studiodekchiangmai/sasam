# Sasam (สะสม) - Prototype MVP

Sasam เป็นแอปพลิเคชันสะสมการ์ดประจำจังหวัด 77 จังหวัด โดยใช้ Google Sheets เป็นฐานข้อมูลผ่าน Google Apps Script (GAS) และใช้งานหน้า Frontend ผ่าน GitHub Pages โดยสามารถเชื่อมต่อ LIFF สำหรับรันบน LINE ได้

## โครงสร้างโปรเจกต์
- `index.html` - โค้ด Frontend ทั้งหมด (HTML5 + Vue.js + Tailwind CSS + LIFF SDK) รวมไว้ในไฟล์เดียว
- `Code.gs` - โค้ด Backend API สำหรับ Google Apps Script (รองรับ RESTful JSON Data)
- `README.md` - คู่มือการติดตั้งและตั้งค่าฐานข้อมูลตัวอย่าง

---

## 1. การตั้งค่า Google Sheets (Database Schema & Mock Data)
สร้าง Google Sheets ใหม่ และตั้งชื่อแผ่นงาน (Sheet) และ Column Headers ตามนี้อย่างเคร่งครัดที่แถวที่ 1 (Row 1):

### แผ่นงาน (Sheet) ที่ 1: `Cards`
| card_id | name | region | rarity | slogan | stat_tourism | stat_culture | attraction_url | image_drive_id |
|---|---|---|---|---|---|---|---|---|
| TH-10 | กรุงเทพมหานคร | Central | Rare | กรุงเทพฯ ดุจเทพสร้าง | 95 | 90 | https://example.com | 1A2B3C4D5E6F7G8H9I |
| TH-50 | เชียงใหม่ | North | Common | ดอยสุเทพเป็นศรี ประเพณีเป็นสง่า | 99 | 85 | https://example.com | 1A2B3C4D5E6F7G8H9I |
| TH-83 | ภูเก็ต | South | Secret | ไข่มุกอันดามัน สวรรค์เมืองใต้ | 99 | 80 | https://example.com | 1A2B3C4D5E6F7G8H9I |

*(วิธีการใส่รูป: คัดลอกเฉพาะรหัส ID ของรูปภาพที่อัปโหลดลง Google Drive มาใส่ในช่อง `image_drive_id` โดยตั้งค่าแชร์รูปภาพใน Drive ให้เป็น "Anyone with the link" เพื่อให้ Frontend สามารถเข้าถึงได้)*

### แผ่นงาน (Sheet) ที่ 2: `Users`
| user_id | display_name | coins | created_at |
|---|---|---|---|
| guest123 | Tester 01 | 1000 | 2024-01-01T12:00:00.000Z |

### แผ่นงาน (Sheet) ที่ 3: `Inventory`
| id | user_id | card_id | obtained_via | obtained_at |
|---|---|---|---|---|
| INV-1 | guest123 | TH-10 | Gacha | 2024-01-01T12:00:00.000Z |

### แผ่นงาน (Sheet) ที่ 4: `Marketplace`
| listing_id | seller_id | inventory_id | card_id | price_coins | status |
|---|---|---|---|---|---|
| MKT-1 | another_user | INV-2 | TH-83 | 500 | Active |

---

## 2. การตั้งค่า Google Apps Script (Backend)
1. ในหน้า Google Sheets ให้ไปที่เมนู **ส่วนขยาย (Extensions) > Apps Script**
2. คัดลอกโค้ดจากไฟล์ `Code.gs` ทั้งหมดไปวางทับในเอดิเตอร์
3. แก้ไขตัวแปร `SPREADSHEET_ID` บรรทัดบนสุด โดยเอา ID จาก URL ของ Google Sheet มาใส่ (เช่น `1abc123...`)
4. กดปุ่ม **การทำให้ใช้งานได้ (Deploy) > การทำให้ใช้งานได้รายการใหม่ (New deployment)**
5. เลือกประเภท (Select type) เป็น **เว็บแอป (Web App)**
6. **การเข้าถึง (Who has access):** ให้เลือกเป็น **"ทุกคน" (Anyone)**
7. กดปุ่มการทำให้ใช้งานได้ (Deploy) จากนั้นให้อนุญาตสิทธิ์การเข้าถึง 
8. คัดลอก **URL เว็บแอป (Web App URL)** ที่ได้มาเก็บไว้

---

## 3. การตั้งค่า Frontend และอัปโหลดขึ้น GitHub Pages
1. เปิดไฟล์ `index.html` ในโปรเจกต์นี้
2. ค้นหาตัวแปร `API_URL` (บริเวณบรรทัดที่ 162) และนำ **URL เว็บแอป** ที่คัดลอกไว้จากข้อที่แล้วมาใส่แทนที่ `"YOUR_GAS_WEB_APP_URL_HERE"`
3. *(ทางเลือก)* หากต้องการนำไปใช้ใน LINE Mini App (LIFF):
   - สร้าง Channel ใน LINE Developers
   - นำ LIFF ID มาใส่ตรง `LIFF_ID` (บริเวณบรรทัดที่ 163)
   - นำ URL ของ GitHub Pages มาใส่เป็น Endpoint URL ของ LIFF
4. ทำการ Commit และ Push ไฟล์ทั้งหมด (`index.html`, `README.md`) ขึ้นไปยัง **GitHub Repository**
5. ไปที่แท็บ **Settings > Pages** ใน GitHub ของคุณ
6. ในส่วน Source ให้เลือก Branch เป็น `main` หรือ `master` และกด Save
7. รอสักครู่ GitHub จะสร้าง URL สำหรับเปิดเว็บไซต์ (ตัวอย่างเช่น `https://yourusername.github.io/Sasam/`) ซึ่งสามารถเข้าใช้งานหรือส่งให้คนอื่นทดสอบได้ทันที
