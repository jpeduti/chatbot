/**
 * 🎭 Chat Service V2 - Repository Enhanced
 * Versión mejorada del ChatService usando Repository Pattern
 */

import { StateService } from './state-service'
import { ProspectService } from './prospect-service'
import { ProspectServiceV2 } from './prospect-service-v2'
import { ValidationService } from './validation-service'
import { TimeoutService } from './timeout-service'
import { MessageFormatterService } from './message-formatter'
import { FlowHandler, FLOW_TYPES, STEP_TYPES, FlowContext } from './flow-handler'
import { UserState, FlowType, StepType } from '../domain/types/user-state'
import { FlowResult } from '../domain/types/flow'
import { IProspectoActualRepository, IProspectoHistorialRepository } from '../repositories/interfaces/IProspectoRepository'
import { detectPhoneFromUserId, generatePhoneConfirmationMessage } from '../utils/phone-formatter'

export class ChatServiceV2 {
  private stateService: StateService
  private prospectService: ProspectService
  private prospectServiceV2: ProspectServiceV2
  private validationService: ValidationService
  private timeoutService: TimeoutService
  private messageFormatter: MessageFormatterService
  private flowHandler: FlowHandler
  private prospectoActualRepo: IProspectoActualRepository
  private prospectoHistorialRepo: IProspectoHistorialRepository

  constructor(
    stateService: StateService,
    prospectService: ProspectService,
    prospectServiceV2: ProspectServiceV2,
    validationService: ValidationService,
    timeoutService: TimeoutService,
    messageFormatter: MessageFormatterService,
    flowHandler: FlowHandler,
    prospectoActualRepo: IProspectoActualRepository,
    prospectoHistorialRepo: IProspectoHistorialRepository
  ) {
    this.stateService = stateService
    this.prospectService = prospectService
    this.prospectServiceV2 = prospectServiceV2
    this.validationService = validationService
    this.timeoutService = timeoutService
    this.messageFormatter = messageFormatter
    this.flowHandler = flowHandler
    this.prospectoActualRepo = prospectoActualRepo
    this.prospectoHistorialRepo = prospectoHistorialRepo

    console.log('🎭 [CHAT-SERVICE-V2] Inicializado con Repository Pattern')
  }

  /**
   * 🎯 Método principal para procesar mensajes (mejorado con Repository)
   */
  async processMessage(userId: string, message: string): Promise<string> {
    try {
      const state = this.stateService.getState(userId)
      const cleanMessage = message.trim()

      console.log(`🤖 [${userId}] Procesando: "${cleanMessage}" | Estado: ${state.flujo_actual}/${state.paso_actual}`)

      // 1. 🔍 Reconocimiento usando ProspectServiceV2 (PRIMERO)
      const recognition = await this.prospectServiceV2.reconocerProspecto(userId)
      
      // 🔄 Actualizar última interacción solo si el prospecto existe
      if (recognition.success && recognition.data) {
        try {
          await this.prospectoActualRepo.updateLastInteraction(userId)
        } catch (error) {
          console.warn(`⚠️ [${userId}] No se pudo actualizar última interacción (prospecto nuevo)`)
        }
      }
      
      if (!recognition.success) {
        console.error(`❌ [${userId}] Error en reconocimiento:`, recognition.error)
        return this.messageFormatter.formatErrorMessage()
      }

      // 2. 🎯 Procesar con FlowHandler usando contexto mejorado
      const flowContext: FlowContext = {
        userId,
        message: cleanMessage,
        currentStep: (state.paso_actual as STEP_TYPES) || STEP_TYPES.GREETING,
        currentFlow: (state.flujo_actual as FLOW_TYPES) || FLOW_TYPES.WELCOME,
        userState: state,
        sessionData: {
          isReturning: recognition.isReturning || false,
          sessionCount: recognition.sessionCount || 0,
          prospectData: recognition.data || null,
          fromHistory: recognition.fromHistory || false,
          processingTime: Date.now()
        }
      }

      const flowResult = await this.flowHandler.processFlow(flowContext)

      // 3. 💾 Guardar cambios usando Repository si es necesario
      if (flowResult.shouldSave && flowResult.metadata?.prospectData) {
        const saveResult = await this.prospectServiceV2.guardarProspecto(userId, flowResult.metadata.prospectData)
        
        if (saveResult.success) {
          console.log(`💾 [${userId}] Prospecto guardado via Repository`)
        } else {
          console.error(`❌ [${userId}] Error guardando prospecto:`, saveResult.error)
        }
      }

      // 4. 🔄 Actualizar estado si cambió
      if (flowResult.nextFlow || flowResult.nextStep) {
        const newState = { ...state }
        if (flowResult.nextFlow) newState.flujo_actual = flowResult.nextFlow
        if (flowResult.nextStep) newState.paso_actual = flowResult.nextStep
        this.stateService.setState(userId, newState)
      }

      return flowResult.response || this.messageFormatter.formatErrorMessage()

    } catch (error) {
      console.error(`💥 [${userId}] Error crítico en ChatServiceV2:`, error)
      return this.messageFormatter.formatErrorMessage()
    }
  }

  /**
   * 🎯 Método avanzado con análisis de patrones
   */
  async processMessageWithAnalytics(userId: string, message: string): Promise<{
    response: string
    analytics: {
      processingTime: number
      flowType: string
      stepType: string
      cacheHit: boolean
      dbQueries: number
      prospectProfile: string
    }
  }> {
    const startTime = Date.now()
    let dbQueries = 0
    let cacheHit = false

    try {
      console.log(`📊 [${userId}] Procesamiento con analytics iniciado`)

      // 🔍 Reconocimiento con métricas
      const recognition = await this.prospectServiceV2.reconocerProspecto(userId)
      dbQueries++

      if (recognition.fromHistory) {
        cacheHit = true
      }

      // 📈 Obtener perfil del prospecto desde Repository
      const prospecto = await this.prospectoActualRepo.findByWhatsapp(userId)
      if (prospecto) {
        dbQueries++
      }

      // 🎯 Procesar mensaje normal
      const response = await this.processMessage(userId, message)

      const processingTime = Date.now() - startTime

      const analytics = {
        processingTime,
        flowType: this.stateService.getState(userId).flujo_actual || 'unknown',
        stepType: this.stateService.getState(userId).paso_actual || 'unknown',
        cacheHit,
        dbQueries,
        prospectProfile: prospecto?.perfil_usuario || 'new'
      }

      console.log(`📊 [${userId}] Analytics:`, analytics)

      return { response, analytics }

    } catch (error) {
      console.error(`💥 [${userId}] Error en processMessageWithAnalytics:`, error)
      return {
        response: this.messageFormatter.formatErrorMessage(),
        analytics: {
          processingTime: Date.now() - startTime,
          flowType: 'error',
          stepType: 'error',
          cacheHit: false,
          dbQueries,
          prospectProfile: 'error'
        }
      }
    }
  }

  /**
   * 📊 Obtener métricas en tiempo real usando Repository
   */
  async getRealtimeMetrics(): Promise<{
    activeUsers: number
    totalProspects: number
    sessionsToday: number
    cacheHitRate: number
    averageResponseTime: number
    topCarreras: Array<{ carrera: string; count: number }>
    priorityProspects: number
  }> {
    try {
      console.log(`📊 [METRICS] Obteniendo métricas en tiempo real`)

      // 📈 Métricas básicas usando ProspectServiceV2
      const basicMetrics = await this.prospectServiceV2.obtenerMetricas()

      // 🎯 Carreras más populares usando Repository
      const topCarreras = await this.getTopCarreras()

      // ⚡ Métricas de performance (simuladas por ahora)
      const cacheHitRate = 85.5 // TODO: Implementar métricas reales de cache
      const averageResponseTime = 150 // TODO: Implementar métricas reales

      return {
        activeUsers: basicMetrics.prospectos_activos,
        totalProspects: basicMetrics.prospectos_totales,
        sessionsToday: basicMetrics.sesiones_hoy,
        cacheHitRate,
        averageResponseTime,
        topCarreras,
        priorityProspects: basicMetrics.prospectos_prioritarios
      }
    } catch (error) {
      console.error(`❌ [METRICS] Error obteniendo métricas:`, error)
      return {
        activeUsers: 0,
        totalProspects: 0,
        sessionsToday: 0,
        cacheHitRate: 0,
        averageResponseTime: 0,
        topCarreras: [],
        priorityProspects: 0
      }
    }
  }

  /**
   * 🎓 Obtener carreras más populares
   */
  private async getTopCarreras(): Promise<Array<{ carrera: string; count: number }>> {
    try {
      // 🔍 Usar Repository para obtener datos agregados
      const prospectos = await this.prospectoActualRepo.findMany({
        carrera_interes: {
          not: 'Sin especificar'
        }
      })

      // 📊 Agrupar por carrera
      const carreraCount = prospectos.reduce((acc: Record<string, number>, prospecto) => {
        const carrera = prospecto.carrera_interes || 'Sin especificar'
        acc[carrera] = (acc[carrera] || 0) + 1
        return acc
      }, {})

      // 🏆 Top 5 carreras
      return Object.entries(carreraCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([carrera, count]) => ({ carrera, count }))

    } catch (error) {
      console.error(`❌ [METRICS] Error obteniendo top carreras:`, error)
      return []
    }
  }

  /**
   * 🔄 Migrar usuario de servicio legacy a Repository
   */
  async migrateUserToRepository(userId: string): Promise<{
    success: boolean
    message: string
    migratedData?: any
  }> {
    try {
      console.log(`🔄 [${userId}] Iniciando migración a Repository`)

      // 1. 🔍 Obtener datos del servicio legacy (usando método simulado)
      console.log(`🔍 [${userId}] Simulando obtención de datos legacy`)
      const legacyRecognition = { success: false, data: null }

      if (!legacyRecognition.success || !legacyRecognition.data) {
        return {
          success: false,
          message: 'No hay datos legacy para migrar'
        }
      }

      // 2. 💾 Guardar en Repository
      const migrationResult = await this.prospectServiceV2.guardarProspecto(userId, legacyRecognition.data)

      if (migrationResult.success) {
        console.log(`✅ [${userId}] Migración exitosa a Repository`)
        return {
          success: true,
          message: 'Usuario migrado exitosamente',
          migratedData: migrationResult.data
        }
      } else {
        return {
          success: false,
          message: `Error en migración: ${migrationResult.error}`
        }
      }

    } catch (error) {
      console.error(`❌ [${userId}] Error en migración:`, error)
      return {
        success: false,
        message: `Error crítico en migración: ${error instanceof Error ? error.message : 'Unknown'}`
      }
    }
  }

  /**
   * 🧹 Limpiar caches y optimizar rendimiento
   */
  async optimizePerformance(): Promise<{
    cacheCleared: boolean
    expiredSessionsCleared: number
    memoryOptimized: boolean
  }> {
    try {
      console.log(`🧹 [OPTIMIZE] Iniciando optimización de rendimiento`)

      // 1. 🗑️ Limpiar cache del Repository (usando type assertion)
      const repoWithCache = this.prospectoActualRepo as any
      if (repoWithCache.clearExpiredCache) {
        repoWithCache.clearExpiredCache()
      }

      // 2. 🕒 Limpiar sesiones expiradas (simulado)
      const expiredCount = 0 // TODO: Implementar clearExpiredSessions en StateService

      // 3. 🧠 Optimizar memoria (si necesario)
      if (global.gc) {
        global.gc()
      }

      console.log(`✅ [OPTIMIZE] Optimización completada: ${expiredCount} sesiones expiradas eliminadas`)

      return {
        cacheCleared: true,
        expiredSessionsCleared: expiredCount,
        memoryOptimized: !!global.gc
      }

    } catch (error) {
      console.error(`❌ [OPTIMIZE] Error en optimización:`, error)
      return {
        cacheCleared: false,
        expiredSessionsCleared: 0,
        memoryOptimized: false
      }
    }
  }

  /**
   * 📱 Preparar para integración WhatsApp
   */
  async prepareForWhatsApp(userId: string): Promise<{
    ready: boolean
    webhookConfigured: boolean
    prospectMigrated: boolean
    sessionInitialized: boolean
  }> {
    try {
      console.log(`📱 [${userId}] Preparando para WhatsApp`)

      // 1. 🔄 Migrar prospecto si es necesario
      const migration = await this.migrateUserToRepository(userId)

      // 2. 🎯 Inicializar sesión limpia (usando método existente)
      this.stateService.getState(userId) // Esto inicializa si no existe

      // 3. 📞 Configurar webhook (placeholder)
      const webhookConfigured = true // TODO: Implementar configuración real

      return {
        ready: migration.success && webhookConfigured,
        webhookConfigured,
        prospectMigrated: migration.success,
        sessionInitialized: true
      }

    } catch (error) {
      console.error(`❌ [${userId}] Error preparando WhatsApp:`, error)
      return {
        ready: false,
        webhookConfigured: false,
        prospectMigrated: false,
        sessionInitialized: false
      }
    }
  }
}
