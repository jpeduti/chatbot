export interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'bot' | 'system'
  timestamp: Date
  type: 'text' | 'quick_replies' | 'carousel' | 'image' | 'file'
  metadata?: MessageMetadata
  quickReplies?: QuickReply[]
  cards?: ChatCard[]
}

export interface MessageMetadata {
  version?: string
  responseTime?: number
  analytics?: any
  userId?: string
  messageId?: string
}

export interface QuickReply {
  id: string
  text: string
  emoji?: string
  value: string
  action?: 'send_message' | 'open_url' | 'call_phone'
}

export interface ChatCard {
  id: string
  title: string
  subtitle?: string
  description: string
  image?: string
  price?: string
  duration?: string
  buttons: CardButton[]
}

export interface CardButton {
  id: string
  text: string
  type: 'primary' | 'secondary' | 'outline'
  action: 'send_message' | 'open_url' | 'call_phone'
  value: string
}

export interface ChatMetrics {
  messageCount: number
  cacheHitRate: number
  avgResponseTime: number
  activeVersion: 'v1' | 'v2'
  conversationDuration: number
  errorCount: number
}

export interface ChatState {
  isConnected: boolean
  isTyping: boolean
  isSending: boolean
  hasError: boolean
  errorMessage?: string
  currentUserId: string
  sessionId?: string
}

export interface ChatResponse {
  status: string
  demo: boolean
  conversation: {
    phone: string
    user_message: string
    bot_response: string
    timestamp: string
  }
  prospecto: {
    data: any
    guardado: boolean
    id: string | null
  }
  analytics?: any
}

export interface UniversityData {
  facultades: Facultad[]
  programas: Programa[]
  costos: CostoInfo[]
  modalidades: ModalidadInfo[]
}

export interface Facultad {
  id: string
  nombre: string
  descripcion: string
  icon: string
  carreras: string[]
}

export interface Programa {
  id: string
  nombre: string
  facultad: string
  duracion: string
  modalidad: string[]
  precio: number
  descripcion: string
  requisitos: string[]
  imagen?: string
}

export interface CostoInfo {
  tipo: string
  valor: number
  descripcion: string
  descuentos?: string[]
}

export interface ModalidadInfo {
  tipo: string
  descripcion: string
  horarios: string[]
  requisitos: string[]
}
