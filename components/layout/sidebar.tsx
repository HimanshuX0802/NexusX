"use client"

import { useState, useEffect } from "react"
import { ref, onValue, push, set, get } from "firebase/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Hash, Users, LogOut, Volume2, MessageSquare, User } from "lucide-react"
import { database } from "@/lib/firebase"
import { useAuth } from "@/hooks/useAuth"
import { ProfileSettings } from "@/components/profile/profile-settings"
import type { Server, Channel } from "@/lib/types"
import { toast } from "sonner"

interface SidebarProps {
  selectedServer: Server | null
  selectedChannel: Channel | null
  onServerSelect: (server: Server) => void
  onChannelSelect: (channel: Channel) => void
  onDirectMessage: () => void
}

export function Sidebar({
  selectedServer,
  selectedChannel,
  onServerSelect,
  onChannelSelect,
  onDirectMessage,
}: SidebarProps) {
  const { user, logout } = useAuth()
  const [servers, setServers] = useState<Server[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [showCreateServer, setShowCreateServer] = useState(false)
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showJoinServer, setShowJoinServer] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [serverName, setServerName] = useState("")
  const [channelName, setChannelName] = useState("")
  const [channelType, setChannelType] = useState<"text" | "voice">("text")
  const [inviteCode, setInviteCode] = useState("")

  // Load user's servers
  useEffect(() => {
    if (!user) return

    const serversRef = ref(database, "servers")
    const unsubscribe = onValue(serversRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const userServers = Object.entries(data)
          .map(([id, serverData]: [string, any]) => ({
            id,
            ...serverData,
          }))
          .filter((server: Server) => server.members && server.members.includes(user.uid))
        setServers(userServers)
      } else {
        setServers([])
      }
    })

    return unsubscribe
  }, [user])

  // Load channels for selected server
  useEffect(() => {
    if (!selectedServer) {
      setChannels([])
      return
    }

    const channelsRef = ref(database, "channels")
    const unsubscribe = onValue(channelsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const serverChannels = Object.entries(data)
          .map(([id, channelData]: [string, any]) => ({
            id,
            ...channelData,
          }))
          .filter((channel: Channel) => channel.serverId === selectedServer.id)
          .sort((a, b) => {
            // Sort by type first (text channels first, then voice)
            if (a.type !== b.type) {
              return a.type === "text" ? -1 : 1
            }
            // Then sort by creation date
            return a.createdAt - b.createdAt
          })
        setChannels(serverChannels)
      } else {
        setChannels([])
      }
    })

    return unsubscribe
  }, [selectedServer])

  const createServer = async () => {
    if (!user || !serverName.trim()) return

    try {
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()
      const serversRef = ref(database, "servers")
      const newServerRef = push(serversRef)

      const serverData = {
        name: serverName,
        ownerId: user.uid,
        members: [user.uid],
        inviteCode,
        createdAt: Date.now(),
      }

      await set(newServerRef, serverData)

      // Create a general channel
      const channelsRef = ref(database, "channels")
      const newChannelRef = push(channelsRef)
      await set(newChannelRef, {
        name: "general",
        serverId: newServerRef.key,
        type: "text",
        isPrivate: false,
        createdAt: Date.now(),
      })

      setServerName("")
      setShowCreateServer(false)
      toast.success("Server created successfully!")
    } catch (error) {
      toast.error("Failed to create server")
    }
  }

  const joinServer = async () => {
    if (!user || !inviteCode.trim()) return

    try {
      const serversRef = ref(database, "servers")
      const snapshot = await get(serversRef)
      const data = snapshot.val()

      if (!data) {
        toast.error("Invalid invite code")
        return
      }

      let serverToJoin: any = null
      let serverId = ""

      Object.entries(data).forEach(([id, serverData]: [string, any]) => {
        if (serverData.inviteCode === inviteCode.toUpperCase()) {
          serverToJoin = serverData
          serverId = id
        }
      })

      if (!serverToJoin) {
        toast.error("Invalid invite code")
        return
      }

      if (serverToJoin.members && serverToJoin.members.includes(user.uid)) {
        toast.error("You are already a member of this server")
        return
      }

      // Add user to server members
      const updatedMembers = serverToJoin.members ? [...serverToJoin.members, user.uid] : [user.uid]
      const serverRef = ref(database, `servers/${serverId}/members`)
      await set(serverRef, updatedMembers)

      setInviteCode("")
      setShowJoinServer(false)
      toast.success("Joined server successfully!")
    } catch (error) {
      toast.error("Failed to join server")
    }
  }

  const createChannel = async () => {
    if (!user || !selectedServer || !channelName.trim()) return

    try {
      const channelsRef = ref(database, "channels")
      const newChannelRef = push(channelsRef)

      await set(newChannelRef, {
        name: channelName,
        serverId: selectedServer.id,
        type: channelType,
        isPrivate: false,
        createdAt: Date.now(),
        activeUsers: channelType === "voice" ? [] : undefined,
      })

      setChannelName("")
      setChannelType("text")
      setShowCreateChannel(false)
      toast.success(`${channelType === "text" ? "Text" : "Voice"} channel created successfully!`)
    } catch (error) {
      toast.error("Failed to create channel")
    }
  }

  return (
    <div className="flex h-full">
      {/* Server List */}
      <div className="w-16 bg-gray-900 flex flex-col items-center py-3 space-y-2">
        <Button
          variant="ghost"
          size="icon"
          className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-700 text-white"
          onClick={onDirectMessage}
        >
          <Users className="h-6 w-6" />
        </Button>

        <div className="w-8 h-0.5 bg-gray-600 rounded" />

        <ScrollArea className="flex-1 w-full">
          <div className="space-y-2 px-2">
            {servers.map((server) => (
              <Button
                key={server.id}
                variant="ghost"
                size="icon"
                className={`w-12 h-12 rounded-full ${
                  selectedServer?.id === server.id
                    ? "bg-purple-600 text-white"
                    : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                }`}
                onClick={() => onServerSelect(server)}
              >
                <span className="text-sm font-semibold">{server.name.charAt(0).toUpperCase()}</span>
              </Button>
            ))}

            <Dialog open={showCreateServer} onOpenChange={setShowCreateServer}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-12 h-12 rounded-full bg-gray-700 hover:bg-green-600 text-green-400 hover:text-white"
                >
                  <Plus className="h-6 w-6" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Server</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Server name" value={serverName} onChange={(e) => setServerName(e.target.value)} />
                  <Button onClick={createServer} className="w-full">
                    Create Server
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showJoinServer} onOpenChange={setShowJoinServer}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-12 h-12 rounded-full bg-gray-700 hover:bg-blue-600 text-blue-400 hover:text-white"
                >
                  <Users className="h-6 w-6" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join Server</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Invite code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
                  <Button onClick={joinServer} className="w-full">
                    Join Server
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </ScrollArea>
      </div>

      {/* Channel List */}
      {selectedServer && (
        <div className="w-60 bg-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h2 className="font-semibold text-white">{selectedServer.name}</h2>
            <p className="text-sm text-gray-400">Invite: {selectedServer.inviteCode}</p>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2">
              {/* Text Channels */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase">Text Channels</span>
                </div>

                {channels
                  .filter((channel) => channel.type === "text")
                  .map((channel) => (
                    <Button
                      key={channel.id}
                      variant="ghost"
                      className={`w-full justify-start text-left mb-1 ${
                        selectedChannel?.id === channel.id
                          ? "bg-gray-700 text-white"
                          : "text-gray-300 hover:bg-gray-700 hover:text-white"
                      }`}
                      onClick={() => onChannelSelect(channel)}
                    >
                      <Hash className="h-4 w-4 mr-2" />
                      {channel.name}
                    </Button>
                  ))}
              </div>

              {/* Voice Channels */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase">Voice Channels</span>
                </div>

                {channels
                  .filter((channel) => channel.type === "voice")
                  .map((channel) => (
                    <Button
                      key={channel.id}
                      variant="ghost"
                      className={`w-full justify-start text-left mb-1 ${
                        selectedChannel?.id === channel.id
                          ? "bg-gray-700 text-white"
                          : "text-gray-300 hover:bg-gray-700 hover:text-white"
                      }`}
                      onClick={() => onChannelSelect(channel)}
                    >
                      <Volume2 className="h-4 w-4 mr-2" />
                      {channel.name}
                      {channel.activeUsers && channel.activeUsers.length > 0 && (
                        <Badge variant="secondary" className="ml-2 bg-green-600 text-white">
                          {channel.activeUsers.length}
                        </Badge>
                      )}
                    </Button>
                  ))}
              </div>

              {/* Create Channel Button */}
              <Dialog open={showCreateChannel} onOpenChange={setShowCreateChannel}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left mt-2 text-gray-400 hover:text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Channel
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Channel</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Channel name"
                      value={channelName}
                      onChange={(e) => setChannelName(e.target.value)}
                    />

                    <Tabs defaultValue="text" onValueChange={(value) => setChannelType(value as "text" | "voice")}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="text">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Text Channel
                        </TabsTrigger>
                        <TabsTrigger value="voice">
                          <Volume2 className="h-4 w-4 mr-2" />
                          Voice Channel
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>

                    <Button onClick={createChannel} className="w-full">
                      Create Channel
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </ScrollArea>

          {/* User Panel */}
          <div className="p-3 bg-gray-900 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.photoURL || "/placeholder.svg"} />
                  <AvatarFallback>{user?.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.displayName}</p>
                  <p className="text-xs text-gray-400">
                    <Badge variant="secondary" className="bg-green-600 text-white">
                      Online
                    </Badge>
                  </p>
                </div>
              </div>
              <div className="flex space-x-1">
                <Dialog open={showSettings} onOpenChange={setShowSettings}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white">
                      <User className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Profile Settings</DialogTitle>
                    </DialogHeader>
                    <ProfileSettings onClose={() => setShowSettings(false)} />
                  </DialogContent>
                </Dialog>

                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
