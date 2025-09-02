/**
 * 🚀 UNIACC Chatbot Server - Nueva Arquitectura
 * Servidor refactorizado usando services y dependency injection
 */

import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { createChatRoutes, CHAT_ENDPOINTS_DOCS } from './controllers/chat-routes'
import { WhatsAppSender } from './utils/whatsapp-sender'
import { SupabaseIntegration } from './actions/supabase-integration'
import { createChatBotServices } from './services/service-factory'
import logger from './utils/enhanced-logger'

// Cargar variables de entorno
dotenv.config()

const app = express()
const PORT = process.env.BOT_PORT || 3001

// 🔧 Middleware de seguridad y configuración
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-hashes'", "https://cdn.tailwindcss.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}))

app.use(cors({
  origin: [
    'http://localhost:3000', 'http://127.0.0.1:3000',
    'http://localhost:3009', 'http://127.0.0.1:3009',
    'http://localhost:3001', 'http://127.0.0.1:3001',
    'http://localhost:3002', 'http://127.0.0.1:3002'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// 📁 Servir archivos estáticos (comentado por ahora)
// app.use(express.static('public'))

// 🏭 Inicializar servicios
const webhookUrl = process.env.VUE_WEBHOOK_URL!
const webhookSecret = process.env.VUE_WEBHOOK_SECRET!

console.log('🏭 [SERVER] Inicializando servicios...')
const services = createChatBotServices(webhookUrl, webhookSecret)

// 🎮 Crear ChatController manualmente para rutas legacy
const { ChatController } = require('./controllers/chat-controller')
const chatController = new ChatController(services)

// 📱 WhatsApp Sender (legacy compatibility)
const whatsappSender = new WhatsAppSender(
  process.env.WHATSAPP_ACCESS_TOKEN!,
  process.env.WHATSAPP_PHONE_NUMBER_ID!
)

// 📊 Rate limiting simple
const rateLimitMap = new Map()
const RATE_LIMIT_WINDOW = 60000 // 1 minuto
const RATE_LIMIT_MAX = 30 // máximo 30 requests por minuto

function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const clientId = req.ip || 'unknown'
  const now = Date.now()
  
  if (!rateLimitMap.has(clientId)) {
    rateLimitMap.set(clientId, { count: 1, firstRequest: now })
    return next()
  }
  
  const clientData = rateLimitMap.get(clientId)
  
  // Reset si pasó la ventana
  if (now - clientData.firstRequest > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(clientId, { count: 1, firstRequest: now })
    return next()
  }
  
  // Verificar límite
  if (clientData.count >= RATE_LIMIT_MAX) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - clientData.firstRequest)) / 1000)
    })
  }
  
  clientData.count++
  next()
}

// 🛣️ Rutas principales usando nueva arquitectura
app.use('/chat', rateLimitMiddleware, createChatRoutes(webhookUrl, webhookSecret))

// 🔄 Legacy compatibility routes para Dashboard
app.get('/api/prospectos/reconocimiento/:whatsapp', rateLimitMiddleware, chatController.getProspectRecognition)

// 📱 Endpoint legacy de WhatsApp webhook
app.post('/webhook', rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const validation = validateWhatsAppWebhook(req.body)
    
    if (!validation.valido) {
      return res.status(400).json({
        success: false,
        error: validation.error
      })
    }

    const { from, message } = validation.data!
    
    console.log(`📱 [WEBHOOK] WhatsApp de ${from}: "${message}"`)
    
    // Usar ChatService para procesar
    const response = await services.chatService.processMessage(from, message)
    
    // Registrar interacción (mantener compatibilidad)
    try {
      const supabaseIntegration = (services.prospectService as any).supabaseIntegration
      if (supabaseIntegration?.registrarInteraccion) {
        await supabaseIntegration.registrarInteraccion(from, message, response)
      }
    } catch (error) {
      console.log('⚠️ [WEBHOOK] Error registrando interacción:', error)
    }
    
    res.json({
      success: true,
      response,
      from,
      processed: true
    })

  } catch (error) {
    console.error('💥 [WEBHOOK] Error:', error)
    res.status(500).json({
      success: false,
      error: 'Error procesando webhook'
    })
  }
})

// 🔍 Webhook verification (WhatsApp)
app.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ [WEBHOOK] Verificación exitosa')
    res.status(200).send(challenge)
  } else {
    console.log('❌ [WEBHOOK] Verificación fallida')
    res.sendStatus(403)
  }
})

// 🏠 Página principal
app.get('/', (req: Request, res: Response) => {
  res.redirect('/chat-demo')
})

// 🎮 Chat demo page
app.get('/chat-demo', (req: Request, res: Response) => {
  res.json({
    message: "Chat Demo API v2.0",
    status: "active",
    description: "Use POST /chat/message para probar el chatbot",
    example: {
      method: "POST",
      url: "/chat/message",
      body: {
        "userId": "56999888777",
        "message": "hola"
      }
    },
    endpoints: [
      "POST /chat/message - Enviar mensaje al chatbot",
      "GET /chat/health - Health check",
      "GET /chat/stats - Estadísticas del sistema"
    ]
  })
})

// 🎯 Endpoint legacy para test-chat (compatibilidad)
app.post('/test-chat', rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { phone, message } = req.body
    
    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        error: 'phone y message son requeridos'
      })
    }

    console.log(`🧪 [TEST-CHAT] ${phone}: "${message}"`)
    
    // Usar ChatService
    const botResponse = await services.chatService.processMessage(phone, message)
    
    res.json({
      status: 'success',
      demo: true,
      conversation: {
        phone,
        user_message: message,
        bot_response: botResponse,
        timestamp: new Date().toISOString()
      },
      prospecto: {
        data: services.stateService.getState(phone)?.datos_prospecto || {},
        guardado: true,
        id: services.stateService.getState(phone)?.prospecto_id || null
      }
    })

  } catch (error) {
    console.error('💥 [TEST-CHAT] Error:', error)
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
})

// 📊 Legacy endpoints para compatibilidad
app.get('/check-timeout/:phone', async (req: Request, res: Response) => {
  const warning = await services.chatService.checkForTimeoutWarning(req.params.phone)
  const timeout = await services.chatService.checkForSessionTimeout(req.params.phone)
  
  res.json({
    status: warning ? 'warning' : timeout ? 'timeout' : 'active',
    message: warning || timeout || null
  })
})

app.post('/force-timeout/:phone', async (req: Request, res: Response) => {
  try {
    const timeoutMessage = await services.chatService.forceTimeout(req.params.phone)
    res.json({
      success: true,
      message: timeoutMessage
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error forzando timeout'
    })
  }
})

// 📋 Documentación de API
app.get('/api-docs', (req: Request, res: Response) => {
  res.json({
    title: 'UNIACC Chatbot API v2.0',
    description: 'API refactorizada con arquitectura de servicios',
    version: '2.0.0-refactored',
    endpoints: {
      ...CHAT_ENDPOINTS_DOCS,
      'POST /webhook': {
        description: 'Webhook para WhatsApp',
        body: 'WhatsApp webhook format',
        response: 'Respuesta del bot'
      },
      'POST /test-chat': {
        description: 'Endpoint de testing (legacy)',
        body: { phone: 'string', message: 'string' },
        response: 'Respuesta del bot con metadata'
      }
    }
  })
})

// 🔧 Helper para validar webhook
function validateWhatsAppWebhook(body: any) {
  if (body && body.from && body.message) {
    return {
      valido: true,
      data: {
        from: body.from,
        message: body.message,
        messageId: body.messageId || `msg-${Date.now()}`
      }
    }
  }
  
  if (body.entry && body.entry[0] && body.entry[0].changes) {
    try {
      const messages = body.entry[0].changes[0].value.messages
      if (messages && messages[0]) {
        const msg = messages[0]
        return {
          valido: true,
          data: {
            from: msg.from,
            message: msg.text?.body || 'mensaje',
            messageId: msg.id
          }
        }
      }
    } catch (e) {
      // Continuar con validación fallida
    }
  }
  
  return {
    valido: false,
    error: 'Formato de webhook inválido'
  }
}

// 🚨 Error handler global
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('💥 [SERVER] Error no manejado:', error)
  
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    requestId: req.headers['x-request-id'] || 'unknown'
  })
})

// 🚀 Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`🚀 [SERVER] UNIACC Chatbot v2.0 ejecutándose en puerto ${PORT}`)
  console.log(`🌐 [SERVER] URLs disponibles:`)
  console.log(`   • Chat Demo: http://localhost:${PORT}/chat-demo`)
  console.log(`   • API Docs: http://localhost:${PORT}/api-docs`)
  console.log(`   • Health Check: http://localhost:${PORT}/chat/health`)
  console.log(`   • Stats: http://localhost:${PORT}/chat/stats`)
  console.log(`🏭 [SERVER] Servicios inicializados exitosamente`)
})

// 🧹 Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 [SERVER] Recibido SIGTERM, cerrando servidor...')
  server.close(() => {
    console.log('✅ [SERVER] Servidor cerrado exitosamente')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('🛑 [SERVER] Recibido SIGINT, cerrando servidor...')
  server.close(() => {
    console.log('✅ [SERVER] Servidor cerrado exitosamente')
    process.exit(0)
  })
})

export default app
