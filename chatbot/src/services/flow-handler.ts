/**
 * 🔄 Flow Handler Service
 * Manejo avanzado de flujos de conversación con state machines
 */

import { UserState } from '../domain/types/user-state'
import { ProspectService } from './prospect-service'
import { ValidationService } from './validation-service'
import { MessageFormatterService } from './message-formatter'
import logger from '../utils/enhanced-logger'

export enum FLOW_TYPES {
  WELCOME = 'welcome',
  PROSPECT_CAPTURE = 'prospect_capture',
  PROGRAM_DISCOVERY = 'program_discovery',
  CAREER_EXPLORATION = 'career_exploration',
  ADMISSION_INQUIRY = 'admission_inquiry',
  FINANCIAL_INQUIRY = 'financial_inquiry',
  ADVISOR_CONNECTION = 'advisor_connection',
  SUPPORT = 'support'
}

export enum STEP_TYPES {
  GREETING = 'greeting',
  PHONE_CONFIRMATION = 'phone_confirmation',
  DATA_CAPTURE = 'data_capture',
  MENU_SELECTION = 'menu_selection',
  INFORMATION_DELIVERY = 'information_delivery',
  ADVISOR_REQUEST = 'advisor_request',
  COMPLETION = 'completion'
}

export interface FlowResult {
  success: boolean
  response: string
  nextFlow?: FLOW_TYPES
  nextStep?: STEP_TYPES
  shouldSave?: boolean
  metadata?: { [key: string]: any }
  actions?: FlowAction[]
}

export interface FlowAction {
  type: 'save_data' | 'send_notification' | 'schedule_followup' | 'transfer_advisor'
  payload: any
}

export interface FlowContext {
  userId: string
  message: string
  currentFlow: FLOW_TYPES | null
  currentStep: STEP_TYPES | null
  userState: UserState
  sessionData: { [key: string]: any }
}

export class FlowHandler {
  private prospectService: ProspectService
  private validationService: ValidationService
  private messageFormatter: MessageFormatterService

  constructor(
    prospectService: ProspectService,
    validationService: ValidationService,
    messageFormatter: MessageFormatterService
  ) {
    this.prospectService = prospectService
    this.validationService = validationService
    this.messageFormatter = messageFormatter
    console.log('[FlowHandler] Inicializado con manejo avanzado de flujos')
  }

  /**
   * 🎯 Procesador principal de flujos
   */
  public async processFlow(context: FlowContext): Promise<FlowResult> {
    try {
      console.log(`🔄 [FlowHandler] Procesando flujo: ${context.currentFlow}/${context.currentStep} para ${context.userId}`)

      // Detectar intenciones especiales
      const specialIntent = this.detectSpecialIntent(context.message)
      if (specialIntent) {
        return this.handleSpecialIntent(specialIntent, context)
      }

      // Procesar según el flujo actual
      switch (context.currentFlow) {
        case FLOW_TYPES.WELCOME:
          return this.handleWelcomeFlow(context)
        case FLOW_TYPES.PROSPECT_CAPTURE:
          return this.handleProspectCaptureFlow(context)
        case FLOW_TYPES.PROGRAM_DISCOVERY:
          return this.handleProgramDiscoveryFlow(context)
        case FLOW_TYPES.CAREER_EXPLORATION:
          return this.handleCareerExplorationFlow(context)
        case FLOW_TYPES.ADMISSION_INQUIRY:
          return this.handleAdmissionInquiryFlow(context)
        case FLOW_TYPES.FINANCIAL_INQUIRY:
          return this.handleFinancialInquiryFlow(context)
        case FLOW_TYPES.ADVISOR_CONNECTION:
          return this.handleAdvisorConnectionFlow(context)
        case FLOW_TYPES.SUPPORT:
          return this.handleSupportFlow(context)
        default:
          return this.handleDefaultFlow(context)
      }
    } catch (error) {
      console.error(`💥 [FlowHandler] Error procesando flujo: ${error}`)
      return {
        success: false,
        response: 'Lo siento, ha ocurrido un error. ¿Podrías intentar de nuevo?',
        nextFlow: FLOW_TYPES.WELCOME,
        nextStep: STEP_TYPES.GREETING
      }
    }
  }

  /**
   * 🔍 Detectar intenciones especiales
   */
  private detectSpecialIntent(message: string): string | null {
    const normalizedMessage = message.toLowerCase().trim()
    
    if (this.validationService.isGreeting(message)) {
      return 'greeting'
    }
    
    if (this.validationService.isHelpRequest(message)) {
      return 'help'
    }
    
    if (normalizedMessage.includes('asesor') || normalizedMessage.includes('hablar con alguien')) {
      return 'advisor_request'
    }
    
    if (normalizedMessage.includes('carrera') || normalizedMessage.includes('programa')) {
      return 'career_inquiry'
    }
    
    if (normalizedMessage.includes('precio') || normalizedMessage.includes('costo') || normalizedMessage.includes('beca')) {
      return 'financial_inquiry'
    }
    
    if (normalizedMessage.includes('admisión') || normalizedMessage.includes('matrícula')) {
      return 'admission_inquiry'
    }
    
    return null
  }

  /**
   * ⚡ Manejar intenciones especiales
   */
  private async handleSpecialIntent(intent: string, context: FlowContext): Promise<FlowResult> {
    switch (intent) {
      case 'greeting':
        return {
          success: true,
          response: this.messageFormatter.formatWelcomeMessage(!!context.userState.es_usuario_recurrente, context.userState),
          nextFlow: FLOW_TYPES.WELCOME,
          nextStep: STEP_TYPES.GREETING
        }
      
      case 'help':
        return {
          success: true,
          response: this.generateHelpMessage(),
          nextFlow: context.currentFlow || FLOW_TYPES.WELCOME,
          nextStep: STEP_TYPES.MENU_SELECTION
        }
      
      case 'advisor_request':
        return {
          success: true,
          response: '🙋‍♂️ ¡Perfecto! Te conectaré con uno de nuestros asesores. Primero necesito algunos datos básicos para dirigirte al especialista correcto.',
          nextFlow: FLOW_TYPES.ADVISOR_CONNECTION,
          nextStep: STEP_TYPES.DATA_CAPTURE,
          actions: [{ type: 'save_data', payload: { solicitud_asesor: true } }]
        }
      
      case 'career_inquiry':
        return {
          success: true,
          response: '🎓 ¡Excelente! Te ayudo a explorar nuestras carreras. ¿Tienes alguna área de interés específica o prefieres que te muestre todas las opciones?',
          nextFlow: FLOW_TYPES.CAREER_EXPLORATION,
          nextStep: STEP_TYPES.INFORMATION_DELIVERY
        }
      
      case 'financial_inquiry':
        return {
          success: true,
          response: '💰 Te ayudo con información sobre costos y becas. ¿Te interesa conocer precios, opciones de financiamiento o becas disponibles?',
          nextFlow: FLOW_TYPES.FINANCIAL_INQUIRY,
          nextStep: STEP_TYPES.INFORMATION_DELIVERY
        }
      
      case 'admission_inquiry':
        return {
          success: true,
          response: '📋 Te explico todo sobre el proceso de admisión. ¿Quieres saber sobre requisitos, fechas importantes o el proceso paso a paso?',
          nextFlow: FLOW_TYPES.ADMISSION_INQUIRY,
          nextStep: STEP_TYPES.INFORMATION_DELIVERY
        }
      
      default:
        return this.handleDefaultFlow(context)
    }
  }

  /**
   * 👋 Flujo de bienvenida
   */
  private async handleWelcomeFlow(context: FlowContext): Promise<FlowResult> {
    const existingUser = await this.prospectService.verifyExistingUser(context.userId)
    
    if (existingUser) {
      return {
        success: true,
        response: this.generateReturningUserMenu(existingUser.nombre),
        nextFlow: FLOW_TYPES.WELCOME,
        nextStep: STEP_TYPES.MENU_SELECTION
      }
    } else {
      return {
        success: true,
        response: this.generateNewUserWelcome(),
        nextFlow: FLOW_TYPES.PROSPECT_CAPTURE,
        nextStep: STEP_TYPES.PHONE_CONFIRMATION
      }
    }
  }

  /**
   * 📝 Flujo de captura de prospecto (mejorado)
   */
  private async handleProspectCaptureFlow(context: FlowContext): Promise<FlowResult> {
    // Delegamos la captura al servicio existente, pero con mejoras
    const datos = context.userState.datos_prospecto
    
    switch (context.currentStep) {
      case STEP_TYPES.PHONE_CONFIRMATION:
        if (this.validationService.validateConfirmation(context.message).isValid && this.validationService.validateConfirmation(context.message).sanitizedValue === true) {
          return {
            success: true,
            response: 'Perfecto! Ahora cuéntame, ¿cuál es tu **nombre completo**?',
            nextFlow: FLOW_TYPES.PROSPECT_CAPTURE,
            nextStep: STEP_TYPES.DATA_CAPTURE,
            metadata: { capturing_field: 'nombre' }
          }
        }
        break
        
      case STEP_TYPES.DATA_CAPTURE:
        // Aquí implementaríamos la lógica de captura mejorada
        const currentField = context.sessionData.capturing_field
        return this.processCaptureField(currentField, context.message, context)
        
      default:
        return this.handleDefaultFlow(context)
    }
    
    return this.handleDefaultFlow(context)
  }

  /**
   * 🎓 Flujo de exploración de carreras
   */
  private async handleCareerExplorationFlow(context: FlowContext): Promise<FlowResult> {
    return {
      success: true,
      response: this.generateCareerExplorationResponse(),
      nextFlow: FLOW_TYPES.CAREER_EXPLORATION,
      nextStep: STEP_TYPES.INFORMATION_DELIVERY
    }
  }

  /**
   * 📋 Flujo de consultas de admisión
   */
  private async handleAdmissionInquiryFlow(context: FlowContext): Promise<FlowResult> {
    return {
      success: true,
      response: this.generateAdmissionInfoResponse(),
      nextFlow: FLOW_TYPES.ADMISSION_INQUIRY,
      nextStep: STEP_TYPES.INFORMATION_DELIVERY
    }
  }

  /**
   * 💰 Flujo de consultas financieras
   */
  private async handleFinancialInquiryFlow(context: FlowContext): Promise<FlowResult> {
    return {
      success: true,
      response: this.generateFinancialInfoResponse(),
      nextFlow: FLOW_TYPES.FINANCIAL_INQUIRY,
      nextStep: STEP_TYPES.INFORMATION_DELIVERY
    }
  }

  /**
   * 🙋‍♂️ Flujo de conexión con asesor
   */
  private async handleAdvisorConnectionFlow(context: FlowContext): Promise<FlowResult> {
    return {
      success: true,
      response: '✅ Perfecto! He registrado tu solicitud. Un asesor especializado se contactará contigo en las próximas horas. ¿Hay algo más en lo que pueda ayudarte?',
      nextFlow: FLOW_TYPES.WELCOME,
      nextStep: STEP_TYPES.COMPLETION,
      actions: [
        { type: 'save_data', payload: { estado: 'solicitud_asesor_registrada' } },
        { type: 'send_notification', payload: { tipo: 'nuevo_lead_asesor', userId: context.userId } }
      ]
    }
  }

  /**
   * 🆘 Flujo de soporte
   */
  private async handleSupportFlow(context: FlowContext): Promise<FlowResult> {
    return {
      success: true,
      response: this.generateSupportResponse(),
      nextFlow: FLOW_TYPES.SUPPORT,
      nextStep: STEP_TYPES.INFORMATION_DELIVERY
    }
  }

  /**
   * 🎓 Flujo de descubrimiento de programas
   */
  private async handleProgramDiscoveryFlow(context: FlowContext): Promise<FlowResult> {
    return {
      success: true,
      response: this.generateProgramDiscoveryResponse(),
      nextFlow: FLOW_TYPES.PROGRAM_DISCOVERY,
      nextStep: STEP_TYPES.INFORMATION_DELIVERY
    }
  }

  /**
   * 🔄 Flujo por defecto
   */
  private handleDefaultFlow(context: FlowContext): FlowResult {
    return {
      success: true,
      response: this.generateDefaultResponse(),
      nextFlow: FLOW_TYPES.WELCOME,
      nextStep: STEP_TYPES.MENU_SELECTION
    }
  }

  /**
   * 📝 Procesar campo de captura específico
   */
  private async processCaptureField(field: string, value: string, context: FlowContext): Promise<FlowResult> {
    switch (field) {
      case 'nombre':
        const nameValidation = this.validationService.validateName(value)
        if (nameValidation.isValid) {
          return {
            success: true,
            response: `¡Hola ${nameValidation.sanitizedValue}! 👋\n\nPara enviarte información personalizada, ¿cuál es tu **email**?`,
            nextFlow: FLOW_TYPES.PROSPECT_CAPTURE,
            nextStep: STEP_TYPES.DATA_CAPTURE,
            shouldSave: true,
            metadata: { capturing_field: 'email', captured_data: { nombre: nameValidation.sanitizedValue } }
          }
        } else {
          return {
            success: false,
            response: nameValidation.message || 'Por favor ingresa un nombre válido.',
            nextFlow: FLOW_TYPES.PROSPECT_CAPTURE,
            nextStep: STEP_TYPES.DATA_CAPTURE,
            metadata: { capturing_field: 'nombre' }
          }
        }
      
      case 'email':
        const emailValidation = this.validationService.validateEmail(value)
        if (emailValidation.isValid) {
          return {
            success: true,
            response: `✅ Email: ${emailValidation.sanitizedValue}\n\n🎂 ¿Cuántos **años** tienes?`,
            nextFlow: FLOW_TYPES.PROSPECT_CAPTURE,
            nextStep: STEP_TYPES.DATA_CAPTURE,
            shouldSave: true,
            metadata: { capturing_field: 'edad', captured_data: { email: emailValidation.sanitizedValue } }
          }
        } else {
          return {
            success: false,
            response: emailValidation.message || 'Por favor ingresa un email válido.',
            nextFlow: FLOW_TYPES.PROSPECT_CAPTURE,
            nextStep: STEP_TYPES.DATA_CAPTURE,
            metadata: { capturing_field: 'email' }
          }
        }
      
      // Agregar más campos según sea necesario...
      
      default:
        return this.handleDefaultFlow(context)
    }
  }

  // === GENERADORES DE MENSAJES ===

  private generateHelpMessage(): string {
    return `🆘 **¿En qué puedo ayudarte?**

Estas son las cosas que puedo hacer por ti:

1️⃣ **Información de carreras** - Explorar programas académicos
2️⃣ **Proceso de admisión** - Requisitos y fechas importantes  
3️⃣ **Costos y becas** - Precios y opciones de financiamiento
4️⃣ **Hablar con asesor** - Conectarte con un especialista
5️⃣ **Campus y modalidades** - Presencial, online, híbrido

Simplemente escríbeme lo que necesitas o elige una opción. 😊`
  }

  private generateReturningUserMenu(nombre: string): string {
    return `¡Hola de nuevo, ${nombre}! 👋

¿En qué puedo ayudarte hoy?

1️⃣ Explorar nuevas carreras
2️⃣ Información de admisión  
3️⃣ Costos y becas
4️⃣ Hablar con un asesor
5️⃣ Actualizar mis datos

Escribe el número o dime directamente qué necesitas.`
  }

  private generateNewUserWelcome(): string {
    return `¡Hola! 👋 Soy tu asistente virtual de UNIACC.

Estoy aquí para ayudarte a:
✅ Encontrar la carrera perfecta para ti
✅ Conocer el proceso de admisión
✅ Información sobre becas y financiamiento
✅ Conectarte con nuestros asesores

Para empezar, ¿cuál es tu **nombre completo**?`
  }

  private generateCareerExplorationResponse(): string {
    return `🎓 **Carreras UNIACC**

Tenemos más de 40 programas en estas áreas:

🏗️ **Ingenierías**: Civil, Industrial, Informática
👔 **Negocios**: Administración, Marketing, Finanzas  
🎨 **Diseño**: Gráfico, Digital, Arquitectura
👩‍⚕️ **Salud**: Enfermería, Kinesiología, Nutrición
⚖️ **Humanidades**: Derecho, Psicología, Educación

¿Qué área te interesa más? O escríbeme una carrera específica.`
  }

  private generateAdmissionInfoResponse(): string {
    return `📋 **Proceso de Admisión UNIACC**

**Requisitos básicos:**
✅ Licencia de Enseñanza Media
✅ Prueba de Transición (PDT) o equivalente
✅ Entrevista personal (algunas carreras)

**Fechas importantes 2024:**
📅 Proceso regular: Enero - Marzo
📅 Proceso especial: Abril - Julio  
📅 Proceso tardío: Agosto - Noviembre

**¿Qué te gustaría saber específicamente?**
• Puntajes mínimos por carrera
• Documentos necesarios
• Proceso paso a paso`
  }

  private generateFinancialInfoResponse(): string {
    return `💰 **Costos y Financiamiento UNIACC**

**Opciones de pago:**
💳 Matrícula desde $150.000
💳 Aranceles desde $3.200.000/año
💳 Planes de pago flexibles

**Becas disponibles:**
🏆 Beca Excelencia Académica (hasta 100%)
🎯 Beca Vocación Pedagógica  
💪 Beca Deportiva
🤝 Convenios empresariales

**Financiamiento:**
🏦 Crédito con Aval del Estado (CAE)
🏦 Crédito UNIACC
🏦 Becas internas

¿Te interesa alguna opción específica?`
  }

  private generateSupportResponse(): string {
    return `🆘 **Centro de Ayuda UNIACC**

Estoy aquí para resolver tus dudas sobre:

📚 **Académico**: Carreras, mallas, modalidades
💰 **Financiero**: Aranceles, becas, pagos
📋 **Admisión**: Requisitos, fechos, documentos
🏢 **Campus**: Ubicaciones, horarios, servicios

Si no puedo resolver tu consulta, te conectaré con un especialista.

**¿Cuál es tu consulta específica?**`
  }

  private generateProgramDiscoveryResponse(): string {
    return `🔍 **Descubre tu Programa Ideal**

Te ayudo a encontrar la carrera perfecta según tus intereses:

🧪 **¿Te gusta la ciencia?** → Ingenierías, Salud
💼 **¿Te atrae el mundo empresarial?** → Negocios, Administración
🎨 **¿Eres creativo?** → Diseño, Arquitectura
👥 **¿Te gusta ayudar a otros?** → Psicología, Educación, Salud

**Cuéntame:**
• ¿Qué te gusta hacer en tu tiempo libre?
• ¿En qué eres bueno/a?
• ¿Qué tipo de trabajo te imaginas haciendo?`
  }

  private generateDefaultResponse(): string {
    return `No estoy seguro de entender tu consulta. 🤔

¿Podrías ser más específico? Puedo ayudarte con:

1️⃣ **Carreras y programas**
2️⃣ **Proceso de admisión**  
3️⃣ **Costos y becas**
4️⃣ **Hablar con un asesor**

Escribe el número o dime directamente qué necesitas.`
  }
}
