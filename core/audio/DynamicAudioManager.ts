/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Dynamic Audio Manager - Динамічне завантаження та кешування звуків з URL
 * Використовує DynamicAudioCache для управління пам'яттю
 */

import { DynamicAudioCache, AudioCacheConfig } from './DynamicAudioCache';

export interface DynamicSoundManifest {
  id: string;
  url: string;
  category: 'music' | 'sfx' | 'ambient';
  priority?: number;
  preload?: boolean;
}

export interface DynamicAudioOptions {
  /** Гучність звуку (0-1) */
  volume?: number;
  /** Швидкість відтворення (0.5-2.0) */
  rate?: number;
  /** Зациклити звук */
  loop?: boolean;
  /** Затримка перед початком (сек) */
  delay?: number;
  /** Позиційний звук */
  positional?: boolean;
  /** Налаштування кешу */
  cacheConfig?: Partial<AudioCacheConfig>;
}

/**
 * Менеджер для динамічного завантаження звуків з URL
 * Інтегрується з UnifiedAudioManager для синхронізації
 */
export class DynamicAudioManager {
  private static instance: DynamicAudioManager;
  
  private cache: DynamicAudioCache;
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  
  // Активні джерела звуку
  private activeSources: Map<string, AudioBufferSourceNode> = new Map();
  
  // Маніфест звуків
  private manifest: Map<string, DynamicSoundManifest> = new Map();
  
  // Стан
  private initialized = false;

  private constructor(config?: Partial<AudioCacheConfig>) {
    this.cache = new DynamicAudioCache(config);
  }

  /**
   * Отримати екземпляр (Singleton)
   */
  public static getInstance(config?: Partial<AudioCacheConfig>): DynamicAudioManager {
    if (!DynamicAudioManager.instance) {
      DynamicAudioManager.instance = new DynamicAudioManager(config);
    }
    return DynamicAudioManager.instance;
  }

  /**
   * Ініціалізувати менеджер
   */
  public init(audioContext: AudioContext, masterGain: GainNode): void {
    if (this.initialized) return;
    
    this.audioContext = audioContext;
    this.masterGain = masterGain;
    this.initialized = true;
    
    if (import.meta.env.DEV) {
      console.log('🎵 Dynamic Audio Manager initialized');
    }
  }

  /**
   * Зареєструвати маніфест звуків
   */
  public registerManifest(manifest: DynamicSoundManifest[]): void {
    for (const sound of manifest) {
      this.manifest.set(sound.id, sound);
      
      // Якщо preload = true, завантажуємо одразу
      if (sound.preload) {
        this.preload(sound.id).catch(err => {
          console.warn(`[DynamicAudio] Failed to preload ${sound.id}:`, err);
        });
      }
    }
    
    if (import.meta.env.DEV) {
      console.log(`[DynamicAudio] Registered ${manifest.length} sounds`);
    }
  }

  /**
   * Попередньо завантажити звук
   */
  public async preload(soundId: string): Promise<void> {
    const manifestEntry = this.manifest.get(soundId);
    if (!manifestEntry) {
      throw new Error(`Sound ${soundId} not found in manifest`);
    }

    await this.cache.load(soundId, () => this.fetchAudioBuffer(manifestEntry.url));
  }

  /**
   * Попередньо завантажити кілька звуків
   */
  public async preloadMultiple(soundIds: string[]): Promise<void> {
    await Promise.allSettled(soundIds.map(id => this.preload(id)));
  }

  /**
   * Відтворити динамічний звук
   */
  public play(soundId: string, options: DynamicAudioOptions = {}): string | null {
    if (!this.initialized || !this.audioContext || !this.masterGain) {
      console.warn('[DynamicAudio] Not initialized');
      return null;
    }

    const buffer = this.cache.get(soundId);
    if (!buffer) {
      console.warn(`[DynamicAudio] Sound not in cache: ${soundId}`);
      // Спробувати завантажити
      this.loadAndPlay(soundId, options);
      return null;
    }

    return this.playBuffer(buffer, options);
  }

  /**
   * Відтворити буфер напряму
   */
  private playBuffer(buffer: AudioBuffer, options: DynamicAudioOptions): string {
    if (!this.audioContext || !this.masterGain) return '';

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    
    // Налаштування
    source.playbackRate.value = options.rate ?? 1.0;
    source.loop = options.loop ?? false;

    // Gain вузол для цього звуку
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = options.volume ?? 1.0;

    // Позиційний звук
    if (options.positional && this.audioContext.listener) {
      const panner = this.audioContext.createPanner();
      panner.panningModel = 'HRTF';
      source.connect(panner);
      panner.connect(gainNode);
    } else {
      source.connect(gainNode);
    }
    
    gainNode.connect(this.masterGain);

    // Затримка
    const delay = options.delay ?? 0;
    const startTime = this.audioContext.currentTime + delay;
    source.start(startTime);

    // Генеруємо унікальний ID
    const playId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.activeSources.set(playId, source);

    // Видаляємо після завершення
    source.onended = () => {
      this.activeSources.delete(playId);
      source.disconnect();
      gainNode.disconnect();
    };

    return playId;
  }

  /**
   * Завантажити та відтворити (lazy loading)
   */
  private async loadAndPlay(soundId: string, options: DynamicAudioOptions): Promise<void> {
    // Перевіряємо чи вже завантажується
    const existingPromise = this.cache.getLoadingPromise(soundId);
    if (existingPromise) {
      const buffer = await existingPromise;
      this.playBuffer(buffer, options);
      return;
    }

    // Завантажуємо
    const manifestEntry = this.manifest.get(soundId);
    if (!manifestEntry) {
      console.error(`[DynamicAudio] Sound not in manifest: ${soundId}`);
      return;
    }

    try {
      const buffer = await this.cache.load(soundId, () => this.fetchAudioBuffer(manifestEntry.url));
      this.playBuffer(buffer, options);
    } catch (err) {
      console.error(`[DynamicAudio] Failed to load ${soundId}:`, err);
    }
  }

  /**
   * Зупинити відтворення за ID
   */
  public stop(playId: string): void {
    const source = this.activeSources.get(playId);
    if (source) {
      try {
        source.stop();
      } catch {
        // Вже зупинено
      }
      this.activeSources.delete(playId);
    }
  }

  /**
   * Зупинити всі звуки
   */
  public stopAll(): void {
    for (const [, source] of this.activeSources) {
      try {
        source.stop();
      } catch {
        // Вже зупинено
      }
    }
    this.activeSources.clear();
  }

  /**
   * Оновити позицію слухача (для позиційного звуку)
   */
  public updateListenerPosition(x: number, y: number, z: number): void {
    if (!this.audioContext?.listener) return;
    
    if (this.audioContext.listener.positionX) {
      this.audioContext.listener.positionX.setValueAtTime(x, this.audioContext.currentTime);
      this.audioContext.listener.positionY.setValueAtTime(y, this.audioContext.currentTime);
      this.audioContext.listener.positionZ.setValueAtTime(z, this.audioContext.currentTime);
    } else {
      // Deprecated API для старих браузерів
      this.audioContext.listener.setPosition(x, y, z);
    }
  }

  /**
   * Отримати статистику кешу
   */
  public getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Очистити кеш
   */
  public clearCache(): void {
    this.cache.clear();
    if (import.meta.env.DEV) {
      console.log('[DynamicAudio] Cache cleared');
    }
  }

  /**
   * Встановити максимальний розмір кешу
   */
  public setMaxCacheSize(mb: number): void {
    this.cache.setMaxSize(mb);
  }

  /**
   * Отримати кеш
   */
  public getCache(): DynamicAudioCache {
    return this.cache;
  }

  /**
   * Завантажити AudioBuffer з URL
   */
  private async fetchAudioBuffer(url: string): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return await this.audioContext.decodeAudioData(arrayBuffer);
  }

  /**
   * Видалити ресурси
   */
  public dispose(): void {
    this.stopAll();
    this.clearCache();
    this.manifest.clear();
    this.initialized = false;
    
    if (import.meta.env.DEV) {
      console.log('🎵 Dynamic Audio Manager disposed');
    }
  }
}

// Експорт синглтона
export const dynamicAudio = DynamicAudioManager.getInstance();