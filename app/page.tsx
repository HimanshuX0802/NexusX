"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { AuthForm } from "@/components/auth/auth-form"
import { Sidebar } from "@/components/layout/sidebar"
import { ChatArea } from "@/components/chat/chat-area"
import { DirectMessages } from "@/components/chat/direct-messages"
import { IncomingCallDialog } from "@/components/chat/incoming-call"
import type { Server, Channel } from "@/lib/types"
import { Toaster } from "sonner"
import { Loader2 } from "lucide-react"

export default function Home() {
  const { user, loading } = useAuth()
  const [selectedServer, setSelectedServer] = useState<Server | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [showDirectMessages, setShowDirectMessages] = useState(false)

  const handleServerSelect = (server: Server) => {
    setSelectedServer(server)
    setSelectedChannel(null)
    setShowDirectMessages(false)
  }

  const handleChannelSelect = (channel: Channel) => {
    setSelectedChannel(channel)
    setShowDirectMessages(false)
  }

  const handleDirectMessage = () => {
    setShowDirectMessages(true)
    setSelectedServer(null)
    setSelectedChannel(null)
  }

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-4" />
          <div className="text-white text-xl">Loading Nexus X...</div>
          <div className="text-gray-400 text-sm mt-2">Connecting to Firebase...</div>
        </div>
      </div>
    )
  }

  // Show auth form if user is not logged in
  if (!user) {
    return (
      <>
        <AuthForm />
        <Toaster />
      </>
    )
  }

  // Show main app if user is logged in
  return (
    <div className="h-screen flex bg-gray-900 overflow-hidden">
      <Sidebar
        selectedServer={selectedServer}
        selectedChannel={selectedChannel}
        onServerSelect={handleServerSelect}
        onChannelSelect={handleChannelSelect}
        onDirectMessage={handleDirectMessage}
      />

      {showDirectMessages ? <DirectMessages /> : <ChatArea channel={selectedChannel} server={selectedServer} />}

      <IncomingCallDialog />
      <Toaster position="top-right" />
    </div>
  )
}
