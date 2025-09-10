/**
 * ✅ Validation Service
 * Servicio centralizado para validaciones
 */

import { ValidationResult } from '../domain/types/flow'

export class ValidationService {
  
  /**
   * 📧 Validar email con regex robusto
   */
  validateEmail(email: string): ValidationResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    if (!email || email.trim().length === 0) {
      return {
        isValid: false,
        message: "❌ El email es requerido"
      }
    }
    
    const trimmedEmail = email.trim().toLowerCase()
    
    if (!emailRegex.test(trimmedEmail)) {
      return {
        isValid: false,
        message: "❌ Email inválido. Ejemplo: nombre@dominio.com"
      }
    }
    
    return {
      isValid: true,
      sanitizedValue: trimmedEmail
    }
  }

  /**
   * 🎂 Validar edad
   */
  validateAge(ageInput: string): ValidationResult {
    const edad = parseInt(ageInput.trim())
    
    if (isNaN(edad)) {
      return {
        isValid: false,
        message: "❌ Por favor ingresa un número válido"
      }
    }
    
    if (edad < 16 || edad > 80) {
      return {
        isValid: false,
        message: "❌ Por favor ingresa una edad válida (entre 16 y 80 años)"
      }
    }
    
    return {
      isValid: true,
      sanitizedValue: edad
    }
  }

  /**
   * 👤 Validar nombre
   */
  validateName(name: string): ValidationResult {
    if (!name || name.trim().length < 2) {
      return {
        isValid: false,
        message: "❌ Por favor ingresa un nombre válido (mínimo 2 caracteres)"
      }
    }
    
    const trimmedName = name.trim()
    
    // Verificar que no sea solo números o caracteres especiales
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(trimmedName)) {
      return {
        isValid: false,
        message: "❌ El nombre solo puede contener letras y espacios"
      }
    }
    
    return {
      isValid: true,
      sanitizedValue: trimmedName
    }
  }

  /**
   * 📍 Validar región (número del 1 al 16)
   */
  validateRegion(regionInput: string): ValidationResult {
    const numeroRegion = parseInt(regionInput.trim())
    
    if (isNaN(numeroRegion) || numeroRegion < 1 || numeroRegion > 16) {
      return {
        isValid: false,
        message: "❌ Por favor selecciona un número válido del 1 al 16"
      }
    }
    
    const regiones = [
      'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo',
      'Valparaíso', 'Metropolitana', 'O\'Higgins', 'Maule', 'Ñuble',
      'Biobío', 'La Araucanía', 'Los Ríos', 'Los Lagos', 'Aysén', 'Magallanes'
    ]
    
    return {
      isValid: true,
      sanitizedValue: regiones[numeroRegion - 1]
    }
  }

  /**
   * 📱 Validar teléfono
   */
  validatePhone(phone: string): ValidationResult {
    // Limpiar teléfono: solo números
    const cleanPhone = phone.replace(/\D/g, '')
    
    if (cleanPhone.length < 8) {
      return {
        isValid: false,
        message: "❌ Por favor ingresa un teléfono válido (mínimo 8 dígitos)"
      }
    }
    
    // Formatear teléfono chileno
    let formattedPhone = cleanPhone
    if (cleanPhone.startsWith('569') && cleanPhone.length === 11) {
      // Ya está en formato correcto
    } else if (cleanPhone.startsWith('9') && cleanPhone.length === 9) {
      formattedPhone = '56' + cleanPhone
    } else if (cleanPhone.length === 8) {
      formattedPhone = '569' + cleanPhone
    }
    
    return {
      isValid: true,
      sanitizedValue: formattedPhone
    }
  }

  /**
   * 🤖 Validar confirmación (sí/no)
   */
  validateConfirmation(input: string): ValidationResult {
    const cleaned = input.trim().toLowerCase()
    
    const positiveAnswers = ['sí', 'si', 'yes', 'y', 's', '1', 'ok', 'correcto', 'exacto']
    const negativeAnswers = ['no', 'n', '0', 'negativo', 'incorrecto']
    
    if (positiveAnswers.includes(cleaned)) {
      return {
        isValid: true,
        sanitizedValue: true
      }
    }
    
    if (negativeAnswers.includes(cleaned)) {
      return {
        isValid: true,
        sanitizedValue: false
      }
    }
    
    return {
      isValid: false,
      message: "❌ Por favor responde 'sí' o 'no'"
    }
  }

  /**
   * 🎯 Validar opción de menú
   */
  validateMenuOption(input: string, validOptions: string[]): ValidationResult {
    const cleaned = input.trim().toLowerCase()
    
    // Buscar coincidencia exacta
    const exactMatch = validOptions.find(option => option.toLowerCase() === cleaned)
    if (exactMatch) {
      return {
        isValid: true,
        sanitizedValue: exactMatch
      }
    }
    
    // Buscar coincidencia parcial
    const partialMatch = validOptions.find(option => 
      option.toLowerCase().includes(cleaned) || 
      cleaned.includes(option.toLowerCase())
    )
    
    if (partialMatch) {
      return {
        isValid: true,
        sanitizedValue: partialMatch
      }
    }
    
    return {
      isValid: false,
      message: `❌ Opción no válida. Opciones disponibles: ${validOptions.join(', ')}`
    }
  }

  /**
   * 🔍 Detectar saludo
   */
  isGreeting(message: string): boolean {
    const cleaned = message.trim().toLowerCase()
    const greetings = [
      'hola', 'hi', 'hello', 'hey', 'buenos días', 'buenas tardes', 
      'buenas noches', 'saludos', 'inicio', 'empezar', 'comenzar'
    ]
    
    return greetings.some(greeting => cleaned.includes(greeting))
  }

  /**
   * 🆘 Detectar solicitud de ayuda
   */
  isHelpRequest(message: string): boolean {
    const cleaned = message.trim().toLowerCase()
    const helpKeywords = [
      'ayuda', 'help', 'no entiendo', 'no sé', 'como', 'qué hago',
      'información', 'opciones', 'menú', 'menu'
    ]
    
    return helpKeywords.some(keyword => cleaned.includes(keyword))
  }
}

// 🌍 Singleton instance
export const validationService = new ValidationService()
