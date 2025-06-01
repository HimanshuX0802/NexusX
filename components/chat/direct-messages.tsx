"use client"

import { useState, useEffect } from "react"
import { ref, onValue, push, set } from "firebase/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Send, Plus, Phone, Video, Paperclip } from "lucide-react"
import { database } from "@/lib/firebase"
import { useAuth } from "@/hooks/useAuth"
import { useWebRTC } from "@/hooks/useWebRTC"
import { CallInterface } from "@/components/chat/call-interface"
import type { DirectMessage, User } from "@/lib/types"
import { toast } from "sonner"

export function DirectMessages() {
  const { user } = useAuth()
  const { startCall, isCallActive } = useWebRTC()
  const [conversations, setConversations] = useState<Record<string, DirectMessage[]>>({})
  const [users, setUsers] = useState<Record<string, User>>({})
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [showNewDM, setShowNewDM] = useState(false)
  const [searchEmail, setSearchEmail] = useState("")

  // Load all users
  useEffect(() => {
    const usersRef = ref(database, "users")
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const filteredUsers: Record<string, User> = {}
        Object.entries(data).forEach(([uid, userData]: [string, any]) => {
          if (uid !== user?.uid) {
            filteredUsers[uid] = { uid, ...userData }
          }
        })
        setUsers(filteredUsers)
      }
    })

    return unsubscribe
  }, [user])

  // Load direct messages
  useEffect(() => {
    if (!user) return

    const dmRef = ref(database, "directMessages")
    const unsubscribe = onValue(dmRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const userMessages = Object.entries(data)
          .map(([id, messageData]: [string, any]) => ({
            id,
            ...messageData,
          }))
          .filter((message: DirectMessage) => message.senderId === user.uid || message.receiverId === user.uid)
          .sort((a, b) => a.timestamp - b.timestamp)

        // Group messages by conversation
        const grouped: Record<string, DirectMessage[]> = {}
        userMessages.forEach((message) => {
          const otherUserId = message.senderId === user.uid ? message.receiverId : message.senderId
          if (!grouped[otherUserId]) {
            grouped[otherUserId] = []
          }
          grouped[otherUserId].push(message)
        })

        setConversations(grouped)
      }
    })

    return unsubscribe
  }, [user])

  const sendDirectMessage = async () => {
    if (!user || !selectedUser || !newMessage.trim()) return

    try {
      const dmRef = ref(database, "directMessages")
      const newDMRef = push(dmRef)

      await set(newDMRef, {
        content: newMessage,
        senderId: user.uid,
        receiverId: selectedUser,
        timestamp: Date.now(),
        read: false,
      })

      setNewMessage("")
    } catch (error) {
      toast.error("Failed to send message")
    }
  }

  const startNewConversation = async () => {
    if (!searchEmail.trim()) return

    const userToFind = Object.values(users).find((u) => u.email === searchEmail)
    if (!userToFind) {
      toast.error("User not found")
      return
    }

    setSelectedUser(userToFind.uid)
    setShowNewDM(false)
    setSearchEmail("")
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getLastMessage = (userId: string) => {
    const messages = conversations[userId] || []
    return messages[messages.length - 1]
  }

  const initiateCall = async (type: "audio" | "video") => {
    if (!selectedUser) {
      toast.error("No user selected")
      return
    }

    try {
      console.log("🎯 Starting", type, "call with", selectedUser)
      await startCall(selectedUser, type === "video")
    } catch (error) {
      toast.error("Failed to start call")
    }
  }

  // Show call interface if call is active
  if (isCallActive) {
    return <CallInterface />
  }

  return (
    <div className="flex h-full">
      {/* Conversations List */}
      <div className="w-60 bg-gray-800 border-r border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Direct Messages</h2>
            <Dialog open={showNewDM} onOpenChange={setShowNewDM}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start a conversation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Enter user email"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                  />
                  <Button onClick={startNewConversation} className="w-full">
                    Start Conversation
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {Object.entries(conversations).map(([userId, messages]) => {
              const otherUser = users[userId]
              const lastMessage = getLastMessage(userId)

              if (!otherUser) return null

              return (
                <Button
                  key={userId}
                  variant="ghost"
                  className={`w-full justify-start p-3 mb-1 h-auto ${
                    selectedUser === userId
                      ? "bg-gray-700 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                  onClick={() => setSelectedUser(userId)}
                >
                  <Avatar className="h-8 w-8 mr-3">
                    <AvatarImage src={otherUser.photoURL || "/placeholder.svg"} />
                    <AvatarFallback>{otherUser.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{otherUser.displayName}</p>
                    {lastMessage && <p className="text-xs text-gray-400 truncate">{lastMessage.content}</p>}
                  </div>
                </Button>
              )
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-700">
        {selectedUser ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-600 bg-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Avatar className="h-8 w-8 mr-3">
                    <AvatarImage src={users[selectedUser]?.photoURL || "/placeholder.svg"} />
                    <AvatarFallback>{users[selectedUser]?.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-semibold text-white">{users[selectedUser]?.displayName}</h2>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-white hover:bg-green-600"
                    onClick={() => initiateCall("audio")}
                    title="Start voice call"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-white hover:bg-blue-600"
                    onClick={() => initiateCall("video")}
                    title="Start video call"
                  >
                    <Video className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {(conversations[selectedUser] || []).map((message) => {
                  const isOwn = message.senderId === user?.uid

                  return (
                    <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          isOwn ? "bg-purple-600 text-white" : "bg-gray-600 text-white"
                        }`}
                      >
                        <p>{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">{formatTime(message.timestamp)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-600">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-white"
                  onClick={() => toast.info("File upload coming soon!")}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  placeholder={`Message ${users[selectedUser]?.displayName}`}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      sendDirectMessage()
                    }
                  }}
                  className="flex-1 bg-gray-600 border-gray-500 text-white placeholder-gray-400"
                />
                <Button onClick={sendDirectMessage} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Direct Messages</h2>
              <p className="text-gray-400">Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
