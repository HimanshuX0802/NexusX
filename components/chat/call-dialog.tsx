"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"

interface CallDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  callType: "audio" | "video"
  channelName: string
}

export function CallDialog({ open, onOpenChange, callType, channelName }: CallDialogProps) {
  const { user } = useAuth()
  const [callStatus, setCallStatus] = useState<"connecting" | "connected" | "ended">("connecting")
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)

  // Simulate call connection
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        setCallStatus("connected")
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [open])

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (open && callStatus === "connected") {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [open, callStatus])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setCallStatus("connecting")
      setCallDuration(0)
      setIsMuted(false)
      setIsVideoOff(false)
    }
  }, [open])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const endCall = () => {
    setCallStatus("ended")
    setTimeout(() => {
      onOpenChange(false)
    }, 1000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {callStatus === "connecting"
              ? "Connecting..."
              : callStatus === "connected"
                ? `${callType === "video" ? "Video" : "Voice"} Call`
                : "Call Ended"}
          </DialogTitle>
          <DialogDescription>
            {callStatus === "connected" ? `Duration: ${formatDuration(callDuration)}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-6">
          {/* Call info */}
          <div className="text-center mb-6">
            <p className="text-lg font-medium text-white">{channelName}</p>
            {callStatus === "connected" && <p className="text-sm text-gray-400">{formatDuration(callDuration)}</p>}
          </div>

          {/* User avatars */}
          <div className="flex justify-center mb-8">
            {callType === "video" && callStatus === "connected" && !isVideoOff ? (
              <div className="relative bg-gray-800 rounded-lg overflow-hidden w-64 h-48">
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-gray-400">Video preview would appear here</p>
                </div>
                <div className="absolute bottom-2 right-2 bg-gray-900 rounded-full p-1">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.photoURL || "/placeholder.svg"} />
                    <AvatarFallback>{user?.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </div>
              </div>
            ) : (
              <Avatar className="h-24 w-24">
                <AvatarImage src={user?.photoURL || "/placeholder.svg"} />
                <AvatarFallback className="text-4xl">{user?.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            )}
          </div>

          {/* Call status */}
          {callStatus === "connecting" && (
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
              <span className="text-gray-400">Connecting to channel...</span>
            </div>
          )}

          {/* Call controls */}
          {callStatus === "connected" && (
            <div className="flex space-x-4">
              <Button
                variant="outline"
                size="icon"
                className={`h-12 w-12 rounded-full ${isMuted ? "bg-red-600 hover:bg-red-700 text-white border-red-600" : ""}`}
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>

              <Button variant="destructive" size="icon" className="h-12 w-12 rounded-full" onClick={endCall}>
                <PhoneOff className="h-5 w-5" />
              </Button>

              {callType === "video" && (
                <Button
                  variant="outline"
                  size="icon"
                  className={`h-12 w-12 rounded-full ${isVideoOff ? "bg-red-600 hover:bg-red-700 text-white border-red-600" : ""}`}
                  onClick={() => setIsVideoOff(!isVideoOff)}
                >
                  {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                </Button>
              )}
            </div>
          )}

          {callStatus === "ended" && <p className="text-gray-400">Call has ended</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
