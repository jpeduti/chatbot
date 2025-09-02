/**
 * 🏭 Service Factory
 * Factory pattern para crear e inyectar dependencias
 */

import { StateService } from './state-service'
import { ProspectService } from './prospect-service'
import { ProspectServiceV2 } from './prospect-service-v2'
import { ValidationService } from './validation-service'
import { TimeoutService } from './timeout-service'
import { MessageFormatterService } from './message-formatter'
import { FlowHandler } from './flow-handler'
import { ChatService } from './chat-service'
import { ChatServiceV2 } from './chat-service-v2'
import { repositoryFactory, RepositoryFactory } from '../repositories/RepositoryFactory'
import { IProspectoActualRepository, IProspectoHistorialRepository } from '../repositories/interfaces/IProspectoRepository'

export class ServiceFactory {
  private static instance: ServiceFactory
  private services: Map<string, any> = new Map()

  private constructor() {}

  /**
   * 🌍 Singleton instance
   */
  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory()
    }
    return ServiceFactory.instance
  }

  /**
   * 🏗️ Crear e inyectar todos los servicios
   */
  createServices(webhookUrl: string, webhookSecret: string): {
    stateService: StateService
    prospectService: ProspectService
    prospectServiceV2: ProspectServiceV2
    validationService: ValidationService
    timeoutService: TimeoutService
    messageFormatter: MessageFormatterService
    flowHandler: FlowHandler
    chatService: ChatService
    chatServiceV2: ChatServiceV2
    repositoryFactory: RepositoryFactory
    prospectoActualRepo: IProspectoActualRepository
    prospectoHistorialRepo: IProspectoHistorialRepository
  } {
    // 1. Crear servicios base (sin dependencias)
    const stateService = this.getOrCreate('stateService', () => new StateService())
    const validationService = this.getOrCreate('validationService', () => new ValidationService())
    const messageFormatter = this.getOrCreate('messageFormatter', () => new MessageFormatterService())
    
    // 1.5. Crear repositorios (capa de datos)
    const prospectoActualRepo = repositoryFactory.getProspectoActualRepository()
    const prospectoHistorialRepo = repositoryFactory.getProspectoHistorialRepository()
    
    console.log('🗄️ [SERVICE-FACTORY] Repositorios Prisma inicializados')
    
    // 2. Crear servicios con dependencias simples
    const prospectService = this.getOrCreate('prospectService', () => 
      new ProspectService(webhookUrl, webhookSecret)
    )
    
    // 2.5. Crear ProspectServiceV2 con repositorios
    const prospectServiceV2 = this.getOrCreate('prospectServiceV2', () =>
      new ProspectServiceV2(prospectoActualRepo, prospectoHistorialRepo)
    )
    
    // 3. Crear servicios con múltiples dependencias
    const timeoutService = this.getOrCreate('timeoutService', () => 
      new TimeoutService(stateService, prospectService)
    )
    
    // 4. Crear FlowHandler (manejo avanzado de flujos)
    const flowHandler = this.getOrCreate('flowHandler', () =>
      new FlowHandler(
        prospectService,
        validationService,
        messageFormatter
      )
    )
    
    // 5. Crear servicio principal (orchestrator)
    const chatService = this.getOrCreate('chatService', () => 
      new ChatService(
        stateService,
        prospectService,
        validationService,
        timeoutService,
        messageFormatter,
        flowHandler
      )
    )
    
    // 5.5. Crear ChatServiceV2 (orchestrator con Repository)
    const chatServiceV2 = this.getOrCreate('chatServiceV2', () =>
      new ChatServiceV2(
        stateService,
        prospectService,
        prospectServiceV2,
        validationService,
        timeoutService,
        messageFormatter,
        flowHandler,
        prospectoActualRepo,
        prospectoHistorialRepo
      )
    )

    console.log('🏭 [SERVICE-FACTORY] Todos los servicios creados exitosamente')

    return {
      stateService,
      prospectService,
      prospectServiceV2,
      validationService,
      timeoutService,
      messageFormatter,
      flowHandler,
      chatService,
      chatServiceV2,
      repositoryFactory,
      prospectoActualRepo,
      prospectoHistorialRepo
    }
  }

  /**
   * 🔧 Obtener o crear servicio (singleton por tipo)
   */
  private getOrCreate<T>(key: string, factory: () => T): T {
    if (!this.services.has(key)) {
      this.services.set(key, factory())
      console.log(`✅ [SERVICE-FACTORY] Creado: ${key}`)
    }
    return this.services.get(key)
  }

  /**
   * 🧹 Limpiar servicios (útil para testing)
   */
  clearServices(): void {
    this.services.clear()
    console.log('🧹 [SERVICE-FACTORY] Servicios limpiados')
  }

  /**
   * 📊 Obtener estadísticas de servicios
   */
  getServiceStats(): { [key: string]: any } {
    const stats: { [key: string]: any } = {}
    
    // StateService stats
    const stateService = this.services.get('stateService') as StateService
    if (stateService) {
      stats.activeUsers = stateService.getActiveUsersCount()
      stats.pendingMessages = stateService.getPendingMessagesCount()
    }
    
    // TimeoutService stats  
    const timeoutService = this.services.get('timeoutService') as TimeoutService
    if (timeoutService) {
      stats.activeTimeouts = timeoutService.getActiveTimeouts()
    }
    
    stats.servicesLoaded = Array.from(this.services.keys())
    
    return stats
  }

  /**
   * 🔄 Reconfigurar servicios (útil para cambios de configuración)
   */
  reconfigureServices(newConfig: { webhookUrl?: string, webhookSecret?: string }): void {
    // Limpiar servicios que dependen de configuración
    this.services.delete('prospectService')
    this.services.delete('timeoutService')
    this.services.delete('chatService')
    
    console.log('🔄 [SERVICE-FACTORY] Servicios reconfigurados')
  }
}

/**
 * 🚀 Helper function para uso simple
 */
export function createChatBotServices(webhookUrl: string, webhookSecret: string) {
  const factory = ServiceFactory.getInstance()
  return factory.createServices(webhookUrl, webhookSecret)
}

/**
 * 📊 Helper function para estadísticas
 */
export function getChatBotStats() {
  const factory = ServiceFactory.getInstance()
  return factory.getServiceStats()
}
