/**
 * 🏭 Service Factory Simplificado
 * Factory pattern para crear solo los servicios necesarios
 */

import { ProspectServiceV2 } from './prospect-service-v2'
import { ValidationService } from './validation-service'
import { MessageFormatterService } from './message-formatter'
import { UniaccChatService } from './UniaccChatService'
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
   * 🏗️ Crear servicios simplificados
   */
  createServices(webhookUrl: string, webhookSecret: string): {
    prospectServiceV2: ProspectServiceV2
    validationService: ValidationService
    messageFormatter: MessageFormatterService
    uniaccChatService: UniaccChatService
    repositoryFactory: RepositoryFactory
    prospectoActualRepo: IProspectoActualRepository
    prospectoHistorialRepo: IProspectoHistorialRepository
  } {
    // 1. Crear servicios base (sin dependencias)
    const validationService = this.getOrCreate('validationService', () => new ValidationService())
    const messageFormatter = this.getOrCreate('messageFormatter', () => new MessageFormatterService())
    
    // 2. Crear repositorios (capa de datos)
    const prospectoActualRepo = repositoryFactory.getProspectoActualRepository()
    const prospectoHistorialRepo = repositoryFactory.getProspectoHistorialRepository()
    
    console.log('🗄️ [SERVICE-FACTORY] Repositorios Prisma inicializados')
    
    // 3. Crear ProspectServiceV2 con repositorios
    const prospectServiceV2 = this.getOrCreate('prospectServiceV2', () =>
      new ProspectServiceV2(prospectoActualRepo, prospectoHistorialRepo)
    )
    
    // 4. Crear servicio principal simplificado
    const uniaccChatService = this.getOrCreate('uniaccChatService', () =>
      new UniaccChatService(
        prospectoActualRepo,
        validationService,
        messageFormatter,
        prospectServiceV2
      )
    )

    console.log('🏭 [SERVICE-FACTORY] Servicios simplificados creados exitosamente')

    return {
      prospectServiceV2,
      validationService,
      messageFormatter,
      uniaccChatService,
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
    stats.servicesLoaded = Array.from(this.services.keys())
    return stats
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