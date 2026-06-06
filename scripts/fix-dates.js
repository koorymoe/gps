const fs = require('fs');
const XLSX = require('xlsx');
const admin = require('firebase-admin');

const env = fs.readFileSync('/home/user/gps/.env.local', 'utf8');
const envObj = {};
env.split('\n').forEach(line => {
  const eq = line.indexOf('=');
  if (eq > 0) {
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq+1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1,-1);
    envObj[k] = v;
  }
});

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: envObj.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: envObj.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: envObj.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const db = admin.firestore();

function parseDate(val) {
  if (!val || val === 0) return null;
  if (typeof val === 'number') {
    const date = new Date((val - 25569) * 86400 * 1000);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  }
  if (typeof val === 'string') {
    const parts = val.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
    }
  }
  return null;
}

async function fixDates() {
  // قراءة الإكسل
  const wb = XLSX.readFile('/root/.claude/uploads/dc36bf7d-2709-51c4-8884-102392f0a7bb/5184a4d4-_____.xlsx');
  const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

  // بناء map: رقم GPS → تاريخ
  const dateByGps = {};
  data.forEach(row => {
    const gps = String(row['رقم ال GPS'] || '');
    const date = parseDate(row['تاريخ انتهاء الاشتراك']);
    if (gps && date) dateByGps[gps] = date;
  });
  console.log('تواريخ صالحة بالإكسل:', Object.keys(dateByGps).length);

  // جيب device_requests بدون تاريخ
  const snap = await db.collection('device_requests').get();
  let updated = 0, skipped = 0;

  let batch = db.batch();
  let ops = 0;

  for (const d of snap.docs) {
    const req = d.data();
    if (req.subscription_end) { skipped++; continue; }

    const simNum = String(req.sim_number || '');
    const date = dateByGps[simNum];
    if (!date) continue;

    batch.update(d.ref, { subscription_end: date });
    ops++;
    updated++;

    if (ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }

  if (ops > 0) await batch.commit();
  console.log(`✓ تم تحديث ${updated} زبون`);
  console.log(`- تجاهل ${skipped} (عنده تاريخ مسبقاً)`);
  process.exit(0);
}

fixDates().catch(e => { console.error(e.message); process.exit(1); });
