/**
 * 🎯 Prospect Types  
 * Tipos para manejo de prospectos y base de datos
 */

export interface ProspectoData {
  whatsapp: string
  nombre: string
  email: string | null
  telefono: string | null
  edad?: number
  region?: string
  carrera_interes?: string
  facultad_interes?: string
  nivel_interes?: string
  tipo_consulta?: string
  source: string
  flujo_actual?: string
  telefono_confirmado?: boolean
  preferencia_contacto?: string
  datos_adicionales?: any
}

export interface ProgressiveStep {
  userId: string
  campo: string
  valor: any
  progreso_porcentaje: number
  pasos_completados: string[]
  metadata: {
    campo_capturado: string
    valor_capturado: any
    paso_numero: number
    progreso_porcentaje: number
    pasos_completados: string[]
  }
}

export interface ProspectResult {
  success: boolean
  message?: string
  data?: ProspectoData | null
  prospectoId?: string
  error?: string
  isReturning?: boolean
  sessionCount?: number
  fromHistory?: boolean
}

export interface SessionResult {
  success: boolean
  message?: string
  historial_id?: string
  sesion_numero?: number
  es_nuevo_usuario?: boolean
  perfil_usuario?: string
  razon?: string
  error?: string
}
