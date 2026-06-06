import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, setDoc,
  query, where, orderBy, Timestamp, serverTimestamp
} from 'firebase/firestore'
import { db } from './config'
import { SubscriptionType } from '@/types'

// ---- تحويل الصورة لـ Base64 ----
export async function uploadFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ---- الزبائن ----
export async function createCustomer(data: {
  full_name: string
  father_name: string
  grandfather_name: string
  phone: string
  address: string
  id_card_front_url: string
  id_card_back_url: string
  residence_card_front_url: string
  residence_card_back_url: string
}) {
  const ref = await addDoc(collection(db, 'customers'), { ...data, created_at: serverTimestamp() })
  return ref.id
}

export async function getAllCustomers() {
  const snap = await getDocs(query(collection(db, 'customers'), orderBy('created_at', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getAllCustomersWithSubscriptions() {
  const [custSnap, reqSnap] = await Promise.all([
    getDocs(query(collection(db, 'customers'), orderBy('created_at', 'desc'))),
    getDocs(collection(db, 'device_requests')),
  ])
  const reqByCustomer: Record<string, { id: string; gps_number?: string; sim_number?: string; subscription_end?: string; status?: string }> = {}
  reqSnap.docs.forEach(d => {
    const data = d.data()
    if (data.customer_id) reqByCustomer[data.customer_id] = { id: d.id, ...data }
  })
  return custSnap.docs.map(d => ({
    id: d.id,
    ...d.data(),
    subscription: reqByCustomer[d.id] || null,
  }))
}

export async function updateSubscriptionEnd(requestId: string, subscriptionEnd: string) {
  await updateDoc(doc(db, 'device_requests', requestId), { subscription_end: subscriptionEnd })
}

export async function deleteCustomer(customerId: string) {
  // احذف طلبات الجهاز المرتبطة بالزبون
  const reqSnap = await getDocs(query(collection(db, 'device_requests'), where('customer_id', '==', customerId)))
  await Promise.all(reqSnap.docs.map(d => deleteDoc(d.ref)))
  // احذف الزبون
  await deleteDoc(doc(db, 'customers', customerId))
}

export async function deleteDeviceRequest(requestId: string) {
  await deleteDoc(doc(db, 'device_requests', requestId))
}

// ---- طلبات الأجهزة ----
export async function createDeviceRequest(data: {
  customer_id: string
  employee_id: string
  purchase_type: string
  subscription_type: string | null
  invoice_photo_url?: string
  price?: number
  gps_number?: string
  residence_card_number?: string
}) {
  const ref = await addDoc(collection(db, 'device_requests'), {
    ...data,
    status: 'pending',
    created_at: serverTimestamp(),
  })
  return ref.id
}

export async function getPendingRequests() {
  const snap = await getDocs(query(collection(db, 'device_requests'), where('status', '==', 'pending')))
  const requests = snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Array<{ id: string } & Record<string, unknown>>

  // جلب بيانات الزبون لكل طلب
  return Promise.all(requests.map(async (req) => {
    const custSnap = await getDoc(doc(db, 'customers', req.customer_id as string))
    const empSnap = await getDoc(doc(db, 'profiles', req.employee_id as string))
    return {
      ...req,
      customer: custSnap.exists() ? { id: custSnap.id, ...custSnap.data() } : null,
      employee: empSnap.exists() ? empSnap.data() : null,
    }
  }))
}

export async function deliverRequest(requestId: string, adminId: string, subscriptionType: string | null, activationDate: string | null, deviceChecks?: { checked: boolean; activated: boolean; delivered: boolean }) {
  let subEnd = null
  let subStart = null
  if (subscriptionType && activationDate) {
    const days = subscriptionType === '3_months' ? 90 : subscriptionType === '6_months' ? 180 : 365
    const start = new Date(activationDate)
    subStart = Timestamp.fromDate(start)
    const end = new Date(activationDate)
    end.setDate(end.getDate() + days)
    subEnd = Timestamp.fromDate(end)
  }
  await updateDoc(doc(db, 'device_requests', requestId), {
    status: 'activated',
    admin_id: adminId,
    delivered_at: serverTimestamp(),
    activation_date: subStart,
    subscription_start: subStart,
    subscription_end: subEnd,
    subscription_status: 'active',
    ...(deviceChecks ? { device_checked: deviceChecks.checked, device_activated: deviceChecks.activated, device_delivered: deviceChecks.delivered } : {}),
  })
}

export async function deliverToCustomer(requestId: string, employeeId: string) {
  await updateDoc(doc(db, 'device_requests', requestId), {
    status: 'delivered',
    delivered_to_customer_at: serverTimestamp(),
    delivered_by_employee: employeeId,
  })
}

export async function getAllActivatedRequests() {
  const toISO = (val: unknown) => {
    if (!val) return null
    if (typeof val === 'string') return val
    if (val instanceof Timestamp) return val.toDate().toISOString()
    if (typeof val === 'object' && 'toDate' in val) return (val as Timestamp).toDate().toISOString()
    return null
  }
  const [snap, custSnap] = await Promise.all([
    getDocs(query(collection(db, 'device_requests'), where('status', '==', 'activated'))),
    getDocs(collection(db, 'customers')),
  ])
  const customersMap: Record<string, Record<string, unknown>> = {}
  custSnap.docs.forEach(d => { customersMap[d.id] = { id: d.id, ...d.data() } })
  return snap.docs.map(d => {
    const req = d.data() as Record<string, unknown>
    return {
      id: d.id,
      ...req,
      activation_date: toISO(req.activation_date),
      subscription_end: toISO(req.subscription_end),
      customer: customersMap[req.customer_id as string] || null,
    }
  }).filter(r => r.customer)
}

export async function getRecentlyDelivered() {
  const toISO = (val: unknown) => {
    if (!val) return null
    if (typeof val === 'string') return val
    if (val instanceof Timestamp) return val.toDate().toISOString()
    if (typeof val === 'object' && 'toDate' in val) return (val as Timestamp).toDate().toISOString()
    return null
  }
  const [snap, custSnap] = await Promise.all([
    getDocs(query(collection(db, 'device_requests'), where('status', '==', 'delivered'))),
    getDocs(collection(db, 'customers')),
  ])
  const customersMap: Record<string, Record<string, unknown>> = {}
  custSnap.docs.forEach(d => { customersMap[d.id] = { id: d.id, ...d.data() } })
  return snap.docs
    .map(d => {
      const req = d.data() as Record<string, unknown>
      return {
        id: d.id,
        ...req,
        activation_date: toISO(req.activation_date),
        subscription_end: toISO(req.subscription_end),
        delivered_to_customer_at: toISO(req.delivered_to_customer_at),
        customer: customersMap[req.customer_id as string] || null,
      }
    })
    .filter(r => r.customer)
    .sort((a, b) => {
      const da = a.delivered_to_customer_at || ''
      const db2 = b.delivered_to_customer_at || ''
      return db2 > da ? 1 : -1
    })
    .slice(0, 20)
}

export async function searchActivatedRequests(search: string) {
  const all = await getAllActivatedRequests()
  const s = search.toLowerCase()
  return all.filter(req => {
    const c = req.customer as Record<string, unknown>
    const fullName = `${c.full_name} ${c.father_name} ${c.grandfather_name}`.toLowerCase()
    return fullName.includes(s) || String(c.phone).includes(search) || String((req as Record<string, unknown>).gps_number || '').toLowerCase().includes(s)
  })
}

export async function getDeliveredSubscriptions() {
  const toISO = (val: unknown) => {
    if (!val) return null
    if (typeof val === 'string') return val
    if (val instanceof Timestamp) return val.toDate().toISOString()
    if (typeof val === 'object' && 'toDate' in val) return (val as Timestamp).toDate().toISOString()
    return String(val)
  }

  // جيب كل device_requests والزبائن بنفس الوقت
  const [activatedSnap, deliveredSnap, custSnap] = await Promise.all([
    getDocs(query(collection(db, 'device_requests'), where('status', '==', 'activated'))),
    getDocs(query(collection(db, 'device_requests'), where('status', '==', 'delivered'))),
    getDocs(collection(db, 'customers')),
  ])

  // بناء map للزبائن
  const customersMap: Record<string, Record<string, unknown>> = {}
  custSnap.docs.forEach(d => { customersMap[d.id] = { id: d.id, ...d.data() } })

  const allDocs = [...activatedSnap.docs, ...deliveredSnap.docs]
  const mapped = allDocs.map(d => ({ id: d.id, ...d.data() } as Record<string, unknown>))
  return mapped
    .filter(r => r.subscription_end)
    .map(req => ({
      ...req,
      created_at: toISO(req.created_at),
      activation_date: toISO(req.activation_date),
      subscription_end: toISO(req.subscription_end) as string,
      customer: customersMap[req.customer_id as string] || null,
    }))
}

export async function renewSubscription(requestId: string, newSub: SubscriptionType, currentEnd: string) {
  const days = newSub === '3_months' ? 90 : newSub === '6_months' ? 180 : 365
  const now = new Date()
  const end = new Date(currentEnd)
  const startFrom = end > now ? end : now
  const newEnd = new Date(startFrom)
  newEnd.setDate(newEnd.getDate() + days)

  await updateDoc(doc(db, 'device_requests', requestId), {
    subscription_type: newSub,
    subscription_end: Timestamp.fromDate(newEnd),
    subscription_status: 'active',
  })
}

export async function searchCustomerSubscription(search: string) {
  const toISO = (val: unknown) => {
    if (!val) return null
    if (typeof val === 'string') return val
    if (val instanceof Timestamp) return val.toDate().toISOString()
    if (typeof val === 'object' && 'toDate' in val) return (val as Timestamp).toDate().toISOString()
    return null
  }
  const [snap, custSnap] = await Promise.all([
    getDocs(collection(db, 'device_requests')),
    getDocs(collection(db, 'customers')),
  ])
  const customersMap: Record<string, Record<string, unknown>> = {}
  custSnap.docs.forEach(d => { customersMap[d.id] = { id: d.id, ...d.data() } })

  const s = search.toLowerCase()
  for (const d of snap.docs) {
    const req = d.data() as Record<string, unknown>
    if (!req.subscription_end) continue
    const c = customersMap[req.customer_id as string]
    if (!c) continue
    const fullName = `${c.full_name} ${c.father_name} ${c.grandfather_name}`.toLowerCase()
    if (fullName.includes(s) || String(c.phone).includes(search)) {
      return {
        requestId: d.id,
        customerId: c.id,
        ...c,
        subscription_end: toISO(req.subscription_end),
        subscription_type: req.subscription_type,
      }
    }
  }
  return null
}

// ---- الصيانة ----
export async function createMaintenanceRequest(data: {
  customer_id: string
  employee_id: string
  problem_description: string
  problem_type?: string
}) {
  const ref = await addDoc(collection(db, 'maintenance_requests'), {
    ...data,
    status: 'pending',
    created_at: serverTimestamp(),
  })
  return ref.id
}

export async function getAllMaintenanceRequests() {
  const snap = await getDocs(collection(db, 'maintenance_requests'))
  const requests = snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Array<{ id: string } & Record<string, unknown>>

  return Promise.all(requests.map(async (req) => {
    const custSnap = await getDoc(doc(db, 'customers', req.customer_id as string))
    const empSnap = await getDoc(doc(db, 'profiles', req.employee_id as string))
    return {
      ...req,
      created_at: req.created_at ? (req.created_at as Timestamp).toDate().toISOString() : '',
      resolved_at: req.resolved_at ? (req.resolved_at as Timestamp).toDate().toISOString() : null,
      customer: custSnap.exists() ? custSnap.data() : null,
      employee: empSnap.exists() ? empSnap.data() : null,
    }
  }))
}

export async function updateMaintenanceStatus(id: string, status: string, notes: string) {
  await updateDoc(doc(db, 'maintenance_requests', id), {
    status,
    admin_notes: notes,
    resolved_at: status === 'completed' ? serverTimestamp() : null,
  })
}

// ---- إعدادات الأسعار ----
export async function getSubscriptionPrices(): Promise<{ '3_months': number; '6_months': number; yearly: number }> {
  const snap = await getDoc(doc(db, 'settings', 'subscription_prices'))
  if (snap.exists()) return snap.data() as { '3_months': number; '6_months': number; yearly: number }
  return { '3_months': 0, '6_months': 0, yearly: 0 }
}

export async function saveSubscriptionPrices(prices: { '3_months': number; '6_months': number; yearly: number }) {
  await setDoc(doc(db, 'settings', 'subscription_prices'), prices)
}

// ---- طلبات الموظف ----
export async function getMyDeviceRequests(employeeId: string) {
  const snap = await getDocs(query(collection(db, 'device_requests'), where('employee_id', '==', employeeId)))
  const requests = snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Array<{ id: string } & Record<string, unknown>>
  return Promise.all(requests.map(async (req) => {
    const custSnap = await getDoc(doc(db, 'customers', req.customer_id as string))
    return {
      ...req,
      created_at: req.created_at ? (req.created_at as Timestamp).toDate().toISOString() : null,
      customer: custSnap.exists() ? { id: custSnap.id, ...custSnap.data() } : null,
    }
  }))
}

// ---- طلبات تجديد الاشتراك ----
export async function createRenewalRequest(data: {
  customer_id: string
  original_request_id: string
  employee_id: string
  subscription_type: string
  current_end: string
}) {
  const ref = await addDoc(collection(db, 'renewal_requests'), {
    ...data,
    status: 'pending',
    created_at: serverTimestamp(),
  })
  return ref.id
}

export async function getPendingRenewals() {
  const snap = await getDocs(query(collection(db, 'renewal_requests'), where('status', '==', 'pending')))
  const requests = snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Array<{ id: string } & Record<string, unknown>>
  return Promise.all(requests.map(async (req) => {
    const custSnap = await getDoc(doc(db, 'customers', req.customer_id as string))
    return {
      ...req,
      created_at: req.created_at ? (req.created_at as Timestamp).toDate().toISOString() : null,
      customer: custSnap.exists() ? { id: custSnap.id, ...custSnap.data() } : null,
    }
  }))
}

export async function approveRenewal(renewalId: string, originalRequestId: string, adminId: string, subscriptionType: string, currentEnd: string) {
  const days = subscriptionType === '3_months' ? 90 : subscriptionType === '6_months' ? 180 : 365
  const now = new Date()
  const end = new Date(currentEnd)
  const startFrom = end > now ? end : now
  const newEnd = new Date(startFrom)
  newEnd.setDate(newEnd.getDate() + days)
  await updateDoc(doc(db, 'renewal_requests', renewalId), {
    status: 'delivered',
    admin_id: adminId,
    approved_at: serverTimestamp(),
    new_subscription_end: Timestamp.fromDate(newEnd),
  })
  await updateDoc(doc(db, 'device_requests', originalRequestId), {
    subscription_type: subscriptionType,
    subscription_end: Timestamp.fromDate(newEnd),
    subscription_status: 'active',
  })
}

// ---- SIM كارتات ----
export async function getAllSimCards() {
  const snap = await getDocs(collection(db, 'sim_cards'))
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) }))
}

export async function addSimCard(data: { sim_number: string; iccid?: string; operator: string; notes?: string }) {
  const ref = await addDoc(collection(db, 'sim_cards'), {
    ...data,
    status: 'available',
    current_customer_name: null,
    current_request_id: null,
    created_at: serverTimestamp(),
  })
  return ref.id
}

export async function assignSimCard(simId: string, customerName: string, requestId: string) {
  await updateDoc(doc(db, 'sim_cards', simId), {
    status: 'in_use',
    current_customer_name: customerName,
    current_request_id: requestId,
  })
}

export async function releaseSimCard(simId: string) {
  await updateDoc(doc(db, 'sim_cards', simId), {
    status: 'available',
    current_customer_name: null,
    current_request_id: null,
  })
}

export async function updateSimCard(simId: string, data: { sim_number?: string; iccid?: string; operator?: string; notes?: string }) {
  await updateDoc(doc(db, 'sim_cards', simId), data)
}

// ---- زبائن قدامى ----
export async function addLegacyCustomer(data: {
  full_name: string
  father_name: string
  grandfather_name: string
  phone: string
  address: string
  gps_number: string
  sim_number?: string
  subscription_type: string
  activation_date: string
  subscription_end: string
  notes?: string
}) {
  // Create customer
  const custRef = await addDoc(collection(db, 'customers'), {
    full_name: data.full_name,
    father_name: data.father_name,
    grandfather_name: data.grandfather_name,
    phone: data.phone,
    address: data.address,
    id_card_front_url: '',
    id_card_back_url: '',
    residence_card_front_url: '',
    residence_card_back_url: '',
    created_at: serverTimestamp(),
  })

  // Create device request as already delivered
  const start = new Date(data.activation_date)
  const end = new Date(data.subscription_end)

  await addDoc(collection(db, 'device_requests'), {
    customer_id: custRef.id,
    employee_id: 'legacy',
    purchase_type: 'device_sim',
    subscription_type: data.subscription_type,
    gps_number: data.gps_number,
    sim_number: data.sim_number || '',
    status: 'delivered',
    activation_date: Timestamp.fromDate(start),
    subscription_start: Timestamp.fromDate(start),
    subscription_end: Timestamp.fromDate(end),
    subscription_status: 'active',
    notes: data.notes || 'زبون قديم - مضاف يدوياً',
    is_legacy: true,
    created_at: serverTimestamp(),
    delivered_at: serverTimestamp(),
  })

  return custRef.id
}

// ---- إحصائيات الداشبورد ----
export async function getDashboardStats() {
  const [pendingSnap, allSnap, monthSnap] = await Promise.all([
    getDocs(query(collection(db, 'device_requests'), where('status', '==', 'pending'))),
    getDocs(query(collection(db, 'device_requests'), where('status', '==', 'delivered'))),
    getDocs(collection(db, 'device_requests')),
  ])
  return {
    pending: pendingSnap.size,
    delivered: allSnap.size,
    total: monthSnap.size,
  }
}
