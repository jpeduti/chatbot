/**
 * 🎓 UniaccFlow - Arquitectura Simplificada para WhatsApp
 * Un solo flujo que maneja todo, siguiendo mejores prácticas mundiales
 */

import { IProspectoActualRepository } from '../repositories/interfaces/IProspectoRepository'
import { ValidationService } from '../services/validation-service'
import { MessageFormatterService } from '../services/message-formatter'
import { ProspectServiceV2 } from '../services/prospect-service-v2'

// 🎯 Estado Simplificado
interface SimpleState {
  userId: string
  step: 'greeting' | 'capture' | 'menu' | 'action'
  userData: {
    nombre?: string
    email?: string
    telefono?: string
    edad?: number
    region?: string
    carrera_interes?: string
  }
  needsData: string[]
  currentAction?: string
  lastInteraction: Date
}

// 🎯 Resultado del Flujo
interface FlowResponse {
  message: string
  completed: boolean
  shouldSave?: boolean
  nextStep?: string
}

export class UniaccFlow {
  private prospectoRepo: IProspectoActualRepository
  private validationService: ValidationService
  private messageFormatter: MessageFormatterService
  private prospectService: ProspectServiceV2
  
  // 🗄️ Estado en memoria (simple)
  private userStates = new Map<string, SimpleState>()

  constructor(
    prospectoRepo: IProspectoActualRepository,
    validationService: ValidationService,
    messageFormatter: MessageFormatterService,
    prospectService: ProspectServiceV2
  ) {
    this.prospectoRepo = prospectoRepo
    this.validationService = validationService
    this.messageFormatter = messageFormatter
    this.prospectService = prospectService
  }

  /**
   * 🚀 Método Principal - Procesa cualquier mensaje
   */
  async processMessage(userId: string, message: string): Promise<string> {
    try {
      console.log(`🎓 [UNIACC-FLOW] ${userId}: "${message}"`)
      
      // 1. Obtener o crear estado
      const state = this.getOrCreateState(userId)
      
      // 2. Actualizar última interacción
      state.lastInteraction = new Date()
      
      // 3. Procesar según paso actual
      let response: FlowResponse
      
      switch (state.step) {
        case 'greeting':
          response = await this.handleGreeting(userId, message, state)
          break
        case 'capture':
          response = await this.handleDataCapture(userId, message, state)
          break
        case 'menu':
          response = await this.handleMenu(userId, message, state)
          break
        case 'action':
          response = await this.handleAction(userId, message, state)
          break
        default:
          response = { message: 'Error interno. Escribe "hola" para empezar.', completed: false }
      }
      
      // 4. Actualizar estado si es necesario
      if (response.nextStep) {
        state.step = response.nextStep as any
      }
      
      // 5. Guardar datos si es necesario
      if (response.shouldSave) {
        await this.saveUserData(userId, state)
      }
      
      // 6. Limpiar si se completó
      if (response.completed) {
        this.cleanupState(userId)
      }
      
      return response.message
      
    } catch (error) {
      console.error(`💥 [UNIACC-FLOW] Error para ${userId}:`, error)
      return 'Lo siento, algo salió mal. Escribe "hola" para empezar de nuevo.'
    }
  }

  /**
   * 👋 Manejo de Saludos - Detecta usuario nuevo vs recurrente
   */
  private async handleGreeting(userId: string, message: string, state: SimpleState): Promise<FlowResponse> {
    const isGreeting = this.isGreetingMessage(message)
    
    if (!isGreeting) {
      return {
        message: '¡Hola! 👋 Para empezar, escribe "hola" o "inicio".',
        completed: false
      }
    }

    // Verificar si es usuario recurrente
    const existingUser = await this.prospectoRepo.findByWhatsapp(userId)
    
    if (existingUser && existingUser.nombre && !this.isTechnicalName(existingUser.nombre)) {
      // Usuario conocido - ir directo al menú
      state.step = 'menu'
      return {
        message: `¡Hola ${existingUser.nombre}! 👋 Me alegra verte de nuevo.\n\n${this.getMainMenu()}`,
        completed: false,
        nextStep: 'menu'
      }
    } else {
      // Usuario nuevo o con datos técnicos
      state.step = 'capture'
      state.needsData = ['telefono', 'nombre', 'email', 'edad', 'region']
      
      const phoneNumber = this.extractPhoneFromUserId(userId)
      const phoneMessage = `¡Hola! 👋 Detectamos que escribes desde ${phoneNumber}.\n\n¿Es correcto tu número? Responde:\n1️⃣ Sí, es correcto\n2️⃣ No, quiero cambiarlo`
      
      return {
        message: phoneMessage,
        completed: false,
        nextStep: 'capture'
      }
    }
  }

  /**
   * 📝 Captura de Datos - Un solo flujo para todo
   */
  private async handleDataCapture(userId: string, message: string, state: SimpleState): Promise<FlowResponse> {
    const nextField = state.needsData[0]
    
    if (!nextField) {
      // Completado - ir al menú
      state.step = 'menu'
      return {
        message: `🎉 ¡Perfecto! Tu información ha sido registrada.\n\n${this.getMainMenu()}`,
        completed: false,
        nextStep: 'menu',
        shouldSave: true
      }
    }

    switch (nextField) {
      case 'telefono':
        return this.handlePhoneCapture(message, state)
      
      case 'nombre':
        return this.handleNameCapture(message, state)
      
      case 'email':
        return this.handleEmailCapture(message, state)
      
      case 'edad':
        return this.handleAgeCapture(message, state)
      
      case 'region':
        return this.handleRegionCapture(message, state)
      
      default:
        return {
          message: 'Error en captura. Escribe "hola" para empezar.',
          completed: false
        }
    }
  }

  /**
   * 📱 Captura de Teléfono
   */
  private handlePhoneCapture(message: string, state: SimpleState): FlowResponse {
    const cleanMessage = message.trim().toLowerCase()
    
    if (cleanMessage === '1' || cleanMessage.includes('sí') || cleanMessage.includes('si')) {
      // Confirmar teléfono y pasar al siguiente
      state.userData.telefono = this.extractPhoneFromUserId(state.userId)
      state.needsData.shift() // Remover 'telefono'
      return {
        message: '✅ Teléfono confirmado. ¿Cuál es tu nombre completo?',
        completed: false
      }
    } else if (cleanMessage === '2' || cleanMessage.includes('no')) {
      return {
        message: '📱 Por favor ingresa tu número de teléfono:\n\nFormato: +56912345678',
        completed: false
      }
    } else if (this.isValidPhone(message)) {
      // Teléfono válido ingresado manualmente
      state.userData.telefono = message
      state.needsData.shift()
      return {
        message: '✅ Teléfono registrado. ¿Cuál es tu nombre completo?',
        completed: false
      }
    } else {
      return {
        message: '❌ Número no válido. Por favor ingresa un número válido:\n\nFormato: +56912345678',
        completed: false
      }
    }
  }

  /**
   * 👤 Captura de Nombre
   */
  private handleNameCapture(message: string, state: SimpleState): FlowResponse {
    if (this.isValidName(message)) {
      state.userData.nombre = message
      state.needsData.shift()
      return {
        message: `✅ Hola ${message}! 👋 ¿Cuál es tu email?`,
        completed: false
      }
    } else {
      return {
        message: '❌ Nombre no válido. Por favor ingresa tu nombre completo:',
        completed: false
      }
    }
  }

  /**
   * 📧 Captura de Email
   */
  private handleEmailCapture(message: string, state: SimpleState): FlowResponse {
    if (this.isValidEmail(message)) {
      state.userData.email = message
      state.needsData.shift()
      return {
        message: '✅ Email registrado. ¿Cuál es tu edad?',
        completed: false
      }
    } else {
      return {
        message: '❌ Email no válido. Por favor ingresa un email válido:\n\nEjemplo: usuario@email.com',
        completed: false
      }
    }
  }

  /**
   * 🎂 Captura de Edad
   */
  private handleAgeCapture(message: string, state: SimpleState): FlowResponse {
    const age = parseInt(message.trim())
    
    if (age >= 16 && age <= 80) {
      state.userData.edad = age
      state.needsData.shift()
      return {
        message: '✅ Edad registrada. ¿En qué región vives?\n\n' + this.getRegionsMenu(),
        completed: false
      }
    } else {
      return {
        message: '❌ Edad no válida. Por favor ingresa una edad entre 16 y 80 años:',
        completed: false
      }
    }
  }

  /**
   * 🌍 Captura de Región
   */
  private handleRegionCapture(message: string, state: SimpleState): FlowResponse {
    const region = this.parseRegionChoice(message)
    
    if (region) {
      state.userData.region = region
      state.needsData.shift()
      return {
        message: `✅ Región registrada: ${region}\n\n🎉 ¡Perfecto! Tu información ha sido registrada.\n\n${this.getMainMenu()}`,
        completed: false,
        shouldSave: true,
        nextStep: 'menu'
      }
    } else {
      return {
        message: '❌ Opción no válida. Por favor selecciona una región:\n\n' + this.getRegionsMenu(),
        completed: false
      }
    }
  }

  /**
   * 🏠 Manejo del Menú Principal
   */
  private async handleMenu(userId: string, message: string, state: SimpleState): Promise<FlowResponse> {
    const choice = message.trim()
    
    switch (choice) {
      case '1':
        state.step = 'action'
        state.currentAction = 'carreras'
        return {
          message: this.getCareersMenu(),
          completed: false,
          nextStep: 'action'
        }
      
      case '2':
        state.step = 'action'
        state.currentAction = 'aranceles'
        return {
          message: this.getPricingInfo(),
          completed: false,
          nextStep: 'action'
        }
      
      case '3':
        state.step = 'action'
        state.currentAction = 'admision'
        return {
          message: this.getAdmissionInfo(),
          completed: false,
          nextStep: 'action'
        }
      
      case '4':
        // Solicitar asesor - terminar sesión
        state.userData.carrera_interes = 'asesor_request'
        return {
          message: '✅ ¡Perfecto! Un asesor te contactará en las próximas 24 horas.\n\n¡Gracias por tu interés en UNIACC! 🎓\n\nEscribe "hola" para nuevas consultas.',
          completed: true,
          shouldSave: true
        }
      
      case '5':
        return {
          message: this.getMainMenu(),
          completed: false
        }
      
      default:
        return {
          message: '❌ Opción no válida. Por favor selecciona una opción:\n\n' + this.getMainMenu(),
          completed: false
        }
    }
  }

  /**
   * 🎯 Manejo de Acciones (carreras, aranceles, etc.)
   */
  private async handleAction(userId: string, message: string, state: SimpleState): Promise<FlowResponse> {
    if (!state.currentAction) {
      return {
        message: 'Error en acción. Escribe "hola" para empezar.',
        completed: false
      }
    }

    switch (state.currentAction) {
      case 'carreras':
        return this.handleCareerSelection(message, state)
      
      case 'aranceles':
        return this.handlePricingAction(message, state)
      
      case 'admision':
        return this.handleAdmissionAction(message, state)
      
      default:
        return {
          message: 'Error en acción. Escribe "hola" para empezar.',
          completed: false
        }
    }
  }

  /**
   * 🎓 Manejo de Selección de Carreras
   */
  private handleCareerSelection(message: string, state: SimpleState): FlowResponse {
    const choice = message.trim().toUpperCase()
    
    switch (choice) {
      case 'A':
        return {
          message: this.getArtsCareers(),
          completed: false
        }
      
      case 'B':
        return {
          message: this.getCommunicationsCareers(),
          completed: false
        }
      
      case 'C':
        return {
          message: this.getArchitectureCareers(),
          completed: false
        }
      
      case 'D':
        return {
          message: this.getLegalCareers(),
          completed: false
        }
      
      case 'E':
        return {
          message: this.getBusinessCareers(),
          completed: false
        }
      
      case '6':
        state.step = 'menu'
        state.currentAction = undefined
        return {
          message: this.getMainMenu(),
          completed: false,
          nextStep: 'menu'
        }
      
      default:
        return {
          message: '❌ Opción no válida. Por favor selecciona una facultad:\n\n' + this.getCareersMenu(),
          completed: false
        }
    }
  }

  /**
   * 💰 Manejo de Información de Aranceles
   */
  private handlePricingAction(message: string, state: SimpleState): FlowResponse {
    const choice = message.trim()
    
    if (choice === '1') {
      return {
        message: '¿Te gustaría que un asesor te contacte para más información sobre aranceles?\n\n1. ✅ Sí, contactarme\n2. ❌ No, gracias',
        completed: false
      }
    } else if (choice === '2') {
      return {
        message: '✅ Información registrada. ¡Gracias!\n\nEscribe "hola" para nuevas consultas.',
        completed: true,
        shouldSave: true
      }
    } else {
      return {
        message: '❌ Opción no válida. Por favor selecciona:\n\n1. ✅ Sí, contactarme\n2. ❌ No, gracias',
        completed: false
      }
    }
  }

  /**
   * 📋 Manejo de Información de Admisión
   */
  private handleAdmissionAction(message: string, state: SimpleState): FlowResponse {
    const choice = message.trim()
    
    if (choice === '1') {
      return {
        message: '✅ ¡Perfecto! Un asesor te contactará para información de admisión.\n\n¡Gracias por tu interés en UNIACC! 🎓\n\nEscribe "hola" para nuevas consultas.',
        completed: true,
        shouldSave: true
      }
    } else if (choice === '2') {
      return {
        message: '✅ Información registrada. ¡Gracias!\n\nEscribe "hola" para nuevas consultas.',
        completed: true,
        shouldSave: true
      }
    } else {
      return {
        message: '❌ Opción no válida. Por favor selecciona:\n\n1. ✅ Sí, contactarme\n2. ❌ No, gracias',
        completed: false
      }
    }
  }

  /**
   * 💾 Guardar Datos del Usuario
   */
  private async saveUserData(userId: string, state: SimpleState): Promise<void> {
    try {
      // Usar el ProspectServiceV2 para guardar datos de forma simplificada
      await this.prospectService.guardarProspecto(userId, {
        whatsapp: userId,
        nombre: state.userData.nombre || 'Usuario',
        email: state.userData.email || null,
        telefono: state.userData.telefono || null,
        edad: state.userData.edad,
        region: state.userData.region,
        carrera_interes: state.userData.carrera_interes,
        nivel_interes: this.determineInterestLevel(state),
        tipo_consulta: this.determineConsultationType(state),
        source: 'whatsapp_bot'
      })
      
      console.log(`💾 [UNIACC-FLOW] Datos guardados para ${userId}`)
      
    } catch (error) {
      console.error(`💥 [UNIACC-FLOW] Error guardando datos para ${userId}:`, error)
    }
  }

  /**
   * 🎯 Determinar Nivel de Interés
   */
  private determineInterestLevel(state: SimpleState): string {
    if (state.userData.carrera_interes === 'asesor_request') {
      return 'urgente'
    }
    if (state.currentAction === 'aranceles' || state.currentAction === 'admision') {
      return 'alto'
    }
    return 'medio'
  }

  /**
   * 📋 Determinar Tipo de Consulta
   */
  private determineConsultationType(state: SimpleState): string {
    if (state.userData.carrera_interes === 'asesor_request') {
      return 'solicitud_asesor'
    }
    if (state.currentAction === 'carreras') {
      return 'exploracion_carreras'
    }
    if (state.currentAction === 'aranceles') {
      return 'informacion_aranceles'
    }
    if (state.currentAction === 'admision') {
      return 'informacion_admision'
    }
    return 'consulta_general'
  }

  /**
   * 🔧 Métodos de Utilidad
   */
  private getOrCreateState(userId: string): SimpleState {
    if (!this.userStates.has(userId)) {
      this.userStates.set(userId, {
        userId,
        step: 'greeting',
        userData: {},
        needsData: [],
        lastInteraction: new Date()
      })
    }
    return this.userStates.get(userId)!
  }

  private cleanupState(userId: string): void {
    this.userStates.delete(userId)
  }

  private isGreetingMessage(message: string): boolean {
    const greetings = [
      'hola', 'hi', 'hello', 'buenas', 'qué tal', 'como estas',
      'inicio', 'empezar', 'start', 'menu', 'heyyy', 'holis'
    ]
    return greetings.some(greeting => 
      message.toLowerCase().trim().includes(greeting)
    )
  }

  private isTechnicalName(name: string): boolean {
    return name.includes('Usuario (timeout)') || name.includes('timeout')
  }

  private extractPhoneFromUserId(userId: string): string {
    // Si es un ID de prueba, usar un número de prueba
    if (userId.startsWith('test_')) {
      return '+56999888777'
    }
    
    // Extraer número del userId (formato WhatsApp real)
    const phone = userId.replace(/\D/g, '')
    if (phone.startsWith('56')) {
      return '+' + phone
    }
    return '+56' + phone
  }

  private parseRegionChoice(choice: string): string | null {
    const regions = [
      'Metropolitana', 'Valparaíso', 'Biobío', 'La Araucanía',
      'Los Lagos', 'Antofagasta', 'Coquimbo', 'Maule',
      'O\'Higgins', 'Ñuble', 'Atacama', 'Aysén',
      'Magallanes', 'Arica y Parinacota', 'Los Ríos', 'Tarapacá'
    ]
    
    const num = parseInt(choice.trim())
    if (num >= 1 && num <= 16) {
      return regions[num - 1]
    }
    return null
  }

  /**
   * 📝 Menús y Mensajes
   */
  private getMainMenu(): string {
    return `🎓 UNIACC - ¿En qué te puedo ayudar?

1️⃣ Conocer nuestras carreras
2️⃣ Información de aranceles
3️⃣ Proceso de admisión
4️⃣ Hablar con un asesor
5️⃣ Volver al menú

Responde con el número de tu opción.`
  }

  private getCareersMenu(): string {
    return `🎨 FACULTADES Y CARRERAS UNIACC

A) 🎭 FACULTAD DE ARTES
B) 📺 FACULTAD DE COMUNICACIONES
C) 🏗️ ARQUITECTURA Y DISEÑO
D) ⚖️ CIENCIAS JURÍDICAS Y SOCIALES
E) 💼 NEGOCIOS Y TECNOLOGÍA

6️⃣ Volver al menú principal

Responde con la letra de la facultad que te interesa.`
  }

  private getArtsCareers(): string {
    return `🎭 FACULTAD DE ARTES

1️⃣ Teatro y Comunicación Escénica
2️⃣ Danza y Coreografía
3️⃣ Música e Interpretación
4️⃣ Artes Visuales

Duración: 8-10 semestres
Modalidad: Presencial
Requisitos: Audiciones/Portfolio

¿Te interesa alguna de estas carreras?
Escribe "asesor" para hablar con alguien.`
  }

  private getCommunicationsCareers(): string {
    return `📺 FACULTAD DE COMUNICACIONES

1️⃣ Comunicación Audiovisual (pioneros desde 1981)
2️⃣ Periodismo
3️⃣ Publicidad

Duración: 10 semestres
Modalidades: Presencial/Semipresencial

¿Te interesa alguna de estas carreras?
Escribe "asesor" para hablar con alguien.`
  }

  private getArchitectureCareers(): string {
    return `🏗️ ARQUITECTURA Y DISEÑO

1️⃣ Arquitectura
2️⃣ Diseño de Interiores

Duración: 11 semestres (Arquitectura), 10 semestres (Diseño)
Modalidades: Presencial/Semipresencial

¿Te interesa alguna de estas carreras?
Escribe "asesor" para hablar con alguien.`
  }

  private getLegalCareers(): string {
    return `⚖️ CIENCIAS JURÍDICAS Y SOCIALES

1️⃣ Derecho
2️⃣ Psicología

Duración: 12 semestres
Modalidades: Presencial/Vespertino/Semipresencial

¿Te interesa alguna de estas carreras?
Escribe "asesor" para hablar con alguien.`
  }

  private getBusinessCareers(): string {
    return `💼 NEGOCIOS Y TECNOLOGÍA

1️⃣ Ingeniería Comercial
2️⃣ Contador Auditor

Duración: 10 semestres
Modalidades: Presencial/Online

¿Te interesa alguna de estas carreras?
Escribe "asesor" para hablar con alguien.`
  }

  private getPricingInfo(): string {
    return `💰 INFORMACIÓN DE ARANCELES UNIACC

📊 Costos aproximados:
• Carreras de Artes: $11.5M - $13M anual
• Carreras de Comunicaciones: $12M - $14M anual
• Arquitectura: $14M - $16M anual
• Derecho y Psicología: $13M - $15M anual
• Negocios: $11M - $12M anual

🎓 Becas disponibles:
• Mérito Académico: hasta 50%
• Apoyo Regional: 15-30%
• Deportiva: hasta 30%

¿Te gustaría más información sobre financiamiento?

1. ✅ Sí, contactarme
2. ❌ No, gracias`
  }

  private getAdmissionInfo(): string {
    return `📋 PROCESO DE ADMISIÓN UNIACC 2025

📅 Fechas importantes:
• Postulación: Marzo - Diciembre 2025
• Matrícula: Enero 2026
• Inicio clases: Marzo 2026

📝 Requisitos:
• Licencia de Enseñanza Media
• PAES (opcional)
• Entrevista personal (algunas carreras)

🎓 Proceso independiente del DEMRE

¿Te gustaría más información sobre el proceso de admisión?

1. ✅ Sí, contactarme
2. ❌ No, gracias`
  }

  private getRegionsMenu(): string {
    return `🌍 REGIONES DE CHILE

1. Metropolitana
2. Valparaíso
3. Biobío
4. La Araucanía
5. Los Lagos
6. Antofagasta
7. Coquimbo
8. Maule
9. O'Higgins
10. Ñuble
11. Atacama
12. Aysén
13. Magallanes
14. Arica y Parinacota
15. Los Ríos
16. Tarapacá

Responde con el número de tu región.`
  }

  /**
   * 🔧 Métodos de Validación
   */
  private isValidPhone(phone: string): boolean {
    // Validar formato de teléfono chileno o internacional
    const phoneRegex = /^\+?[0-9]{8,15}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
  }

  private isValidName(name: string): boolean {
    // Validar nombre (mínimo 2 caracteres, solo letras y espacios)
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,50}$/
    return nameRegex.test(name.trim())
  }

  private isValidEmail(email: string): boolean {
    // Validar email RFC
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email.trim())
  }
}
