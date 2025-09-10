/**
 * 💬 Message Formatter Service
 * Servicio para formateo y construcción de mensajes
 */

import { UserState, ProspectData } from '../domain/types/user-state'

export class MessageFormatterService {

  /**
   * 👋 Mensaje de bienvenida personalizado
   */
  formatWelcomeMessage(isRecurring: boolean = false, userData?: any): string {
    if (isRecurring && userData?.nombre) {
      return `👋 ¡Hola de nuevo, ${userData.nombre}!

¿En qué puedo ayudarte hoy?

1️⃣ Información sobre carreras
2️⃣ Hablar con un asesor
3️⃣ Costos y becas
4️⃣ Proceso de admisión

Escribe el **número** de tu opción:`
    }

    return `¡Hola! 👋 Soy el asistente virtual de **UNIACC**.

🎓 Te ayudo a encontrar la carrera perfecta para ti.

👤 ¿Cuál es tu **nombre completo**?`
  }

  /**
   * 📧 Mensaje para solicitar email con value exchange
   */
  formatEmailRequest(nombre: string): string {
    return `¡Hola ${nombre}! 👋

📧 Para enviarte la **guía personalizada de carreras** 📚, ¿cuál es tu **email**?`
  }

  /**
   * 🎂 Mensaje para solicitar edad
   */
  formatAgeRequest(): string {
    return `🎂 ¿Cuántos **años** tienes?`
  }

  /**
   * 📍 Mensaje para solicitar región
   */
  formatRegionRequest(): string {
    return `📍 ¿En qué **región** vives?

1️⃣ Arica y Parinacota
2️⃣ Tarapacá  
3️⃣ Antofagasta
4️⃣ Atacama
5️⃣ Coquimbo
6️⃣ Valparaíso
7️⃣ Metropolitana
8️⃣ O'Higgins
9️⃣ Maule
🔟 Ñuble
1️⃣1️⃣ Biobío
1️⃣2️⃣ La Araucanía
1️⃣3️⃣ Los Ríos
1️⃣4️⃣ Los Lagos
1️⃣5️⃣ Aysén
1️⃣6️⃣ Magallanes

Escribe el **número** de tu región:`
  }

  /**
   * 📱 Mensaje para solicitar teléfono
   */
  formatPhoneRequest(): string {
    return `📱 Por último, ¿cuál es tu **teléfono**?`
  }

  /**
   * ✅ Mensaje de confirmación con progreso
   */
  formatConfirmationMessage(campo: string, valor: any, progreso?: number): string {
    const progressBar = progreso ? this.formatProgressBar(progreso) : ''
    
    let emoji = ''
    switch (campo) {
      case 'email': emoji = '📧'; break
      case 'edad': emoji = '🎂'; break
      case 'region': emoji = '📍'; break
      case 'telefono': emoji = '📱'; break
      default: emoji = '✅'; break
    }
    
    return `${emoji} ${this.capitalizeField(campo)}: ${valor}${progressBar ? '\n\n' + progressBar : ''}`
  }

  /**
   * 📊 Barra de progreso visual
   */
  formatProgressBar(percentage: number): string {
    const steps = 4
    const completed = Math.round((percentage / 100) * steps)
    const remaining = steps - completed
    
    const progressEmojis = '✅'.repeat(completed) + '⬜'.repeat(remaining)
    
    return `📊 Progreso: ${progressEmojis} ${percentage}% completado`
  }

  /**
   * 🎯 Mensaje de finalización exitosa
   */
  formatCompletionMessage(nombre: string, datos: ProspectData): string {
    return `🎉 ¡Perfecto, ${nombre}!

📋 **Datos registrados:**
👤 Nombre: ${datos.nombre}
📧 Email: ${datos.email}
🎂 Edad: ${datos.edad} años
📍 Región: ${datos.region}

🎓 **¿Qué te gustaría hacer ahora?**

1️⃣ Explorar carreras disponibles
2️⃣ Hablar con un asesor especializado  
3️⃣ Información sobre costos y becas
4️⃣ Proceso de admisión

Escribe el **número** de tu opción:`
  }

  /**
   * 📞 Mensaje de confirmación de teléfono
   */
  formatPhoneConfirmation(phoneNumber: string): string {
    return `📱 He detectado tu número: **${phoneNumber}**

¿Es correcto?

✅ Responde **"sí"** si es correcto
❌ Responde **"no"** para escribir otro número`
  }

  /**
   * 🎯 Mensaje de menú principal
   */
  formatMainMenu(): string {
    return `🎓 **¿En qué puedo ayudarte?**

1️⃣ Explorar carreras y programas
2️⃣ Hablar con un asesor
3️⃣ Información sobre costos y becas  
4️⃣ Proceso de admisión y requisitos
5️⃣ Campus y modalidades

Escribe el **número** de tu opción:`
  }

  /**
   * ❌ Mensaje de error genérico
   */
  formatErrorMessage(context?: string): string {
    const baseMessage = `❌ No he entendido tu respuesta.`
    
    if (context) {
      return `${baseMessage}\n\n💡 ${context}`
    }
    
    return `${baseMessage}

💡 Puedes escribir:
• "ayuda" para ver opciones
• "menú" para ir al menú principal
• "asesor" para hablar con alguien`
  }

  /**
   * 🆘 Mensaje de ayuda
   */
  formatHelpMessage(): string {
    return `🆘 **¿Necesitas ayuda?**

🎓 Soy el asistente de UNIACC y puedo ayudarte con:

📋 **Información disponible:**
• Carreras y programas de estudio
• Costos, aranceles y becas
• Proceso de admisión
• Campus y modalidades

💬 **Comandos útiles:**
• "menú" - Ver opciones principales
• "asesor" - Hablar con una persona
• "carreras" - Explorar programas
• "hola" - Reiniciar conversación

¿Qué te gustaría saber?`
  }

  /**
   * 🏷️ Mensaje con social proof
   */
  formatSocialProofMessage(count: number = 847): string {
    return `🌟 ¡Únete a más de **${count} estudiantes** que ya recibieron asesoría personalizada de UNIACC! 🎓`
  }

  /**
   * 📈 Mensaje con urgencia suave
   */
  formatUrgencyMessage(): string {
    return `⏰ **¡Últimos días para postular!**

🎯 Asegura tu cupo para el próximo período académico.`
  }

  /**
   * 🔧 Helpers privados
   */
  private capitalizeField(field: string): string {
    const fieldNames: { [key: string]: string } = {
      'nombre': 'Nombre',
      'email': 'Email', 
      'edad': 'Edad',
      'region': 'Región',
      'telefono': 'Teléfono'
    }
    
    return fieldNames[field] || field
  }

  /**
   * 🎨 Formatear texto con emojis según contexto
   */
  addContextEmoji(text: string, context: 'success' | 'error' | 'info' | 'warning'): string {
    const emojis = {
      success: '✅',
      error: '❌', 
      info: 'ℹ️',
      warning: '⚠️'
    }
    
    return `${emojis[context]} ${text}`
  }

  /**
   * 📝 Formatear lista con números y emojis
   */
  formatNumberedList(items: string[], startEmoji: string = ''): string {
    const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
    
    return items.map((item, index) => {
      const emoji = index < numberEmojis.length ? numberEmojis[index] : `${index + 1}️⃣`
      return `${emoji} ${item}`
    }).join('\n')
  }

  /**
   * 💎 Mensaje de value proposition
   */
  formatValueProposition(action: string): string {
    const valueProps: { [key: string]: string } = {
      'email': 'Para enviarte la **guía personalizada de carreras** 📚',
      'telefono': 'Para que un asesor te contacte directamente 📞',
      'datos': 'Para crear tu **perfil académico personalizado** 🎯'
    }
    
    return valueProps[action] || 'Para brindarte la mejor experiencia'
  }
}

// 🌍 Singleton instance
export const messageFormatter = new MessageFormatterService()
