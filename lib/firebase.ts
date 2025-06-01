import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getDatabase } from "firebase/database"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: "AIzaSyDgVr6M_dDukti1anoQPp7fYJIjX-9Va6A",
  authDomain: "nexusx-195fa.firebaseapp.com",
  databaseURL: "https://nexusx-195fa-default-rtdb.firebaseio.com",
  projectId: "nexusx-195fa",
  storageBucket: "nexusx-195fa.firebasestorage.app",
  messagingSenderId: "308906039754",
  appId: "1:308906039754:web:193ca47d3066828b64d733",
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const database = getDatabase(app)
export const storage = getStorage(app)
export default app
