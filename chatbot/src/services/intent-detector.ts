/**
 * 🎯 Intent Detector Service
 * Detecta intenciones del usuario para dirigir a flujos específicos
 */

export interface IntentResult {
  intent: string
  confidence: number
  flow?: string
}

export class IntentDetectorService {
  
  constructor() {
    console.log('🎯 [INTENT-DETECTOR] Inicializado')
  }

  /**
   * 🔍 Detectar intención principal del mensaje
   */
  detectIntent(message: string, userContext?: any): IntentResult {
    const cleanMessage = message.toLowerCase().trim()

    // 🏠 MAIN MENU - Si el usuario ya completó captura inicial
    if (userContext?.hasCompletedCapture && this.isMenuRequest(cleanMessage)) {
      return {
        intent: 'main_menu',
        confidence: 0.9,
        flow: 'main-menu'
      }
    }

    // 🎓 ADVISOR REQUEST - Alta prioridad
    if (this.isAdvisorRequest(cleanMessage)) {
      return {
        intent: 'advisor_request',
        confidence: 0.9,
        flow: 'advisor-request'
      }
    }

    // 📚 CAREER INFO
    if (this.isCareerInfo(cleanMessage)) {
      return {
        intent: 'career_info',
        confidence: 0.8,
        flow: 'career-info'
      }
    }

    // 📝 ADMISSION INFO
    if (this.isAdmissionInfo(cleanMessage)) {
      return {
        intent: 'admission_info',
        confidence: 0.8,
        flow: 'admission-info'
      }
    }

    // 🏠 GREETING / GENERAL - Flujo por defecto
    return {
      intent: 'general',
      confidence: 0.5,
      flow: 'prospect-capture'
    }
  }

  /**
   * 🏠 Detectar solicitud de menú principal
   */
  private isMenuRequest(message: string): boolean {
    const menuKeywords = [
      'menu', 'menú', 'opciones', 'que puedo hacer',
      'qué puedo hacer', 'ayuda', 'información',
      'quiero saber', 'me interesa', 'continuar'
    ]

    return menuKeywords.some(keyword => message.includes(keyword)) ||
           this.isGreeting(message) // Saludos también pueden activar menú
  }

  /**
   * 🎓 Detectar solicitud de asesor
   */
  private isAdvisorRequest(message: string): boolean {
    const advisorKeywords = [
      'asesor', 'ejecutivo', 'vendedor', 'representante',
      'hablar con', 'contactar', 'llamar', 'llamada',
      'ayuda', 'consulta', 'orientacion', 'orientación',
      'quiero hablar', 'necesito hablar', 'contacto',
      'me pueden contactar', 'pueden llamarme',
      'urgente', 'rapido', 'rápido', 'inmediato'
    ]

    return advisorKeywords.some(keyword => 
      message.includes(keyword) || 
      this.isSimilar(message, keyword)
    )
  }

  /**
   * 📚 Detectar información de carreras
   */
  private isCareerInfo(message: string): boolean {
    const careerKeywords = [
      'carrera', 'carreras', 'programa', 'programas',
      'ingenieria', 'ingeniería', 'medicina', 'derecho',
      'psicologia', 'psicología', 'administracion', 'administración',
      'que carreras', 'qué carreras', 'estudiar',
      'titulos', 'títulos', 'grado', 'profesion', 'profesión'
    ]

    return careerKeywords.some(keyword => message.includes(keyword))
  }

  /**
   * 📝 Detectar información de admisión
   */
  private isAdmissionInfo(message: string): boolean {
    const admissionKeywords = [
      'admision', 'admisión', 'postular', 'postulacion', 'postulación',
      'matricula', 'matrícula', 'inscripcion', 'inscripción',
      'requisitos', 'documentos', 'cuando empieza', 'cuándo empieza',
      'fechas', 'plazos', 'becas', 'financiamiento',
      'arancel', 'precio', 'costo', 'cuanto cuesta', 'cuánto cuesta'
    ]

    return admissionKeywords.some(keyword => message.includes(keyword))
  }

  /**
   * 🔍 Verificar similitud básica
   */
  private isSimilar(text: string, keyword: string): boolean {
    // Implementación básica de similitud
    const textWords = text.split(' ')
    return textWords.some(word => 
      word.length > 3 && 
      keyword.includes(word.substring(0, 4))
    )
  }

  /**
   * 🎯 Detectar si es saludo inicial
   */
  isGreeting(message: string): boolean {
    const greetings = ['hola', 'hello', 'hi', 'buenas', 'buenos dias', 'buenas tardes']
    const cleanMessage = message.toLowerCase().trim()
    
    return greetings.some(greeting => 
      cleanMessage === greeting || 
      cleanMessage.startsWith(greeting + ' ') ||
      cleanMessage.startsWith(greeting + ',')
    )
  }
}
