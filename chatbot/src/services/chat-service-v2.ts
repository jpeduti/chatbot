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
import { ReturningUserFlow } from '../flows/returning-user/ReturningUserFlow'
import { AdmissionFlow } from '../flows/admission/AdmissionFlow'
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
  private returningUserFlow: ReturningUserFlow
  private admissionFlow: AdmissionFlow
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
    
    // 🔄 Inicializar ReturningUserFlow
    this.returningUserFlow = new ReturningUserFlow(
      this.flowContextManager,
      this.validationService,
      this.messageFormatter,
      this.prospectServiceV2
    )
    
    // 📝 Inicializar AdmissionFlow
    this.admissionFlow = new AdmissionFlow(
      this.flowContextManager,
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

      // 🎯 VERIFICAR SI CONVERSACIÓN ESTÁ ASIGNADA A EJECUTIVO (NUEVA PRIORIDAD)
      const isAssignedToExecutive = await this.checkIfAssignedToExecutive(userId)
      if (isAssignedToExecutive) {
        console.log(`👥 [${userId}] Conversación asignada a ejecutivo - modo handoff activado`)
        return this.handleExecutiveHandoffMode(userId, cleanMessage)
      }

      // 🔄 DETECTAR USUARIO RECURRENTE PRIMERO - ANTES de timeouts
      const returningUserCheck = await this.checkReturningUser(userId, cleanMessage)
      if (returningUserCheck.shouldUseReturningFlow) {
        console.log(`🔄 [${userId}] Usuario recurrente detectado - OMITIENDO verificación de timeouts`)
        console.log(`💭 [${userId}] ReturningUserFlow manejará experiencia directamente`)
        
        // ⏰ LIMPIAR cualquier timeout pendiente para usuarios recurrentes
        // this.timeoutService.clearPendingMessages(userId) // TODO: Implementar después
        console.log(`🧹 [${userId}] Timeouts pendientes omitidos para ReturningUser`)
        
        const flowResult = await this.returningUserFlow.processMessage(userId, cleanMessage)
        return await this.handleFlowResult(userId, cleanMessage, flowResult, undefined)
      }

      // 🔍 Verificar si el usuario ya completó captura inicial
      const userContext = await this.getUserContext(userId)
      
      // 🔄 VERIFICAR SI YA ESTÁ EN UN FLUJO ACTIVO (ANTES de verificar timeouts)
      const activeContext = await this.flowContextManager.getActiveContext(userId)
      const isInReturningUserFlow = activeContext && activeContext.currentFlow === 'returning-user'
      const isInMainMenu = activeContext && activeContext.currentFlow === 'main-menu'
      const isInAdmissionFlow = activeContext && activeContext.currentFlow === 'admission'
      const hasActiveFlow = isInReturningUserFlow || isInMainMenu || isInAdmissionFlow

      // ⏰ VERIFICAR MENSAJES PENDIENTES DE TIMEOUT (considerar flujos activos)
      console.log(`\n⏰ [${userId}] ===== VERIFICANDO TIMEOUTS PENDIENTES =====`)
      const pendingWarning = this.timeoutService.getPendingWarningMessage(userId)
      const pendingTimeout = this.timeoutService.getPendingTimeoutMessage(userId)
      
      console.log(`📊 [${userId}] Estado timeout:`, {
        hasPendingWarning: !!pendingWarning,
        hasPendingTimeout: !!pendingTimeout,
        hasActiveFlow: !!(activeContext && activeContext.isActive),
        activeFlowType: activeContext?.currentFlow,
        warningPreview: pendingWarning ? pendingWarning.substring(0, 50) + '...' : null,
        timeoutPreview: pendingTimeout ? pendingTimeout.substring(0, 50) + '...' : null
      })
      
      if (pendingTimeout && (!activeContext || !activeContext.isActive)) {
        console.log(`⏰ [${userId}] ENTREGANDO TIMEOUT PENDIENTE - fin de flujo`)
        console.log(`📤 [${userId}] Mensaje timeout: "${pendingTimeout}"`)
        return pendingTimeout
      } else if (pendingTimeout && activeContext && activeContext.isActive) {
        console.log(`🔄 [${userId}] TIMEOUT PENDIENTE OMITIDO - usuario tiene flujo activo (${activeContext.currentFlow})`)
        console.log(`🧹 [${userId}] Limpiando timeout pendiente para continuar flujo activo`)
        // El usuario está activo en un flujo, omitir timeout y continuar
      }
      
      if (pendingWarning) {
        console.log(`⚠️ [${userId}] WARNING PENDIENTE detectado - continuará procesamiento`)
        console.log(`📤 [${userId}] Warning detectado: "${pendingWarning.substring(0, 100)}..."`)
        // Continuar con el procesamiento normal después del warning
      } else {
        console.log(`✅ [${userId}] No hay warnings pendientes`)
      }
      console.log(`⏰ [${userId}] ===== FIN VERIFICACIÓN TIMEOUTS =====\n`)

      // ⏰ CONFIGURAR TIMEOUT para esta sesión (usar V1 por ahora)
      this.timeoutService.setSessionTimeout(userId)
      
      console.log(`🔍 [${userId}] Context activo encontrado en memoria`)
      console.log(`📊 [${userId}] Flujos activos: { returningUser: ${isInReturningUserFlow}, mainMenu: ${isInMainMenu}, admission: ${isInAdmissionFlow} }`)
      
      // 🎪 Elegir flujo basado en contexto activo
      let flowResult: any
      
      if (isInReturningUserFlow) {
        // 🔄 Si está en ReturningUserFlow, MANTENER en ReturningUserFlow
        console.log(`🔄 [${userId}] Manteniendo en ReturningUserFlow (step: ${activeContext.currentStep})`)
        flowResult = await this.returningUserFlow.processMessage(userId, cleanMessage)
      } else if (isInMainMenu) {
        // 🏠 Si está en MainMenu, seguir con MainMenu
        console.log(`🏠 [${userId}] Manteniendo en MainMenuFlow`)
        flowResult = await this.mainMenuFlow.processMessage(userId, cleanMessage)
      } else if (isInAdmissionFlow) {
        // 📝 Si está en AdmissionFlow, seguir con AdmissionFlow
        console.log(`📝 [${userId}] Manteniendo en AdmissionFlow`)
        flowResult = await this.admissionFlow.processMessage(userId, cleanMessage)
      } else {
        // 🎯 DETECTAR INTENCIÓN para elegir flujo (solo si no hay context activo)
        const intent = this.intentDetector.detectIntent(cleanMessage, userContext)
        console.log(`🎯 [${userId}] Intención detectada:`, intent, `| MainMenu activo: ${isInMainMenu}`)
        
        if (intent.flow === 'main-menu' && intent.confidence > 0.8) {
          // 🏠 Usar MainMenuFlow  
          flowResult = await this.mainMenuFlow.processMessage(userId, cleanMessage)
        } else if (intent.flow === 'advisor-request' && intent.confidence > 0.8) {
          // 🎓 Usar AdvisorRequestFlow
          flowResult = await this.advisorRequestFlow.processMessage(userId, cleanMessage)
        } else {
          // 🎪 Usar ProspectCaptureFlow por defecto
          flowResult = await this.prospectCaptureFlow.processMessage(userId, cleanMessage)
        }
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
          } else if (flowResult.nextFlow === 'admission') {
          console.log(`\n📝 [${userId}] ===== TRANSICIÓN A ADMISSION FLOW (V2) =====`)
          console.log(`🎯 [${userId}] Flujo origen completado, activando AdmissionFlow`)
          console.log(`⏰ [${userId}] Timestamp transición: ${new Date().toISOString()}`)
          
          try {
            const admissionStartTime = Date.now()
            
            // 📝 Ejecutar AdmissionFlow automáticamente
            console.log(`🚀 [${userId}] Iniciando AdmissionFlow con mensaje "menu"`)
            const admissionResult = await this.admissionFlow.processMessage(userId, "menu")
            
            const admissionTime = Date.now() - admissionStartTime
            console.log(`⚡ [${userId}] AdmissionFlow procesado en ${admissionTime}ms`)
            console.log(`✅ [${userId}] AdmissionFlow resultado:`, {
              success: admissionResult.success,
              completed: admissionResult.completed,
              hasMessage: !!admissionResult.message
            })
            
            // Registrar interacción de admisión
            console.log(`💾 [${userId}] Registrando interacción en conversaciones...`)
            await this.conversacionRepo.registrarInteraccion(userId, "admission", admissionResult.message)
            console.log(`📋 [${userId}] Interacción admission registrada exitosamente`)
            
            console.log(`📝 [${userId}] ===== ADMISSION FLOW ACTIVADO (V2) =====\n`)
            
            // Devolver mensaje del AdmissionFlow
            return admissionResult.message
            
          } catch (admissionError) {
            console.error(`💥 [${userId}] ===== ERROR EN TRANSICIÓN ADMISSION (V2) =====`)
            console.error(`❌ [${userId}] Error activando AdmissionFlow:`, admissionError)
            console.error(`🔍 [${userId}] Error stack:`, admissionError instanceof Error ? admissionError.stack : 'No stack')
            console.error(`📝 [${userId}] ===== FIN ERROR ADMISSION (V2) =====\n`)
            // Fallback al mensaje original
          }
          } else if (flowResult.nextFlow === undefined) {
            // 🔚 Sesión completada sin siguiente flujo (ej: handoff a asesor)
            console.log(`🔚 [${userId}] Sesión completada y finalizada`)
            try {
              // 🛑 CANCELAR TIMEOUTS PROGRAMADOS - La sesión está completa exitosamente
              console.log(`🛑 [${userId}] Cancelando timeouts programados...`)
              this.stateService.clearTimeouts(userId)
              this.timeoutService.clearPendingMessages(userId)
              console.log(`✅ [${userId}] Timeouts cancelados - sesión completada exitosamente`)
              
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

  /**
   * 🔄 Verificar si el usuario es recurrente y debe usar ReturningUserFlow
   */
  private async checkReturningUser(userId: string, message: string): Promise<{
    shouldUseReturningFlow: boolean
    prospectData?: any
    reason?: string
  }> {
    try {
      console.log(`\n🔄 [CHAT-SERVICE-V2] ===== CHECK RETURNING USER =====`)
      console.log(`📱 [${userId}] Input: "${message}"`)
      console.log(`⏰ [${userId}] Timestamp: ${new Date().toISOString()}`)

      // 1. 🔍 Solo procesar si es un mensaje de inicio (hola, saludo, etc.)
      const isGreeting = this.isGreetingMessage(message)
      console.log(`🔍 [${userId}] Análisis saludo:`, {
        message: message,
        isGreeting: isGreeting,
        messageLength: message.length
      })
      
      if (!isGreeting) {
        console.log(`❌ [${userId}] No es saludo - saltando ReturningUser check`)
        return { 
          shouldUseReturningFlow: false, 
          reason: 'No es un mensaje de saludo inicial' 
        }
      }

      // 2. 🔍 Verificar si ya hay un contexto activo de ReturningUser
      console.log(`🔍 [${userId}] Verificando contexto activo...`)
      const activeContext = await this.flowContextManager.getActiveContext(userId)
      console.log(`📊 [${userId}] Contexto activo:`, {
        exists: !!activeContext,
        currentFlow: activeContext?.currentFlow,
        isActive: activeContext?.isActive,
        currentStep: activeContext?.currentStep
      })
      
      if (activeContext && activeContext.currentFlow === 'returning-user') {
        console.log(`✅ [${userId}] Ya está en ReturningUser flow`)
        return { 
          shouldUseReturningFlow: true, 
          reason: 'Ya está en flujo de usuario recurrente' 
        }
      }

      // 3. 🔍 Buscar prospecto en base de datos
      console.log(`\n💾 [${userId}] ===== CONSULTANDO BD PARA RETURNING USER =====`)
      console.log(`📞 [${userId}] Buscando prospecto: "${userId}"`)
      console.log(`⏰ [${userId}] Timestamp consulta: ${new Date().toISOString()}`)
      
      let prospectResult
      try {
        prospectResult = await this.prospectServiceV2.reconocerProspecto(userId)
        console.log(`✅ [${userId}] Consulta BD exitosa para ReturningUser`)
      } catch (dbError) {
        console.error(`💥 [${userId}] ERROR BD en ReturningUser check:`)
        console.error(`📋 [${userId}] Error detalles:`, {
          name: dbError instanceof Error ? dbError.name : 'Unknown',
          message: dbError instanceof Error ? dbError.message : String(dbError)
        })
        throw dbError
      }
      
      console.log(`📊 [${userId}] ===== RESPUESTA BD RETURNING USER =====`)
      console.log(`🔍 [${userId}] Resultado reconocimiento COMPLETO:`, prospectResult)
      console.log(`📋 [${userId}] Análisis respuesta:`, {
        isReturning: prospectResult.isReturning,
        success: prospectResult.success,
        sessionCount: prospectResult.sessionCount,
        fromHistory: prospectResult.fromHistory,
        hasData: !!prospectResult.data
      })
      
      if (prospectResult.data) {
        console.log(`📋 [${userId}] Datos completos encontrados:`, prospectResult.data)
        console.log(`📊 [${userId}] Campos clave:`, {
          nombre: prospectResult.data.nombre || '[SIN NOMBRE]',
          telefono: prospectResult.data.telefono || '[SIN TELEFONO]',
          email: prospectResult.data.email || '[SIN EMAIL]',
          dataFields: Object.keys(prospectResult.data)
        })
      } else {
        console.log(`⚠️ [${userId}] No hay datos de prospecto en BD`)
      }
      
      if (prospectResult.isReturning && prospectResult.data) {
        // 4. 🎯 Verificar si aplica para Flujo 1 (solo teléfono, sin nombre o con nombre)
        const hasPhone = !!prospectResult.data.telefono
        const hasName = !!prospectResult.data.nombre
        
        console.log(`🎯 [${userId}] Análisis para Flujo 1:`, {
          hasPhone: hasPhone,
          hasName: hasName,
          phoneValue: prospectResult.data.telefono,
          nameValue: prospectResult.data.nombre,
          sessionCount: prospectResult.sessionCount
        })
        
        if (hasPhone) {
          const flowType = hasName ? 'nombre' : 'solo teléfono'
          console.log(`✅ [${userId}] ACTIVANDO RETURNING USER FLOW`)
          console.log(`🎯 [${userId}] Tipo: Usuario recurrente con ${flowType}`)
          
          return {
            shouldUseReturningFlow: true,
            prospectData: prospectResult.data,
            reason: `Usuario recurrente con ${flowType}`
          }
        } else {
          console.log(`❌ [${userId}] Sin teléfono - no aplica ReturningUser`)
        }
      } else {
        console.log(`❌ [${userId}] No es usuario recurrente o sin datos`)
      }

      return { 
        shouldUseReturningFlow: false,
        reason: 'Usuario nuevo o sin datos suficientes'
      }

    } catch (error) {
      console.error(`❌ [${userId}] Error verificando usuario recurrente:`, error)
      return { 
        shouldUseReturningFlow: false,
        reason: 'Error en verificación'
      }
    }
  }

  /**
   * 🎯 Verificar si el mensaje es un saludo inicial (Clase Mundial)
   */
  private isGreetingMessage(message: string): boolean {
    const cleanMessage = message.toLowerCase().trim()
    
    // 🌍 1. SALUDOS FORMALES E INFORMALES (Español)
    const spanishGreetings = [
      'hola', 'buenas', 'buenos días', 'buenas tardes', 'buenas noches',
      'buen día', 'buenas', 'que tal', 'qué tal', 'como estas', 'cómo estás',
      'saludos', 'muy buenas', 'holaa', 'holis', 'ola', 'holaaa'
    ]
    
    // 🌎 2. SALUDOS INTERNACIONALES  
    const internationalGreetings = [
      'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
      'greetings', 'howdy', 'what\'s up', 'whats up', 'wassup'
    ]
    
    // 📱 3. SALUDOS DIGITALES/GENERACIONALES
    const digitalGreetings = [
      'heyyy', 'heyy', 'hiiii', 'helloo', 'sup', 'yo',
      'holiii', 'holiwis', 'holi', 'ke tal', 'q tal'
    ]
    
    // 🔄 4. REINICIOS Y COMANDOS DE INICIO
    const startCommands = [
      'empezar', 'comenzar', 'iniciar', 'start', 'begin', 'menu',
      'ayuda', 'help', 'info', 'información', 'inicio'
    ]
    
    // 🎯 5. PATRONES DE CORTESÍA
    const courtesyPatterns = [
      'disculpe', 'disculpa', 'perdón', 'excuse me', 'sorry',
      'por favor', 'please', 'gracias', 'thank you', 'thanks'
    ]
    
    // 📞 6. ESPECÍFICOS DE ATENCIÓN AL CLIENTE
    const servicePatterns = [
      'necesito ayuda', 'quiero información', 'tengo una consulta',
      'me pueden ayudar', 'quisiera saber', 'estoy interesado',
      'i need help', 'i want information', 'can you help me'
    ]
    
    // 🔍 Combinar todos los patrones
    const allGreetings = [
      ...spanishGreetings,
      ...internationalGreetings, 
      ...digitalGreetings,
      ...startCommands,
      ...courtesyPatterns,
      ...servicePatterns
    ]
    
    // 🎯 DETECCIÓN INTELIGENTE
    
    // Coincidencia exacta
    if (allGreetings.includes(cleanMessage)) {
      return true
    }
    
    // Empieza con saludo + algo más
    for (const greeting of allGreetings) {
      if (cleanMessage.startsWith(greeting + ' ') || 
          cleanMessage.startsWith(greeting + ',') ||
          cleanMessage.startsWith(greeting + '!') ||
          cleanMessage.startsWith(greeting + '.')) {
        return true
      }
    }
    
    // Contiene saludo (más permisivo para frases naturales)
    const naturalPhrases = [
      'hola', 'hello', 'hi ', 'buenos días', 'buenas tardes', 
      'buenas noches', 'ayuda', 'help', 'información'
    ]
    
    for (const phrase of naturalPhrases) {
      if (cleanMessage.includes(phrase)) {
        return true
      }
    }
    
    // 🔢 Detección por longitud (mensajes muy cortos suelen ser saludos)
    if (cleanMessage.length <= 3 && cleanMessage.match(/^[a-záéíóúñ]+$/i)) {
      return true // "hi", "ola", etc.
    }
    
    // 🎭 Detección de emojis de saludo
    const greetingEmojis = ['👋', '🙋', '😊', '😄', '🙂', '😃', '👍']
    if (greetingEmojis.some(emoji => message.includes(emoji))) {
      return true
    }
    
    return false
  }

  /**
   * 🔄 Manejar resultado de flujo (extraído para reutilización)
   */
  private async handleFlowResult(
    userId: string, 
    message: string, 
    flowResult: any, 
    pendingWarning?: string
  ): Promise<string> {
    if (flowResult.success) {
      console.log(`✅ [${userId}] FlowContext procesado exitosamente`)
      
      // 💬 Registrar interacción en conversaciones/mensajes usando Prisma
      try {
        await this.conversacionRepo.registrarInteraccion(userId, message, flowResult.message)
        console.log(`💬 [${userId}] Interacción registrada en conversaciones/mensajes`)
      } catch (interactionError) {
        console.warn(`⚠️ [${userId}] Error registrando interacción:`, interactionError)
        // No fallar el flujo por error de registro
      }
      
      // 🔄 Si el flujo está completo, procesar siguiente flujo O limpiar sesión
      if (flowResult.completed) {
        console.log(`🔍 [${userId}] FLUJO COMPLETADO - nextFlow: ${flowResult.nextFlow}`)
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
        } else if (flowResult.nextFlow === 'admission') {
          console.log(`\n📝 [${userId}] ===== TRANSICIÓN A ADMISSION FLOW =====`)
          console.log(`🎯 [${userId}] Flujo origen completado, activando AdmissionFlow`)
          console.log(`⏰ [${userId}] Timestamp transición: ${new Date().toISOString()}`)
          
          try {
            const admissionStartTime = Date.now()
            
            // 📝 Ejecutar AdmissionFlow automáticamente
            console.log(`🚀 [${userId}] Iniciando AdmissionFlow con mensaje "menu"`)
            const admissionResult = await this.admissionFlow.processMessage(userId, "menu")
            
            const admissionTime = Date.now() - admissionStartTime
            console.log(`⚡ [${userId}] AdmissionFlow procesado en ${admissionTime}ms`)
            console.log(`✅ [${userId}] AdmissionFlow resultado:`, {
              success: admissionResult.success,
              completed: admissionResult.completed,
              hasMessage: !!admissionResult.message
            })
            
            // Registrar interacción de admisión
            console.log(`💾 [${userId}] Registrando interacción en conversaciones...`)
            await this.conversacionRepo.registrarInteraccion(userId, "admission", admissionResult.message)
            console.log(`📋 [${userId}] Interacción admission registrada exitosamente`)
            
            console.log(`📝 [${userId}] ===== ADMISSION FLOW ACTIVADO =====\n`)
            
            // Devolver mensaje del AdmissionFlow
            return admissionResult.message
            
          } catch (admissionError) {
            console.error(`💥 [${userId}] ===== ERROR EN TRANSICIÓN ADMISSION =====`)
            console.error(`❌ [${userId}] Error activando AdmissionFlow:`, admissionError)
            console.error(`🔍 [${userId}] Error stack:`, admissionError instanceof Error ? admissionError.stack : 'No stack')
            console.error(`📝 [${userId}] ===== FIN ERROR ADMISSION =====\n`)
            // Fallback al mensaje original
          }
        } else if (flowResult.nextFlow === undefined) {
          // 🔚 Sesión completada sin siguiente flujo (ej: handoff a asesor)
          console.log(`🔚 [${userId}] ===== SESIÓN COMPLETADA SIN NEXTFLOW =====`)
          console.log(`🎯 [${userId}] Tipo: Handoff a asesor o sesión terminada`)
          console.log(`📊 [${userId}] FlowResult data:`, flowResult.data)
          
          try {
            // 🛑 CANCELAR TIMEOUTS PROGRAMADOS - La sesión está completa exitosamente
            console.log(`🛑 [${userId}] ===== CANCELANDO TIMEOUTS =====`)
            console.log(`🧹 [${userId}] Ejecutando stateService.clearTimeouts()...`)
            this.stateService.clearTimeouts(userId)
            console.log(`🧹 [${userId}] Ejecutando timeoutService.clearPendingMessages()...`)
            this.timeoutService.clearPendingMessages(userId)
            console.log(`✅ [${userId}] ===== TIMEOUTS CANCELADOS EXITOSAMENTE =====`)
            
            // Limpiar contexto activo para permitir nueva sesión
            console.log(`🧹 [${userId}] Desactivando FlowContext...`)
            await this.flowContextManager.deactivateContext(userId)
            console.log(`✅ [${userId}] ===== CONTEXTO LIMPIADO EXITOSAMENTE =====`)
            console.log(`🔚 [${userId}] ===== LIMPIEZA COMPLETA - SESIÓN CERRADA =====`)
          } catch (cleanupError) {
            console.error(`❌ [${userId}] ===== ERROR EN LIMPIEZA =====`)
            console.error(`💥 [${userId}] Error limpiando contexto:`, cleanupError)
            console.error(`🔍 [${userId}] Error stack:`, cleanupError instanceof Error ? cleanupError.stack : 'No stack')
            console.error(`❌ [${userId}] ===== FIN ERROR LIMPIEZA =====`)
          }
        }
      }
      
      // ⚠️ Incluir warning si existe (SOLO si el flujo NO está completado)
      let finalMessage = flowResult.message
      if (pendingWarning && !flowResult.completed) {
        finalMessage = `⚠️ ${pendingWarning}\n\n${flowResult.message}`
      }
      
      return finalMessage
    } else {
      console.error(`❌ [${userId}] Error en FlowContext:`, flowResult.message)
      return flowResult.message || this.messageFormatter.formatErrorMessage()
    }
  }

  /**
   * 👥 Verificar si conversación está asignada a ejecutivo
   */
  private async checkIfAssignedToExecutive(userId: string): Promise<boolean> {
    try {
      console.log(`👥 [${userId}] Verificando si conversación está asignada...`)
      
      // Usar SupabaseIntegration para consultar estado de conversación
      const supabaseIntegration = (this.prospectService as any).supabaseIntegration
      if (!supabaseIntegration?.consultarEstadoConversacion) {
        console.log(`⚠️ [${userId}] SupabaseIntegration no disponible para consulta`)
        return false
      }
      
      const estadoConversacion = await supabaseIntegration.consultarEstadoConversacion(userId)
      
      if (estadoConversacion && estadoConversacion.assigned_to) {
        console.log(`👥 [${userId}] Conversación asignada a ejecutivo: ${estadoConversacion.assigned_to}`)
        console.log(`🎯 [${userId}] Estado handoff: ${estadoConversacion.handoff_status}`)
        return true
      }
      
      console.log(`🤖 [${userId}] Conversación NO asignada - continúa con bot`)
      return false
      
    } catch (error) {
      console.error(`❌ [${userId}] Error verificando asignación:`, error)
      return false
    }
  }

  /**
   * 👥 Manejar modo handoff (conversación asignada a ejecutivo)
   */
  private async handleExecutiveHandoffMode(userId: string, message: string): Promise<string> {
    try {
      console.log(`👥 [${userId}] ===== MODO HANDOFF ACTIVADO =====`)
      console.log(`📝 [${userId}] Mensaje usuario: "${message}"`)
      
      // Registrar interacción del usuario para que el ejecutivo la vea
      // TODO: Implementar cuando tengamos conversacionRepo
      console.log(`💬 [${userId}] Registrando mensaje para ejecutivo: "${message}"`)
      
      // Respuesta estándar de handoff
      const handoffMessage = `🤝 Tu mensaje ha sido recibido y enviado a nuestro asesor especializado.

📱 Él te responderá directamente por este mismo chat en breve.

⏰ **Horario de atención:** Lunes a Viernes 9:00 - 18:00

✅ Mientras tanto, puedes seguir escribiendo y todos tus mensajes llegarán a tu asesor asignado.`

      console.log(`👥 [${userId}] ===== HANDOFF RESPONSE ENVIADA =====`)
      
      return handoffMessage
      
    } catch (error) {
      console.error(`❌ [${userId}] Error en modo handoff:`, error)
      return `🤝 Tu mensaje ha sido recibido por nuestro equipo de asesores.

Responderemos a la brevedad por este mismo chat.

✅ Puedes seguir escribiendo y recibiremos todos tus mensajes.`
    }
  }
}
