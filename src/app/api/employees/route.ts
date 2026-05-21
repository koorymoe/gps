import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

export async function POST(req: NextRequest) {
  try {
    const { full_name, email, password, role } = await req.json()

    if (!full_name || !email || !password || !role) {
      return NextResponse.json({ error: 'جميع الحقول مطلوبة' }, { status: 400 })
    }

    // إنشاء المستخدم في Firebase Auth
    const userRecord = await adminAuth.createUser({ email, password, displayName: full_name })

    // إنشاء الملف الشخصي في Firestore
    await adminDb.collection('profiles').doc(userRecord.uid).set({
      full_name,
      role,
      email,
      created_at: new Date(),
    })

    return NextResponse.json({ success: true, uid: userRecord.uid })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'حدث خطأ'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const snap = await adminDb.collection('profiles').orderBy('created_at', 'desc').get()
    const employees = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    return NextResponse.json({ employees })
  } catch (err: unknown) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { uid } = await req.json()
    await adminAuth.deleteUser(uid)
    await adminDb.collection('profiles').doc(uid).delete()
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
