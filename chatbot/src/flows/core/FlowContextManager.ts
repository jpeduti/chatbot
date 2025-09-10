/**
 * 📊 FlowContextManager - Gestión del Ciclo de Vida de FlowContext
 * 
 * Maneja la persistencia, recuperación, actualización y limpieza de FlowContext.
 * Integra con el sistema de caché y repositories para optimizar rendimiento.
 * 
 * @author UNIACC ChatBot Team
 * @version 2.0 - Repository Enhanced
 */

import { FlowContext, FlowContextSnapshot, ValidationError, FlowMetrics } from './FlowContext'
import { FlowContextBuilder } from './FlowContextBuilder'
import { ICacheManager } from '../../cache/interfaces/ICacheManager'
import { IProspectoActualRepository } from '../../repositories/interfaces/IProspectoRepository'

export class FlowContextManager {
  private readonly CONTEXT_CACHE_PREFIX = 'flow_context:'
  private readonly CONTEXT_TTL = 1800 // 30 minutos
  private readonly activeContexts = new Map<string, FlowContext>()

  constructor(
    private readonly cacheManager: ICacheManager | null,
    private readonly prospectoRepo: IProspectoActualRepository
  ) {
    console.log('📊 [FLOW-CONTEXT-MANAGER] Inicializado con', cacheManager ? 'caché y repository' : 'solo repository')
  }

  // 🔍 Obtener FlowContext Existente
  async getContext(userId: string): Promise<FlowContext | null> {
    try {
      // 1. 🚀 Buscar en memoria (más rápido)
      if (this.activeContexts.has(userId)) {
        const context = this.activeContexts.get(userId)!
        await this.updateLastActivity(context)
        return context
      }

      // 2. 💾 Buscar en caché (solo si está disponible)
      if (this.cacheManager) {
        const cacheKey = this.getCacheKey(userId)
        const cachedContext = await this.cacheManager.get<FlowContext>(cacheKey)
      
        if (cachedContext) {
          console.log(`📊 [${userId}] Context recuperado desde caché`)
          this.activeContexts.set(userId, cachedContext)
          await this.updateLastActivity(cachedContext)
          return cachedContext
        }
      }

      // 3. 🗄️ Buscar en base de datos (último recurso)
      const prospectData = await this.prospectoRepo.findByWhatsapp(userId)
      if (prospectData) {
        console.log(`📊 [${userId}] Reconstruyendo context desde BD`)
        const context = await this.reconstructContextFromDb(userId, prospectData)
        await this.saveContext(context)
        return context
      }

      console.log(`📊 [${userId}] No se encontró context existente`)
      return null

    } catch (error) {
      console.error(`❌ [${userId}] Error obteniendo context:`, error)
      return null
    }
  }

  // 💾 Guardar FlowContext
  async saveContext(context: FlowContext): Promise<void> {
    try {
      // 1. 🚀 Guardar en memoria
      this.activeContexts.set(context.userId, context)
      
      // 2. 💾 Guardar en caché (solo si está disponible)
      if (this.cacheManager) {
        const cacheKey = this.getCacheKey(context.userId)
        await this.cacheManager.set(cacheKey, context, { ttl: this.CONTEXT_TTL })
      }
      
      // 3. 🏷️ Marcar como guardado
      context.needsSave = false
      context.sessionMetadata.lastActivity = new Date()
      
      console.log(`📊 [${context.userId}] Context guardado - Step: ${context.currentStep}`)

    } catch (error) {
      console.error(`❌ [${context.userId}] Error guardando context:`, error)
      context.needsSave = true // Marcar para reintento
      throw error
    }
  }

  // 🔄 Actualizar FlowContext
  async updateContext(userId: string, updates: Partial<FlowContext>): Promise<FlowContext | null> {
    try {
      const context = await this.getContext(userId)
      if (!context) {
        console.warn(`⚠️ [${userId}] No se puede actualizar context inexistente`)
        return null
      }

      // 🔄 Aplicar actualizaciones
      Object.assign(context, updates)
      context.needsSave = true
      context.sessionMetadata.lastActivity = new Date()

      // 💾 Guardar cambios
      await this.saveContext(context)
      
      console.log(`📊 [${userId}] Context actualizado`)
      return context

    } catch (error) {
      console.error(`❌ [${userId}] Error actualizando context:`, error)
      return null
    }
  }

  // ➡️ Avanzar al Siguiente Paso
  async advanceToNextStep(userId: string, stepData?: any): Promise<FlowContext | null> {
    try {
      const context = await this.getContext(userId)
      if (!context) return null

      // 📊 Actualizar métricas del paso anterior
      await this.recordStepCompletion(context)

      // ➡️ Avanzar paso
      context.previousStep = context.currentStep
      context.currentStep = context.nextStep || context.currentStep
      context.nextStep = this.calculateNextStep(context)
      
      // 📈 Actualizar progreso
      context.sessionMetadata.totalSteps++
      context.sessionMetadata.stepStartTime = new Date()
      context.sessionMetadata.attemptsCurrentStep = 0
      context.sessionMetadata.completionPercentage = this.calculateCompletionPercentage(context)

      // 📊 Guardar datos del paso si se proporcionan
      if (stepData) {
        Object.assign(context.capturedData, stepData)
      }

      await this.saveContext(context)
      console.log(`📊 [${userId}] Avanzado a paso: ${context.currentStep}`)
      
      return context

    } catch (error) {
      console.error(`❌ [${userId}] Error avanzando paso:`, error)
      return null
    }
  }

  /**
   * 🔍 Obtener context activo (sin crear uno nuevo)
   */
  async getActiveContext(userId: string): Promise<FlowContext | null> {
    try {
      // Buscar en caché primero
      if (this.cacheManager) {
        const cacheKey = `flow_context:${userId}`
        const cachedContext = await this.cacheManager.get(cacheKey)
        if (cachedContext) {
          console.log(`🔍 [${userId}] Context activo encontrado en caché`)
          return cachedContext as FlowContext
        }
      }

      // Buscar en memoria activa
      const memoryContext = this.activeContexts.get(userId)
      if (memoryContext && memoryContext.isActive) {
        console.log(`🔍 [${userId}] Context activo encontrado en memoria`)
        return memoryContext
      }

      console.log(`🔍 [${userId}] No hay context activo`)
      return null
    } catch (error) {
      console.error(`❌ [${userId}] Error obteniendo context activo:`, error)
      return null
    }
  }

  /**
   * 🔚 Desactivar context (cerrar sesión)
   */
  async deactivateContext(userId: string): Promise<void> {
    try {
      // Remover de memoria activa
      const context = this.activeContexts.get(userId)
      if (context) {
        context.isActive = false
        context.needsSave = false
        this.activeContexts.delete(userId)
        console.log(`🔚 [${userId}] Context removido de memoria activa`)
      }

      // Remover de caché
      if (this.cacheManager) {
        const cacheKey = `flow_context:${userId}`
        await this.cacheManager.delete(cacheKey)
        console.log(`🔚 [${userId}] Context removido de caché`)
      }

      console.log(`🧹 [${userId}] Context desactivado completamente`)
    } catch (error) {
      console.error(`❌ [${userId}] Error desactivando context:`, error)
    }
  }

  // ❌ Registrar Error de Validación
  async recordValidationError(userId: string, error: ValidationError): Promise<void> {
    try {
      const context = await this.getContext(userId)
      if (!context) return

      // ❌ Agregar error
      context.validationErrors.push(error)
      context.sessionMetadata.attemptsCurrentStep++
      context.metrics.errorsCount++

      // 🚨 Verificar límite de intentos
      if (context.sessionMetadata.attemptsCurrentStep >= context.sessionMetadata.maxAttemptsPerStep) {
        context.metadata.maxAttemptsReached = true
        console.warn(`🚨 [${userId}] Máximo de intentos alcanzado en paso: ${context.currentStep}`)
      }

      await this.saveContext(context)

    } catch (error) {
      console.error(`❌ [${userId}] Error registrando validación:`, error)
    }
  }

  // 📊 Actualizar Métricas
  async updateMetrics(userId: string, metricUpdates: Partial<FlowMetrics>): Promise<void> {
    try {
      const context = await this.getContext(userId)
      if (!context) return

      // 📊 Actualizar métricas
      Object.assign(context.metrics, metricUpdates)
      context.metrics.messagesExchanged++

      await this.saveContext(context)

    } catch (error) {
      console.error(`❌ [${userId}] Error actualizando métricas:`, error)
    }
  }

  // 🎯 Completar Flujo
  async completeFlow(userId: string, reason: string = 'completed'): Promise<FlowContext | null> {
    try {
      const context = await this.getContext(userId)
      if (!context) return null

      // 🎯 Marcar como completado
      context.isActive = false
      context.sessionMetadata.completionPercentage = 100
      context.metadata.completionReason = reason
      context.metadata.completedAt = new Date()

      // 📊 Registrar evento de conversión
      context.metrics.conversionEvents.push(`flow_completed:${reason}`)

      await this.saveContext(context)
      console.log(`🎯 [${userId}] Flujo completado: ${reason}`)

      return context

    } catch (error) {
      console.error(`❌ [${userId}] Error completando flujo:`, error)
      return null
    }
  }

  // 🗑️ Limpiar Context
  async cleanupContext(userId: string): Promise<void> {
    try {
      // 🗑️ Remover de memoria
      this.activeContexts.delete(userId)
      
      // 🗑️ Remover de caché (solo si está disponible)
      if (this.cacheManager) {
        const cacheKey = this.getCacheKey(userId)
        await this.cacheManager.delete(cacheKey)
      }
      
      console.log(`🗑️ [${userId}] Context limpiado`)

    } catch (error) {
      console.error(`❌ [${userId}] Error limpiando context:`, error)
    }
  }

  // 📸 Crear Snapshot para Debugging
  async createSnapshot(userId: string): Promise<FlowContextSnapshot | null> {
    try {
      const context = await this.getContext(userId)
      if (!context) return null

      const snapshot: FlowContextSnapshot = {
        context: { ...context },
        timestamp: new Date(),
        version: context.version,
        checksum: this.calculateChecksum(context)
      }

      return snapshot

    } catch (error) {
      console.error(`❌ [${userId}] Error creando snapshot:`, error)
      return null
    }
  }

  // 🧹 Limpieza Automática de Contexts Expirados
  async cleanupExpiredContexts(): Promise<number> {
    let cleanedCount = 0
    const now = Date.now()
    const maxInactiveTime = 3600000 // 1 hora

    try {
      Array.from(this.activeContexts.entries()).forEach(([userId, context]) => {
        const lastActivity = context.sessionMetadata.lastActivity.getTime()
        const inactiveTime = now - lastActivity

        if (inactiveTime > maxInactiveTime || !context.isActive) {
          this.cleanupContext(userId)
          cleanedCount++
        }
      })

      if (cleanedCount > 0) {
        console.log(`🧹 Limpieza automática: ${cleanedCount} contexts eliminados`)
      }

    } catch (error) {
      console.error('❌ Error en limpieza automática:', error)
    }

    return cleanedCount
  }

  // 🔍 MÉTODOS PRIVADOS

  private getCacheKey(userId: string): string {
    return `${this.CONTEXT_CACHE_PREFIX}${userId}`
  }

  private async updateLastActivity(context: FlowContext): Promise<void> {
    context.sessionMetadata.lastActivity = new Date()
    context.needsSave = true
  }

  private async recordStepCompletion(context: FlowContext): Promise<void> {
    const stepDuration = Date.now() - context.sessionMetadata.stepStartTime.getTime()
    context.metrics.stepDurations[context.currentStep] = stepDuration
    context.metrics.conversionEvents.push(`step_completed:${context.currentStep}`)
  }

  private calculateNextStep(context: FlowContext): string | undefined {
    // 🎯 Usar FlowContextBuilder para determinar siguiente paso
    return new FlowContextBuilder(context.userId)
      .fromConfig({
        userId: context.userId,
        flow: context.currentFlow as any,
        step: context.currentStep
      })
      .build().nextStep
  }

  private calculateCompletionPercentage(context: FlowContext): number {
    const { totalSteps, expectedSteps } = context.sessionMetadata
    return Math.min(100, Math.round((totalSteps / expectedSteps) * 100))
  }

  private calculateChecksum(context: FlowContext): string {
    const data = JSON.stringify({
      userId: context.userId,
      currentStep: context.currentStep,
      capturedData: context.capturedData,
      timestamp: context.sessionMetadata.lastActivity
    })
    
    // Simple hash para debugging
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convertir a 32-bit integer
    }
    
    return hash.toString(16)
  }

  private async reconstructContextFromDb(userId: string, prospectData: any): Promise<FlowContext> {
    // 🏗️ Reconstruir context desde datos de BD
    const builder = new FlowContextBuilder(userId)
      .withFlow('prospect-capture' as any)
      .withExistingData({
        nombre: prospectData.nombre,
        email: prospectData.email,
        telefono: prospectData.telefono,
        edad: prospectData.edad,
        region: prospectData.region,
        telefono_confirmado: prospectData.telefono_confirmado,
        preferencia_contacto: prospectData.preferencia_contacto
      })

    // 🔄 Determinar paso actual basado en datos existentes
    const currentStep = this.determineCurrentStepFromData(prospectData)
    if (currentStep) {
      builder.withFlow('prospect-capture' as any, currentStep)
    }

    return builder.build()
  }

  private determineCurrentStepFromData(prospectData: any): string | undefined {
    // 🎯 Lógica para determinar dónde continuó el usuario
    if (!prospectData.nombre) return 'name-capture'
    if (!prospectData.email) return 'email-capture'
    if (!prospectData.edad) return 'age-capture'
    if (!prospectData.region) return 'region-capture'
    return 'completion'
  }

  // 📊 Estadísticas del Manager
  getStats() {
    return {
      activeContexts: this.activeContexts.size,
      memoryUsage: process.memoryUsage(),
      cacheStats: 'Ver cacheManager.getStats()'
    }
  }
}

export default FlowContextManager
