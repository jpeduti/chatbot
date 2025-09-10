/**
 * 🎭 Chat Service (Main Orchestrator)
 * Servicio principal que coordina toda la lógica del chatbot
 */

import { StateService } from './state-service'
import { ProspectService } from './prospect-service'
import { ValidationService } from './validation-service'
import { TimeoutService } from './timeout-service'
import { MessageFormatterService } from './message-formatter'
import { FlowHandler, FLOW_TYPES, STEP_TYPES, FlowContext } from './flow-handler'
import { UserState, FlowType, StepType } from '../domain/types/user-state'
import { FlowResult } from '../domain/types/flow'
import { detectPhoneFromUserId, generatePhoneConfirmationMessage } from '../utils/phone-formatter'

export class ChatService {
  private stateService: StateService
  private prospectService: ProspectService
  private validationService: ValidationService
  private timeoutService: TimeoutService
  private messageFormatter: MessageFormatterService
  private flowHandler: FlowHandler

  constructor(
    stateService: StateService,
    prospectService: ProspectService,
    validationService: ValidationService,
    timeoutService: TimeoutService,
    messageFormatter: MessageFormatterService,
    flowHandler: FlowHandler
  ) {
    this.stateService = stateService
    this.prospectService = prospectService
    this.validationService = validationService
    this.timeoutService = timeoutService
    this.messageFormatter = messageFormatter
    this.flowHandler = flowHandler
  }

  /**
   * 🎯 Método principal para procesar mensajes
   */
  async processMessage(userId: string, message: string): Promise<string> {
    try {
      const state = this.stateService.getState(userId)
      const cleanMessage = message.trim()

      console.log(`🤖 [${userId}] Procesando: "${cleanMessage}" | Estado: ${state.flujo_actual}/${state.paso_actual}`)

      // Configurar timeout para esta sesión
      this.timeoutService.setSessionTimeout(userId)

      // Si es saludo o inicio, reiniciar
      if (this.validationService.isGreeting(cleanMessage) || !state.flujo_actual) {
        return await this.initializeConversation(userId)
      }

      // Procesar según flujo actual
      return await this.processCurrentFlow(userId, cleanMessage, state)

    } catch (error) {
      console.error(`💥 Error procesando mensaje para ${userId}:`, error)
      return this.messageFormatter.formatErrorMessage('Ha ocurrido un error. Por favor, intenta de nuevo.')
    }
  }

  /**
   * 🔄 Método avanzado con FlowHandler (nueva funcionalidad)
   */
  async processMessageAdvanced(userId: string, message: string): Promise<string> {
    try {
      const state = this.stateService.getState(userId)
      const cleanMessage = message.trim()

      console.log(`🔄 [ADVANCED] ${userId} Procesando: "${cleanMessage}" | Flujo: ${state.flujo_actual}`)

      // Configurar timeout
      this.timeoutService.setSessionTimeout(userId)

      // Crear contexto para FlowHandler
      const context: FlowContext = {
        userId,
        message: cleanMessage,
        currentFlow: state.flujo_actual as FLOW_TYPES | null,
        currentStep: state.paso_actual as STEP_TYPES | null,
        userState: state,
        sessionData: state.datos_prospecto || {}
      }

      // Procesar con FlowHandler avanzado
      const result = await this.flowHandler.processFlow(context)

      // Aplicar acciones si las hay
      if (result.actions) {
        await this.executeFlowActions(result.actions, userId)
      }

      // Actualizar estado si es necesario
      if (result.nextFlow || result.nextStep) {
        this.stateService.setState(userId, {
          flujo_actual: result.nextFlow || state.flujo_actual,
          paso_actual: result.nextStep || state.paso_actual
        })
      }

      // Guardar datos si es necesario
      if (result.shouldSave && result.metadata?.captured_data) {
        const field = result.metadata.capturing_field
        const value = result.metadata.captured_data[field]
        if (field && value) {
          await this.prospectService.saveProgressiveStep(userId, field, value, state)
        }
      }

      return result.response

    } catch (error) {
      console.error(`💥 Error en processMessageAdvanced para ${userId}:`, error)
      return 'Lo siento, ha ocurrido un error. ¿Podrías intentar de nuevo?'
    }
  }

  /**
   * 🚀 Inicializar conversación
   */
  private async initializeConversation(userId: string): Promise<string> {
    // Verificar si es usuario recurrente
    const existingUser = await this.prospectService.verifyExistingUser(userId)
    
    if (existingUser) {
      console.log(`🔍 [RECURRING] Usuario reconocido: ${userId}`)
      return this.showContextualMenu(userId, existingUser)
    } else {
      console.log(`🆕 [NEW] Usuario nuevo: ${userId}`)
      return this.startNewUserFlow(userId)
    }
  }

  /**
   * 🆕 Flujo para usuario nuevo
   */
  private async startNewUserFlow(userId: string): Promise<string> {
    this.stateService.clearState(userId)
    
    // Auto-detectar número de WhatsApp
    const phoneDetection = detectPhoneFromUserId(userId)
    
    if (phoneDetection.isValid) {
      // Flujo con confirmación de teléfono
      this.stateService.setState(userId, {
        flujo_actual: 'captura_inicial',
        paso_actual: 'confirmar_telefono',
        datos_prospecto: {
          telefono_detectado: phoneDetection.formatted,
          whatsapp: phoneDetection.formatted
        }
      })
      
      return generatePhoneConfirmationMessage(phoneDetection.formatted!)
    } else {
      // Flujo tradicional
      this.stateService.setState(userId, {
        flujo_actual: 'captura_inicial',
        paso_actual: 'solicitar_nombre'
      })
      
      return this.messageFormatter.formatWelcomeMessage(false)
    }
  }

  /**
   * 🔄 Procesar flujo actual
   */
  private async processCurrentFlow(userId: string, message: string, state: UserState): Promise<string> {
    switch (state.flujo_actual) {
      case 'captura_inicial':
        return await this.processInitialCapture(userId, message, state)
      
      case 'advisor_connection':
        return await this.processAdvisorConnection(userId, message, state)
      
      case 'menu_principal':
        return await this.processMainMenu(userId, message, state)
      
      default:
        console.log(`⚠️ [FLOW] Flujo no reconocido: ${state.flujo_actual}`)
        return this.messageFormatter.formatErrorMessage('Flujo no reconocido. Escribe "menú" para continuar.')
    }
  }

  /**
   * 📝 Procesar captura inicial
   */
  private async processInitialCapture(userId: string, message: string, state: UserState): Promise<string> {
    switch (state.paso_actual) {
      case 'confirmar_telefono':
        return await this.processPhoneConfirmation(userId, message)
      
      case 'solicitar_nombre':
        return await this.processNameCapture(userId, message)
      
      case 'solicitar_email':
        return await this.processEmailCapture(userId, message)
      
      case 'solicitar_edad':
        return await this.processAgeCapture(userId, message)
      
      case 'solicitar_region':
        return await this.processRegionCapture(userId, message)
      
      default:
        return this.messageFormatter.formatErrorMessage('Paso no reconocido en captura inicial.')
    }
  }

  /**
   * 📱 Procesar confirmación de teléfono
   */
  private async processPhoneConfirmation(userId: string, message: string): Promise<string> {
    const validation = this.validationService.validateConfirmation(message)
    
    if (!validation.isValid) {
      return validation.message!
    }
    
    if (validation.sanitizedValue) {
      // Teléfono confirmado
      this.stateService.setState(userId, {
        paso_actual: 'solicitar_nombre',
        datos_prospecto: {
          ...this.stateService.getState(userId).datos_prospecto,
          telefono_confirmado: true
        }
      })
      
      return this.messageFormatter.formatWelcomeMessage(false)
    } else {
      // Teléfono no confirmado
      this.stateService.setState(userId, {
        paso_actual: 'solicitar_telefono_manual'
      })
      
      return this.messageFormatter.formatPhoneRequest()
    }
  }

  /**
   * 👤 Procesar captura de nombre
   */
  private async processNameCapture(userId: string, message: string): Promise<string> {
    const validation = this.validationService.validateName(message)
    
    if (!validation.isValid) {
      return validation.message!
    }
    
    const nombre = validation.sanitizedValue!
    
    // Actualizar estado
    this.stateService.setState(userId, {
      datos_prospecto: { 
        ...this.stateService.getState(userId).datos_prospecto, 
        nombre 
      },
      paso_actual: 'solicitar_email'
    })
    
    // Progressive Capture
    await this.prospectService.saveProgressiveStep(userId, 'nombre', nombre, this.stateService.getState(userId))
    
    return this.messageFormatter.formatEmailRequest(nombre)
  }

  /**
   * 📧 Procesar captura de email
   */
  private async processEmailCapture(userId: string, message: string): Promise<string> {
    const validation = this.validationService.validateEmail(message)
    
    if (!validation.isValid) {
      return validation.message!
    }
    
    const email = validation.sanitizedValue!
    
    // Actualizar estado
    this.stateService.setState(userId, {
      datos_prospecto: { 
        ...this.stateService.getState(userId).datos_prospecto, 
        email 
      },
      paso_actual: 'solicitar_edad'
    })
    
    // Progressive Capture
    await this.prospectService.saveProgressiveStep(userId, 'email', email, this.stateService.getState(userId))
    
    return this.messageFormatter.formatConfirmationMessage('email', email, 50) + '\n\n' + 
           this.messageFormatter.formatAgeRequest()
  }

  /**
   * 🎂 Procesar captura de edad
   */
  private async processAgeCapture(userId: string, message: string): Promise<string> {
    const validation = this.validationService.validateAge(message)
    
    if (!validation.isValid) {
      return validation.message!
    }
    
    const edad = validation.sanitizedValue!
    const state = this.stateService.getState(userId)
    
    // Determinar siguiente paso
    const hasConfirmedPhone = state.datos_prospecto?.telefono_confirmado === true
    const nextStep = hasConfirmedPhone ? 'solicitar_region' : 'solicitar_telefono'
    
    // Actualizar estado
    this.stateService.setState(userId, {
      datos_prospecto: { 
        ...state.datos_prospecto, 
        edad 
      },
      paso_actual: nextStep
    })
    
    // Progressive Capture
    await this.prospectService.saveProgressiveStep(userId, 'edad', edad, this.stateService.getState(userId))
    
    const confirmMessage = this.messageFormatter.formatConfirmationMessage('edad', `${edad} años`, 75)
    
    if (nextStep === 'solicitar_region') {
      return confirmMessage + '\n\n' + this.messageFormatter.formatRegionRequest()
    } else {
      return confirmMessage + '\n\n' + this.messageFormatter.formatPhoneRequest()
    }
  }

  /**
   * 📍 Procesar captura de región
   */
  private async processRegionCapture(userId: string, message: string): Promise<string> {
    const validation = this.validationService.validateRegion(message)
    
    if (!validation.isValid) {
      return validation.message!
    }
    
    const region = validation.sanitizedValue!
    
    // Actualizar estado
    this.stateService.setState(userId, {
      datos_prospecto: { 
        ...this.stateService.getState(userId).datos_prospecto, 
        region 
      },
      flujo_actual: 'menu_principal',
      paso_actual: null
    })
    
    // Progressive Capture
    await this.prospectService.saveProgressiveStep(userId, 'region', region, this.stateService.getState(userId))
    
    const state = this.stateService.getState(userId)
    return this.messageFormatter.formatCompletionMessage(state.datos_prospecto.nombre!, state.datos_prospecto)
  }

  /**
   * 🎯 Procesar menú principal
   */
  private async processMainMenu(userId: string, message: string, state: UserState): Promise<string> {
    const menuOptions = ['1', '2', '3', '4', '5']
    const validation = this.validationService.validateMenuOption(message, menuOptions)
    
    if (!validation.isValid) {
      return validation.message!
    }
    
    // TODO: Implementar lógica de menú
    return `🚧 Opción ${validation.sanitizedValue} en desarrollo...`
  }

  /**
   * 🎯 Procesar conexión con asesor
   */
  private async processAdvisorConnection(userId: string, message: string, state: UserState): Promise<string> {
    // TODO: Implementar lógica de asesor
    return `🚧 Conexión con asesor en desarrollo...`
  }

  /**
   * 🔄 Mostrar menú contextual para usuarios recurrentes
   */
  private showContextualMenu(userId: string, userData: any): string {
    this.stateService.setState(userId, {
      flujo_actual: 'menu_principal',
      paso_actual: null,
      es_usuario_recurrente: true
    })
    
    return this.messageFormatter.formatWelcomeMessage(true, userData)
  }

  /**
   * ⏰ Métodos de timeout (delegates)
   */
  async checkForTimeoutWarning(userId: string): Promise<string | null> {
    return await this.timeoutService.checkForTimeoutWarning(userId)
  }

  async checkForSessionTimeout(userId: string): Promise<string | null> {
    return await this.timeoutService.checkForSessionTimeout(userId)
  }

  async forceTimeout(userId: string): Promise<string> {
    return await this.timeoutService.forceTimeout(userId)
  }

  /**
   * ⚡ Ejecutar acciones del FlowHandler
   */
  private async executeFlowActions(actions: any[], userId: string): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'save_data':
            // Guardar datos específicos en el estado
            const currentState = this.stateService.getState(userId)
            this.stateService.setState(userId, {
              datos_prospecto: {
                ...currentState.datos_prospecto,
                ...action.payload
              }
            })
            console.log(`✅ [ACTION] Datos guardados para ${userId}:`, action.payload)
            break

          case 'send_notification':
            // Enviar notificación (placeholder para implementación futura)
            console.log(`🔔 [ACTION] Notificación pendiente para ${userId}:`, action.payload)
            // TODO: Implementar sistema de notificaciones
            break

          case 'schedule_followup':
            // Programar seguimiento (placeholder)
            console.log(`📅 [ACTION] Seguimiento programado para ${userId}:`, action.payload)
            // TODO: Implementar sistema de scheduling
            break

          case 'transfer_advisor':
            // Transferir a asesor (placeholder)
            console.log(`👥 [ACTION] Transferencia a asesor para ${userId}:`, action.payload)
            // TODO: Implementar sistema de transferencia
            break

          default:
            console.warn(`⚠️ [ACTION] Tipo de acción desconocido: ${action.type}`)
        }
      } catch (error) {
        console.error(`💥 [ACTION] Error ejecutando acción ${action.type} para ${userId}:`, error)
      }
    }
  }
}
