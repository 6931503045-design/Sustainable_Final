# คู่มือ Deploy เว็บ + เชื่อม LINE OA (ทีละขั้น)

ใช้เวลาประมาณ 1–2 ชั่วโมง ค่าใช้จ่าย 0 บาท ต้องมี: บัญชี GitHub (มีแล้ว), บัญชี LINE, อีเมล

> 🔐 **ห้ามใส่ token/secret ลงในโค้ด แชตกลุ่ม หรือโปสเตอร์เด็ดขาด** ใส่ใน Vercel เท่านั้น

---

## ขั้นที่ 1: Deploy เว็บขึ้น Vercel
1. เข้า <https://vercel.com> แล้ว Sign up ด้วย GitHub
2. กด **Add New → Project** แล้วเลือก repo `sustainable_final`
3. ตั้ง **Root Directory = `web`** (Framework จะขึ้นว่า Vite เอง)
4. ใส่ Environment Variable `LOT_SECRET` ก่อนหนึ่งตัว (สุ่มข้อความยาว ๆ เช่นพิมพ์มั่ว ๆ 40 ตัวอักษร) แล้วกด **Deploy**
5. ได้ URL เช่น `https://rai-mai-phao.vercel.app` ลองเปิด `/kiosk` แล้วกด "ใช้ล็อตทดลอง" ควรทำงานได้ (โหมดทดลอง ยังไม่ส่ง LINE)

## ขั้นที่ 2: สร้าง LINE Official Account + เปิด Messaging API
1. เข้า <https://manager.line.biz> แล้วสร้างบัญชี LINE OA ชื่อ "ไร่ไม่เผา" (หมวดหมู่: เกษตร/สิ่งแวดล้อม)
2. ใน OA Manager ไปที่ **ตั้งค่า (Settings) → Messaging API → เปิดใช้งาน Messaging API**
   - ระบบให้สร้าง/เลือก **Provider** ให้ตั้งชื่อเช่น `RaiMaiPhao` (**จำไว้ ขั้นที่ 3 ต้องใช้ Provider เดียวกัน**)
3. เข้า <https://developers.line.biz/console> → Provider → channel Messaging API ที่เพิ่งสร้าง
   - แท็บ **Basic settings**: คัดลอก **Channel secret** → `LINE_CHANNEL_SECRET`
   - แท็บ **Basic settings** ด้านล่างสุด: **Your user ID** (ขึ้นต้นด้วย U…) → `TECH_USER_ID` (ช่างในเดโม = คนดูแลระบบ)
   - แท็บ **Messaging API**: กด Issue **Channel access token (long-lived)** → `LINE_CHANNEL_ACCESS_TOKEN`

## ขั้นที่ 3: สร้าง LINE Login channel + LIFF
1. ใน Provider **เดียวกัน** กด **Create a new channel → LINE Login**
   - App types: ✅ Web app
   - คัดลอก **Channel ID** (ตัวเลข) → `LINE_LOGIN_CHANNEL_ID`
2. แท็บ **LIFF → Add**
   - LIFF app name: `ไร่ไม่เผา`
   - Size: **Full**
   - Endpoint URL: `https://<โดเมน-vercel>/liff`
   - Scopes: ✅ `openid` ✅ `profile`
   - Add friend option (Bot link feature): **On (Aggressive)** (ชวนเพิ่มเพื่อน OA ตอนเปิดครั้งแรก ต้องเป็นเพื่อนก่อนถึงจะรับข้อความได้)
   - กด Add แล้วคัดลอก **LIFF ID** → `VITE_LIFF_ID` และ `https://liff.line.me/<LIFF ID>` → `LIFF_URL`
3. ⚠️ ที่หัว channel เปลี่ยนสถานะจาก **Developing → Published** ไม่งั้นคนอื่น (เช่นกรรมการ) จะ login ไม่ได้ ใช้ได้แค่แอดมิน

## ขั้นที่ 4: ใส่ค่าใน Vercel แล้ว Redeploy
Vercel → Project → **Settings → Environment Variables** ใส่ทุกตัวตาม `web/.env.example`:

| ตัวแปร | ได้จาก |
|---|---|
| `VITE_LIFF_ID` | ขั้น 3.2 |
| `LIFF_URL` | ขั้น 3.2 |
| `LINE_LOGIN_CHANNEL_ID` | ขั้น 3.1 |
| `LINE_CHANNEL_SECRET` | ขั้น 2.3 |
| `LINE_CHANNEL_ACCESS_TOKEN` | ขั้น 2.3 |
| `TECH_USER_ID` | ขั้น 2.3 |
| `LOT_SECRET` | ขั้น 1 (**ห้ามเปลี่ยนหลังเริ่มใช้งาน** ไม่งั้น QR เก่าใช้ไม่ได้) |

แล้วไปที่ **Deployments → ⋯ → Redeploy** (ต้อง redeploy เพราะ `VITE_LIFF_ID` ถูกฝังตอน build)

## ขั้นที่ 5: Webhook (ตอบข้อความอัตโนมัติ)
1. LINE Developers → channel Messaging API → แท็บ **Messaging API**
   - Webhook URL: `https://<โดเมน-vercel>/api/webhook` → กด **Verify** (ต้องขึ้น Success)
   - เปิด **Use webhook**
2. ใน OA Manager → **ตั้งค่าการตอบกลับ**: ปิด "ข้อความตอบกลับอัตโนมัติ" และ "ข้อความทักทาย" (ไม่งั้นจะตอบซ้ำกับบอท)

## ขั้นที่ 6: Rich menu
OA Manager → **หน้าหลัก → ริชเมนู → สร้าง**
- เทมเพลต: **แบบใหญ่ (Large) 4 ช่อง** (2×2)
- รูปภาพ: อัปโหลด `docs/line/richmenu.png` (2500×1686)
- ช่อง A "ขาย / เรียกรถรับ": ลิงก์ → `https://liff.line.me/<LIFF ID>`
- ช่อง B "ราคารับซื้อ": ข้อความ → `ราคา` (บอทตอบเป็นตารางราคา) หรือลิงก์ → `https://liff.line.me/<LIFF ID>?tab=price`
- ช่อง C "ล็อตของฉัน": ลิงก์ → `https://liff.line.me/<LIFF ID>?tab=lots`
- ช่อง D "ขับรถรับของ": ลิงก์ → `https://liff.line.me/<LIFF ID>/driver`
- ช่วงเวลาแสดง: ตั้งให้ครอบคลุมถึงหลังวันงาน แล้วกดบันทึก

> หน้าคนขับใช้ LIFF ตัวเดียวกัน (`/driver` ต่อท้าย LIFF URL จะเปิด `<endpoint>/liff/driver`) ไม่ต้องสร้าง LIFF เพิ่ม

## ขั้นที่ 7 (จำเป็นสำหรับระบบเรียกรถ): ฐานข้อมูลฟรี Upstash
ถ้าไม่ทำ งานรับของและข้อมูลคนขับจะเก็บในหน่วยความจำของ server ซึ่ง Vercel ล้างทิ้งบ่อย และแต่ละเครื่องอาจเห็นข้อมูลไม่ตรงกัน (ส่วนอื่นยังทำงานได้)
1. Vercel → Project → **Storage → Create → Upstash (Redis)** → Free plan → Connect to project
2. Vercel จะเพิ่มตัวแปร `KV_REST_API_URL` / `KV_REST_API_TOKEN` ให้เอง (โค้ดรองรับแล้ว) แล้วกด Redeploy
3. เปิด `/api/stats` ต้องเห็น `"persistent": true`

## ทดสอบหลังตั้งค่า (ทำให้ครบก่อน 11 พ.ย.)
- [ ] เพิ่มเพื่อน OA แล้วได้ข้อความทักทาย + ปุ่ม quick reply
- [ ] พิมพ์ "ราคา" แล้วบอทตอบเป็นการ์ดตารางราคา
- [ ] กดริชเมนู "แจ้งเศษพืช" → ยินยอม → กรอก แล้ว **QR เด้งเข้าแชต**
- [ ] เปิด `/kiosk` บนแท็บเล็ต (อนุญาตกล้อง) สแกน QR จากมือถือ → แปรรูป แล้ว **ใบรับของเด้งเข้าแชต** มีรูปสินค้า
- [ ] **ระบบเรียกรถ (ใช้มือถือ 2 เครื่อง):** เครื่อง B กดเมนู "ขับรถรับของ" แล้วสมัคร → เครื่อง A แจ้งขายแบบ "เรียกรถไปรับ" → เครื่อง B ได้ข้อความ "งานรับของใหม่" → กดรับงาน → เครื่อง A ได้ "มีคนขับรับงานแล้ว" → B กด "รับของแล้ว" → B เอา QR ไปสแกนที่ตู้ → A ได้ใบรับของที่หักค่ารถ, B ได้ "ส่งของสำเร็จ"
- [ ] Dashboard กด "แจ้งช่างผ่าน LINE" แล้ว LINE ของ `TECH_USER_ID` ได้ข้อความ
- [ ] แท็บ "สิทธิ์ของฉัน" กดลบข้อมูลได้
- [ ] ให้เพื่อนอีกคน (ไม่ใช่แอดมิน) ลองทำซ้ำ เพื่อเช็กว่า channel เป็น Published แล้ว

## แก้ปัญหาที่เจอบ่อย
| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| หน้า LIFF ขึ้น "โหมดทดลอง" | ยังไม่ได้ใส่ `VITE_LIFF_ID` หรือยังไม่ได้ Redeploy |
| "ยืนยันตัวตน LINE ไม่สำเร็จ" | `LINE_LOGIN_CHANNEL_ID` ผิด (ต้องเป็นของ LINE Login channel ไม่ใช่ Messaging API) |
| สร้างล็อตได้แต่ QR ไม่เข้าแชต (`pushError` 400) | LINE Login กับ Messaging API อยู่คนละ Provider (userId ไม่ตรงกัน) หรือผู้ใช้ยังไม่ได้เพิ่มเพื่อน OA |
| `pushError` 429 | โควตาข้อความ push รายเดือนของแผนฟรีเต็ม ให้ตรวจใน OA Manager หรือทดสอบให้น้อยลง (แจ้งงานใหม่ถึงคนขับนับตามจำนวนคนขับ) |
| คนขับไม่ได้รับแจ้งงานใหม่ | คนขับต้องสมัครผ่าน LINE (ไม่ใช่โหมดทดลอง) และเป็นเพื่อนกับ OA · ล็อตทดลองจะไม่แจ้งคนขับ |
| งานรับของหาย / Dashboard ไม่ตรงกันข้ามเครื่อง | ยังไม่ได้ทำขั้นที่ 7 (Upstash) — **ระบบเรียกรถต้องใช้ Upstash** เพราะเกษตรกรกับคนขับใช้คนละเครื่อง |
| กล้องที่ `/kiosk` ไม่เปิด | ต้องเปิดผ่าน https (Vercel) และกดอนุญาตกล้อง หรือใช้ปุ่ม "ใช้ล็อตทดลอง" |
| Webhook Verify ไม่ผ่าน | `LINE_CHANNEL_SECRET` ผิด หรือยังไม่ได้ Redeploy |

## ทดสอบในเครื่องตัวเอง (สำหรับ Dev)
```bash
cd web
cp .env.example .env.local   # ใส่ LOT_SECRET อย่างน้อยหนึ่งตัว
npm install
npm run dev                  # เปิด http://localhost:5173
npm test                     # ทดสอบ API (จำลอง LINE ไม่ต้องมีบัญชี)
```
หน้า LIFF ในเครื่องจะเข้าโหมดทดลอง ส่วนการทดสอบกับ LINE จริงให้ใช้ URL ของ Vercel
