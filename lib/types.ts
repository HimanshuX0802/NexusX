export interface User {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  status: "online" | "offline" | "idle" | "dnd"
  lastSeen: number
  inCall?: string // channelId if in a call
}

export interface Server {
  id: string
  name: string
  description?: string
  icon?: string
  ownerId: string
  members: string[]
  inviteCode: string
  createdAt: number
}

export interface Channel {
  id: string
  name: string
  serverId: string
  type: "text" | "voice"
  isPrivate: boolean
  createdAt: number
  activeUsers?: string[] // For voice channels
  lastMessage?: {
    content: string
    authorId: string
    timestamp: number
  }
}

export interface Message {
  id: string
  content: string
  authorId: string
  channelId: string
  serverId?: string
  timestamp: number
  edited?: boolean
  editedAt?: number
  attachments?: Attachment[]
}

export interface Attachment {
  id: string
  name: string
  type: string
  url: string
  size: number
}

export interface DirectMessage {
  id: string
  content: string
  senderId: string
  receiverId: string
  timestamp: number
  read: boolean
  attachments?: Attachment[]
}

export interface TypingIndicator {
  userId: string
  channelId: string
  timestamp: number
}

export interface Call {
  id: string
  initiatorId: string
  receiverId: string
  status: "ringing" | "ongoing" | "ended"
  startTime: number
  endTime?: number
  type: "audio" | "video"
}
