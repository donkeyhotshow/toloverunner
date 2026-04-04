/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Dynamic Audio Cache - Система кешування звуків з LRU/LFU eviction
 * Підтримує динамічне завантаження та управління пам'яттю
 */

export type EvictionPolicy = 'LRU' | 'LFU';

export interface AudioCacheConfig {
  /** Максимальний розмір кешу в MB */
  maxCacheSizeMB: number;
  /** Пріоритет завантаження звуків */
  preloadPriority: string[];
  /** Політика витіснення */
  evictionPolicy: EvictionPolicy;
  /** Мінімальний вік для LFU (ms) */
  lfuMinAge?: number;
}

export interface CachedAudioAsset {
  id: string;
  buffer: AudioBuffer;
  sizeBytes: number;
  lastUsed: number;
  useCount: number;
  priority: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  currentSizeMB: number;
  itemCount: number;
}

/**
 * LRU/LFU кеш для AudioBuffer з підтримкой динамічного завантаження
 */
export class DynamicAudioCache {
  private cache: Map<string, CachedAudioAsset> = new Map();
  private loadingPromises: Map<string, Promise<AudioBuffer>> = new Map();
  private config: AudioCacheConfig;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    currentSizeMB: 0,
    itemCount: 0
  };

  constructor(config: Partial<AudioCacheConfig> = {}) {
    this.config = {
      maxCacheSizeMB: config.maxCacheSizeMB ?? 32,
      preloadPriority: config.preloadPriority ?? [],
      evictionPolicy: config.evictionPolicy ?? 'LRU',
      lfuMinAge: config.lfuMinAge ?? 1000
    };
  }

  /**
   * Отримати звук з кешу
   */
  get(id: string): AudioBuffer | null {
    const asset = this.cache.get(id);
    
    if (asset) {
      // Оновлюємо статистику
      asset.lastUsed = Date.now();
      asset.useCount++;
      this.stats.hits++;
      return asset.buffer;
    }
    
    this.stats.misses++;
    return null;
  }

  /**
   * Перевірити чи звук завантажується
   */
  isLoading(id: string): boolean {
    return this.loadingPromises.has(id);
  }

  /**
   * Отримати Promise завантаження звуку
   */
  getLoadingPromise(id: string): Promise<AudioBuffer> | null {
    return this.loadingPromises.get(id) ?? null;
  }

  /**
   * Завантажити звук в кеш
   */
  async load(id: string, loadFn: () => Promise<AudioBuffer>): Promise<AudioBuffer> {
    // Перевіряємо чи вже в кеші
    const cached = this.get(id);
    if (cached) return cached;

    // Перевіряємо чи вже завантажується
    const existingPromise = this.loadingPromises.get(id);
    if (existingPromise) {
      const buffer = await existingPromise;
      return buffer;
    }

    // Створюємо новий Promise завантаження
    const promise = loadFn();
    this.loadingPromises.set(id, promise);

    try {
      const buffer = await promise;
      
      // Обчислюємо розмір
      const sizeBytes = this.calculateBufferSize(buffer);
      
      // Перевіряємо чи потрібно витісняти
      await this.ensureSpace(sizeBytes);
      
      // Додаємо до кешу
      const priority = this.config.preloadPriority.indexOf(id);
      const asset: CachedAudioAsset = {
        id,
        buffer,
        sizeBytes,
        lastUsed: Date.now(),
        useCount: 1,
        priority: priority >= 0 ? priority : 999
      };
      
      this.cache.set(id, asset);
      this.updateStats();
      
      return buffer;
    } finally {
      this.loadingPromises.delete(id);
    }
  }

  /**
   * Видалити звук з кешу
   */
  remove(id: string): boolean {
    const asset = this.cache.get(id);
    if (asset) {
      this.cache.delete(id);
      this.updateStats();
      return true;
    }
    return false;
  }

  /**
   * Очистити весь кеш
   */
  clear(): void {
    this.cache.clear();
    this.stats.evictions += this.stats.itemCount;
    this.updateStats();
  }

  /**
   * Встановити максимальний розмір кешу
   */
  setMaxSize(mb: number): void {
    this.config.maxCacheSizeMB = mb;
    this.ensureSpace(0); // Примусове витіснення якщо потрібно
  }

  /**
   * Отримати статистику кешу
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Отримати поточний конфіг
   */
  getConfig(): AudioCacheConfig {
    return { ...this.config };
  }

  /**
   * Обчислити розмір AudioBuffer в байтах
   */
  private calculateBufferSize(buffer: AudioBuffer): number {
    // AudioBuffer: length * numberOfChannels * bytesPerSample
    // Float32 = 4 bytes per sample
    return buffer.length * buffer.numberOfChannels * 4;
  }

  /**
   * Оновити статистику
   */
  private updateStats(): void {
    let totalBytes = 0;
    for (const asset of this.cache.values()) {
      totalBytes += asset.sizeBytes;
    }
    this.stats.currentSizeMB = totalBytes / (1024 * 1024);
    this.stats.itemCount = this.cache.size;
  }

  /**
   * Забезпечити достатньо місця в кеші
   */
  private async ensureSpace(requiredBytes: number): Promise<void> {
    const maxBytes = this.config.maxCacheSizeMB * 1024 * 1024;
    
    while (this.getCurrentBytes() + requiredBytes > maxBytes && this.cache.size > 0) {
      await this.evict();
    }
  }

  /**
   * Отримати поточний розмір в байтах
   */
  private getCurrentBytes(): number {
    let bytes = 0;
    for (const asset of this.cache.values()) {
      bytes += asset.sizeBytes;
    }
    return bytes;
  }

  /**
   * Витіснити найменш використовуваний елемент
   */
  private async evict(): Promise<void> {
    let idToEvict: string | null = null;

    if (this.config.evictionPolicy === 'LRU') {
      // LRU - витісняємо найдовше невикористовуваний
      let oldestTime = Infinity;
      for (const [id, asset] of this.cache.entries()) {
        if (asset.lastUsed < oldestTime) {
          oldestTime = asset.lastUsed;
          idToEvict = id;
        }
      }
    } else {
      // LFU - витісняємо найменш використовуваний
      // Але враховуємо вік (lfuMinAge)
      const now = Date.now();
      let lowestScore = Infinity;
      
      for (const [id, asset] of this.cache.entries()) {
        const age = now - asset.lastUsed;
        const score = asset.useCount / Math.max(1, age / this.config.lfuMinAge!);
        
        if (score < lowestScore) {
          lowestScore = score;
          idToEvict = id;
        }
      }
    }

    if (idToEvict) {
      this.remove(idToEvict);
      this.stats.evictions++;
      if (import.meta.env.DEV) {
        console.log(`[AudioCache] Evicted: ${idToEvict}, Policy: ${this.config.evictionPolicy}`);
      }
    }
  }
}

// Експорт синглтона для використання
export const audioCache = new DynamicAudioCache();