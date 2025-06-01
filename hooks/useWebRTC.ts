"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { ref, set, onValue, remove, push, query, orderByChild, equalTo } from "firebase/database"
import { database } from "@/lib/firebase"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"

interface CallData {
  id: string
  callerId: string
  receiverId: string
  offer?: RTCSessionDescriptionInit
  answer?: RTCSessionDescriptionInit
  status: "ringing" | "accepted" | "rejected" | "ended"
  type: "audio" | "video"
  timestamp: number
}

export function useWebRTC() {
  const { user } = useAuth()
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [isCallActive, setIsCallActive] = useState(false)
  const [isIncomingCall, setIsIncomingCall] = useState(false)
  const [incomingCallData, setIncomingCallData] = useState<CallData | null>(null)
  const [callStatus, setCallStatus] = useState<string>("")
  const [currentCallId, setCurrentCallId] = useState<string | null>(null)
  const [callDuration, setCallDuration] = useState(0)

  const peerConnection = useRef<RTCPeerConnection | null>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null) // Dedicated audio ref
  const callDataRef = useRef<any>(null)
  const iceCandidatesRef = useRef<any>(null)
  const incomingCallsRef = useRef<any>(null)
  const isEndingCall = useRef(false)
  const callTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isCleaningUp = useRef(false)

  // Enhanced STUN/TURN servers for better connectivity
  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ],
  }

  // Call timer
  useEffect(() => {
    if (isCallActive && !callTimerRef.current) {
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
    } else if (!isCallActive && callTimerRef.current) {
      clearInterval(callTimerRef.current)
      callTimerRef.current = null
      setCallDuration(0)
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current)
        callTimerRef.current = null
      }
    }
  }, [isCallActive])

  // Enhanced video/audio ref management
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      const video = localVideoRef.current
      video.srcObject = localStream
      video.muted = true

      const playPromise = video.play()
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.log("Local video autoplay blocked:", error)
        })
      }
    }
  }, [localStream])

  useEffect(() => {
    if (remoteStream) {
      const hasVideo = remoteStream.getVideoTracks().length > 0

      if (hasVideo && remoteVideoRef.current) {
        const video = remoteVideoRef.current
        video.srcObject = remoteStream

        const playPromise = video.play()
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.log("Remote video autoplay blocked:", error)
          })
        }
      } else if (!hasVideo && remoteAudioRef.current) {
        const audio = remoteAudioRef.current
        audio.srcObject = remoteStream

        const playPromise = audio.play()
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.log("Remote audio autoplay blocked:", error)
          })
        }
      }
    }
  }, [remoteStream])

  // Create peer connection with enhanced error handling
  const createPeerConnection = useCallback(
    (callId: string) => {
      console.log("🔄 Creating new peer connection for call:", callId)

      if (isEndingCall.current) {
        console.log("⚠️ Not creating PC - call is ending")
        return null
      }

      const pc = new RTCPeerConnection(iceServers)

      // Enhanced ICE candidate handling
      pc.onicecandidate = (event) => {
        if (event.candidate && callId && !isEndingCall.current) {
          console.log("📡 New ICE candidate")
          const candidateRef = ref(database, `calls/${callId}/candidates`)
          push(candidateRef, {
            candidate: event.candidate.candidate,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sdpMid: event.candidate.sdpMid,
            from: user?.uid,
            timestamp: Date.now(),
          }).catch((error) => {
            console.error("❌ Failed to save ICE candidate:", error)
          })
        }
      }

      // Enhanced remote stream handling
      pc.ontrack = (event) => {
        console.log("🎵 Remote stream received!")
        if (!isEndingCall.current) {
          setRemoteStream(event.streams[0])
          setCallStatus("Connected")
          setIsCallActive(true)
          toast.success("🎉 Call connected!")
        }
      }

      // Enhanced connection state monitoring
      pc.onconnectionstatechange = () => {
        console.log("🔗 Connection state:", pc.connectionState)
        if (isEndingCall.current) return

        switch (pc.connectionState) {
          case "connected":
            setCallStatus("Connected")
            setIsCallActive(true)
            break
          case "disconnected":
            setCallStatus("Reconnecting...")
            break
          case "failed":
            console.log("❌ Connection failed")
            toast.error("Connection failed")
            setTimeout(() => {
              if (!isEndingCall.current) {
                endCall()
              }
            }, 2000)
            break
          case "closed":
            if (!isEndingCall.current) {
              endCall()
            }
            break
        }
      }

      pc.oniceconnectionstatechange = () => {
        console.log("🧊 ICE state:", pc.iceConnectionState)
        if (isEndingCall.current) return

        switch (pc.iceConnectionState) {
          case "connected":
          case "completed":
            setCallStatus("Connected")
            setIsCallActive(true)
            break
          case "disconnected":
            setCallStatus("Reconnecting...")
            break
          case "failed":
            console.log("❌ ICE connection failed")
            toast.error("Connection failed")
            setTimeout(() => {
              if (!isEndingCall.current) {
                endCall()
              }
            }, 3000)
            break
        }
      }

      return pc
    },
    [user?.uid],
  )

  // Enhanced media acquisition
  const getUserMedia = async (video = false) => {
    try {
      console.log("🎤 Getting user media...")

      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
        video: video
          ? {
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              frameRate: { ideal: 30, max: 60 },
            }
          : false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log("✅ Got media stream with", stream.getTracks().length, "tracks")

      if (!isEndingCall.current) {
        setLocalStream(stream)
      }

      return stream
    } catch (error) {
      console.error("❌ Media error:", error)

      // More specific error messages
      if (error instanceof DOMException) {
        switch (error.name) {
          case "NotAllowedError":
            toast.error("Camera/microphone access denied")
            break
          case "NotFoundError":
            toast.error("No camera/microphone found")
            break
          case "NotReadableError":
            toast.error("Camera/microphone is being used by another application")
            break
          default:
            toast.error("Could not access camera/microphone")
        }
      } else {
        toast.error("Media access failed")
      }

      throw error
    }
  }

  // Enhanced ICE candidate listening with cleanup
  const listenForCandidates = useCallback(
    (callId: string) => {
      if (isEndingCall.current) return

      const candidatesRef = ref(database, `calls/${callId}/candidates`)
      iceCandidatesRef.current = onValue(candidatesRef, (snapshot) => {
        const candidates = snapshot.val()
        if (candidates && peerConnection.current && !isEndingCall.current) {
          Object.entries(candidates).forEach(([key, candidateData]: [string, any]) => {
            if (candidateData.from !== user?.uid && candidateData.candidate) {
              console.log("🧊 Adding remote ICE candidate")
              const candidate = new RTCIceCandidate({
                candidate: candidateData.candidate,
                sdpMLineIndex: candidateData.sdpMLineIndex,
                sdpMid: candidateData.sdpMid,
              })

              peerConnection.current
                ?.addIceCandidate(candidate)
                .then(() => console.log("✅ ICE candidate added"))
                .catch((err) => console.error("❌ ICE candidate error:", err))
            }
          })
        }
      })
    },
    [user?.uid],
  )

  // Enhanced call initiation
  const startCall = async (receiverId: string, isVideo = false) => {
    try {
      console.log("📞 Starting call to:", receiverId)
      isEndingCall.current = false
      setCallStatus("Getting media...")

      const stream = await getUserMedia(isVideo)
      if (isEndingCall.current) {
        console.log("⚠️ Call ended during media setup")
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setCurrentCallId(callId)

      const pc = createPeerConnection(callId)
      if (!pc) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      peerConnection.current = pc

      // Add tracks with enhanced error handling
      stream.getTracks().forEach((track) => {
        console.log("➕ Adding track:", track.kind)
        try {
          pc.addTrack(track, stream)
        } catch (error) {
          console.error("❌ Error adding track:", error)
        }
      })

      listenForCandidates(callId)
      setCallStatus("Creating offer...")

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo,
      })
      await pc.setLocalDescription(offer)
      console.log("✅ Offer created and set")

      if (isEndingCall.current) {
        console.log("⚠️ Call ended during offer creation")
        return
      }

      // Save to Firebase with expiration
      const callRef = ref(database, `calls/${callId}`)
      await set(callRef, {
        id: callId,
        callerId: user?.uid,
        receiverId,
        offer,
        status: "ringing",
        type: isVideo ? "video" : "audio",
        timestamp: Date.now(),
        expiresAt: Date.now() + 30000, // 30 seconds
      })

      console.log("💾 Call saved to Firebase")

      // Auto-timeout after 30 seconds
      setTimeout(() => {
        if (callStatus === "Calling..." && !isCallActive) {
          toast.error("Call timeout")
          endCall()
        }
      }, 30000)

      // Listen for answer with enhanced handling
      callDataRef.current = onValue(callRef, async (snapshot) => {
        const data = snapshot.val()
        if (!data || isEndingCall.current) return

        console.log("📱 Call update:", data.status)

        try {
          if (data.status === "accepted" && data.answer && pc.signalingState === "have-local-offer") {
            console.log("📥 Setting remote answer")
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer))
            console.log("✅ Remote description set")
          } else if (data.status === "rejected") {
            toast.error("Call rejected")
            endCall()
          } else if (data.status === "ended") {
            endCall()
          }
        } catch (error) {
          console.error("❌ Error handling call update:", error)
          endCall()
        }
      })

      setCallStatus("Calling...")
      toast.success("📞 Call initiated!")
      console.log("🎯 Call setup complete, waiting for answer...")
    } catch (error) {
      console.error("❌ Start call error:", error)
      toast.error("Failed to start call")
      endCall()
    }
  }

  // Enhanced call answering
  const answerCall = async (callData: CallData) => {
    try {
      console.log("📞 Answering call...")
      isEndingCall.current = false
      setCallStatus("Getting media...")
      setCurrentCallId(callData.id)

      const stream = await getUserMedia(callData.type === "video")
      if (isEndingCall.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      const pc = createPeerConnection(callData.id)
      if (!pc) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      peerConnection.current = pc

      stream.getTracks().forEach((track) => {
        console.log("➕ Adding track:", track.kind)
        try {
          pc.addTrack(track, stream)
        } catch (error) {
          console.error("❌ Error adding track:", error)
        }
      })

      listenForCandidates(callData.id)
      setCallStatus("Setting up connection...")

      if (callData.offer) {
        console.log("📥 Setting remote offer")
        await pc.setRemoteDescription(new RTCSessionDescription(callData.offer))
      }

      console.log("📝 Creating answer...")
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      const callRef = ref(database, `calls/${callData.id}`)
      await set(callRef, {
        ...callData,
        answer,
        status: "accepted",
      })

      console.log("✅ Call answered")
      setIsIncomingCall(false)
      setIncomingCallData(null)
      setCallStatus("Connecting...")
      toast.success("📞 Call answered!")
    } catch (error) {
      console.error("❌ Answer call error:", error)
      toast.error("Failed to answer call")
      endCall()
    }
  }

  // Enhanced call rejection
  const rejectCall = async (callData: CallData) => {
    try {
      const callRef = ref(database, `calls/${callData.id}`)
      await set(callRef, { ...callData, status: "rejected" })
      setIsIncomingCall(false)
      setIncomingCallData(null)
      toast.success("Call rejected")
    } catch (error) {
      console.error("❌ Reject call error:", error)
    }
  }

  // Enhanced call ending with complete cleanup
  const endCall = useCallback(() => {
    if (isEndingCall.current) {
      console.log("⚠️ Already ending call, skipping...")
      return
    }

    isEndingCall.current = true
    console.log("📴 Ending call")

    // Stop call timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current)
      callTimerRef.current = null
    }

    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.close()
      peerConnection.current = null
    }

    // Stop all media tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop()
        console.log("🛑 Stopped local track:", track.kind)
      })
    }

    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => {
        track.stop()
        console.log("🛑 Stopped remote track:", track.kind)
      })
    }

    // Clean up all listeners
    if (callDataRef.current) {
      callDataRef.current()
      callDataRef.current = null
    }

    if (iceCandidatesRef.current) {
      iceCandidatesRef.current()
      iceCandidatesRef.current = null
    }

    // Remove from Firebase
    if (currentCallId) {
      const callRef = ref(database, `calls/${currentCallId}`)
      remove(callRef).catch(console.error)
    }

    // Clear video/audio elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null
    }

    // Reset all state
    setLocalStream(null)
    setRemoteStream(null)
    setIsCallActive(false)
    setIsIncomingCall(false)
    setIncomingCallData(null)
    setCallStatus("")
    setCurrentCallId(null)
    setCallDuration(0)

    toast.success("📴 Call ended")

    // Reset ending flag after cleanup
    setTimeout(() => {
      isEndingCall.current = false
    }, 1000)
  }, [localStream, remoteStream, currentCallId])

  // Enhanced incoming call listener with query optimization
  useEffect(() => {
    if (!user) return

    // Use query to filter calls by receiver ID
    const userCallsQuery = query(ref(database, "calls"), orderByChild("receiverId"), equalTo(user.uid))

    incomingCallsRef.current = onValue(userCallsQuery, (snapshot) => {
      const calls = snapshot.val()
      if (!calls) return

      Object.values(calls).forEach((call: any) => {
        const isValidIncomingCall =
          call.status === "ringing" &&
          !isCallActive &&
          !isIncomingCall &&
          !isEndingCall.current &&
          Date.now() - call.timestamp < 30000 // 30 second timeout

        if (isValidIncomingCall) {
          console.log("📞 Incoming call detected")
          setIsIncomingCall(true)
          setIncomingCallData(call)
          toast.success("📞 Incoming call!")

          // Play ringtone (optional)
          // playRingtone()
        }
      })
    })

    return () => {
      if (incomingCallsRef.current) {
        incomingCallsRef.current()
        incomingCallsRef.current = null
      }
    }
  }, [user, isCallActive, isIncomingCall])

  // Enhanced cleanup on page unload
  useEffect(() => {
    const cleanup = () => {
      if (isCleaningUp.current) return
      isCleaningUp.current = true

      console.log("🧹 Page unload cleanup")
      if (isCallActive || localStream) {
        endCall()
      }

      // Reset after a short delay
      setTimeout(() => {
        isCleaningUp.current = false
      }, 500)
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
  }, [isCallActive, localStream, endCall])

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return {
    localStream,
    remoteStream,
    isCallActive,
    isIncomingCall,
    incomingCallData,
    callStatus,
    callDuration,
    formatDuration,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    startCall,
    answerCall,
    rejectCall,
    endCall,
  }
}
