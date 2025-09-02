/**
 * 🎯 Prospecto Repository Interface
 * Interfaz específica para operaciones de prospectos
 */

import { IBaseRepository, IPaginatedResult, IPaginationOptions } from './IBaseRepository'
import { prospecto_actual, prospecto_historial, Prisma } from '../../generated/prisma'

export interface IProspectoActualRepository extends IBaseRepository<prospecto_actual, string> {
  // 🔍 Métodos de búsqueda específicos
  findByWhatsapp(whatsapp: string): Promise<prospecto_actual | null>
  findByEmail(email: string): Promise<prospecto_actual | null>
  findByTelefono(telefono: string): Promise<prospecto_actual | null>
  
  // 📊 Búsquedas avanzadas
  findActiveProspects(limit?: number): Promise<prospecto_actual[]>
  findPriorityProspects(): Promise<prospecto_actual[]>
  findByCarrera(carrera: string): Promise<prospecto_actual[]>
  findByRegion(region: string): Promise<prospecto_actual[]>
  
  // 🔄 Operaciones específicas
  updateLastInteraction(whatsapp: string): Promise<void>
  incrementSessionCount(whatsapp: string): Promise<void>
  assignToExecutive(whatsapp: string, executiveId: string): Promise<void>
  
  // 📈 Métricas
  getProspectStats(): Promise<{
    total: number
    nuevos: number
    activos: number
    prioritarios: number
  }>
  
  // 🔍 Búsquedas con paginación
  findPaginated(
    filters: Prisma.prospecto_actualWhereInput,
    options: IPaginationOptions
  ): Promise<IPaginatedResult<prospecto_actual>>
}

export interface IProspectoHistorialRepository extends IBaseRepository<prospecto_historial, string> {
  // 🔍 Métodos de búsqueda específicos
  findByWhatsapp(whatsapp: string): Promise<prospecto_historial[]>
  findByProspectoId(prospectoId: string): Promise<prospecto_historial[]>
  findRecentSessions(limit?: number): Promise<prospecto_historial[]>
  
  // 📊 Métricas y análisis
  getSessionsByPeriod(start: Date, end: Date): Promise<prospecto_historial[]>
  getConversionFunnel(): Promise<{
    step: string
    count: number
    percentage: number
  }[]>
  
  // 🎯 Progressive Capture específico
  saveProgressiveStep(data: {
    whatsapp: string
    sesion_numero: number
    tipo_consulta: string
    nombre: string
    email?: string
    telefono?: string
    edad?: number
    region?: string
    metadata?: any
  }): Promise<prospecto_historial>
  
  // 📈 Analytics
  getAbandonmentAnalysis(): Promise<{
    paso: string
    abandonos: number
    rate: number
  }[]>
  
  // 🎯 Métodos auxiliares
  getLatestSessionNumber(whatsapp: string): Promise<number>
  updateSessionEnd(id: string, razonFinalizacion?: string): Promise<void>
}

// 🎯 Tipos específicos para operaciones
export interface CreateProspectoData {
  whatsapp: string
  nombre: string
  email?: string | null
  telefono?: string | null
  edad?: number | null
  region?: string | null
  carrera_interes?: string | null
  nivel_interes?: string | null
  tipo_consulta?: string | null
  telefono_confirmado?: boolean | null
  preferencia_contacto?: string | null
  metadata?: any
}

export interface UpdateProspectoData {
  nombre?: string
  email?: string
  telefono?: string
  edad?: number
  region?: string
  carrera_interes?: string
  nivel_interes?: string
  estado?: string
  telefono_confirmado?: boolean
  preferencia_contacto?: string
  metadata?: any
}
