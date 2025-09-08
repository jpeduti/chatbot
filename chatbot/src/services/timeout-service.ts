/**
 * ⏰ Timeout Service
 * Manejo centralizado de timeouts y sesiones
 */

import { UserState, TimeoutMessage } from '../domain/types/user-state'
import { StateService } from './state-service'
import { ProspectService } from './prospect-service'
import { ProspectServiceV2 } from './prospect-service-v2'

export class TimeoutService {
  private readonly SESSION_TIMEOUT: number
  private readonly WARNING_TIMEOUT: number
  private stateService: StateService
  private prospectService: ProspectService
  private prospectServiceV2: ProspectServiceV2
  // 🎯 Almacenar FlowContextManager para acceder a datos
  private flowContextManager: any

  constructor(
    stateService: StateService,
    prospectService: ProspectService,
    prospectServiceV2: ProspectServiceV2,
    sessionTimeout?: number,
    warningTimeout?: number
  ) {
    this.stateService = stateService
    this.prospectService = prospectService
    this.prospectServiceV2 = prospectServiceV2
    this.flowContextManager = null // Se asignará después
    this.SESSION_TIMEOUT = sessionTimeout || parseInt(process.env.SESSION_TIMEOUT || '20000')
    this.WARNING_TIMEOUT = warningTimeout || parseInt(process.env.WARNING_TIMEOUT || '10000')
    
    console.log(`⏰ [TIMEOUT-SERVICE] Configurado:`)
    console.log(`   SESSION_TIMEOUT: ${this.SESSION_TIMEOUT}ms (${this.SESSION_TIMEOUT/1000}s)`)
    console.log(`   WARNING_TIMEOUT: ${this.WARNING_TIMEOUT}ms (${this.WARNING_TIMEOUT/1000}s)`)
  }

  /**
   * 🔗 Configurar FlowContextManager para acceso a datos V2
   */
  setFlowContextManager(flowContextManager: any): void {
    this.flowContextManager = flowContextManager
    console.log(`🔗 [TIMEOUT-SERVICE] FlowContextManager configurado`)
  }

  /**
   * 🔍 Verificar si FlowContextManager está configurado
   */
  isFlowContextManagerConfigured(): boolean {
    return !!this.flowContextManager
  }

  /**
   * 🔄 Configurar timeout para una sesión
   */
  setSessionTimeout(userId: string): void {
    this.clearTimeouts(userId)
    
    const state = this.stateService.getState(userId)
    state.fecha_ultima_interaccion = new Date()
    state.timeout_warning_sent = false
    
    // Warning timeout
    const warningTimeout = setTimeout(async () => {
      await this.sendWarningMessage(userId)
    }, this.WARNING_TIMEOUT)
    
    // Session timeout - con logs detallados y acceso a FlowContext
    const sessionTimeout = setTimeout(async () => {
      console.log(`🔥 [TIMEOUT-TRIGGER] Iniciando timeout para ${userId}`)
      await this.handleSessionTimeoutWithFlowContext(userId)
    }, this.SESSION_TIMEOUT)
    
    // Guardar referencias en StateService
    this.stateService.setTimeouts(userId, warningTimeout, sessionTimeout)
  }

  /**
   * 🔄 Configurar timeout V2 con FlowContext data
   */
  setSessionTimeoutV2(userId: string, getCapturedDataCallback: () => any): void {
    this.clearTimeouts(userId)
    
    const state = this.stateService.getState(userId)
    state.fecha_ultima_interaccion = new Date()
    state.timeout_warning_sent = false
    
    // Warning timeout
    const warningTimeout = setTimeout(async () => {
      await this.sendWarningMessage(userId)
    }, this.WARNING_TIMEOUT)
    
    // Session timeout V2 - con datos del FlowContext
    const sessionTimeout = setTimeout(async () => {
      const capturedData = getCapturedDataCallback()
      await this.handleSessionTimeoutV2(userId, capturedData)
    }, this.SESSION_TIMEOUT)
    
    // Guardar referencias en StateService
    this.stateService.setTimeouts(userId, warningTimeout, sessionTimeout)
  }

  /**
   * 🧹 Limpiar timeouts existentes
   */
  clearTimeouts(userId: string): void {
    this.stateService.clearTimeouts(userId)
  }

  /**
   * ⚠️ Enviar mensaje de advertencia
   */
  private async sendWarningMessage(userId: string): Promise<string | null> {
    const state = this.stateService.getState(userId)
    
    if (state.timeout_warning_sent) return null // Ya enviado
    
    state.timeout_warning_sent = true
    const warningMessage = this.generateWarningMessage(state)
    
    console.log(`⏰ Warning generado para ${userId}: ${warningMessage}`)
    
    // Guardar mensaje pendiente
    this.stateService.setPendingMessage(userId, {
      tipo: 'warning',
      mensaje: warningMessage,
      timestamp: new Date()
    })
    
    return warningMessage
  }

  /**
   * 🔥 Manejar timeout con acceso completo a FlowContext (con LOGS DETALLADOS)
   */
  async handleSessionTimeoutWithFlowContext(userId: string): Promise<string> {
    console.log(`🔥 [TIMEOUT-FULL] ==========================================`)
    console.log(`🔥 [TIMEOUT-FULL] Procesando timeout para usuario: ${userId}`)
    console.log(`🔥 [TIMEOUT-FULL] ==========================================`)

    let capturedData: any = null
    let flowContextData: any = null

    try {
      // 1. 🔍 Intentar obtener datos del FlowContext V2
      if (this.flowContextManager) {
        console.log(`🔍 [TIMEOUT-FULL] FlowContextManager disponible, obteniendo context...`)
        
        try {
          const activeContext = await this.flowContextManager.getContext(userId)
          if (activeContext) {
            flowContextData = activeContext
            
            console.log(`✅ [TIMEOUT-FULL] FlowContext encontrado:`)
            console.log(`📊 [TIMEOUT-FULL] - currentFlow: ${activeContext.currentFlow}`)
            console.log(`📊 [TIMEOUT-FULL] - currentStep: ${activeContext.currentStep}`)
            console.log(`📊 [TIMEOUT-FULL] - lastMessage: ${activeContext.lastMessage}`)
            console.log(`📊 [TIMEOUT-FULL] - capturedData:`, JSON.stringify(activeContext.capturedData, null, 2))
            
            // 🎯 MANEJAR TIMEOUT ESPECÍFICO DE ADMISSION FLOW
            if (activeContext.currentFlow === 'admission' && activeContext.currentStep === 'contact-decision') {
              console.log(`🎯 [TIMEOUT-ADMISSION] Timeout en AdmissionFlow contact-decision detectado`)
              console.log(`🔄 [TIMEOUT-ADMISSION] Delegando a AdmissionFlow.handleContactDecisionTimeout`)
              
              // Importar y usar el método específico de AdmissionFlow
              const { AdmissionFlow } = await import('../flows/admission/AdmissionFlow')
              const admissionFlow = new AdmissionFlow(this.flowContextManager, this.prospectServiceV2)
              const admissionTimeoutResult = await admissionFlow.handleContactDecisionTimeout(userId)
              
              console.log(`✅ [TIMEOUT-ADMISSION] AdmissionFlow timeout procesado exitosamente`)
              console.log(`📤 [TIMEOUT-ADMISSION] Mensaje específico generado`)
              
              // Limpiar estado y contexto
              this.stateService.clearState(userId)
              await this.flowContextManager.deactivateContext(userId)
              
              return admissionTimeoutResult.message
            }
            
            capturedData = {
              nombre: activeContext.capturedData?.nombre,
              email: activeContext.capturedData?.email,
              telefono: activeContext.capturedData?.telefono || userId,
              telefono_confirmado: activeContext.capturedData?.telefono_confirmado || false,
              edad: activeContext.capturedData?.edad,
              region: activeContext.capturedData?.region,
              // Metadata adicional
              currentStep: activeContext.currentStep,
              currentFlow: activeContext.currentFlow,
              lastMessage: activeContext.lastMessage
            }
            
          } else {
            console.log(`❌ [TIMEOUT-FULL] No se encontró FlowContext activo para ${userId}`)
          }
        } catch (contextError) {
          console.error(`❌ [TIMEOUT-FULL] Error obteniendo FlowContext:`, contextError)
        }
      } else {
        console.log(`⚠️ [TIMEOUT-FULL] FlowContextManager no configurado`)
      }

      // 2. 🔍 Fallback: obtener datos del StateService V1
      const stateV1 = this.stateService.getState(userId)
      console.log(`🔍 [TIMEOUT-FULL] StateService V1 datos:`)
      console.log(`📊 [TIMEOUT-FULL] - flujo_actual: ${stateV1.flujo_actual}`)
      console.log(`📊 [TIMEOUT-FULL] - paso_actual: ${stateV1.paso_actual}`)
      console.log(`📊 [TIMEOUT-FULL] - datos_prospecto:`, JSON.stringify(stateV1.datos_prospecto, null, 2))
      console.log(`📊 [TIMEOUT-FULL] - telefono_confirmado: ${stateV1.telefono_confirmado}`)

      // 3. 💾 Intentar guardar datos si existen
      if (capturedData) {
        console.log(`💾 [TIMEOUT-FULL] Intentando guardar datos del FlowContext...`)
        return await this.handleSessionTimeoutV2(userId, capturedData)
      } else {
        console.log(`💾 [TIMEOUT-FULL] No hay datos del FlowContext, usando StateService V1...`)
        return await this.handleSessionTimeout(userId)
      }

    } catch (error) {
      console.error(`💥 [TIMEOUT-FULL] Error crítico en timeout:`, error)
      return await this.handleSessionTimeout(userId)
    }
  }

  /**
   * ⏰ Manejar timeout de sesión (V2 con FlowContext)
   */
  async handleSessionTimeoutV2(userId: string, capturedData?: any): Promise<string> {
    console.log(`⏰ [V2] Sesión timeout para ${userId}, evaluando datos...`)
    
    let dataSaved = false
    
    if (capturedData) {
      // 🎯 Usar datos del FlowContext V2
      console.log(`🔍 [TIMEOUT-V2-EVAL] Datos del FlowContext:`, {
        nombre: !!capturedData.nombre,
        email: !!capturedData.email,
        telefono: !!capturedData.telefono,
        telefono_confirmado: !!capturedData.telefono_confirmado
      })
      
      const shouldSave = !!(
        capturedData.nombre || 
        capturedData.email || 
        capturedData.telefono ||
        capturedData.telefono_confirmado
      )
      
      if (shouldSave) {
        try {
          const result = await this.prospectServiceV2.saveTimeoutSession(userId, capturedData)
          dataSaved = result.success
          
          if (result.success) {
            console.log(`💾 [TIMEOUT-V2] Datos FlowContext guardados para ${userId}`)
          } else {
            console.log(`❌ [TIMEOUT-V2] Error guardando FlowContext: ${result.message}`)
          }
        } catch (error) {
          console.error(`❌ [TIMEOUT-V2] Error crítico:`, error)
        }
      } else {
        console.log(`🗑️ [TIMEOUT-V2] No hay datos útiles en FlowContext para ${userId}`)
      }
    } else {
      // 🔄 Fallback al método V1
      return await this.handleSessionTimeout(userId)
    }
    
    // Generar mensaje de timeout personalizado
    const timeoutMessage = this.generateTimeoutMessageV2(capturedData, dataSaved)
    
    console.log(`⏰ [V2] Timeout message generado para ${userId}: ${timeoutMessage}`)
    
    // Guardar mensaje pendiente
    this.stateService.setPendingMessage(userId, {
      tipo: 'timeout',
      mensaje: timeoutMessage,
      timestamp: new Date()
    })
    
    // Limpiar sesión
    this.clearTimeouts(userId)
    this.stateService.clearState(userId)
    
    return timeoutMessage
  }

  /**
   * ⏰ Manejar timeout de sesión (V1 legacy)
   */
  private async handleSessionTimeout(userId: string): Promise<string> {
    const state = this.stateService.getState(userId)
    
    console.log(`⏰ Sesión timeout para ${userId}, evaluando datos...`)
    
    // Decidir si guardar datos
    const shouldSave = this.shouldSaveTimeoutData(state)
    let dataSaved = false
    
    if (shouldSave) {
      try {
        // 🎯 USAR PROSPECT SERVICE V2 para mejor integración
        const capturedData = {
          nombre: state.datos_prospecto.nombre,
          email: state.datos_prospecto.email,
          telefono: state.datos_prospecto.telefono || userId,
          telefono_confirmado: state.telefono_confirmado || false,
          edad: state.datos_prospecto.edad,
          region: state.datos_prospecto.region
        }
        
        const result = await this.prospectServiceV2.saveTimeoutSession(userId, capturedData)
        dataSaved = result.success
        
        if (result.success) {
          console.log(`💾 [TIMEOUT-V2] Datos guardados por timeout para ${userId}`)
        } else {
          console.log(`❌ [TIMEOUT-V2] Error guardando datos: ${result.message}`)
        }
      } catch (error) {
        console.error(`❌ [TIMEOUT-V2] Error crítico guardando datos:`, error)
        // Fallback al sistema V1
        await this.prospectService.saveTimeoutSession(userId, state)
        dataSaved = true
        console.log(`💾 [TIMEOUT-V1-FALLBACK] Datos guardados con fallback para ${userId}`)
      }
    } else {
      console.log(`🗑️ No se guardaron datos por timeout para ${userId}`)
    }
    
    // Generar mensaje de timeout personalizado
    const timeoutMessage = this.generateTimeoutMessage(state, dataSaved)
    
    console.log(`⏰ Timeout message generado para ${userId}: ${timeoutMessage}`)
    
    // Guardar mensaje pendiente
    this.stateService.setPendingMessage(userId, {
      tipo: 'timeout',
      mensaje: timeoutMessage,
      timestamp: new Date()
    })
    
    // Limpiar sesión
    this.clearTimeouts(userId)
    this.stateService.clearState(userId)
    
    return timeoutMessage
  }

  /**
   * 📝 Generar mensaje de warning personalizado
   */
  private generateWarningMessage(state: UserState): string {
    const nombre = state.datos_prospecto.nombre
    
    return `⏰ ${nombre ? `${nombre}, ¿` : '¿'}Sigues ahí? 
    
Solo me quedan ${nombre ? 'unos pocos datos' : 'algunas preguntas'} para poder ayudarte mejor.`
  }

  /**
   * 🔚 Generar mensaje de timeout personalizado
   */
  private generateTimeoutMessage(state: UserState, dataSaved: boolean): string {
    const nombre = state.datos_prospecto.nombre
    
    if (dataSaved) {
      return `⏰ ${nombre ? `${nombre}, tu` : 'Tu'} sesión ha finalizado por inactividad.

📋 He guardado tus datos${nombre ? ` (${nombre})` : ''}.
      
🔄 Para continuar, escribe "hola" cuando quieras retomar la conversación.`
    } else {
      return `⏰ Sesión finalizada por inactividad.

🔄 Para obtener información sobre UNIACC, escribe "hola" para comenzar.`
    }
  }

  /**
   * 📝 Generar mensaje de timeout V2 (con FlowContext)
   */
  private generateTimeoutMessageV2(capturedData: any, dataSaved: boolean): string {
    const nombre = capturedData?.nombre || ''
    
    if (dataSaved) {
      return `⏰ Sesión finalizada por inactividad${nombre ? `, ${nombre}` : ''}.\n\n💾 Tus datos han sido guardados exitosamente.\n\n🔄 Para continuar, escribe "hola" para comenzar una nueva conversación.`
    } else {
      return `⏰ Sesión finalizada por inactividad.\n\n🔄 Para obtener información sobre UNIACC, escribe "hola" para comenzar.`
    }
  }

  /**
   * 🔍 Evaluar si guardar datos por timeout
   */
  private shouldSaveTimeoutData(state: UserState): boolean {
    const datos = state.datos_prospecto
    
    // 🎯 NUEVO CRITERIO V2: Guardar si hay CUALQUIER dato capturado
    // Ya no requerimos nombre obligatorio - teléfono confirmado es suficiente
    
    // 🎯 NUEVO: Si ya pidió asesor, NO hacer timeout adicional
    if (state.opcion_menu_seleccionada === 'hablar_asesor' || state.flujo_actual === 'advisor_connection') {
      console.log(`🎯 [TIMEOUT-SKIP] Usuario ya pidió asesor, saltando timeout para preservar solicitud`)
      return false
    }
    
    // 🆕 PROGRESSIVE: Si ya tiene prospecto_id, siempre actualizar
    if (state.prospecto_id) {
      return true
    }
    
    // ✅ V2: Guardar si tiene CUALQUIER dato útil (incluye teléfono confirmado)
    const hasUsefulData = !!(
      datos.nombre || 
      datos.email || 
      datos.edad || 
      datos.region ||
      datos.telefono ||
      state.telefono_confirmado
    )
    
    console.log(`🔍 [TIMEOUT-EVAL] Datos disponibles:`, {
      nombre: !!datos.nombre,
      email: !!datos.email,
      telefono: !!datos.telefono,
      telefono_confirmado: !!state.telefono_confirmado,
      shouldSave: hasUsefulData
    })
    
    return hasUsefulData
  }

  /**
   * 📥 Obtener mensaje de warning pendiente
   */
  async checkForTimeoutWarning(userId: string): Promise<string | null> {
    return this.stateService.getPendingMessage(userId, 'warning')?.mensaje || null
  }

  /**
   * 📥 Obtener mensaje de timeout final pendiente
   */
  async checkForSessionTimeout(userId: string): Promise<string | null> {
    return this.stateService.getPendingMessage(userId, 'timeout')?.mensaje || null
  }

  /**
   * 🧪 Forzar timeout desde interfaz (para testing)
   */
  async forceTimeout(userId: string): Promise<string> {
    console.log(`🧪 [TESTING] Forzando timeout para ${userId}`)
    return await this.handleSessionTimeout(userId)
  }

  /**
   * 📊 Estadísticas de timeouts
   */
  getActiveTimeouts(): number {
    return this.stateService.getActiveUsersCount()
  }

  /**
   * 🔧 Configurar nuevos tiempos de timeout
   */
  updateTimeouts(sessionTimeout: number, warningTimeout: number): void {
    console.log(`🔧 [TIMEOUT-CONFIG] Actualizando timeouts:`)
    console.log(`   SESSION_TIMEOUT: ${sessionTimeout}ms`)
    console.log(`   WARNING_TIMEOUT: ${warningTimeout}ms`)
    
    // Note: Esta configuración solo afectará nuevas sesiones
    // Para aplicar a sesiones existentes, sería necesario reiniciar sus timeouts
  }

  /**
   * 📨 Métodos para ChatServiceV2 (síncronos)
   */
  getPendingWarningMessage(userId: string): string | null {
    const message = this.stateService.getPendingMessage(userId, 'warning')
    return message?.mensaje || null
  }

  getPendingTimeoutMessage(userId: string): string | null {
    const message = this.stateService.getPendingMessage(userId, 'timeout')
    return message?.mensaje || null
  }

  /**
   * 🧹 Limpiar mensajes pendientes para usuarios recurrentes
   */
  clearPendingMessages(userId: string): void {
    console.log(`🧹 [TIMEOUT-SERVICE] Limpiando mensajes pendientes para ${userId}`)
    
    try {
      // Usar el método específico de StateService para limpiar mensajes
      this.stateService.clearPendingMessages(userId)
      console.log(`✅ [TIMEOUT-SERVICE] Mensajes pendientes limpiados exitosamente para ${userId}`)
    } catch (error) {
      console.warn(`⚠️ [TIMEOUT-SERVICE] Error limpiando mensajes pendientes:`, error)
    }
  }
}

// 🌍 No crear singleton aquí - se inyectará via DI
