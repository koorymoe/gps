const fs = require('fs');
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

async function linkSims() {
  // جيب كل device_requests
  const reqSnap = await db.collection('device_requests').get();
  console.log('device_requests:', reqSnap.size);

  // جيب كل الزبائن
  const custSnap = await db.collection('customers').get();
  const customers = {};
  custSnap.docs.forEach(d => { customers[d.id] = d.data(); });
  console.log('customers:', custSnap.size);

  // جيب كل sim_cards
  const simSnap = await db.collection('sim_cards').get();
  const simByNumber = {};
  simSnap.docs.forEach(d => { simByNumber[d.data().sim_number] = { id: d.id, ...d.data() }; });
  console.log('sim_cards:', simSnap.size);

  let linked = 0;
  let batch = db.batch();
  let ops = 0;

  for (const reqDoc of reqSnap.docs) {
    const req = reqDoc.data();
    const simNumber = req.sim_number;
    const customerId = req.customer_id;
    const customer = customers[customerId];

    if (!simNumber || !customer) continue;

    const sim = simByNumber[simNumber];
    if (!sim) continue;

    // ربط السيم بالزبون
    const simRef = db.collection('sim_cards').doc(sim.id);
    const customerName = `${customer.full_name} ${customer.father_name} ${customer.grandfather_name}`.trim();
    batch.update(simRef, {
      status: 'in_use',
      current_customer_name: customerName,
      current_request_id: reqDoc.id,
    });
    ops++;
    linked++;

    if (ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
      console.log(`  ...linked ${linked} so far`);
    }
  }

  if (ops > 0) await batch.commit();
  console.log(`\n✓ Linked ${linked} SIM cards to customers`);
  console.log(`✓ ${simSnap.size - linked} SIM cards remain available`);
  process.exit(0);
}

linkSims().catch(e => { console.error(e.message); process.exit(1); });
