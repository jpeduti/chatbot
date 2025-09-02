/**
 * ⏰ Timeout Service
 * Manejo centralizado de timeouts y sesiones
 */

import { UserState, TimeoutMessage } from '../domain/types/user-state'
import { StateService } from './state-service'
import { ProspectService } from './prospect-service'

export class TimeoutService {
  private readonly SESSION_TIMEOUT: number
  private readonly WARNING_TIMEOUT: number
  private stateService: StateService
  private prospectService: ProspectService

  constructor(
    stateService: StateService,
    prospectService: ProspectService,
    sessionTimeout?: number,
    warningTimeout?: number
  ) {
    this.stateService = stateService
    this.prospectService = prospectService
    this.SESSION_TIMEOUT = sessionTimeout || parseInt(process.env.SESSION_TIMEOUT || '20000')
    this.WARNING_TIMEOUT = warningTimeout || parseInt(process.env.WARNING_TIMEOUT || '10000')
    
    console.log(`⏰ [TIMEOUT-SERVICE] Configurado:`)
    console.log(`   SESSION_TIMEOUT: ${this.SESSION_TIMEOUT}ms (${this.SESSION_TIMEOUT/1000}s)`)
    console.log(`   WARNING_TIMEOUT: ${this.WARNING_TIMEOUT}ms (${this.WARNING_TIMEOUT/1000}s)`)
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
    
    // Session timeout
    const sessionTimeout = setTimeout(async () => {
      await this.handleSessionTimeout(userId)
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
   * ⏰ Manejar timeout de sesión
   */
  private async handleSessionTimeout(userId: string): Promise<string> {
    const state = this.stateService.getState(userId)
    
    console.log(`⏰ Sesión timeout para ${userId}, evaluando datos...`)
    
    // Decidir si guardar datos
    const shouldSave = this.shouldSaveTimeoutData(state)
    let dataSaved = false
    
    if (shouldSave) {
      await this.prospectService.saveTimeoutSession(userId, state)
      dataSaved = true
      console.log(`💾 Datos guardados por timeout para ${userId}`)
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
   * 🔍 Evaluar si guardar datos por timeout
   */
  private shouldSaveTimeoutData(state: UserState): boolean {
    const datos = state.datos_prospecto
    
    // No guardar si no hay datos útiles
    if (!datos.nombre) return false
    
    // 🎯 NUEVO: Si ya pidió asesor, NO hacer timeout adicional
    if (state.opcion_menu_seleccionada === 'hablar_asesor' || state.flujo_actual === 'advisor_connection') {
      console.log(`🎯 [TIMEOUT-SKIP] Usuario ya pidió asesor, saltando timeout para preservar solicitud`)
      return false
    }
    
    // 🆕 PROGRESSIVE: Si ya tiene prospecto_id, siempre actualizar
    if (state.prospecto_id) {
      return true
    }
    
    // Guardar si tiene datos útiles
    return !!(datos.email || datos.edad || datos.region)
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
}

// 🌍 No crear singleton aquí - se inyectará via DI
