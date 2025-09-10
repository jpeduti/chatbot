/**
 * 📋 User State Types
 * Tipos para el manejo de estado de usuarios
 */

export interface ProspectData {
  nombre?: string
  email?: string
  telefono?: string | null
  telefono_detectado?: string
  telefono_confirmado?: boolean
  preferencia_contacto?: string
  whatsapp?: string
  edad?: number
  region?: string
  carrera_interes?: string
  nivel_interes?: string
  campus_preferido?: string
}

export interface UserState {
  flujo_actual: string | null
  paso_actual: string | null
  opcion_menu_seleccionada?: string
  datos_prospecto: ProspectData
  facultad_seleccionada?: string
  carrera_seleccionada?: string
  carreras_sugeridas?: any[]
  historial_consultas?: string[]
  ultima_carrera_consultada?: string
  es_usuario_recurrente?: boolean
  fecha_ultima_interaccion?: Date
  intentos_captura: number
  // Campos para timeout
  timeout_warning_sent?: boolean
  session_timeout_id?: NodeJS.Timeout
  warning_timeout_id?: NodeJS.Timeout
  // Campos para captura incremental
  prospecto_id?: string
  ultimo_campo_guardado?: 'nombre' | 'email' | 'telefono' | 'edad' | 'region'
  campos_capturados?: string[]
  fecha_creacion_prospecto?: Date
}

export interface TimeoutMessage {
  tipo: 'warning' | 'timeout'
  mensaje: string
  timestamp: Date
}

export type FlowType = 'captura_inicial' | 'advisor_connection' | 'menu_principal' | 'exploracion_carreras' | 'detalle_carrera'
export type StepType = 'solicitar_nombre' | 'solicitar_email' | 'solicitar_edad' | 'solicitar_region' | 'confirmar_telefono'