/**
 * 🛣️ Chat Routes
 * Definición de rutas para el chat controller
 */

import { Router } from 'express'
import { ChatController } from './chat-controller'

export function createChatRoutes(webhookUrl: string, webhookSecret: string): Router {
  const router = Router()
  const chatController = new ChatController(webhookUrl, webhookSecret)

  /**
   * 💬 Procesar mensaje de chat
   * POST /chat/message
   * Body: { phone?, userId?, message }
   */
  router.post('/message', async (req, res) => {
    await chatController.processMessage(req, res)
  })

  /**
   * ⏰ Verificar timeouts
   * GET /chat/timeout-check/:userId
   */
  router.get('/timeout-check/:userId', async (req, res) => {
    await chatController.checkTimeout(req, res)
  })

  /**
   * 🧪 Forzar timeout (testing)
   * POST /chat/force-timeout/:userId
   */
  router.post('/force-timeout/:userId', async (req, res) => {
    await chatController.forceTimeout(req, res)
  })

  /**
   * 📊 Estadísticas del sistema
   * GET /chat/stats
   */
  router.get('/stats', async (req, res) => {
    await chatController.getStats(req, res)
  })

  /**
   * 🩺 Health check
   * GET /chat/health
   */
  router.get('/health', async (req, res) => {
    await chatController.healthCheck(req, res)
  })

  /**
   * 🔄 Resetear usuario
   * POST /chat/reset/:userId
   * Body: { keepData?: boolean }
   */
  router.post('/reset/:userId', async (req, res) => {
    await chatController.resetUser(req, res)
  })

  /**
   * 📋 Estado de usuario
   * GET /chat/user-state/:userId
   */
  router.get('/user-state/:userId', async (req, res) => {
    await chatController.getUserState(req, res)
  })

  console.log('🛣️ [CHAT-ROUTES] Rutas configuradas exitosamente')

  return router
}

/**
 * 📝 Documentación de endpoints
 */
export const CHAT_ENDPOINTS_DOCS = {
  'POST /chat/message': {
    description: 'Procesar mensaje de usuario',
    body: {
      phone: 'string (opcional si se envía userId)',
      userId: 'string (opcional si se envía phone)', 
      message: 'string (requerido)'
    },
    response: {
      success: 'boolean',
      response: 'string',
      userId: 'string',
      timestamp: 'string'
    }
  },
  'GET /chat/timeout-check/:userId': {
    description: 'Verificar mensajes de timeout pendientes',
    response: {
      success: 'boolean',
      userId: 'string',
      warning: 'string | null',
      timeout: 'string | null',
      timestamp: 'string'
    }
  },
  'POST /chat/force-timeout/:userId': {
    description: 'Forzar timeout para testing',
    response: {
      success: 'boolean',
      userId: 'string',
      timeoutMessage: 'string',
      timestamp: 'string'
    }
  },
  'GET /chat/stats': {
    description: 'Estadísticas del sistema',
    response: {
      success: 'boolean',
      stats: {
        activeUsers: 'number',
        pendingMessages: 'number',
        activeTimeouts: 'number',
        servicesLoaded: 'string[]'
      },
      timestamp: 'string'
    }
  },
  'GET /chat/health': {
    description: 'Health check del sistema',
    response: {
      success: 'boolean',
      status: 'healthy | unhealthy',
      version: 'string',
      services: 'object',
      timestamp: 'string'
    }
  },
  'POST /chat/reset/:userId': {
    description: 'Resetear estado de usuario',
    body: {
      keepData: 'boolean (opcional)'
    },
    response: {
      success: 'boolean',
      userId: 'string',
      message: 'string',
      keepData: 'boolean',
      timestamp: 'string'
    }
  },
  'GET /chat/user-state/:userId': {
    description: 'Obtener estado actual de usuario',
    response: {
      success: 'boolean',
      userId: 'string',
      state: {
        flujo_actual: 'string | null',
        paso_actual: 'string | null',
        datos_prospecto: 'object',
        es_usuario_recurrente: 'boolean',
        fecha_ultima_interaccion: 'string',
        campos_capturados: 'string[]'
      },
      timestamp: 'string'
    }
  }
}
