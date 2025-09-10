/**
 * 🎯 Chat Service Selector
 * Wrapper para seleccionar entre ChatService y ChatServiceV2
 */

import { ChatService } from './chat-service'
import { ChatServiceV2 } from './chat-service-v2'

export interface ChatServiceInterface {
  processMessage(userId: string, message: string): Promise<string>
}

export class ChatServiceSelector {
  private chatService: ChatService
  private chatServiceV2: ChatServiceV2
  private useV2: boolean

  constructor(chatService: ChatService, chatServiceV2: ChatServiceV2, useV2: boolean = false) {
    this.chatService = chatService
    this.chatServiceV2 = chatServiceV2
    this.useV2 = useV2

    console.log(`🎯 [CHAT-SELECTOR] Configurado para usar: ${useV2 ? 'ChatServiceV2 (Repository)' : 'ChatService (Legacy)'}`)
  }

  /**
   * 🎭 Procesar mensaje usando el servicio seleccionado
   */
  async processMessage(userId: string, message: string): Promise<string> {
    if (this.useV2) {
      return await this.chatServiceV2.processMessage(userId, message)
    } else {
      return await this.chatService.processMessage(userId, message)
    }
  }

  /**
   * 📊 Procesar mensaje con analytics (solo V2)
   */
  async processMessageWithAnalytics(userId: string, message: string): Promise<{
    response: string
    analytics?: any
  }> {
    if (this.useV2) {
      return await this.chatServiceV2.processMessageWithAnalytics(userId, message)
    } else {
      // Fallback para V1
      const response = await this.chatService.processMessage(userId, message)
      return { response }
    }
  }

  /**
   * 📊 Obtener métricas (solo V2)
   */
  async getRealtimeMetrics(): Promise<any> {
    if (this.useV2) {
      return await this.chatServiceV2.getRealtimeMetrics()
    } else {
      return {
        message: 'Métricas solo disponibles en ChatServiceV2',
        available: false
      }
    }
  }

  /**
   * 🔄 Cambiar a ChatServiceV2
   */
  switchToV2(): void {
    this.useV2 = true
    console.log(`🔄 [CHAT-SELECTOR] Cambiado a ChatServiceV2 (Repository)`)
  }

  /**
   * 🔄 Cambiar a ChatService original
   */
  switchToV1(): void {
    this.useV2 = false
    console.log(`🔄 [CHAT-SELECTOR] Cambiado a ChatService (Legacy)`)
  }

  /**
   * ❓ Verificar qué versión está activa
   */
  getActiveVersion(): string {
    return this.useV2 ? 'V2 (Repository)' : 'V1 (Legacy)'
  }

  /**
   * 📱 Preparar para WhatsApp (solo V2)
   */
  async prepareForWhatsApp(userId: string): Promise<any> {
    if (this.useV2) {
      return await this.chatServiceV2.prepareForWhatsApp(userId)
    } else {
      return {
        ready: false,
        message: 'Preparación para WhatsApp solo disponible en ChatServiceV2'
      }
    }
  }

  /**
   * 🧹 Optimizar rendimiento (solo V2)
   */
  async optimizePerformance(): Promise<any> {
    if (this.useV2) {
      return await this.chatServiceV2.optimizePerformance()
    } else {
      return {
        cacheCleared: false,
        message: 'Optimización solo disponible en ChatServiceV2'
      }
    }
  }
}
