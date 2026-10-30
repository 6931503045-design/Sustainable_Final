// GET /api/stats  ข้อมูลสำหรับ Dashboard (ไม่มีข้อมูลระบุตัวบุคคล)
import { json } from './_lib/http.js';
import { listItems, persistent } from './_lib/store.js';

const strip = ({ owner, consentAt, ...rest }) => rest;

export async function GET() {
  const [jobs, lots] = await Promise.all([listItems('jobs', 300), listItems('lots', 100)]);
  return json({ persistent, jobs: jobs.map(strip), lots: lots.map(strip) });
}
