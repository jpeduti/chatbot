import { ref, reactive, computed, watch } from 'vue'
import type { 
  ChatMessage, 
  ChatMetrics, 
  ChatState, 
  ChatResponse,
  QuickReply 
} from '../types/chat'

export function useChat() {
  // Estado reactivo
  const messages = ref<ChatMessage[]>([])
  const metrics = reactive<ChatMetrics>({
    messageCount: 0,
    cacheHitRate: 0,
    avgResponseTime: 0,
    activeVersion: 'v2',
    conversationDuration: 0,
    errorCount: 0
  })
  
  const chatState = reactive<ChatState>({
    isConnected: true,
    isTyping: false,
    isSending: false,
    hasError: false,
    currentUserId: '56999888777'
  })

  const responseTimes = ref<number[]>([])

  // Computed properties
  const lastMessage = computed(() => 
    messages.value[messages.value.length - 1]
  )
  
  const userMessages = computed(() => 
    messages.value.filter(m => m.sender === 'user')
  )
  
  const botMessages = computed(() => 
    messages.value.filter(m => m.sender === 'bot')
  )

  const hasMessages = computed(() => messages.value.length > 0)

  // Métodos principales
  const addMessage = (content: string, sender: 'user' | 'bot' | 'system', metadata?: any) => {
    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      sender,
      timestamp: new Date(),
      type: 'text',
      metadata
    }

    messages.value.push(message)
    
    if (sender === 'user' || sender === 'bot') {
      metrics.messageCount++
    }

    return message
  }

  const addBotMessageWithQuickReplies = (content: string, quickReplies: QuickReply[], metadata?: any) => {
    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      sender: 'bot',
      timestamp: new Date(),
      type: 'quick_replies',
      metadata,
      quickReplies
    }

    messages.value.push(message)
    metrics.messageCount++
    
    return message
  }

  const sendMessage = async (content: string): Promise<void> => {
    if (!content.trim() || chatState.isSending) return

    chatState.isSending = true
    chatState.hasError = false

    // Agregar mensaje del usuario
    addMessage(content, 'user')

    // Mostrar indicador de typing
    showTyping()

    const startTime = Date.now()

    try {
      // Elegir endpoint según versión
      const endpoint = metrics.activeVersion === 'v2' 
        ? '/chat/v2/analytics' 
        : '/test-chat'
      
      const body = metrics.activeVersion === 'v2'
        ? { userId: chatState.currentUserId, message: content }
        : { phone: chatState.currentUserId, message: content }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result: ChatResponse = await response.json()
      const responseTime = Date.now() - startTime

      // Agregar tiempo de respuesta
      responseTimes.value.push(responseTime)
      if (responseTimes.value.length > 10) {
        responseTimes.value.shift()
      }

      // Actualizar métricas
      metrics.avgResponseTime = responseTimes.value.reduce((a, b) => a + b, 0) / responseTimes.value.length

      // Procesar respuesta del bot
      let botResponse: string
      let analytics = null

      if (metrics.activeVersion === 'v2') {
        botResponse = result.conversation?.bot_response || result.response || 'Sin respuesta'
        analytics = result.analytics
        if (analytics?.cacheHit) {
          metrics.cacheHitRate = Math.min(100, metrics.cacheHitRate + 1)
        }
      } else {
        botResponse = result.conversation?.bot_response || 'Sin respuesta'
      }

      // Ocultar typing y agregar respuesta
      hideTyping()
      
      // Agregar mensaje del bot sin quick replies (usuario escribe manualmente)
      addMessage(botResponse, 'bot', {
        version: metrics.activeVersion,
        responseTime,
        analytics
      })

    } catch (error) {
      hideTyping()
      chatState.hasError = true
      chatState.errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      metrics.errorCount++
      
      addMessage(
        `❌ Error: ${chatState.errorMessage}`, 
        'system',
        { 
          version: 'error', 
          responseTime: Date.now() - startTime 
        }
      )
    } finally {
      chatState.isSending = false
    }
  }

  const extractQuickReplies = (content: string): QuickReply[] => {
    const replies: QuickReply[] = []
    
    // Buscar múltiples patrones de opciones numeradas
    const patterns = [
      /(\d+)️⃣\s*\*?\*?([^*\n]+)\*?\*?/g,  // Patrón con emoji: 1️⃣ Opción
      /^(\d+)\s*\*?\*?([^*\n]+)\*?\*?$/gm,  // Patrón simple: 1 Opción (línea completa)
      /(\d+)\.?\s*\*?\*?([^*\n]+)\*?\*?/g   // Patrón con punto: 1. Opción
    ]
    
    for (const regex of patterns) {
      let match
      while ((match = regex.exec(content)) !== null) {
        const [, number, text] = match
        const cleanText = text.trim().replace(/^\*+|\*+$/g, '') // Limpiar asteriscos
        
        // Evitar duplicados
        if (!replies.find(r => r.value === number)) {
          replies.push({
            id: `option-${number}`,
            text: cleanText,
            value: number,
            action: 'send_message'
          })
        }
      }
    }

    return replies.sort((a, b) => parseInt(a.value) - parseInt(b.value)) // Ordenar por número
  }

  const showTyping = () => {
    chatState.isTyping = true
  }

  const hideTyping = () => {
    chatState.isTyping = false
  }

  const clearChat = () => {
    messages.value = []
    metrics.messageCount = 0
    metrics.errorCount = 0
    responseTimes.value = []
    chatState.hasError = false
    chatState.errorMessage = undefined
    
    // Agregar mensaje de bienvenida
    addMessage(
      '¡Hola! 👋 Soy el chatbot de UNIACC v3.0\n\n🚀 **Nueva Interfaz Vue.js:**\n✅ Diseño moderno y responsive\n✅ Typing indicators\n✅ Real-time analytics\n✅ Mobile-first UI\n✅ Chat fluido\n\n*Escribe "hola" para comenzar...*',
      'bot',
      { version: 'welcome' }
    )
  }

  const switchVersion = async (version: 'v1' | 'v2') => {
    try {
      const response = await fetch('/chat/version/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version })
      })

      const result = await response.json()
      
      if (result.success) {
        metrics.activeVersion = version
        addMessage(
          `🔄 Sistema cambiado a ${version.toUpperCase()}`,
          'system',
          { version: 'system' }
        )
      } else {
        throw new Error(result.error || 'Error desconocido')
      }
    } catch (error) {
      addMessage(
        `❌ Error cambiando versión: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        'system',
        { version: 'error' }
      )
    }
  }

  const handleQuickReply = (reply: QuickReply) => {
    sendMessage(reply.value)
  }

  // Inicializar con mensaje de bienvenida
  const initializeChat = () => {
    clearChat()
  }

  // Watch para actualizar duración de conversación
  watch(messages, () => {
    if (messages.value.length > 0) {
      const firstMessage = messages.value[0]
      const lastMessage = messages.value[messages.value.length - 1]
      metrics.conversationDuration = lastMessage.timestamp.getTime() - firstMessage.timestamp.getTime()
    }
  }, { deep: true })

  return {
    // Estado
    messages,
    metrics,
    chatState,
    
    // Computed
    lastMessage,
    userMessages,
    botMessages,
    hasMessages,
    
    // Métodos
    addMessage,
    addBotMessageWithQuickReplies,
    sendMessage,
    clearChat,
    switchVersion,
    handleQuickReply,
    showTyping,
    hideTyping,
    initializeChat
  }
}
