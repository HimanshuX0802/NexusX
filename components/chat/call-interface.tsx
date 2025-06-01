"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react"
import { useWebRTC } from "@/hooks/useWebRTC"
import { useAuth } from "@/hooks/useAuth"
import { useState } from "react"

export function CallInterface() {
  const { user } = useAuth()
  const {
    localStream,
    remoteStream,
    callStatus,
    callDuration,
    formatDuration,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    endCall,
  } = useWebRTC()
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = isMuted // Toggle
      })
      setIsMuted(!isMuted)
      console.log(isMuted ? "🔊 Unmuted" : "🔇 Muted")
    }
  }

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = isVideoOff // Toggle
      })
      setIsVideoOff(!isVideoOff)
      console.log(isVideoOff ? "📹 Video on" : "📹 Video off")
    }
  }

  const hasVideo = localStream?.getVideoTracks().length > 0
  const hasRemoteVideo = remoteStream?.getVideoTracks().length > 0

  return (
    <div className="flex-1 flex flex-col bg-gray-900">
      {/* Call Header */}
      <div className="p-4 border-b border-gray-700 bg-gray-800">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">{hasVideo ? "Video Call" : "Voice Call"}</h2>
          <p className="text-sm text-gray-400">{callStatus}</p>
          {callDuration > 0 && <p className="text-lg font-mono text-green-400 mt-1">{formatDuration(callDuration)}</p>}
          <div className="text-xs text-gray-500 mt-1">
            Local: {localStream ? "✅" : "❌"} | Remote: {remoteStream ? "✅" : "❌"}
          </div>
          {localStream && (
            <div className="text-xs text-green-400 mt-1">
              Audio: {localStream.getAudioTracks().length > 0 ? "✅" : "❌"} | Video:{" "}
              {localStream.getVideoTracks().length > 0 ? "✅" : "❌"}
            </div>
          )}
        </div>
      </div>

      {/* Video/Audio Area */}
      <div className="flex-1 relative bg-gray-800">
        {/* Remote Video */}
        {hasRemoteVideo ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <Avatar className="h-32 w-32 mx-auto mb-4">
                <AvatarImage src={user?.photoURL || "/placeholder.svg"} />
                <AvatarFallback className="text-6xl">{user?.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <p className="text-white text-xl mb-2">{callStatus}</p>
              {remoteStream && <p className="text-green-400">🎵 Audio connected</p>}
            </div>
          </div>
        )}

        {/* Local Video (Picture in Picture) */}
        {hasVideo && (
          <div className="absolute top-4 right-4 w-48 h-36 bg-gray-700 rounded-lg overflow-hidden border-2 border-gray-600">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute bottom-1 left-1 text-xs text-white bg-black bg-opacity-50 px-1 rounded">You</div>
          </div>
        )}

        {/* Dedicated audio element for remote audio */}
        <audio ref={remoteAudioRef} autoPlay />
      </div>

      {/* Call Controls */}
      <div className="p-6 bg-gray-800 border-t border-gray-700">
        <div className="flex justify-center items-center space-x-4">
          {/* Mute Button */}
          <Button
            variant="outline"
            size="icon"
            className={`h-12 w-12 rounded-full ${
              isMuted ? "bg-red-600 hover:bg-red-700 text-white border-red-600" : ""
            }`}
            onClick={toggleMute}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          {/* End Call Button */}
          <Button variant="destructive" size="icon" className="h-12 w-12 rounded-full" onClick={endCall}>
            <PhoneOff className="h-5 w-5" />
          </Button>

          {/* Video Toggle Button */}
          {hasVideo && (
            <Button
              variant="outline"
              size="icon"
              className={`h-12 w-12 rounded-full ${
                isVideoOff ? "bg-red-600 hover:bg-red-700 text-white border-red-600" : ""
              }`}
              onClick={toggleVideo}
            >
              {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>
          )}
        </div>

        {/* Call Info */}
        <div className="mt-4 text-center text-xs text-gray-500">
          <p>Status: {callStatus}</p>
          {callDuration > 0 && <p>Duration: {formatDuration(callDuration)}</p>}
          {localStream && (
            <p>
              Local tracks:{" "}
              {localStream
                .getTracks()
                .map((t) => t.kind)
                .join(", ")}
            </p>
          )}
          {remoteStream && (
            <p>
              Remote tracks:{" "}
              {remoteStream
                .getTracks()
                .map((t) => t.kind)
                .join(", ")}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
