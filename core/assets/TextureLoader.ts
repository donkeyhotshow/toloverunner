/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Система загрузки и управления текстурами
 */

import * as THREE from 'three';
import { TextureLoader as ThreeTextureLoader } from 'three';

/**
 * Типы текстур в игре
 */
export enum TextureType {
  // Шрифты и UI
  FONT_COMIC = 'font_comic',
  FONT_BOLD = 'font_bold',
  FONT_DIGITAL = 'font_digital',

  // Эффекты
  FX_PARTICLE = 'fx_particle',
  FX_GLOW = 'fx_glow',
  FX_SPARKLE = 'fx_sparkle',
  FX_EXPLOSION = 'fx_explosion',
  FX_LIGHTNING = 'fx_lightning',
  FX_SHIELD = 'fx_shield',
  FX_SPEED = 'fx_speed',

  // Враги
  ENEMY_VIRUS_PURPLE = 'enemy_virus_purple',
  ENEMY_VIRUS_GREEN = 'enemy_virus_green',
  ENEMY_VIRUS_YELLOW = 'enemy_virus_yellow',
  ENEMY_VIRUS_RED = 'enemy_virus_red',
  ENEMY_BACTERIA = 'enemy_bacteria',

  // Окружение
  TRACK_BASE = 'track_base',
  TRACK_DETAIL = 'track_detail',
  BACKGROUND_DNA = 'background_dna',
}

/**
 * Маппинг типов текстур на пути к файлам
 */
const TEXTURE_PATHS: Record<TextureType, string> = {
  // Шрифты
  [TextureType.FONT_COMIC]: '/assets/fonts/font_comic.png',
  [TextureType.FONT_BOLD]: '/assets/fonts/font_bold.png',
  [TextureType.FONT_DIGITAL]: '/assets/fonts/font_digital.png',

  // Эффекты
  [TextureType.FX_PARTICLE]: '/assets/fx/fx_particle.png',
  [TextureType.FX_GLOW]: '/assets/fx/fx_glow.png',
  [TextureType.FX_SPARKLE]: '/assets/fx/fx_sparkle.png',
  [TextureType.FX_EXPLOSION]: '/assets/fx/fx_explosion.png',
  [TextureType.FX_LIGHTNING]: '/assets/fx/fx_lightning.png',
  [TextureType.FX_SHIELD]: '/assets/fx/fx_shield.png',
  [TextureType.FX_SPEED]: '/assets/fx/fx_speed.png',

  // Враги
  [TextureType.ENEMY_VIRUS_PURPLE]: '/assets/enemies/virus_purple.png',
  [TextureType.ENEMY_VIRUS_GREEN]: '/assets/enemies/virus_green.png',
  [TextureType.ENEMY_VIRUS_YELLOW]: '/assets/enemies/virus_yellow.png',
  [TextureType.ENEMY_VIRUS_RED]: '/assets/enemies/virus_red.png',
  [TextureType.ENEMY_BACTERIA]: '/assets/enemies/bacteria_1.png',

  // Окружение
  [TextureType.TRACK_BASE]: '/assets/track_base.png',
  [TextureType.TRACK_DETAIL]: '/assets/track_detail.png',
  [TextureType.BACKGROUND_DNA]: '/assets/background_dna.png',
};

/**
 * Менеджер текстур
 * 
 * Загружает, кэширует и управляет текстурами игры.
 * Использует Three.js TextureLoader для загрузки изображений.
 */
export class TextureManager {
  private static instance: TextureManager;
  private loader: ThreeTextureLoader;
  private cache: Map<TextureType, THREE.Texture> = new Map();
  private loadingPromises: Map<TextureType, Promise<THREE.Texture>> = new Map();

  private constructor() {
    this.loader = new ThreeTextureLoader();
  }

  /**
   * Получить единственный экземпляр менеджера (Singleton)
   */
  static getInstance(): TextureManager {
    if (!TextureManager.instance) {
      TextureManager.instance = new TextureManager();
    }
    return TextureManager.instance;
  }

  /**
   * Загрузить текстуру
   * @param type Тип текстуры
   * @param options Опции загрузки
   * @returns Promise с загруженной текстурой
   */
  async loadTexture(
    type: TextureType,
    options: {
      repeat?: [number, number];
      wrapS?: THREE.Wrapping;
      wrapT?: THREE.Wrapping;
      flipY?: boolean;
      generateMipmaps?: boolean;
      minFilter?: THREE.TextureFilter;
      magFilter?: THREE.TextureFilter;
      anisotropy?: number;
    } = {}
  ): Promise<THREE.Texture> {
    // Проверяем кэш
    if (this.cache.has(type)) {
      return this.cache.get(type)!;
    }

    // Проверяем, не загружается ли уже
    if (this.loadingPromises.has(type)) {
      return this.loadingPromises.get(type)!;
    }

    // Загружаем текстуру
    const path = TEXTURE_PATHS[type];
    if (!path) {
      throw new Error(`Texture path not found for type: ${type}`);
    }

    const promise = new Promise<THREE.Texture>((resolve, _reject) => {
      this.loader.load(
        path,
        (texture) => {
          // Применяем опции
          if (options.repeat) {
            texture.repeat.set(options.repeat[0], options.repeat[1]);
          }
          if (options.wrapS !== undefined) {
            texture.wrapS = options.wrapS;
          }
          if (options.wrapT !== undefined) {
            texture.wrapT = options.wrapT;
          }
          if (options.flipY !== undefined) {
            texture.flipY = options.flipY;
          }
          if (options.generateMipmaps !== undefined) {
            texture.generateMipmaps = options.generateMipmaps;
          }
          if (options.minFilter !== undefined) {
            texture.minFilter = options.minFilter;
          }
          if (options.magFilter !== undefined) {
            texture.magFilter = options.magFilter as THREE.MagnificationTextureFilter;
          }

          if (options.anisotropy !== undefined) {
            texture.anisotropy = options.anisotropy;
          } else {
            // Default 4 for performance/quality balance on most textures
            texture.anisotropy = 4;
          }

          texture.colorSpace = THREE.SRGBColorSpace;
          this.cache.set(type, texture);
          this.loadingPromises.delete(type);
          resolve(texture);
        },
        undefined,
        (error) => {
          console.warn(`Failed to load texture ${type}:`, error);
          // Fallback кэшируется и освобождается через dispose() (IMPROVEMENTS_BACKLOG 4.3)
          const fallback = this.createFallbackTexture(type);
          this.cache.set(type, fallback);
          this.loadingPromises.delete(type);
          resolve(fallback);
        }
      );
    });

    this.loadingPromises.set(type, promise);
    return promise;
  }

  /**
   * Получить текстуру из кэша (синхронно)
   * @param type Тип текстуры
   * @returns Текстура или null, если не загружена
   */
  getTexture(type: TextureType): THREE.Texture | null {
    return this.cache.get(type) || null;
  }

  /**
   * Предзагрузить набор текстур
   * @param types Массив типов текстур
   * @returns Promise, который разрешается когда все текстуры загружены
   */
  async preloadTextures(types: TextureType[]): Promise<void> {
    await Promise.all(types.map(type => this.loadTexture(type)));
  }

  /**
   * Создать fallback текстуру при ошибке загрузки
   */
  private createFallbackTexture(type: TextureType): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Цвета в зависимости от типа
    let color = '#ff80ab';
    if (type.includes('enemy')) color = '#cc5de8';
    if (type.includes('fx')) color = '#00f5d4';
    if (type.includes('font')) color = '#ffffff';

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#000000';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('?', 128, 160);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Очистить кэш и освободить память (в т.ч. fallback-текстуры, созданные при ошибке загрузки).
   */
  dispose(): void {
    this.cache.forEach(texture => texture.dispose());
    this.cache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Получить статистику загрузки
   */
  getStats(): { loaded: number; loading: number; total: number } {
    return {
      loaded: this.cache.size,
      loading: this.loadingPromises.size,
      total: Object.keys(TEXTURE_PATHS).length
    };
  }
}

/**
 * Экспорт единственного экземпляра
 */
export const textureManager = TextureManager.getInstance();

