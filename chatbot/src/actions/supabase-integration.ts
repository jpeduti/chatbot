import axios from 'axios'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import logger, { LogCategory } from '../utils/enhanced-logger'

export interface ProspectoData {
  nombre: string
  email: string | null
  telefono: string | null
  whatsapp: string
  edad?: number
  region?: string
  carrera_interes?: string
  facultad_interes?: string
  nivel_interes?: string
  tipo_consulta?: string
  source: string
  flujo_actual?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  datos_adicionales?: Record<string, any>
  // 🆕 Nuevos campos para preferencias de contacto
  telefono_confirmado?: boolean
  preferencia_contacto?: string
}

export class SupabaseIntegration {
  private webhookUrl: string
  private webhookSecret: string
  private client: SupabaseClient | null = null

  constructor(webhookUrl: string, webhookSecret: string) {
    this.webhookUrl = webhookUrl
    this.webhookSecret = webhookSecret
    
    // ✅ Inicializar cliente Supabase
    this.initializeSupabaseClient()
  }

  private initializeSupabaseClient(): void {
    try {
      const supabaseUrl = process.env.SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseKey) {
        console.log('⚠️ [SUPABASE] Variables de entorno no encontradas')
        console.log(`⚠️ [SUPABASE] SUPABASE_URL: ${supabaseUrl ? 'OK' : 'MISSING'}`)
        console.log(`⚠️ [SUPABASE] SUPABASE_ANON_KEY: ${supabaseKey ? 'OK' : 'MISSING'}`)
        return
      }
      
      this.client = createClient(supabaseUrl, supabaseKey)
      console.log('✅ [SUPABASE] Cliente inicializado correctamente')
      
    } catch (error) {
      console.error('❌ [SUPABASE] Error inicializando cliente:', error)
      this.client = null
    }
  }

  async enviarProspecto(data: ProspectoData): Promise<{
    success: boolean
    prospectoId?: string
    sesionNumero?: number
    esNuevoUsuario?: boolean
    perfilUsuario?: string
    error?: string
  }> {
    try {
      console.log('📤 [NUEVA BD] Guardando sesión para:', data.whatsapp)
      console.log('🔧 DEBUG - Datos:', JSON.stringify(data, null, 2))

      // 🎯 USAR NUEVA FUNCIÓN DE BD DIRECTAMENTE
      const payload = {
        p_whatsapp: data.whatsapp,
        p_nombre: data.nombre,
        p_email: data.email,
        p_telefono: data.telefono,
        p_edad: data.edad || null,
        p_region: data.region || null,
        p_carrera_interes: data.carrera_interes || 'Sin especificar',
        p_facultad_interes: data.facultad_interes || '',
        p_tipo_consulta: data.flujo_actual || data.tipo_consulta || 'consulta_general',
        p_nivel_interes: data.nivel_interes || 'medio',
        p_fuente: data.source || 'uniacc_chatbot',
        p_datos_capturados: JSON.stringify({
          nombre: data.nombre,
          email: data.email,
          telefono: data.telefono,
          edad: data.edad,
          region: data.region
        }),
        p_duracion_sesion: null, // TODO: calcular si tienes timestamp inicio
        p_mensajes: 0, // TODO: contar mensajes si tienes contador
        p_flujo_completado: !data.tipo_consulta?.includes('abandono'),
        p_razon_finalizacion: data.tipo_consulta?.includes('abandono') ? 'timeout' : 'completado',
        p_paso_abandono: data.tipo_consulta?.includes('abandono') ? data.tipo_consulta : null,
        p_metadata: JSON.stringify({
          bot_source: 'uniacc_direct',
        timestamp: new Date().toISOString(),
          ...data.datos_adicionales
        }),
        // 🆕 NUEVOS PARÁMETROS PARA PREFERENCIAS DE CONTACTO
        p_telefono_confirmado: data.telefono_confirmado !== undefined ? data.telefono_confirmado : true,
        p_preferencia_contacto: data.preferencia_contacto || 'normal'
      }

      console.log('🔧 DEBUG - Payload para función BD:', JSON.stringify(payload, null, 2))
      
      // 🎯 LLAMAR DIRECTAMENTE A LA FUNCIÓN DE BD
      const response = await axios.post(`${this.webhookUrl}/rpc/insertar_sesion_prospecto`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.webhookSecret,
          'Authorization': `Bearer ${this.webhookSecret}`,
          'User-Agent': 'UNIACC-ChatBot-Direct/1.0'
        },
        timeout: 15000
      })

      console.log('🔧 DEBUG - Response status:', response.status)
      console.log('🔧 DEBUG - Response data:', JSON.stringify(response.data, null, 2))

      if (response.status === 200 || response.status === 201) {
        const result = response.data
        console.log(`✅ [NUEVA BD] Sesión guardada - Usuario: ${result.es_nuevo_usuario ? 'NUEVO' : 'RECURRENTE'}`)
        console.log(`📊 [NUEVA BD] Sesión #${result.sesion_numero} - Perfil: ${result.perfil_usuario}`)
        
        return {
          success: true,
          prospectoId: result.historial_id,
          sesionNumero: result.sesion_numero,
          esNuevoUsuario: result.es_nuevo_usuario,
          perfilUsuario: result.perfil_usuario
        }
      } else {
        console.error('❌ Error HTTP llamando función BD:', response.status)
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        }
      }

    } catch (error: any) {
      console.error('💥 Error crítico con nueva BD:', error.message)
      if (error.response) {
        console.error('🔧 DEBUG - Error status:', error.response.status)
        console.error('🔧 DEBUG - Error data:', JSON.stringify(error.response.data, null, 2))
        console.error('🔧 DEBUG - Error headers:', error.response.headers)
      }
      
      // FALLBACK DESHABILITADO - No crear archivos
      console.log('📄 [FALLBACK] Deshabilitado - No se guarda archivo local')
      // await this.guardarFallbackLocal(data)
      
      return {
        success: false,
        error: error.message
      }
    }
  }

  private async guardarFallbackLocal(data: ProspectoData): Promise<void> {
    try {
      const fs = require('fs').promises
      const path = require('path')
      
      const fallbackDir = path.join(process.cwd(), 'logs', 'fallback-prospectos')
      await fs.mkdir(fallbackDir, { recursive: true })
      
      const filename = `prospecto-${Date.now()}-${data.whatsapp}.json`
      const filepath = path.join(fallbackDir, filename)
      
      await fs.writeFile(filepath, JSON.stringify({
        ...data,
        timestamp: new Date().toISOString(),
        fallback_reason: 'webhook_failed'
      }, null, 2))
      
      console.log(`💾 Prospecto guardado en fallback: ${filename}`)
      
    } catch (fallbackError) {
      console.error('💥 Error crítico en fallback:', fallbackError)
    }
  }

  async registrarInteraccion(whatsapp: string, mensaje: string, respuesta: string): Promise<void> {
    try {
      // 1. Crear o buscar conversación
      const { buscarConversacion, guardarConversacion, guardarMensaje } = await import('../utils/supabase-client')
      
      let conversacionId: string | undefined
      
      // Buscar conversación existente
      const conversacionExistente = await buscarConversacion(whatsapp)
      if (conversacionExistente.success && conversacionExistente.data) {
        conversacionId = conversacionExistente.data.id
        console.log(`🔍 [CONVERSACION] Encontrada existente: ${conversacionId}`)
      } else {
        // Crear nueva conversación
        const nuevaConversacion = await guardarConversacion({
          phone_number: whatsapp,
          contact_name: 'Usuario WhatsApp'
        })
        
        if (nuevaConversacion.success && nuevaConversacion.data) {
          conversacionId = nuevaConversacion.data.id
          console.log(`✅ [CONVERSACION] Nueva creada: ${conversacionId}`)
        }
      }
      
      if (!conversacionId) {
        console.warn('⚠️ No se pudo crear/encontrar conversación')
        return
      }
      
      // 2. Guardar mensaje del usuario
      const mensajeUsuario = await guardarMensaje({
        conversacion_id: conversacionId,
        content: mensaje,
        type: 'user',
        sender_id: whatsapp
      })
      
      if (mensajeUsuario.success) {
        console.log(`💬 [MENSAJE-USER] Guardado: "${mensaje.substring(0, 30)}..."`)
      } else {
        console.warn('⚠️ Error guardando mensaje usuario:', mensajeUsuario.error)
      }
      
      // 3. Guardar respuesta del bot
      const mensajeBot = await guardarMensaje({
        conversacion_id: conversacionId,
        content: respuesta,
        type: 'bot',
        sender_id: 'uniacc_bot'
      })
      
      if (mensajeBot.success) {
        console.log(`🤖 [MENSAJE-BOT] Guardado: "${respuesta.substring(0, 30)}..."`)
      } else {
        console.warn('⚠️ Error guardando mensaje bot:', mensajeBot.error)
      }
      
      console.log(`📊 Interacciones registradas para ${whatsapp} en conversación ${conversacionId}`)

    } catch (error) {
      console.warn('⚠️ Error registrando interacción (no crítico):', error)
    }
  }

  async obtenerEjecutivoDisponible(regionId?: string): Promise<{
    success: boolean
    ejecutivo?: {
      id: string
      nombre: string
      email: string
      telefono: string
      region: string
    }
    error?: string
  }> {
    try {
      const ejecutivosUrl = this.webhookUrl.replace('/api/botpress-webhook', '/api/ejecutivos/disponible')
      
      const params = regionId ? { region: regionId } : {}
      
      const response = await axios.get(ejecutivosUrl, {
        params,
        headers: {
          'Authorization': `Bearer ${this.webhookSecret}`
        },
        timeout: 5000
      })

      if (response.status === 200 && response.data.ejecutivo) {
        return {
          success: true,
          ejecutivo: response.data.ejecutivo
        }
      } else {
        return {
          success: false,
          error: 'No hay ejecutivos disponibles'
        }
      }

    } catch (error: any) {
      console.error('❌ Error obteniendo ejecutivo:', error.message)
      return {
        success: false,
        error: error.message
      }
    }
  }

  async notificarEjecutivo(ejecutivoId: string, prospectoData: ProspectoData): Promise<boolean> {
    try {
      const notificacionUrl = this.webhookUrl.replace('/api/botpress-webhook', '/api/notificaciones')
      
      const payload = {
        ejecutivo_id: ejecutivoId,
        tipo: 'nuevo_prospecto',
        prospecto: prospectoData,
        urgencia: 'normal',
        timestamp: new Date().toISOString()
      }

      const response = await axios.post(notificacionUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.webhookSecret}`
        },
        timeout: 5000
      })

      return response.status === 200

    } catch (error) {
      console.error('❌ Error notificando ejecutivo:', error)
      return false
    }
  }

  // Método para sincronizar datos pendientes en fallback
  async sincronizarFallbacks(): Promise<number> {
    try {
      const fs = require('fs').promises
      const path = require('path')
      
      const fallbackDir = path.join(process.cwd(), 'logs', 'fallback-prospectos')
      const files = await fs.readdir(fallbackDir).catch(() => [])
      
      let sincronizados = 0
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filepath = path.join(fallbackDir, file)
            const content = await fs.readFile(filepath, 'utf8')
            const data = JSON.parse(content)
            
            const result = await this.enviarProspecto(data)
            
            if (result.success) {
              await fs.unlink(filepath) // Eliminar archivo sincronizado
              sincronizados++
              console.log(`✅ Sincronizado fallback: ${file}`)
            }
            
          } catch (error) {
            console.error(`❌ Error sincronizando ${file}:`, error)
          }
        }
      }
      
      if (sincronizados > 0) {
        console.log(`🔄 Sincronizados ${sincronizados} prospectos desde fallback`)
      }
      
      return sincronizados
      
    } catch (error) {
      console.error('💥 Error en sincronización de fallbacks:', error)
      return 0
    }
  }

  /**
   * 💬 Guardar mensaje de ejecutivo en Supabase
   */
  async guardarMensajeEjecutivo(mensajeData: any): Promise<boolean> {
    try {
      console.log(`💬 [SUPABASE] Guardando mensaje de ejecutivo:`, mensajeData)
      
      // ✅ VERIFICAR CLIENTE SUPABASE
      if (!this.client) {
        console.log(`⚠️ [SUPABASE] Cliente no disponible para guardar mensaje ejecutivo`)
        return false
      }
      
      const { error } = await this.client
        .from('mensajes')
        .insert({
          conversacion_id: mensajeData.conversacion_id,
          content: mensajeData.content,
          type: 'agent', // ✅ Forzar tipo correcto
          sender_id: mensajeData.sender_id,
          sender_name: mensajeData.sender_name,
          message_type: mensajeData.message_type || 'text',
          metadata: mensajeData.metadata || {}
          // ✅ CAMPOS ELIMINADOS: timestamp, status (no existen en Supabase)
        })

      if (error) {
        console.error('❌ [SUPABASE] Error guardando mensaje ejecutivo:', error)
        return false
      }

      console.log(`✅ [SUPABASE] Mensaje de ejecutivo guardado exitosamente`)
      return true

    } catch (error) {
      console.error('💥 [SUPABASE] Error crítico guardando mensaje ejecutivo:', error)
      return false
    }
  }

  /**
   * 📨 Obtener mensajes nuevos desde una fecha específica
   */
  async obtenerMensajesNuevos(conversacionId: string, fechaDesde: Date): Promise<any[]> {
    try {
      console.log(`📨 [SUPABASE] Obteniendo mensajes nuevos desde ${fechaDesde.toISOString()}`)
      
      const { data, error } = await this.client!
        .from('mensajes')
        .select(`
          id,
          content,
          type,
          sender_id,
          sender_name,
          message_type,
          created_at,
          metadata
        `)
        .eq('conversacion_id', conversacionId)
        .gte('created_at', fechaDesde.toISOString())
        .order('created_at', { ascending: true })

      if (error) {
        console.error('❌ [SUPABASE] Error obteniendo mensajes nuevos:', error)
        return []
      }

      console.log(`📨 [SUPABASE] ${data?.length || 0} mensajes nuevos encontrados`)
      return data || []

    } catch (error) {
      console.error('💥 [SUPABASE] Error crítico obteniendo mensajes nuevos:', error)
      return []
    }
  }

  /**
   * 👥 Consultar estado de conversación (asignación a ejecutivo)
   */
  async consultarEstadoConversacion(whatsapp: string): Promise<any> {
    try {
      console.log(`👥 [SUPABASE] Consultando estado conversación: ${whatsapp}`)
      
      // 🔍 Verificar que el cliente Supabase esté disponible
      if (!this.client) {
        console.log(`⚠️ [SUPABASE] Cliente no disponible para consulta de conversación`)
        return null
      }
      
      const { data, error } = await this.client
        .from('conversaciones')
        .select(`
          id,
          assigned_to,
          handoff_status,
          handoff_accepted_at,
          agent_last_activity,
          phone_number
        `)
        .eq('phone_number', whatsapp)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        // No error si no existe - es normal para conversaciones nuevas
        if (error.code === 'PGRST116') {
          console.log(`👥 [SUPABASE] No existe conversación para ${whatsapp}`)
          return null
        }
        console.error('❌ [SUPABASE] Error consultando estado conversación:', error)
        return null
      }

      console.log(`👥 [SUPABASE] Estado conversación encontrado:`, {
        id: data.id,
        assigned_to: data.assigned_to,
        handoff_status: data.handoff_status,
        hasActiveAgent: !!data.assigned_to
      })
      
      return data

    } catch (error) {
      console.error('💥 [SUPABASE] Error crítico consultando estado conversación:', error)
      return null
    }
  }
}
