"use client"

import type React from "react"
import { useState } from "react"
import { ref, set } from "firebase/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Camera } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { uploadImage } from "@/lib/imageStorage"
import { database } from "@/lib/firebase"
import { toast } from "sonner"

interface ProfileSettingsProps {
  onClose: () => void
}

export function ProfileSettings({ onClose }: ProfileSettingsProps) {
  const { user, updateStatus } = useAuth()
  const [displayName, setDisplayName] = useState(user?.displayName || "")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB")
        return
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file")
        return
      }
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const handleSave = async () => {
    if (!user) return
    if (!displayName.trim()) {
      toast.error("Display name is required")
      return
    }

    setLoading(true)
    try {
      let photoURL = user.photoURL || null
      if (selectedFile) {
        // Upload the profile picture and get base64 URL
        photoURL = await uploadImage(selectedFile)
      }

      // Update user profile in Firebase Realtime Database
      const userRef = ref(database, `users/${user.uid}`)
      await set(userRef, {
        displayName,
        email: user.email,
        photoURL,
        status: user.status || "online",
      })

      toast.success("Profile updated successfully!")
      onClose()
    } catch (error) {
      toast.error("Failed to update profile")
    } finally {
      setLoading(false)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      setSelectedFile(null)
      setPreviewUrl(null)
    }
  }

  const handleStatusChange = async (status: "online" | "idle" | "dnd" | "offline") => {
    try {
      await updateStatus(status)
      toast.success(`Status changed to ${status}`)
    } catch (error) {
      toast.error("Failed to update status")
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile Picture */}
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <Avatar className="h-24 w-24">
            <AvatarImage src={previewUrl || user?.photoURL || "/placeholder.svg"} />
            <AvatarFallback className="text-2xl">{displayName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <label className="absolute bottom-0 right-0 bg-purple-600 hover:bg-purple-700 rounded-full p-2 cursor-pointer">
            <Camera className="h-4 w-4 text-white" />
            <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          </label>
        </div>
        <p className="text-sm text-gray-400">Click the camera icon to change your avatar</p>
      </div>

      {/* Display Name */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-white">Display Name</label>
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Enter your display name"
          className="bg-gray-700 border-gray-600 text-white"
        />
      </div>

      {/* Status */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-white">Status</label>
        <Select onValueChange={handleStatusChange} defaultValue={user?.status || "online"}>
          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="online">
              <div className="flex items-center space-x-2">
                <Badge className="bg-green-600 text-white">●</Badge>
                <span>Online</span>
              </div>
            </SelectItem>
            <SelectItem value="idle">
              <div className="flex items-center space-x-2">
                <Badge className="bg-yellow-600 text-white">●</Badge>
                <span>Idle</span>
              </div>
            </SelectItem>
            <SelectItem value="dnd">
              <div className="flex items-center space-x-2">
                <Badge className="bg-red-600 text-white">●</Badge>
                <span>Do Not Disturb</span>
              </div>
            </SelectItem>
            <SelectItem value="offline">
              <div className="flex items-center space-x-2">
                <Badge className="bg-gray-600 text-white">●</Badge>
                <span>Offline</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Email (read-only) */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-white">Email</label>
        <Input value={user?.email || ""} disabled className="bg-gray-800 border-gray-600 text-gray-400" />
      </div>

      {/* Actions */}
      <div className="flex space-x-3 pt-4">
        <Button onClick={handleSave} disabled={loading} className="flex-1">
          {loading ? (
            <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2" />
          ) : (
            "Save Changes"
          )}
        </Button>
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
      </div>
    </div>
  )
}