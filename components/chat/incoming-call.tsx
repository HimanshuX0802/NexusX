"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Phone, PhoneOff, Video, Mic } from "lucide-react"
import { useWebRTC } from "@/hooks/useWebRTC"
import { useEffect, useState } from "react"

export function IncomingCallDialog() {
  const { isIncomingCall, incomingCallData, answerCall, rejectCall } = useWebRTC()
  const [isRinging, setIsRinging] = useState(false)

  useEffect(() => {
    if (isIncomingCall) {
      setIsRinging(true)
      // Auto-reject after 30 seconds
      const timeout = setTimeout(() => {
        if (incomingCallData) {
          rejectCall(incomingCallData)
        }
      }, 30000)

      return () => clearTimeout(timeout)
    } else {
      setIsRinging(false)
    }
  }, [isIncomingCall, incomingCallData, rejectCall])

  if (!isIncomingCall || !incomingCallData) return null

  return (
    <Dialog open={isIncomingCall}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Incoming Call</DialogTitle>
          <DialogDescription>
            {incomingCallData.type === "video" ? "Video call" : "Voice call"} from {incomingCallData.callerId}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-6">
          {/* Animated ringing effect */}
          <div className={`relative ${isRinging ? "animate-pulse" : ""}`}>
            <Avatar className="h-24 w-24 mb-4">
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback className="text-4xl">📞</AvatarFallback>
            </Avatar>
            {isRinging && <div className="absolute inset-0 rounded-full border-4 border-green-400 animate-ping"></div>}
          </div>

          <h3 className="text-xl font-semibold text-white mb-2">Incoming Call</h3>
          <div className="flex items-center mb-2">
            {incomingCallData.type === "video" ? (
              <Video className="h-5 w-5 mr-2 text-blue-400" />
            ) : (
              <Mic className="h-5 w-5 mr-2 text-green-400" />
            )}
            <span className="text-gray-400">{incomingCallData.type === "video" ? "Video call" : "Voice call"}</span>
          </div>

          <p className="text-sm text-gray-500 mb-6">From: {incomingCallData.callerId}</p>

          <div className="flex space-x-6">
            {/* Reject Button */}
            <Button
              variant="destructive"
              size="icon"
              className="h-14 w-14 rounded-full animate-pulse"
              onClick={() => rejectCall(incomingCallData)}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>

            {/* Answer Button */}
            <Button
              variant="default"
              size="icon"
              className="h-14 w-14 rounded-full bg-green-600 hover:bg-green-700 animate-pulse"
              onClick={() => answerCall(incomingCallData)}
            >
              <Phone className="h-6 w-6" />
            </Button>
          </div>

          <p className="text-xs text-gray-500 mt-4">Call will auto-reject in 30 seconds</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
