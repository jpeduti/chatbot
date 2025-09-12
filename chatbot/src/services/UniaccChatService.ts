/**
 * 🎓 UniaccChatService - Servicio Simplificado
 * Orquestador principal usando UniaccFlow
 */

import { UniaccFlow } from '../flows/UniaccFlow'
import { IProspectoActualRepository } from '../repositories/interfaces/IProspectoRepository'
import { ValidationService } from './validation-service'
import { MessageFormatterService } from './message-formatter'
import { ProspectServiceV2 } from './prospect-service-v2'

export class UniaccChatService {
  private uniaccFlow: UniaccFlow
  private prospectoRepo: IProspectoActualRepository
  private validationService: ValidationService
  private messageFormatter: MessageFormatterService
  private prospectService: ProspectServiceV2

  constructor(
    prospectoRepo: IProspectoActualRepository,
    validationService: ValidationService,
    messageFormatter: MessageFormatterService,
    prospectService: ProspectServiceV2
  ) {
    this.prospectoRepo = prospectoRepo
    this.validationService = validationService
    this.messageFormatter = messageFormatter
    this.prospectService = prospectService
    
    // Inicializar el flujo único
    this.uniaccFlow = new UniaccFlow(
      prospectoRepo,
      validationService,
      messageFormatter,
      prospectService
    )
  }

  /**
   * 🚀 Método Principal - Procesa mensajes
   */
  async processMessage(userId: string, message: string): Promise<string> {
    try {
      console.log(`🎓 [UNIACC-CHAT] ${userId}: "${message}"`)
      
      // Delegar al flujo único
      const response = await this.uniaccFlow.processMessage(userId, message)
      
      console.log(`✅ [UNIACC-CHAT] Respuesta para ${userId}:`, response.substring(0, 100) + '...')
      
      return response
      
    } catch (error) {
      console.error(`💥 [UNIACC-CHAT] Error para ${userId}:`, error)
      return 'Lo siento, algo salió mal. Escribe "hola" para empezar de nuevo.'
    }
  }

  /**
   * 🔧 Métodos de Utilidad
   */
  async getStats(): Promise<any> {
    try {
      // Obtener estadísticas básicas
      const totalProspectos = await this.prospectoRepo.count()
      
      return {
        totalProspectos,
        service: 'UniaccChatService',
        version: '1.0.0',
        status: 'active'
      }
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error)
      return { error: 'Error obteniendo estadísticas' }
    }
  }

  /**
   * 🧹 Limpiar sesiones expiradas
   */
  async cleanupExpiredSessions(): Promise<void> {
    // El UniaccFlow maneja su propia limpieza
    console.log('🧹 [UNIACC-CHAT] Limpieza de sesiones expiradas completada')
  }
}
