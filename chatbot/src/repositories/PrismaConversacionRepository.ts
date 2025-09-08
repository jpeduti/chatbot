/**
 * 💬 Prisma Conversacion Repository
 * Manejo de conversaciones y mensajes usando Prisma
 */

import { PrismaClient, conversaciones, mensajes } from '../generated/prisma'

// Los tipos vienen de Prisma generados

export interface ConversacionData {
  phone_number: string
  contact_name: string
  prospecto_id?: string
}

export interface MensajeData {
  conversacion_id: string
  content: string
  type: 'user' | 'bot' | 'agent'
  sender_id: string
}

export class PrismaConversacionRepository {
  private prisma: PrismaClient

  constructor() {
    this.prisma = new PrismaClient()
    console.log('💬 [REPO] PrismaConversacionRepository inicializado')
  }

  /**
   * 🔍 Buscar conversación por número de teléfono
   */
  async buscarPorTelefono(phoneNumber: string): Promise<conversaciones | null> {
    try {
      const conversacion = await this.prisma.conversaciones.findFirst({
        where: {
          phone_number: phoneNumber
        },
        orderBy: {
          created_at: 'desc'
        }
      })

      if (conversacion) {
        console.log(`🔍 [CONVERSACION] Encontrada: ${conversacion.id} para ${phoneNumber}`)
      }

      return conversacion
    } catch (error) {
      console.error(`❌ [REPO] Error buscando conversación:`, error)
      return null
    }
  }

  /**
   * ✅ Crear nueva conversación
   */
  async crear(data: ConversacionData): Promise<conversaciones | null> {
    try {
      const conversacion = await this.prisma.conversaciones.create({
        data: {
          phone_number: data.phone_number,
          contact_name: data.contact_name,
          prospecto_id: data.prospecto_id,
          status: 'active',
          message_count: 0,
          contact_info: {
            platform: 'chatbot',
            source: 'uniacc_direct'
          }
        }
      })

      console.log(`✅ [CONVERSACION] Creada: ${conversacion.id} para ${data.phone_number}`)
      return conversacion
    } catch (error) {
      console.error(`❌ [REPO] Error creando conversación:`, error)
      return null
    }
  }

  /**
   * 💬 Guardar mensaje
   */
  async guardarMensaje(data: MensajeData): Promise<mensajes | null> {
    try {
      const mensaje = await this.prisma.mensajes.create({
        data: {
          conversacion_id: data.conversacion_id,
          content: data.content,
          type: data.type,
          sender_id: data.sender_id,
          message_type: 'text',
          is_read: data.type === 'bot' // Bot messages start as read
        }
      })

      // Actualizar contador de mensajes en la conversación
      await this.prisma.conversaciones.update({
        where: { id: data.conversacion_id },
        data: {
          message_count: { increment: 1 },
          last_message_at: new Date()
        }
      })

      console.log(`💬 [MENSAJE] Guardado: ${data.type} - "${data.content.substring(0, 30)}..."`)
      return mensaje
    } catch (error) {
      console.error(`❌ [REPO] Error guardando mensaje:`, error)
      return null
    }
  }

  /**
   * 🔧 Registrar interacción completa (conversación + mensajes)
   */
  async registrarInteraccion(whatsapp: string, mensajeUsuario: string, respuestaBot: string): Promise<void> {
    try {
      // 1. Buscar o crear conversación
      let conversacion = await this.buscarPorTelefono(whatsapp)
      
      if (!conversacion) {
        conversacion = await this.crear({
          phone_number: whatsapp,
          contact_name: 'Usuario ChatBot'
        })
      }

      if (!conversacion) {
        console.warn(`⚠️ [CONVERSACION] No se pudo crear/encontrar para ${whatsapp}`)
        return
      }

      // 2. Guardar mensaje del usuario
      await this.guardarMensaje({
        conversacion_id: conversacion.id,
        content: mensajeUsuario,
        type: 'user',
        sender_id: whatsapp
      })

      // 3. Guardar respuesta del bot
      await this.guardarMensaje({
        conversacion_id: conversacion.id,
        content: respuestaBot,
        type: 'bot',
        sender_id: 'uniacc_chatbot'
      })

      console.log(`💬 [INTERACCION] Registrada completa para ${whatsapp}`)
    } catch (error) {
      console.error(`❌ [REPO] Error registrando interacción:`, error)
    }
  }

  /**
   * 🕒 Actualizar timestamp de última actividad del ejecutivo
   */
  async updateActivityTimestamp(conversacionId: string, ejecutivoId: string): Promise<void> {
    try {
      console.log(`🕒 [REPO] Actualizando actividad: ${conversacionId} → ${ejecutivoId}`)
      
      const updated = await this.prisma.conversaciones.update({
        where: { id: conversacionId },
        data: {
          agent_last_activity: new Date(),
          updated_at: new Date()
        }
      })

      console.log(`✅ [REPO] Actividad actualizada: ${updated.id}`)
    } catch (error) {
      console.error(`❌ [REPO] Error actualizando actividad:`, error)
    }
  }

  /**
   * 📞 Buscar conversación por número de WhatsApp
   */
  async findByWhatsapp(whatsapp: string): Promise<any> {
    try {
      console.log(`📞 [REPO] Buscando conversación por WhatsApp: ${whatsapp}`)
      
      const conversacion = await this.prisma.conversaciones.findFirst({
        where: { phone_number: whatsapp },
        orderBy: { created_at: 'desc' }
      })

      console.log(`📞 [REPO] Conversación encontrada: ${conversacion ? 'SÍ' : 'NO'}`)
      return conversacion
    } catch (error) {
      console.error(`❌ [REPO] Error buscando conversación:`, error)
      return null
    }
  }

  /**
   * 🔍 Buscar conversación por ID
   */
  async findById(conversacionId: string): Promise<any> {
    try {
      console.log(`🔍 [REPO] Buscando conversación por ID: ${conversacionId}`)
      
      const conversacion = await this.prisma.conversaciones.findUnique({
        where: { id: conversacionId }
      })

      console.log(`🔍 [REPO] Conversación encontrada: ${conversacion ? 'SÍ' : 'NO'}`)
      return conversacion
    } catch (error) {
      console.error(`❌ [REPO] Error buscando conversación por ID:`, error)
      return null
    }
  }
}
