/**
 * 💾 Cache Manager Interface
 * Interfaz unificada para diferentes sistemas de caché
 */

export interface CacheOptions {
  ttl?: number // Time to live en milisegundos
  tags?: string[] // Tags para invalidación masiva
  namespace?: string // Namespace para organización
  compress?: boolean // Comprimir datos grandes
  serialize?: boolean // Serializar objetos automáticamente
}

export interface CacheStats {
  hits: number
  misses: number
  sets: number
  deletes: number
  memory: number // Bytes usados
  keys: number // Número de keys
  hitRate: number // Porcentaje de aciertos
}

export interface ICacheManager {
  // 🔧 Operaciones básicas
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean>
  delete(key: string): Promise<boolean>
  exists(key: string): Promise<boolean>
  
  // 🏷️ Operaciones con tags
  setWithTags<T>(key: string, value: T, tags: string[], options?: CacheOptions): Promise<boolean>
  invalidateByTag(tag: string): Promise<number> // Retorna número de keys invalidadas
  invalidateByTags(tags: string[]): Promise<number>
  
  // 🧹 Operaciones de limpieza
  clear(): Promise<boolean>
  clearNamespace(namespace: string): Promise<number>
  clearExpired(): Promise<number>
  
  // 📊 Métricas y estadísticas
  getStats(): Promise<CacheStats>
  getKeys(pattern?: string): Promise<string[]>
  getSize(): Promise<number>
  
  // 🔄 Operaciones masivas
  mget<T>(keys: string[]): Promise<Map<string, T>>
  mset<T>(entries: Map<string, T>, options?: CacheOptions): Promise<boolean>
  mdelete(keys: string[]): Promise<number>
  
  // ⚡ Operaciones atómicas
  increment(key: string, amount?: number): Promise<number>
  decrement(key: string, amount?: number): Promise<number>
  
  // 🔄 Cache-aside pattern
  getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T>
  
  // 🔌 Lifecycle
  connect?(): Promise<void>
  disconnect?(): Promise<void>
  isConnected(): boolean
}
