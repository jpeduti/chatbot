/**
 * 📏 State Service
 * Manejo centralizado del estado de usuarios
 */

import { UserState, ProspectData, TimeoutMessage } from '../domain/types/user-state'

export class StateService {
  private usuarios: Map<string, UserState> = new Map()
  private mensajesPendientes: Map<string, TimeoutMessage> = new Map()

  /**
   * 🔍 Obtener estado de usuario
   */
  getState(userId: string): UserState {
    if (!this.usuarios.has(userId)) {
      this.usuarios.set(userId, this.createInitialState())
    }
    return this.usuarios.get(userId)!
  }

  /**
   * 💾 Actualizar estado de usuario
   */
  setState(userId: string, updates: Partial<UserState>): void {
    const currentState = this.getState(userId)
    const newState = { ...currentState, ...updates }
    
    // Actualizar fecha de última interacción
    newState.fecha_ultima_interaccion = new Date()
    
    this.usuarios.set(userId, newState)
  }

  /**
   * 🆕 Actualizar solo datos de prospecto
   */
  updateProspectData(userId: string, updates: Partial<ProspectData>): void {
    const currentState = this.getState(userId)
    const updatedProspectData = { ...currentState.datos_prospecto, ...updates }
    
    this.setState(userId, { datos_prospecto: updatedProspectData })
  }

  /**
   * 🗑️ Limpiar estado de usuario
   */
  clearState(userId: string): void {
    // Limpiar timeouts antes de resetear
    this.clearTimeouts(userId)
    this.usuarios.set(userId, this.createInitialState())
  }

  /**
   * 🔄 Resetear usuario manteniendo algunos datos
   */
  resetUser(userId: string, keepProspectData: boolean = false): void {
    const currentState = this.getState(userId)
    const newState = this.createInitialState()
    
    if (keepProspectData) {
      newState.datos_prospecto = currentState.datos_prospecto
      newState.prospecto_id = currentState.prospecto_id
      newState.campos_capturados = currentState.campos_capturados
    }
    
    this.usuarios.set(userId, newState)
  }

  /**
   * ⏰ Gestión de timeouts
   */
  setTimeouts(userId: string, warningTimeout: NodeJS.Timeout, sessionTimeout: NodeJS.Timeout): void {
    this.clearTimeouts(userId)
    const state = this.getState(userId)
    state.warning_timeout_id = warningTimeout
    state.session_timeout_id = sessionTimeout
    state.timeout_warning_sent = false
  }

  clearTimeouts(userId: string): void {
    const state = this.usuarios.get(userId)
    if (state) {
      if (state.warning_timeout_id) {
        clearTimeout(state.warning_timeout_id)
        state.warning_timeout_id = undefined
      }
      if (state.session_timeout_id) {
        clearTimeout(state.session_timeout_id)
        state.session_timeout_id = undefined
      }
    }
  }

  /**
   * 📨 Gestión de mensajes pendientes
   */
  setPendingMessage(userId: string, message: TimeoutMessage): void {
    this.mensajesPendientes.set(userId, message)
  }

  getPendingMessage(userId: string, tipo?: 'warning' | 'timeout'): TimeoutMessage | null {
    const mensaje = this.mensajesPendientes.get(userId)
    if (mensaje && (!tipo || mensaje.tipo === tipo)) {
      this.mensajesPendientes.delete(userId)
      return mensaje
    }
    return null
  }

  /**
   * 🔧 Helpers privados
   */
  private createInitialState(): UserState {
    return {
      flujo_actual: null,
      paso_actual: null,
      datos_prospecto: {},
      intentos_captura: 0,
      fecha_ultima_interaccion: new Date()
    }
  }

  /**
   * 📊 Estadísticas y debugging
   */
  getActiveUsersCount(): number {
    return this.usuarios.size
  }

  getPendingMessagesCount(): number {
    return this.mensajesPendientes.size
  }

  getAllUsers(): string[] {
    return Array.from(this.usuarios.keys())
  }

  cleanup(): void {
    // Limpiar usuarios inactivos (más de 1 hora sin actividad)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    for (const [userId, state] of this.usuarios.entries()) {
      if (state.fecha_ultima_interaccion && state.fecha_ultima_interaccion < oneHourAgo) {
        this.clearTimeouts(userId)
        this.usuarios.delete(userId)
        this.mensajesPendientes.delete(userId)
      }
    }
  }
}

// 🌍 Singleton instance
export const stateService = new StateService()

// 🧹 Cleanup automático cada 30 minutos
setInterval(() => {
  stateService.cleanup()
}, 30 * 60 * 1000)
