"use client"

import { useState, useEffect } from "react"
import { ref, onValue, set, remove } from "firebase/database"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Mic, MicOff, PhoneOff, Phone } from "lucide-react"
import { database } from "@/lib/firebase"
import { useAuth } from "@/hooks/useAuth"
import { useWebRTC } from "@/hooks/useWebRTC"
import { CallInterface } from "@/components/chat/call-interface"
import type { Channel, Server, User } from "@/lib/types"
import { toast } from "sonner"

interface VoiceChannelProps {
  channel: Channel
  server: Server | null
}

export function VoiceChannel({ channel, server }: VoiceChannelProps) {
  const { user } = useAuth()
  const { startCall, isCallActive } = useWebRTC()
  const [activeUsers, setActiveUsers] = useState<string[]>([])
  const [users, setUsers] = useState<Record<string, User>>({})
  const [isMuted, setIsMuted] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  // Load users in channel
  useEffect(() => {
    const channelRef = ref(database, `channels/${channel.id}/activeUsers`)
    const unsubscribe = onValue(channelRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setActiveUsers(data)
        // Check if current user is in the list
        setIsConnected(user ? data.includes(user.uid) : false)
      } else {
        setActiveUsers([])
        setIsConnected(false)
      }
    })

    return unsubscribe
  }, [channel.id, user])

  // Load all users
  useEffect(() => {
    const usersRef = ref(database, "users")
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const usersWithIds: Record<string, User> = {}
        Object.entries(data).forEach(([uid, userData]: [string, any]) => {
          usersWithIds[uid] = { uid, ...userData }
        })
        setUsers(usersWithIds)
      }
    })

    return unsubscribe
  }, [])

  // Enhanced cleanup on component unmount and page unload
  useEffect(() => {
    if (!user) return

    const cleanup = async () => {
      if (isConnected) {
        console.log("🧹 Voice channel cleanup")
        await leaveVoiceChannel()
      }
    }

    const handleBeforeUnload = () => cleanup()
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        cleanup()
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      cleanup()
    }
  }, [user, isConnected])

  const joinVoiceChannel = async () => {
    if (!user) return

    try {
      // Test media access first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop()) // Stop test stream

      // Add user to active users
      const channelRef = ref(database, `channels/${channel.id}/activeUsers`)
      const updatedUsers = [...activeUsers.filter((id) => id !== user.uid), user.uid]
      await set(channelRef, updatedUsers)

      // Update user's inCall status
      const userRef = ref(database, `users/${user.uid}/inCall`)
      await set(userRef, channel.id)

      setIsConnected(true)
      toast.success("Joined voice channel")
    } catch (error) {
      console.error("Failed to join voice channel:", error)
      toast.error("Failed to join voice channel - check microphone permissions")
    }
  }

  const leaveVoiceChannel = async () => {
    if (!user) return

    try {
      // Remove user from active users
      const channelRef = ref(database, `channels/${channel.id}/activeUsers`)
      const updatedUsers = activeUsers.filter((id) => id !== user.uid)

      if (updatedUsers.length > 0) {
        await set(channelRef, updatedUsers)
      } else {
        await remove(channelRef)
      }

      // Clear user's inCall status
      const userRef = ref(database, `users/${user.uid}/inCall`)
      await remove(userRef)

      setIsConnected(false)
      toast.success("Left voice channel")
    } catch (error) {
      console.error("Failed to leave voice channel:", error)
      toast.error("Failed to leave voice channel")
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    toast.success(isMuted ? "Microphone unmuted" : "Microphone muted")
  }

  const initiateCall = async () => {
    const otherUser = activeUsers.find((id) => id !== user?.uid)
    if (otherUser) {
      try {
        console.log("🎯 Starting voice call in channel")
        await startCall(otherUser, false) // false = audio only
      } catch (error) {
        console.error("Failed to start call:", error)
        toast.error("Failed to start call")
      }
    } else {
      toast.error("No other users to call")
    }
  }

  // Show call interface if call is active
  if (isCallActive) {
    return <CallInterface />
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-700">
      {/* Channel Header */}
      <div className="p-4 border-b border-gray-600 bg-gray-800">
        <div className="flex items-center">
          <span className="text-gray-400 mr-2">🔊</span>
          <h2 className="text-xl font-semibold text-white">{channel.name}</h2>
          <span className="ml-auto text-sm text-gray-400">
            {activeUsers.length} user{activeUsers.length !== 1 ? "s" : ""} connected
          </span>
        </div>
      </div>

      {/* Voice Channel Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
          <h3 className="text-xl font-semibold text-white mb-6 text-center">Voice Channel</h3>

          {/* Connected Users */}
          <div className="mb-8">
            <h4 className="text-sm font-medium text-gray-400 mb-3">Connected Users</h4>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {activeUsers.length > 0 ? (
                activeUsers.map((userId) => {
                  const connectedUser = users[userId]
                  if (!connectedUser) return null

                  return (
                    <div key={userId} className="flex items-center space-x-3 bg-gray-700 p-3 rounded-md">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={connectedUser.photoURL || "/placeholder.svg"} />
                        <AvatarFallback>{connectedUser.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-white font-medium">{connectedUser.displayName}</p>
                        <p className="text-xs text-gray-400">
                          {userId === user?.uid ? (isMuted ? "Muted" : "Speaking") : "Connected"}
                        </p>
                      </div>
                      {userId === user?.uid && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-white"
                          onClick={toggleMute}
                        >
                          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  )
                })
              ) : (
                <p className="text-gray-400 text-center py-4">No one is connected</p>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center space-x-3">
            {isConnected ? (
              <>
                <Button
                  variant={isMuted ? "default" : "outline"}
                  className={isMuted ? "bg-red-600 hover:bg-red-700" : ""}
                  onClick={toggleMute}
                >
                  {isMuted ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                  {isMuted ? "Unmute" : "Mute"}
                </Button>

                {activeUsers.length > 1 && (
                  <Button variant="outline" onClick={initiateCall}>
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </Button>
                )}

                <Button variant="destructive" onClick={leaveVoiceChannel}>
                  <PhoneOff className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              </>
            ) : (
              <Button onClick={joinVoiceChannel}>
                <Mic className="h-4 w-4 mr-2" />
                Join Voice Channel
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
