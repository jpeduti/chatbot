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
    currentUserId: '56999888777',
    sessionActive: true,
    timeoutWarning: false,
    remainingTime: 0,
    sessionClosedAt: 0
  })

  const responseTimes = ref<number[]>([])
  
  // ⏰ Sistema de Timeout
  const SESSION_TIMEOUT = 20000 // 20 segundos (sync con backend)
  const WARNING_TIMEOUT = 10000 // 10 segundos
  let sessionTimer: number | null = null
  let warningTimer: number | null = null

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

  // ⏰ Funciones de Timeout
  const clearTimeouts = () => {
    console.log('🧹 [FRONTEND] clearTimeouts() ejecutándose...')
    console.log('🧹 [FRONTEND] Timers antes:', { 
      sessionTimer: !!sessionTimer, 
      warningTimer: !!warningTimer 
    })
    
    if (sessionTimer) {
      clearTimeout(sessionTimer)
      sessionTimer = null
      console.log('🧹 [FRONTEND] sessionTimer cancelado')
    }
    if (warningTimer) {
      clearTimeout(warningTimer)
      warningTimer = null
      console.log('🧹 [FRONTEND] warningTimer cancelado')
    }
    chatState.timeoutWarning = false
    chatState.remainingTime = 0
    
    console.log('🧹 [FRONTEND] clearTimeouts() completado')
  }

  const resetSession = () => {
    console.log('🔄 [FRONTEND] Reiniciando sesión')
    chatState.sessionActive = true
    clearTimeouts()
  }

  const startSessionTimeout = () => {
    // 🛑 NO reiniciar timeouts si la sesión ya terminó
    if (!chatState.sessionActive) {
      console.log('🔚 [FRONTEND] Sesión inactiva - no reiniciando timeouts')
      return
    }
    
    clearTimeouts()
    
    // Reset estado
    chatState.sessionActive = true
    chatState.timeoutWarning = false
    chatState.remainingTime = SESSION_TIMEOUT / 1000
    
    // Warning timer
    warningTimer = setTimeout(() => {
      console.log('⚠️ [FRONTEND] WARNING TIMER EJECUTÁNDOSE - ¿Sesión activa?', chatState.sessionActive)
      if (chatState.sessionActive) {
        chatState.timeoutWarning = true
        addMessage(
          '⚠️ Tu sesión expirará en 10 segundos por inactividad. Escribe algo para continuar.',
          'system',
          { type: 'warning' }
        )
      } else {
        console.log('🔚 [FRONTEND] WARNING CANCELADO - Sesión ya terminada')
      }
    }, WARNING_TIMEOUT)
    
    // Session timeout
    sessionTimer = setTimeout(() => {
      chatState.sessionActive = false
      chatState.timeoutWarning = false
      addMessage(
        '⏰ Sesión finalizada por inactividad. Tus datos han sido guardados. Escribe "Hola" para iniciar una nueva conversación.',
        'system',
        { type: 'timeout' }
      )
      clearTimeouts()
    }, SESSION_TIMEOUT)
    
    // Countdown timer
    const countdown = setInterval(() => {
      if (chatState.remainingTime > 0) {
        chatState.remainingTime--
      } else {
        clearInterval(countdown)
      }
    }, 1000)
  }

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
    console.log('🚀 [FRONTEND] sendMessage() ejecutándose con:', content)
    
    if (!content.trim() || chatState.isSending) return

    chatState.isSending = true
    chatState.hasError = false

    // 🔄 Reiniciar sesión si el usuario escribe "hola" y la sesión está inactiva
    if (content.toLowerCase().includes('hola') && !chatState.sessionActive) {
      resetSession()
    }

    // ⏰ Reiniciar timeout con cada mensaje
    startSessionTimeout()

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
        botResponse = result.conversation?.bot_response || 'Sin respuesta'
        analytics = result.analytics
        if (analytics?.cacheHit) {
          metrics.cacheHitRate = Math.min(100, metrics.cacheHitRate + 1)
        }
      } else {
        botResponse = result.conversation?.bot_response || 'Sin respuesta'
      }

      // Ocultar typing y agregar respuesta
      hideTyping()
      
      // 🔍 Detectar si la sesión terminó (flujo completado)
      console.log('🔍 [FRONTEND] Analizando respuesta del bot:', botResponse.substring(0, 100) + '...')
      
      const sessionEnded = botResponse.includes('Para nuevas consultas, escribe "hola"') ||
                          botResponse.includes('escribe "hola" y comenzaremos una nueva conversación') ||
                          botResponse.includes('Sesión completada') ||
                          botResponse.includes('sesión terminada') ||
                          // 🎓 DETECCIÓN ESPECÍFICA PARA SOLICITUD DE ASESOR
                          (botResponse.includes('¡Perfecto! En 24 horas te contactarán') && 
                           botResponse.includes('Presiona "Hola" para volver a consultar')) ||
                          // 🏆 DETECCIÓN PARA OTROS FLUJOS COMPLETADOS
                          botResponse.includes('¡Gracias por elegir UNIACC!')
      
      // 🔍 Análisis detallado de detección
      const detectionResults = {
        hasGraciasUniacc: botResponse.includes('¡Gracias por elegir UNIACC!'),
        hasPerfectoContactaran: botResponse.includes('¡Perfecto! En 24 horas te contactarán'),
        hasPresionaHola: botResponse.includes('Presiona "Hola" para volver a consultar'),
        advisorFlow: (botResponse.includes('¡Perfecto! En 24 horas te contactarán') && 
                     botResponse.includes('Presiona "Hola" para volver a consultar'))
      }
      
      console.log('🔍 [FRONTEND] Análisis detección finalización:', detectionResults)
      console.log('🔍 [FRONTEND] ¿Sesión terminada?', sessionEnded)
      console.log('🔍 [FRONTEND] Estado actual:', { 
        sessionActive: chatState.sessionActive, 
        timeoutWarning: chatState.timeoutWarning,
        hasSessionTimer: !!sessionTimer,
        hasWarningTimer: !!warningTimer
      })
      
      if (sessionEnded) {
        // 🛑 CANCELAR TIMEOUTS - La sesión terminó exitosamente
        console.log('🔚 [FRONTEND] ===== SESIÓN TERMINADA DETECTADA =====')
        console.log('🔚 [FRONTEND] Motivo:', detectionResults.advisorFlow ? 'Solicitud de asesor' : 'Otro flujo completado')
        console.log('🛑 [FRONTEND] Cancelando timeouts programados...')
        clearTimeouts()
        chatState.sessionActive = false
        chatState.sessionClosedAt = Date.now() // ✅ Timestamp del cierre
        console.log('✅ [FRONTEND] ===== SESIÓN CERRADA EXITOSAMENTE =====')
        console.log('📨 [FRONTEND] Polling continuará por 2 minutos para detectar ejecutivo')
      }
      
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
    
    // ⏰ Limpiar timeouts al limpiar chat
    clearTimeouts()
    
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

  // 📨 NUEVO: Sistema de polling para mensajes de ejecutivos
  let pollingInterval: number | null = null
  let lastPollingCheck = Date.now()

  const startPolling = (): void => {
    console.log('📨 [POLLING] Iniciando polling de mensajes de ejecutivos')
    
    if (pollingInterval) {
      clearInterval(pollingInterval)
    }
    
    pollingInterval = setInterval(async () => {
      // ✅ NUEVA LÓGICA: Polling continúa si:
      // 1. Sesión activa del bot, O
      // 2. Conversación asignada a ejecutivo (aunque bot esté inactivo)
      if (chatState.isSending) {
        return // Solo pausar si se está enviando un mensaje
      }
      
      // ✅ NUEVA LÓGICA: Permitir polling por un tiempo después del cierre de sesión
      // para detectar asignación de ejecutivo
        const tiempoSinSesion = Date.now() - (chatState.sessionClosedAt || 0)
        const TIEMPO_GRACIA = 120000 // 120 segundos (2 minutos) después del cierre de sesión
      
      if (!chatState.sessionActive && !chatStateExtended.isAssignedToExecutive) {
        // Si la sesión cerró hace más de 2 minutos y no hay ejecutivo, detener
        if (chatState.sessionClosedAt && tiempoSinSesion > TIEMPO_GRACIA) {
          console.log(`📨 [POLLING] Deteniendo polling - sin sesión por ${Math.floor(tiempoSinSesion/1000)}s y sin ejecutivo`)
          stopPolling()
          return
        }
        console.log(`📨 [POLLING] Continuando polling en período de gracia (${Math.floor(tiempoSinSesion/1000)}s)`)
      }
      
      try {
        const desde = new Date(lastPollingCheck).toISOString()
        console.log(`📨 [POLLING] ${chatState.currentUserId}: Consultando mensajes nuevos desde ${desde}`)
        const response = await fetch(`/api/mensajes/nuevos/${chatState.currentUserId}?desde=${desde}`)
        
        if (!response.ok) {
          console.warn('⚠️ [POLLING] Error en respuesta:', response.status)
          return
        }
        
        const data = await response.json()
        
        if (data.success && data.mensajes && data.mensajes.length > 0) {
          console.log(`📨 [POLLING] ${data.mensajes.length} mensajes nuevos de ejecutivo recibidos`)
          
          // 🎯 PRIMERO: Verificar si hay asignación nueva y mostrar handoff
          if (data.conversacion_asignada && !chatStateExtended.isAssignedToExecutive) {
            chatStateExtended.isAssignedToExecutive = true
            console.log(`🎯 [POLLING] Conversación asignada a ejecutivo: ${data.ejecutivo_asignado}`)
            console.log(`🎯 [POLLING] Continuando polling aunque sesión bot esté inactiva`)
            
            // 🤝 MOSTRAR MENSAJE DE HANDOFF AUTOMÁTICO PRIMERO
            // Obtener nombre real del ejecutivo desde Dashboard API
            let ejecutivoNombre = 'nuestro asesor'
            try {
              const ejecutivoResponse = await fetch(`http://localhost:3002/api/ejecutivos`)
              if (ejecutivoResponse.ok) {
                const response = await ejecutivoResponse.json()
                const ejecutivos = response.data || response
                const ejecutivo = ejecutivos.find((ej: any) => ej.id === data.ejecutivo_asignado)
                ejecutivoNombre = ejecutivo?.nombre || 'nuestro asesor'
                console.log(`👤 [HANDOFF] Ejecutivo obtenido: ${ejecutivoNombre}`)
              }
            } catch (error) {
              console.warn(`⚠️ [HANDOFF] No se pudo obtener nombre del ejecutivo: ${error.message}`)
            }
            
            const mensajeHandoff = `🔄 Te he conectado con ${ejecutivoNombre}, uno de nuestros asesores especializados. En un momento te atenderá para resolver todas tus consultas. ¡Gracias por tu paciencia! 😊`
            
            addMessage(mensajeHandoff, 'bot', [])
            console.log(`🤝 [HANDOFF] Mensaje de conexión mostrado al usuario: ${ejecutivoNombre}`)
          }
          
          // 🔄 SEGUNDO: Agregar mensajes de ejecutivo al chat (ordenados por timestamp)
          const mensajesOrdenados = data.mensajes.sort((a: any, b: any) => {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          })
          
          mensajesOrdenados.forEach((mensaje: any) => {
            addMessage(`👥 **${mensaje.sender_name}**: ${mensaje.content}`, 'bot', [])
            console.log(`📨 [POLLING-ORDER] Mostrando mensaje: ${mensaje.sender_name} - ${mensaje.content?.substring(0, 30)}...`)
          })
        }
        
        lastPollingCheck = Date.now()
        
      } catch (error) {
        console.error('❌ [POLLING] Error consultando mensajes:', error)
      }
    }, 3000) // Polling cada 3 segundos
  }

  const stopPolling = (): void => {
    console.log('📨 [POLLING] Deteniendo polling')
    if (pollingInterval) {
      clearInterval(pollingInterval)
      pollingInterval = null
    }
  }

  // Agregar flag para indicar si está asignado a ejecutivo
  const chatStateExtended = reactive({
    ...chatState,
    isAssignedToExecutive: false
  })

  // Auto-iniciar polling después del primer mensaje
  const originalSendMessage = sendMessage
  const sendMessageWithPolling = async (content: string): Promise<void> => {
    await originalSendMessage(content)
    
    // ✅ SIEMPRE iniciar polling después de cualquier mensaje
    if (!pollingInterval) {
      console.log('📨 [FRONTEND] Iniciando polling después del mensaje (independiente del estado de sesión)')
      setTimeout(() => {
        startPolling()
      }, 2000) // Esperar 2 segundos
    }
  }

  return {
    // Estado
    messages,
    metrics,
    chatState: chatStateExtended,
    
    // Computed
    lastMessage,
    userMessages,
    botMessages,
    hasMessages,
    
    // Métodos
    addMessage,
    addBotMessageWithQuickReplies,
    sendMessage: sendMessageWithPolling,
    clearChat,
    switchVersion,
    handleQuickReply,
    showTyping,
    hideTyping,
    resetSession,
    initializeChat,
    
    // ⏰ Timeout methods
    clearTimeouts,
    startSessionTimeout,
    
    // 📨 Polling methods
    startPolling,
    stopPolling
  }
}
