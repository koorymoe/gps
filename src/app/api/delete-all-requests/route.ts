import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'

export async function DELETE() {
  const snap = await adminDb.collection('device_requests').get()
  const batch = adminDb.batch()
  snap.docs.forEach(d => batch.delete(d.ref))
  await batch.commit()
  return NextResponse.json({ deleted: snap.size })
}
