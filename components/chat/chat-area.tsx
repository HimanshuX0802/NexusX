"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { ref, onValue, push, set, remove, get } from "firebase/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Send, Edit, Trash2, Paperclip, ImageIcon, File, X, Phone, Video } from "lucide-react"
import { database } from "@/lib/firebase"
import { uploadImage } from "@/lib/imageStorage"
import { useAuth } from "@/hooks/useAuth"
import { useWebRTC } from "@/hooks/useWebRTC"
import { VoiceChannel } from "@/components/chat/voice-channel"
import { CallInterface } from "@/components/chat/call-interface"
import type { Message, Channel, Server, User, TypingIndicator, Attachment } from "@/lib/types"
import { toast } from "sonner"

interface ChatAreaProps {
  channel: Channel | null
  server: Server | null
}

export function ChatArea({ channel, server }: ChatAreaProps) {
  const { user } = useAuth()
  const { startCall, isCallActive } = useWebRTC()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [editingMessage, setEditingMessage] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([])
  const [users, setUsers] = useState<Record<string, User>>({})
  const [attachments, setAttachments] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  // Load messages
  useEffect(() => {
    if (!channel) {
      setMessages([])
      return
    }

    const messagesRef = ref(database, "messages")
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const channelMessages = Object.entries(data)
          .map(([id, messageData]: [string, any]) => ({
            id,
            ...messageData,
          }))
          .filter((message: Message) => message.channelId === channel.id)
          .sort((a, b) => a.timestamp - b.timestamp)
        setMessages(channelMessages)
      } else {
        setMessages([])
      }
    })

    return unsubscribe
  }, [channel])

  // Load users
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

  // Listen for typing indicators
  useEffect(() => {
    if (!channel) return

    const typingRef = ref(database, `typing/${channel.id}`)
    const unsubscribe = onValue(typingRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const typingList: TypingIndicator[] = Object.entries(data)
          .map(([userId, typingData]: [string, any]) => ({
            userId,
            channelId: channel.id,
            timestamp: typingData.timestamp,
          }))
          .filter((indicator) => indicator.userId !== user?.uid && Date.now() - indicator.timestamp < 3000)
        setTypingUsers(typingList)
      } else {
        setTypingUsers([])
      }
    })

    return unsubscribe
  }, [channel, user])

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files)
      setAttachments([...attachments, ...filesArray])
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index))
  }

  const uploadAttachments = async (): Promise<Attachment[]> => {
    if (attachments.length === 0) return []

    const uploadedAttachments: Attachment[] = []
    setUploading(true)

    try {
      for (const file of attachments) {
        const fileId = Math.random().toString(36).substring(2)

        // Convert image to base64 and store directly
        const base64Url = await uploadImage(file)

        uploadedAttachments.push({
          id: fileId,
          name: file.name,
          type: file.type,
          url: base64Url, // This is now a base64 data URL
          size: file.size,
        })
      }

      return uploadedAttachments
    } catch (error) {
      console.error("Error uploading files:", error)
      toast.error("Failed to upload files")
      return []
    } finally {
      setUploading(false)
    }
  }

  const sendMessage = async () => {
    if (!user || !channel) return
    if (!newMessage.trim() && attachments.length === 0) return

    try {
      setUploading(true)
      const uploadedAttachments = await uploadAttachments()

      const messagesRef = ref(database, "messages")
      const newMessageRef = push(messagesRef)

      await set(newMessageRef, {
        content: newMessage.trim(),
        authorId: user.uid,
        channelId: channel.id,
        serverId: server?.id,
        timestamp: Date.now(),
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : null,
      })

      // Update channel's last message
      const channelRef = ref(database, `channels/${channel.id}/lastMessage`)
      await set(channelRef, {
        content: newMessage.trim() || `${uploadedAttachments.length} attachment(s)`,
        authorId: user.uid,
        timestamp: Date.now(),
      })

      setNewMessage("")
      setAttachments([])

      // Clear typing indicator
      if (user) {
        const typingRef = ref(database, `typing/${channel.id}/${user.uid}`)
        remove(typingRef)
      }
    } catch (error) {
      toast.error("Failed to send message")
    } finally {
      setUploading(false)
    }
  }

  const handleTyping = () => {
    if (!user || !channel) return

    const typingRef = ref(database, `typing/${channel.id}/${user.uid}`)
    set(typingRef, {
      timestamp: Date.now(),
    })

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to clear typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      remove(typingRef)
    }, 2000)
  }

  const editMessage = async (messageId: string) => {
    if (!editContent.trim()) return

    try {
      const messageRef = ref(database, `messages/${messageId}`)
      const snapshot = await get(messageRef)
      const messageData = snapshot.val()

      await set(messageRef, {
        ...messageData,
        content: editContent,
        edited: true,
        editedAt: Date.now(),
      })

      setEditingMessage(null)
      setEditContent("")
      toast.success("Message updated")
    } catch (error) {
      toast.error("Failed to edit message")
    }
  }

  const deleteMessage = async (messageId: string) => {
    try {
      const messageRef = ref(database, `messages/${messageId}`)
      await remove(messageRef)
      toast.success("Message deleted")
    } catch (error) {
      toast.error("Failed to delete message")
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes"
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
    else return (bytes / 1048576).toFixed(1) + " MB"
  }

  const isImageFile = (type: string) => {
    return type.startsWith("image/")
  }

  const initiateCall = async (type: "audio" | "video") => {
    console.log("🎯 Starting", type, "call")

    if (!server?.members || server.members.length < 2) {
      toast.error("Need at least 2 people in server to start a call")
      return
    }

    // Check permissions first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      })
      stream.getTracks().forEach((track) => track.stop()) // Stop the test stream
      console.log("✅ Media permissions OK")
    } catch (error) {
      toast.error("Please allow microphone access")
      return
    }

    // Find another member to call
    const otherMember = server.members.find((id) => id !== user?.uid)
    if (otherMember) {
      console.log("📞 Calling:", otherMember)
      await startCall(otherMember, type === "video")
    } else {
      toast.error("No other members to call")
    }
  }

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-700">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to Nexus X</h2>
          <p className="text-gray-400">Select a channel to start chatting</p>
        </div>
      </div>
    )
  }

  // Show call interface if call is active
  if (isCallActive) {
    return <CallInterface />
  }

  // Render voice channel UI if this is a voice channel
  if (channel.type === "voice") {
    return <VoiceChannel channel={channel} server={server} />
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-700">
      {/* Channel Header */}
      <div className="p-4 border-b border-gray-600 bg-gray-800 flex justify-between items-center">
        <div className="flex items-center">
          <span className="text-gray-400 mr-2">#</span>
          <h2 className="text-xl font-semibold text-white">{channel.name}</h2>
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

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => {
            const author = users[message.authorId]
            const isOwn = message.authorId === user?.uid

            return (
              <div key={message.id} className="group flex items-start space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={author?.photoURL || "/placeholder.svg"} />
                  <AvatarFallback>{author?.displayName?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-white">{author?.displayName || "Unknown User"}</span>
                    <span className="text-xs text-gray-400">{formatTime(message.timestamp)}</span>
                    {message.edited && (
                      <Badge variant="secondary" className="text-xs">
                        edited
                      </Badge>
                    )}
                  </div>

                  {editingMessage === message.id ? (
                    <div className="mt-1 flex items-center space-x-2">
                      <Input
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            editMessage(message.id)
                          }
                        }}
                        className="flex-1"
                      />
                      <Button size="sm" onClick={() => editMessage(message.id)}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingMessage(null)
                          setEditContent("")
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      {message.content && <p className="text-gray-300 mt-1">{message.content}</p>}

                      {/* Attachments */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.attachments.map((attachment) => (
                            <div
                              key={attachment.id}
                              className="rounded-md overflow-hidden bg-gray-800 border border-gray-600"
                            >
                              {isImageFile(attachment.type) ? (
                                <div className="relative">
                                  <img
                                    src={attachment.url || "/placeholder.svg"}
                                    alt={attachment.name}
                                    className="max-h-80 max-w-full object-contain"
                                    style={{ maxWidth: "400px" }}
                                  />
                                  <div className="absolute bottom-2 right-2 bg-gray-900 bg-opacity-70 p-1 rounded text-xs text-white">
                                    {attachment.name}
                                  </div>
                                </div>
                              ) : (
                                <div className="p-3 flex items-center">
                                  <File className="h-8 w-8 text-blue-400 mr-3" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white truncate">{attachment.name}</p>
                                    <p className="text-xs text-gray-400">{formatFileSize(attachment.size)}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {isOwn && editingMessage !== message.id && (
                  <div className="opacity-0 group-hover:opacity-100 flex space-x-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-gray-400 hover:text-white"
                      onClick={() => {
                        setEditingMessage(message.id)
                        setEditContent(message.content)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-gray-400 hover:text-red-400"
                      onClick={() => deleteMessage(message.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )
          })}

          {/* Typing Indicators */}
          {typingUsers.length > 0 && (
            <div className="flex items-center space-x-2 text-gray-400 text-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
              </div>
              <span>
                {typingUsers.map((indicator) => users[indicator.userId]?.displayName).join(", ")}
                {typingUsers.length === 1 ? " is" : " are"} typing...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-600 bg-gray-800">
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div key={index} className="relative bg-gray-700 rounded-md p-2 flex items-center">
                {file.type.startsWith("image/") ? (
                  <ImageIcon className="h-4 w-4 mr-2 text-blue-400" />
                ) : (
                  <File className="h-4 w-4 mr-2 text-blue-400" />
                )}
                <span className="text-sm text-gray-300 truncate max-w-[150px]">{file.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 ml-1 text-gray-400 hover:text-white"
                  onClick={() => removeAttachment(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t border-gray-600">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-gray-400 hover:text-white"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            multiple
            accept="image/*"
          />

          <Input
            placeholder={`Message #${channel.name}`}
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value)
              handleTyping()
            }}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            className="flex-1 bg-gray-600 border-gray-500 text-white placeholder-gray-400"
            disabled={uploading}
          />
          <Button onClick={sendMessage} disabled={(!newMessage.trim() && attachments.length === 0) || uploading}>
            {uploading ? (
              <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
