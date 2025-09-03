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

// 🎪 Import ProspectCapture V2 con FlowContext
import { ProspectCaptureFlow } from '../flows/prospect-capture'
import { AdvisorRequestFlow } from '../flows/advisor-request'
import { MainMenuFlow } from '../flows/main-menu'
import { FlowContextManager } from '../flows/core'
import { ICacheManager } from '../cache/interfaces/ICacheManager'
import { SupabaseIntegration } from '../actions/supabase-integration'
import { PrismaConversacionRepository } from '../repositories/PrismaConversacionRepository'
import { IntentDetectorService } from './intent-detector'

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
  
  // 🎪 ProspectCapture V2 con FlowContext
  private prospectCaptureFlow: ProspectCaptureFlow
  private advisorRequestFlow: AdvisorRequestFlow
  private mainMenuFlow: MainMenuFlow
  private flowContextManager: FlowContextManager
  private supabaseIntegration: SupabaseIntegration
  private conversacionRepo: PrismaConversacionRepository
  private intentDetector: IntentDetectorService

  constructor(
    stateService: StateService,
    prospectService: ProspectService,
    prospectServiceV2: ProspectServiceV2,
    validationService: ValidationService,
    timeoutService: TimeoutService,
    messageFormatter: MessageFormatterService,
    flowHandler: FlowHandler,
    prospectoActualRepo: IProspectoActualRepository,
    prospectoHistorialRepo: IProspectoHistorialRepository,
    cacheManager: ICacheManager | null,
    webhookUrl: string,
    webhookSecret: string
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
    
    // 💬 Inicializar SupabaseIntegration para conversaciones/mensajes
    this.supabaseIntegration = new SupabaseIntegration(webhookUrl, webhookSecret)
    
    // 💬 Inicializar PrismaConversacionRepository para conversaciones/mensajes directas
    this.conversacionRepo = new PrismaConversacionRepository()
    
    // 🎪 Inicializar FlowContext System
    this.flowContextManager = new FlowContextManager(cacheManager, prospectoActualRepo)
    
    // 🔗 Configurar FlowContextManager en TimeoutService para acceso a datos V2
    this.timeoutService.setFlowContextManager(this.flowContextManager)
    this.prospectCaptureFlow = new ProspectCaptureFlow(
      this.flowContextManager,
      this.validationService,
      this.messageFormatter,
      this.prospectServiceV2
    )
    
    // 🎓 Inicializar AdvisorRequestFlow
    this.advisorRequestFlow = new AdvisorRequestFlow(
      this.flowContextManager,
      this.validationService,
      this.messageFormatter,
      this.prospectServiceV2
    )
    
    // 🏠 Inicializar MainMenuFlow
    this.mainMenuFlow = new MainMenuFlow(
      this.flowContextManager,
      this.validationService,
      this.messageFormatter,
      this.prospectServiceV2
    )
    
    // 🎯 Inicializar IntentDetector
    this.intentDetector = new IntentDetectorService()
    
    console.log('🎭 [CHAT-SERVICE-V2] Inicializado con Repository Pattern + FlowContext')
  }

  /**
   * 🔍 Obtener contexto del usuario para detección de intenciones
   */
  private async getUserContext(userId: string): Promise<any> {
    try {
      // Verificar si existe un prospecto en la base de datos
      const prospecto = await this.prospectoActualRepo.findByWhatsapp(userId)
      
      return {
        hasCompletedCapture: !!prospecto,
        nombre: prospecto?.nombre,
        telefono_confirmado: prospecto?.telefono_confirmado,
        ultimo_contacto: prospecto?.ultimo_contacto
      }
    } catch (error) {
      console.warn(`⚠️ [${userId}] Error obteniendo contexto de usuario:`, error)
      return { hasCompletedCapture: false }
    }
  }

  /**
   * 🎯 Método principal para procesar mensajes (mejorado con Repository + FlowContext)
   */
  async processMessage(userId: string, message: string): Promise<string> {
    try {
      const cleanMessage = message.trim()
      console.log(`🤖 [${userId}] Procesando: "${cleanMessage}" con FlowContext V2`)
      console.log(`🔗 [${userId}] TimeoutService configurado con FlowContextManager: ${this.timeoutService.isFlowContextManagerConfigured()}`)

      // ⏰ VERIFICAR MENSAJES PENDIENTES DE TIMEOUT primero
      const pendingWarning = this.timeoutService.getPendingWarningMessage(userId)
      const pendingTimeout = this.timeoutService.getPendingTimeoutMessage(userId)
      
      if (pendingTimeout) {
        console.log(`⏰ [${userId}] Entregando mensaje de timeout pendiente`)
        return pendingTimeout
      }
      
      if (pendingWarning) {
        console.log(`⚠️ [${userId}] Entregando mensaje de warning pendiente`)
        // Continuar con el procesamiento normal después del warning
      }

      // ⏰ CONFIGURAR TIMEOUT para esta sesión (usar V1 por ahora)
      this.timeoutService.setSessionTimeout(userId)

      // 🔍 Verificar si el usuario ya completó captura inicial
      const userContext = await this.getUserContext(userId)
      
      // 🏠 Verificar si hay un context activo de MainMenu
      const activeMainMenuContext = await this.flowContextManager.getActiveContext(userId)
      const isInMainMenu = activeMainMenuContext && activeMainMenuContext.currentFlow === 'main-menu'
      
      // 🎯 DETECTAR INTENCIÓN para elegir flujo
      const intent = this.intentDetector.detectIntent(cleanMessage, userContext)
      console.log(`🎯 [${userId}] Intención detectada:`, intent, `| MainMenu activo: ${isInMainMenu}`)

      // 🎪 Elegir flujo basado en intención Y contexto activo
      let flowResult: any
      
      if (isInMainMenu) {
        // 🏠 Si está en MainMenu, seguir con MainMenu
        flowResult = await this.mainMenuFlow.processMessage(userId, cleanMessage)
      } else if (intent.flow === 'main-menu' && intent.confidence > 0.8) {
        // 🏠 Usar MainMenuFlow  
        flowResult = await this.mainMenuFlow.processMessage(userId, cleanMessage)
      } else if (intent.flow === 'advisor-request' && intent.confidence > 0.8) {
        // 🎓 Usar AdvisorRequestFlow
        flowResult = await this.advisorRequestFlow.processMessage(userId, cleanMessage)
      } else {
        // 🎪 Usar ProspectCaptureFlow por defecto
        flowResult = await this.prospectCaptureFlow.processMessage(userId, cleanMessage)
      }
      
      if (flowResult.success) {
        console.log(`✅ [${userId}] FlowContext procesado exitosamente`)
        
        // 💬 Registrar interacción en conversaciones/mensajes usando Prisma
        try {
          await this.conversacionRepo.registrarInteraccion(userId, cleanMessage, flowResult.message)
          console.log(`💬 [${userId}] Interacción registrada en conversaciones/mensajes`)
        } catch (interactionError) {
          console.warn(`⚠️ [${userId}] Error registrando interacción:`, interactionError)
          // No fallar el flujo por error de registro
        }
        
        // 🔄 Si el flujo está completo, procesar siguiente flujo O limpiar sesión
        if (flowResult.completed) {
          if (flowResult.nextFlow === 'main-menu') {
            console.log(`🎯 [${userId}] Flujo completado, ejecutando MainMenuFlow`)
            try {
              // 🏠 Ejecutar MainMenuFlow automáticamente 
              const mainMenuResult = await this.mainMenuFlow.processMessage(userId, "menu")
              console.log(`🏠 [${userId}] MainMenu activado exitosamente`)
              
              // Registrar interacción del menú
              await this.conversacionRepo.registrarInteraccion(userId, "menu", mainMenuResult.message)
              
              // Devolver mensaje del MainMenu en lugar del mensaje de completion
              return mainMenuResult.message
            } catch (menuError) {
              console.error(`❌ [${userId}] Error activando MainMenu:`, menuError)
              // Fallback al mensaje original
            }
          } else if (flowResult.nextFlow === undefined) {
            // 🔚 Sesión completada sin siguiente flujo (ej: handoff a asesor)
            console.log(`🔚 [${userId}] Sesión completada y finalizada`)
            try {
              // Limpiar contexto activo para permitir nueva sesión
              await this.flowContextManager.deactivateContext(userId)
              console.log(`🧹 [${userId}] Contexto limpiado para nueva sesión`)
            } catch (cleanupError) {
              console.warn(`⚠️ [${userId}] Error limpiando contexto:`, cleanupError)
            }
          }
        }
        
        // ⚠️ Incluir warning si existe
        let finalMessage = flowResult.message
        if (pendingWarning) {
          finalMessage = `⚠️ ${pendingWarning}\n\n${flowResult.message}`
        }
        
        return finalMessage
      } else {
        console.error(`❌ [${userId}] Error en FlowContext:`, flowResult.message)
        return flowResult.message || this.messageFormatter.formatErrorMessage()
      }

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
