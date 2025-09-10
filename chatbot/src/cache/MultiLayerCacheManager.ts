/**
 * 🔀 Multi-Layer Cache Manager
 * Sistema de caché de múltiples capas (L1: Memory, L2: Redis)
 */

import { ICacheManager, CacheOptions, CacheStats } from './interfaces/ICacheManager'
import { MemoryCacheManager } from './MemoryCacheManager'
import { RedisCacheManager } from './RedisCacheManager'

export interface MultiLayerConfig {
  l1MaxSize?: number
  l1TTL?: number
  l2Config?: any
  l1Only?: boolean // Solo usar L1 si L2 no está disponible
}

export class MultiLayerCacheManager implements ICacheManager {
  private l1Cache: MemoryCacheManager // Caché rápido en memoria
  private l2Cache: RedisCacheManager // Caché distribuido
  private l1Only: boolean

  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    memory: 0,
    keys: 0,
    hitRate: 0
  }

  constructor(config: MultiLayerConfig = {}) {
    // 🧠 L1: Memory Cache (rápido, pequeño)
    this.l1Cache = new MemoryCacheManager(
      config.l1MaxSize || 1000,
      config.l1TTL || 2 * 60 * 1000 // 2 minutos
    )

    // 🌐 L2: Redis Cache (persistente, distribuido)
    this.l2Cache = new RedisCacheManager(config.l2Config || {})
    this.l1Only = config.l1Only || false

    console.log(`🔀 [MULTILAYER-CACHE] Inicializado (L1Only: ${this.l1Only})`)
  }

  // 🔌 CONNECTION MANAGEMENT

  async connect(): Promise<void> {
    if (!this.l1Only) {
      await this.l2Cache.connect()
    }
  }

  async disconnect(): Promise<void> {
    if (!this.l1Only) {
      await this.l2Cache.disconnect()
    }
  }

  isConnected(): boolean {
    return this.l1Only || this.l2Cache.isConnected()
  }

  // 🔧 OPERACIONES BÁSICAS

  async get<T>(key: string): Promise<T | null> {
    // 🥇 L1: Intentar caché en memoria primero
    let value = await this.l1Cache.get<T>(key)
    
    if (value !== null) {
      this.stats.hits++
      this.updateHitRate()
      console.log(`🥇 [L1-HIT] ${key}`)
      return value
    }

    // 🥈 L2: Si no está en L1, intentar Redis
    if (!this.l1Only && this.l2Cache.isConnected()) {
      value = await this.l2Cache.get<T>(key)
      
      if (value !== null) {
        // 🔄 Promover a L1 para próximas consultas
        await this.l1Cache.set(key, value, { ttl: 2 * 60 * 1000 }) // 2 min en L1
        
        this.stats.hits++
        this.updateHitRate()
        console.log(`🥈 [L2-HIT-PROMOTE] ${key}`)
        return value
      }
    }

    this.stats.misses++
    this.updateHitRate()
    console.log(`❌ [CACHE-MISS] ${key}`)
    return null
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    let l1Success = true
    let l2Success = true

    // 🥇 L1: Siempre guardar en memoria (rápido)
    l1Success = await this.l1Cache.set(key, value, {
      ...options,
      ttl: Math.min(options.ttl || 2 * 60 * 1000, 2 * 60 * 1000) // Max 2 min en L1
    })

    // 🥈 L2: Guardar en Redis si está disponible
    if (!this.l1Only && this.l2Cache.isConnected()) {
      l2Success = await this.l2Cache.set(key, value, options)
    }

    const success = l1Success && (this.l1Only || l2Success)
    
    if (success) {
      this.stats.sets++
    }

    console.log(`💾 [MULTILAYER-SET] ${key} (L1: ${l1Success}, L2: ${l2Success})`)
    return success
  }

  async delete(key: string): Promise<boolean> {
    // 🗑️ Eliminar de ambas capas
    const l1Success = await this.l1Cache.delete(key)
    let l2Success = true
    
    if (!this.l1Only && this.l2Cache.isConnected()) {
      l2Success = await this.l2Cache.delete(key)
    }

    const success = l1Success || l2Success
    
    if (success) {
      this.stats.deletes++
    }

    console.log(`🗑️ [MULTILAYER-DELETE] ${key} (L1: ${l1Success}, L2: ${l2Success})`)
    return success
  }

  async exists(key: string): Promise<boolean> {
    // 🔍 Verificar en L1 primero
    if (await this.l1Cache.exists(key)) {
      return true
    }

    // 🔍 Verificar en L2 si L1 no tiene
    if (!this.l1Only && this.l2Cache.isConnected()) {
      return await this.l2Cache.exists(key)
    }

    return false
  }

  // 🏷️ OPERACIONES CON TAGS

  async setWithTags<T>(key: string, value: T, tags: string[], options: CacheOptions = {}): Promise<boolean> {
    const l1Success = await this.l1Cache.setWithTags(key, value, tags, options)
    let l2Success = true

    if (!this.l1Only && this.l2Cache.isConnected()) {
      l2Success = await this.l2Cache.setWithTags(key, value, tags, options)
    }

    return l1Success && (this.l1Only || l2Success)
  }

  async invalidateByTag(tag: string): Promise<number> {
    const l1Count = await this.l1Cache.invalidateByTag(tag)
    let l2Count = 0

    if (!this.l1Only && this.l2Cache.isConnected()) {
      l2Count = await this.l2Cache.invalidateByTag(tag)
    }

    const total = l1Count + l2Count
    console.log(`🏷️ [MULTILAYER-INVALIDATE-TAG] ${tag}: L1=${l1Count}, L2=${l2Count}`)
    return total
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    let total = 0
    for (const tag of tags) {
      total += await this.invalidateByTag(tag)
    }
    return total
  }

  // 🧹 OPERACIONES DE LIMPIEZA

  async clear(): Promise<boolean> {
    const l1Success = await this.l1Cache.clear()
    let l2Success = true

    if (!this.l1Only && this.l2Cache.isConnected()) {
      l2Success = await this.l2Cache.clear()
    }

    console.log(`🧹 [MULTILAYER-CLEAR] L1: ${l1Success}, L2: ${l2Success}`)
    return l1Success && (this.l1Only || l2Success)
  }

  async clearNamespace(namespace: string): Promise<number> {
    const l1Count = await this.l1Cache.clearNamespace(namespace)
    let l2Count = 0

    if (!this.l1Only && this.l2Cache.isConnected()) {
      l2Count = await this.l2Cache.clearNamespace(namespace)
    }

    return l1Count + l2Count
  }

  async clearExpired(): Promise<number> {
    const l1Count = await this.l1Cache.clearExpired()
    let l2Count = 0

    if (!this.l1Only && this.l2Cache.isConnected()) {
      l2Count = await this.l2Cache.clearExpired()
    }

    return l1Count + l2Count
  }

  // 📊 MÉTRICAS Y ESTADÍSTICAS

  async getStats(): Promise<CacheStats> {
    const l1Stats = await this.l1Cache.getStats()
    let l2Stats: CacheStats | null = null

    if (!this.l1Only && this.l2Cache.isConnected()) {
      l2Stats = await this.l2Cache.getStats()
    }

    // 🔄 Combinar estadísticas
    const combinedStats: CacheStats = {
      hits: this.stats.hits,
      misses: this.stats.misses,
      sets: this.stats.sets,
      deletes: this.stats.deletes,
      memory: l1Stats.memory + (l2Stats?.memory || 0),
      keys: l1Stats.keys + (l2Stats?.keys || 0),
      hitRate: this.stats.hitRate
    }

    return combinedStats
  }

  async getKeys(pattern?: string): Promise<string[]> {
    const l1Keys = await this.l1Cache.getKeys(pattern)
    let l2Keys: string[] = []

    if (!this.l1Only && this.l2Cache.isConnected()) {
      l2Keys = await this.l2Cache.getKeys(pattern)
    }

    // 🔄 Unificar y deduplicar
    return Array.from(new Set([...l1Keys, ...l2Keys]))
  }

  async getSize(): Promise<number> {
    const l1Size = await this.l1Cache.getSize()
    let l2Size = 0

    if (!this.l1Only && this.l2Cache.isConnected()) {
      l2Size = await this.l2Cache.getSize()
    }

    return l1Size + l2Size
  }

  // 🔄 OPERACIONES MASIVAS

  async mget<T>(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>()
    const missingKeys: string[] = []

    // 🥇 L1: Obtener lo que esté en memoria
    const l1Results = await this.l1Cache.mget<T>(keys)
    
    Array.from(l1Results.entries()).forEach(([key, value]) => {
      result.set(key, value)
    })

    // 🔍 Identificar keys faltantes
    for (const key of keys) {
      if (!result.has(key)) {
        missingKeys.push(key)
      }
    }

    // 🥈 L2: Obtener keys faltantes de Redis
    if (missingKeys.length > 0 && !this.l1Only && this.l2Cache.isConnected()) {
      const l2Results = await this.l2Cache.mget<T>(missingKeys)
      
      Array.from(l2Results.entries()).forEach(async ([key, value]) => {
        result.set(key, value)
        // 🔄 Promover a L1
        await this.l1Cache.set(key, value, { ttl: 2 * 60 * 1000 })
      })
    }

    return result
  }

  async mset<T>(entries: Map<string, T>, options: CacheOptions = {}): Promise<boolean> {
    const l1Success = await this.l1Cache.mset(entries, options)
    let l2Success = true

    if (!this.l1Only && this.l2Cache.isConnected()) {
      l2Success = await this.l2Cache.mset(entries, options)
    }

    return l1Success && (this.l1Only || l2Success)
  }

  async mdelete(keys: string[]): Promise<number> {
    const l1Count = await this.l1Cache.mdelete(keys)
    let l2Count = 0

    if (!this.l1Only && this.l2Cache.isConnected()) {
      l2Count = await this.l2Cache.mdelete(keys)
    }

    return Math.max(l1Count, l2Count) // Retornar el mayor (keys realmente eliminadas)
  }

  // ⚡ OPERACIONES ATÓMICAS

  async increment(key: string, amount = 1): Promise<number> {
    // ⚡ Usar L2 para operaciones atómicas (más confiable)
    if (!this.l1Only && this.l2Cache.isConnected()) {
      const result = await this.l2Cache.increment(key, amount)
      // 🔄 Invalidar L1 para evitar inconsistencias
      await this.l1Cache.delete(key)
      return result
    }

    // 🔄 Fallback a L1
    return await this.l1Cache.increment(key, amount)
  }

  async decrement(key: string, amount = 1): Promise<number> {
    return this.increment(key, -amount)
  }

  // 🔄 CACHE-ASIDE PATTERN

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    let value = await this.get<T>(key)
    
    if (value !== null) {
      return value
    }

    // 🏭 Ejecutar factory
    console.log(`🏭 [MULTILAYER-FACTORY] ${key}`)
    value = await factory()
    
    // 💾 Guardar en ambas capas
    await this.set(key, value, options)
    
    return value
  }

  // 🛠️ MÉTODOS ESPECÍFICOS DE MULTILAYER

  /**
   * 🔄 Promover key de L2 a L1
   */
  async promoteToL1<T>(key: string): Promise<boolean> {
    if (this.l1Only || !this.l2Cache.isConnected()) {
      return false
    }

    const value = await this.l2Cache.get<T>(key)
    
    if (value !== null) {
      return await this.l1Cache.set(key, value, { ttl: 2 * 60 * 1000 })
    }

    return false
  }

  /**
   * 📊 Obtener estadísticas por capa
   */
  async getLayeredStats(): Promise<{
    l1: CacheStats
    l2: CacheStats | null
    combined: CacheStats
  }> {
    const l1 = await this.l1Cache.getStats()
    let l2: CacheStats | null = null

    if (!this.l1Only && this.l2Cache.isConnected()) {
      l2 = await this.l2Cache.getStats()
    }

    const combined = await this.getStats()

    return { l1, l2, combined }
  }

  // 🛠️ HELPER METHODS

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0
  }
}
