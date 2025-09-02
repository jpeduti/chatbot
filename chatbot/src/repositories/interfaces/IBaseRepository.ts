/**
 * 🗄️ Base Repository Interface
 * Interfaz base para todos los repositorios
 */

export interface IBaseRepository<T, ID = string> {
  findById(id: ID): Promise<T | null>
  findMany(filters?: any): Promise<T[]>
  create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T>
  update(id: ID, data: Partial<T>): Promise<T | null>
  delete(id: ID): Promise<boolean>
  count(filters?: any): Promise<number>
}

export interface IPaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export interface IPaginationOptions {
  page?: number
  limit?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}
