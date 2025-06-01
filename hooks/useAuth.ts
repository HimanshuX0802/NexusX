"use client"

import { useState, useEffect } from "react"
import {
  type User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth"
import { ref, set, onDisconnect, serverTimestamp, get } from "firebase/database"
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage"
import { auth, database, storage } from "@/lib/firebase"
import type { User } from "@/lib/types"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          // Check if user exists in database
          const userRef = ref(database, `users/${firebaseUser.uid}`)
          const userSnapshot = await get(userRef)

          let userData = userSnapshot.val()

          // If user doesn't exist, create user data
          if (!userData) {
            userData = {
              displayName: firebaseUser.displayName || "Anonymous User",
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL || null,
              createdAt: Date.now(),
              status: "online",
            }
            await set(userRef, userData)
          }

          const user: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            displayName: userData.displayName || "Anonymous User",
            photoURL: userData.photoURL || undefined,
            status: "online",
            lastSeen: Date.now(),
          }

          // Set user as online
          const statusRef = ref(database, `status/${firebaseUser.uid}`)
          await set(statusRef, {
            status: "online",
            lastSeen: serverTimestamp(),
          })

          // Set offline when disconnected
          onDisconnect(statusRef).set({
            status: "offline",
            lastSeen: serverTimestamp(),
          })

          setUser(user)
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error("Auth error:", error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    })

    return unsubscribe
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      return result
    } catch (error: any) {
      throw new Error(error.message || "Failed to login")
    }
  }

  const register = async (email: string, password: string, displayName: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(result.user, { displayName })

      // Create user in database
      const userRef = ref(database, `users/${result.user.uid}`)
      await set(userRef, {
        displayName,
        email,
        photoURL: null,
        createdAt: Date.now(),
        status: "online",
      })

      return result
    } catch (error: any) {
      throw new Error(error.message || "Failed to create account")
    }
  }

  const logout = async () => {
    try {
      if (user) {
        const statusRef = ref(database, `status/${user.uid}`)
        await set(statusRef, {
          status: "offline",
          lastSeen: serverTimestamp(),
        })
      }
      await signOut(auth)
    } catch (error: any) {
      throw new Error("Failed to logout")
    }
  }

  const updateUserProfile = async (displayName?: string, photoFile?: File) => {
    try {
      if (!auth.currentUser) throw new Error("No authenticated user")

      let photoURL = user?.photoURL

      // Upload new photo if provided
      if (photoFile) {
        const fileRef = storageRef(storage, `profile_pictures/${auth.currentUser.uid}`)
        await uploadBytes(fileRef, photoFile)
        photoURL = await getDownloadURL(fileRef)
      }

      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName: displayName || auth.currentUser.displayName,
        photoURL,
      })

      // Update user in database
      const userRef = ref(database, `users/${auth.currentUser.uid}`)
      await set(userRef, {
        displayName: displayName || user?.displayName,
        email: user?.email,
        photoURL,
        createdAt: user?.lastSeen || Date.now(),
        status: "online",
      })

      // Update local user state
      if (user) {
        setUser({
          ...user,
          displayName: displayName || user.displayName,
          photoURL,
        })
      }

      return true
    } catch (error) {
      console.error("Failed to update profile:", error)
      throw new Error("Failed to update profile")
    }
  }

  const updateStatus = async (status: "online" | "idle" | "dnd" | "offline") => {
    try {
      if (!user) return

      const statusRef = ref(database, `status/${user.uid}`)
      await set(statusRef, {
        status,
        lastSeen: serverTimestamp(),
      })

      setUser({
        ...user,
        status,
      })
    } catch (error) {
      console.error("Failed to update status:", error)
    }
  }

  return { user, loading, login, register, logout, updateUserProfile, updateStatus }
}
