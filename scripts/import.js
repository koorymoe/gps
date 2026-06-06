const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const admin = require('firebase-admin');

// Load env
const env = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const envObj = {};
env.split('\n').forEach(line => {
  const eq = line.indexOf('=');
  if (eq > 0) {
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    envObj[k] = v;
  }
});

const privateKey = envObj.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: envObj.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: envObj.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey,
  }),
});

const db = admin.firestore();

// Read Excel files
const simsWb = XLSX.readFile('/root/.claude/uploads/dc36bf7d-2709-51c4-8884-102392f0a7bb/d4086fab-__________.xlsx');
const simsData = XLSX.utils.sheet_to_json(simsWb.Sheets[simsWb.SheetNames[0]]);

const customersWb = XLSX.readFile('/root/.claude/uploads/dc36bf7d-2709-51c4-8884-102392f0a7bb/6470fd87-_____.xlsx');
const customersData = XLSX.utils.sheet_to_json(customersWb.Sheets[customersWb.SheetNames[0]]);

console.log(`SIM cards: ${simsData.length}`);
console.log(`Customers: ${customersData.length}`);

// Build SIM lookup by SUBNO
const simLookup = {};
simsData.forEach(s => {
  simLookup[String(s.SUBNO)] = s;
});

// Parse date from Excel
function parseDate(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    // Excel serial date
    const date = new Date((val - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  if (typeof val === 'string') {
    // Try DD/MM/YYYY
    const parts = val.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
    }
  }
  return null;
}

// Split name into parts
function splitName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/);
  return {
    full_name: parts[0] || '',
    father_name: parts[1] || '',
    grandfather_name: parts.slice(2).join(' ') || '',
  };
}

async function importData() {
  const batch_size = 400;
  let customerCount = 0;
  let simCount = 0;
  let matchedCount = 0;

  // 1. Import SIM cards
  console.log('\nImporting SIM cards...');
  let batch = db.batch();
  let ops = 0;
  for (const sim of simsData) {
    const ref = db.collection('sims').doc(String(sim.SUBNO));
    batch.set(ref, {
      sim_number: String(sim.SUBNO),
      iccid: sim.iccid ? String(sim.iccid) : '',
      operator: sim['المشغل'] || '',
      status: sim['الحالة'] || '',
      imported_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    ops++;
    simCount++;
    if (ops >= batch_size) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();
  console.log(`✓ Imported ${simCount} SIM cards`);

  // 2. Import customers + create device_requests (matched)
  console.log('\nImporting customers and matching with SIMs...');
  batch = db.batch();
  ops = 0;

  for (const cust of customersData) {
    const nameParts = splitName(cust['اسم الزبون']);
    const simNumber = String(cust['رقم ال GPS'] || '');
    const gpsId = String(cust['ID جهاز GPS'] || '');
    const subEnd = parseDate(cust['تاريخ انتهاء الاشتراك']);
    const phone = String(cust['رقم الهاتف'] || '');

    // Create customer
    const custRef = db.collection('customers').doc();
    batch.set(custRef, {
      full_name: nameParts.full_name,
      father_name: nameParts.father_name,
      grandfather_name: nameParts.grandfather_name,
      phone,
      address: '',
      national_id_number: '',
      residence_card_number: '',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    customerCount++;
    ops++;

    // Create device_request (subscription record)
    const sim = simLookup[simNumber];
    const reqRef = db.collection('device_requests').doc();
    batch.set(reqRef, {
      customer_id: custRef.id,
      sim_number: simNumber,
      gps_number: gpsId,
      iccid: sim?.iccid ? String(sim.iccid) : '',
      operator: sim?.['المشغل'] || '',
      subscription_end: subEnd,
      status: 'delivered',
      purchase_type: 'device_sim',
      imported: true,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    ops++;

    if (sim) matchedCount++;

    if (ops >= batch_size) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
      console.log(`  ...processed ${customerCount} customers so far`);
    }
  }
  if (ops > 0) await batch.commit();

  console.log(`\n✓ Imported ${customerCount} customers`);
  console.log(`✓ Created ${customerCount} device_requests`);
  console.log(`✓ Matched with SIM data: ${matchedCount}/${customerCount}`);
  console.log('\nDone!');
  process.exit(0);
}

importData().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
