
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'


const firebaseConfig = {
  apiKey: "AIzaSyDwtyyGTS9svI_91HbCNAtFwwMOJjifB_s",
  authDomain: "vault-sensor.firebaseapp.com",
  projectId: "vault-sensor",
  storageBucket: "vault-sensor.firebasestorage.app",
  messagingSenderId: "G-F0G04DMGWJ",
  appId: "1:48236996629:web:12a56312514443c85b461c"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
