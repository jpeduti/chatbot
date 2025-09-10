/**
 * 🎮 Chat Controller
 * Controlador para manejar endpoints de chat
 */

import { Request, Response } from 'express'
import { ChatService } from '../services/chat-service'
import { createChatBotServices, getChatBotStats } from '../services/service-factory'

export class ChatController {
  private chatService: ChatService
  private services: any

  constructor(servicesOrWebhookUrl: any | string, webhookSecret?: string) {
    if (typeof servicesOrWebhookUrl === 'string') {
      // Constructor legacy con webhookUrl y webhookSecret
      this.services = createChatBotServices(servicesOrWebhookUrl, webhookSecret!)
      this.chatService = this.services.chatService
    } else {
      // Constructor nuevo con services pre-creados
      this.services = servicesOrWebhookUrl
      this.chatService = this.services.chatService
    }
    
    console.log('🎮 [CHAT-CONTROLLER] Inicializado exitosamente')
  }

  /**
   * 💬 Endpoint principal para procesar mensajes
   * POST /chat/message
   */
  async processMessage(req: Request, res: Response): Promise<void> {
    try {
      const { phone, message, userId } = req.body
      
      // Validar parámetros requeridos
      if (!message) {
        res.status(400).json({
          success: false,
          error: 'Mensaje es requerido'
        })
        return
      }

      // Usar phone o userId como identificador
      const userIdentifier = userId || phone
      if (!userIdentifier) {
        res.status(400).json({
          success: false,
          error: 'phone o userId es requerido'
        })
        return
      }

      console.log(`🎮 [CHAT-CONTROLLER] Procesando mensaje de ${userIdentifier}: "${message}"`)

      // Procesar mensaje usando ChatService
      const response = await this.chatService.processMessage(userIdentifier, message)

      // Respuesta exitosa
      res.json({
        success: true,
        response,
        userId: userIdentifier,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('💥 [CHAT-CONTROLLER] Error procesando mensaje:', error)
      
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      })
    }
  }

  /**
   * ⏰ Endpoint para verificar timeouts
   * GET /chat/timeout-check/:userId
   */
  async checkTimeout(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params
      
      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'userId es requerido'
        })
        return
      }

      // Verificar warnings y timeouts pendientes
      const warning = await this.chatService.checkForTimeoutWarning(userId)
      const timeout = await this.chatService.checkForSessionTimeout(userId)

      res.json({
        success: true,
        userId,
        warning,
        timeout,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('💥 [CHAT-CONTROLLER] Error verificando timeout:', error)
      
      res.status(500).json({
        success: false,
        error: 'Error verificando timeout'
      })
    }
  }

  /**
   * 🧪 Endpoint para forzar timeout (testing)
   * POST /chat/force-timeout/:userId
   */
  async forceTimeout(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params
      
      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'userId es requerido'
        })
        return
      }

      console.log(`🧪 [CHAT-CONTROLLER] Forzando timeout para ${userId}`)

      const timeoutMessage = await this.chatService.forceTimeout(userId)

      res.json({
        success: true,
        userId,
        timeoutMessage,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('💥 [CHAT-CONTROLLER] Error forzando timeout:', error)
      
      res.status(500).json({
        success: false,
        error: 'Error forzando timeout'
      })
    }
  }

  /**
   * 📊 Endpoint para estadísticas del sistema
   * GET /chat/stats
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = getChatBotStats()
      
      res.json({
        success: true,
        stats,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('💥 [CHAT-CONTROLLER] Error obteniendo estadísticas:', error)
      
      res.status(500).json({
        success: false,
        error: 'Error obteniendo estadísticas'
      })
    }
  }

  /**
   * 🩺 Endpoint de health check
   * GET /chat/health
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const stats = getChatBotStats()
      
      res.json({
        success: true,
        status: 'healthy',
        version: '2.0.0-refactored',
        services: {
          activeUsers: stats.activeUsers || 0,
          servicesLoaded: stats.servicesLoaded || []
        },
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('💥 [CHAT-CONTROLLER] Error en health check:', error)
      
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: 'Servicios no disponibles'
      })
    }
  }

  /**
   * 🔄 Endpoint para reiniciar usuario
   * POST /chat/reset/:userId
   */
  async resetUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params
      const { keepData } = req.body
      
      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'userId es requerido'
        })
        return
      }

      // Resetear usuario usando StateService
      this.services.stateService.resetUser(userId, keepData || false)
      
      console.log(`🔄 [CHAT-CONTROLLER] Usuario ${userId} reseteado`)

      res.json({
        success: true,
        userId,
        message: 'Usuario reseteado exitosamente',
        keepData: keepData || false,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('💥 [CHAT-CONTROLLER] Error reseteando usuario:', error)
      
      res.status(500).json({
        success: false,
        error: 'Error reseteando usuario'
      })
    }
  }

  /**
   * 📋 Endpoint para obtener estado de usuario
   * GET /chat/user-state/:userId
   */
  async getUserState(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params
      
      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'userId es requerido'
        })
        return
      }

      const userState = this.services.stateService.getState(userId)
      
      // Remover datos sensibles como timeouts
      const sanitizedState = {
        flujo_actual: userState.flujo_actual,
        paso_actual: userState.paso_actual,
        datos_prospecto: {
          nombre: userState.datos_prospecto?.nombre,
          email: userState.datos_prospecto?.email,
          edad: userState.datos_prospecto?.edad,
          region: userState.datos_prospecto?.region
        },
        es_usuario_recurrente: userState.es_usuario_recurrente,
        fecha_ultima_interaccion: userState.fecha_ultima_interaccion,
        campos_capturados: userState.campos_capturados
      }

      res.json({
        success: true,
        userId,
        state: sanitizedState,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('💥 [CHAT-CONTROLLER] Error obteniendo estado:', error)
      
      res.status(500).json({
        success: false,
        error: 'Error obteniendo estado de usuario'
      })
    }
  }

  /**
   * 🔍 Endpoint para reconocimiento de usuario (compatibility con Dashboard)
   * @route GET /api/prospectos/reconocimiento/:whatsapp
   */
  public getProspectRecognition = async (req: Request, res: Response): Promise<void> => {
    const { whatsapp } = req.params
    if (!whatsapp) {
      res.status(400).json({ success: false, message: 'WhatsApp número requerido' })
      return
    }

    try {
      const existingUser = await this.services.prospectService.verifyExistingUser(whatsapp)
      
      if (existingUser) {
        res.json({
          success: true,
          found: true,
          prospecto: existingUser,
          message: `Usuario existente encontrado: ${existingUser.nombre}`
        })
      } else {
        res.status(404).json({
          success: false,
          found: false,
          message: 'Usuario no encontrado',
          prospecto: null
        })
      }
    } catch (error) {
      console.error(`❌ [CHAT-CONTROLLER] Error en reconocimiento para ${whatsapp}: ${error}`)
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor',
        details: (error as Error).message 
      })
    }
  }
}
