/**
 * 🎓 UNIACC ChatBot Simplificado
 * Arquitectura simplificada siguiendo mejores prácticas mundiales
 */

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { ServiceFactory } from './services/service-factory'
import { UniaccChatService } from './services/UniaccChatService'
import { RepositoryFactory } from './repositories/RepositoryFactory'

// Cargar variables de entorno
dotenv.config()

const app = express()
const PORT = process.env.BOT_PORT || 3004

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}))
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Servir archivos estáticos
app.use(express.static('public'))

// Rate limiting básico
const rateLimitMap = new Map<string, { count: number, resetTime: number }>()
const RATE_LIMIT = 10 // mensajes por minuto
const RATE_WINDOW = 60 * 1000 // 1 minuto

function rateLimitMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const clientId = req.ip || 'unknown'
  const now = Date.now()
  
  const clientData = rateLimitMap.get(clientId)
  
  if (!clientData || now > clientData.resetTime) {
    rateLimitMap.set(clientId, { count: 1, resetTime: now + RATE_WINDOW })
    next()
  } else if (clientData.count < RATE_LIMIT) {
    clientData.count++
    next()
  } else {
    res.status(429).json({ error: 'Rate limit exceeded' })
  }
}

// Inicializar servicios
let uniaccChatService: UniaccChatService

async function initializeServices() {
  try {
    console.log('🚀 Inicializando UNIACC ChatBot Simplificado...')
    
    // Crear factory de repositorios
    const repositoryFactory = RepositoryFactory.getInstance()
    
    // Obtener repositorios necesarios
    const prospectoRepo = repositoryFactory.getProspectoActualRepository()
    
    // Crear servicios básicos
    const serviceFactory = ServiceFactory.getInstance()
    const services = serviceFactory.createServices(
      process.env.VUE_WEBHOOK_URL || 'http://localhost:3002/api/botpress-webhook',
      process.env.VUE_WEBHOOK_SECRET || 'uniacc_webhook_secret_123'
    )
    
    // Usar el servicio simplificado del factory
    uniaccChatService = services.uniaccChatService
    
    console.log('✅ Servicios inicializados correctamente')
    
  } catch (error) {
    console.error('💥 Error inicializando servicios:', error)
    process.exit(1)
  }
}

// 🏠 Página principal
app.get('/', (req, res) => {
  res.json({
    service: 'UNIACC ChatBot Simplificado',
    version: '1.0.0',
    status: 'active',
    endpoints: [
      'GET /health - Health check',
      'GET /stats - Estadísticas',
      'POST /webhook - WhatsApp webhook',
      'POST /chat - Chat directo'
    ]
  })
})

// 💚 Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'UniaccChatBot',
    version: '1.0.0'
  })
})

// 📊 Estadísticas
app.get('/stats', async (req, res) => {
  try {
    const stats = await uniaccChatService.getStats()
    res.json(stats)
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo estadísticas' })
  }
})

// 📱 Webhook WhatsApp
app.post('/webhook', rateLimitMiddleware, async (req, res) => {
  try {
    console.log('📱 [WEBHOOK] Mensaje recibido:', req.body)
    
    // Validar webhook de WhatsApp
    if (req.body.object !== 'whatsapp_business_account') {
      return res.status(400).json({ error: 'Invalid webhook type' })
    }
    
    const changes = req.body.entry?.[0]?.changes?.[0]
    const value = changes?.value
    
    if (value?.messages) {
      const message = value.messages[0]
      const from = message.from
      const messageBody = message.text?.body || 
                        message.interactive?.button_reply?.title || 
                        message.interactive?.list_reply?.title || ''
      
      console.log(`📱 [WEBHOOK] Procesando mensaje de ${from}: "${messageBody}"`)
      
      // Procesar mensaje
      const response = await uniaccChatService.processMessage(from, messageBody)
      
      // TODO: Enviar respuesta por WhatsApp Business API
      console.log(`📤 [WEBHOOK] Respuesta para ${from}:`, response.substring(0, 100) + '...')
      
      res.status(200).send('OK')
    } else {
      console.log('📱 [WEBHOOK] Webhook sin mensajes')
      res.status(200).send('OK')
    }
    
  } catch (error) {
    console.error('💥 [WEBHOOK] Error:', error)
    res.status(500).json({ error: 'Error procesando webhook' })
  }
})

// 💬 Chat directo para testing
app.post('/chat', rateLimitMiddleware, async (req, res) => {
  try {
    const { userId, message } = req.body
    
    if (!userId || !message) {
      return res.status(400).json({ error: 'userId y message son requeridos' })
    }
    
    console.log(`💬 [CHAT] ${userId}: "${message}"`)
    
    const response = await uniaccChatService.processMessage(userId, message)
    
    console.log(`📤 [CHAT] Enviando respuesta para ${userId}:`, response.substring(0, 100) + '...')
    
    res.json({
      success: true,
      userId,
      message,
      response,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('💥 [CHAT] Error:', error)
    res.status(500).json({ error: 'Error procesando mensaje' })
  }
})

// 🎯 Interfaz de testing web
app.get('/test', (req, res) => {
  res.sendFile('test.html', { root: 'public' })
})

// 🚀 Inicializar servidor
async function startServer() {
  await initializeServices()
  
  app.listen(PORT, () => {
    console.log(`🎓 UNIACC ChatBot Simplificado iniciado en puerto ${PORT}`)
    console.log(`🌐 Interfaz de test: http://localhost:${PORT}/test`)
    console.log(`💚 Health check: http://localhost:${PORT}/health`)
    console.log(`📊 Estadísticas: http://localhost:${PORT}/stats`)
  })
}

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Iniciar servidor
startServer().catch(error => {
  console.error('💥 Error iniciando servidor:', error)
  process.exit(1)
})
