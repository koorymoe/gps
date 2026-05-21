import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from './config'

export async function loginUser(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  return cred.user
}

export async function logoutUser() {
  await signOut(auth)
}

export async function getUserProfile(uid: string) {
  const snap = await getDoc(doc(db, 'profiles', uid))
  return snap.exists() ? snap.data() : null
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}
