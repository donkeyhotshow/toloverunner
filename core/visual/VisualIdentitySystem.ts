/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Visual Identity System - Система візуальної ідентичності
 * 
 * Особливості:
 * - Кольорова палітра для біологічного комікс-стилю
 * - Консистентне арт-напрям
 * - Guidelines для візуальної читабельності
 * - Адаптація під Subway Surfers підхід
 */

import * as THREE from 'three';

// === КОЛЬОРОВА ПАЛІТРА ===

// Основні кольори
export const COLOR_PALETTE = {
  // Primary - біологічні акценти
  primary: {
    red: '#FF6B6B',      // Кров/корал
    green: '#4ECDC4',    // Тканина/бірюз
    yellow: '#FFE66D'    // Жовток/золото
  },
  
  // Secondary - додаткові
  secondary: {
    pink: '#FF69B4',     // Біологічний акцент
    purple: '#9B59B6',   // Глибока тканина
    blue: '#3498DB',      // Вена/глибина
    orange: '#E67E22',   // Фолікул
    coral: '#E74C3C'     // Забарвлення
  },
  
  // Neutral - нейтральні
  neutral: {
    light: '#F5F5F5',
    mid: '#CCCCCC',
    dark: '#2C3E50',
    background: '#1A1A2E',
    surface: '#16213E'
  },
  
  // Game-specific кольори
  game: {
    player: '#FFF8F0',     // Основний колір гравця
    playerRim: '#FFB6C1', // Rim гравця
    obstacleDanger: '#FF3333', // Небезпека
    obstacleWarning: '#FF9933', // Попередження
    collectible: '#FF00FF',   // Збір предметів
    safe: '#33FF33',          // Безпечний шлях
    powerup: '#C44DFF',       // Power-up
    shield: '#00FFFF',        // Щит
    speed: '#FFFF00'          // Прискорення
  }
} as const;

// === ТИПОГРАФІКА ===

export const TYPOGRAPHY = {
  // Основні шрифти (системні)
  primary: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  display: '"Bangers", "Comic Sans MS", cursive, sans-serif',
  monospace: '"Fira Code", "Consolas", monospace',
  
  // Розміри для UI
  sizes: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem'      // 48px
  },
  
  // Вага шрифту
  weights: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  }
} as const;

// === СТИЛЬОВІ НАПРЯМКИ ===

// Outline налаштування
export const OUTLINE_STYLE = {
  // Товщина лінії
  width: {
    thin: 0.015,
    medium: 0.025,
    thick: 0.035
  },
  // Колір
  color: '#000000',
  // Призначення
  usage: {
    player: 0.025,
    obstacle: 0.02,
    collectible: 0.015,
    decoration: 0.01
  }
} as const;

// Shading налаштування
export const SHADING_STYLE = {
  type: 'cell' as const,
  bands: 3,
  ambient: 0.4,
  
  // Пресети для різних об'єктів
  presets: {
    player: { bands: 4, ambient: 0.35 },
    obstacle: { bands: 3, ambient: 0.4 },
    collectible: { bands: 4, ambient: 0.3 },
    environment: { bands: 3, ambient: 0.5 }
  }
} as const;

// === БІОМ НАЛАШТУВАННЯ ===

// Налаштування для кожного біому
export const BIOME_VISUAL_THEMES = {
  BIO_JUNGLE: {
    name: 'Bio Jungle',
    colors: {
      primary: '#228B22',
      secondary: '#90EE90',
      accent: '#FFD93D',
      warning: '#FF6B6B',
      background: '#1A4A1A',
      fog: '#2E8B57'
    },
    atmosphere: {
      density: 0.3,
      color: '#90EE90',
      particles: 'pollen'
    },
    lighting: {
      ambient: { color: '#1A4A1A', intensity: 0.4 },
      main: { color: '#FFE4B5', intensity: 1.2 },
      rim: { color: '#90EE90', intensity: 0.5 }
    }
  },
  
  VEIN_TUNNEL: {
    name: 'Vein Tunnel',
    colors: {
      primary: '#8B0000',
      secondary: '#FF1493',
      accent: '#FF6B6B',
      warning: '#FFFF00',
      background: '#2D0000',
      fog: '#4A0000'
    },
    atmosphere: {
      density: 0.5,
      color: '#FF6B6B',
      particles: 'cells'
    },
    lighting: {
      ambient: { color: '#4A0000', intensity: 0.3 },
      main: { color: '#FF6B6B', intensity: 0.8 },
      rim: { color: '#FF1493', intensity: 0.8 }
    }
  },
  
  EGG_ZONE: {
    name: 'Egg Zone',
    colors: {
      primary: '#FFFACD',
      secondary: '#FFE4E1',
      accent: '#FFD700',
      warning: '#FFA500',
      background: '#FFF8DC',
      fog: '#FFFACD'
    },
    atmosphere: {
      density: 0.2,
      color: '#FFFFE0',
      particles: 'bubbles'
    },
    lighting: {
      ambient: { color: '#FFFACD', intensity: 0.5 },
      main: { color: '#FFFFFF', intensity: 1.0 },
      rim: { color: '#FFD700', intensity: 0.6 }
    }
  },
  
  SPERM_DUCT: {
    name: 'Sperm Duct',
    colors: {
      primary: '#DEB887',
      secondary: '#F5DEB3',
      accent: '#FF6347',
      warning: '#DC143C',
      background: '#8B4513',
      fog: '#A0522D'
    },
    atmosphere: {
      density: 0.4,
      color: '#DEB887',
      particles: 'mucus'
    },
    lighting: {
      ambient: { color: '#8B4513', intensity: 0.35 },
      main: { color: '#FFDAB9', intensity: 0.9 },
      rim: { color: '#FF6347', intensity: 0.7 }
    }
  },
  
  OVARY_CORRIDOR: {
    name: 'Ovary Corridor',
    colors: {
      primary: '#FFB6C1',
      secondary: '#FF69B4',
      accent: '#FF1493',
      warning: '#C71585',
      background: '#2D1F3D',
      fog: '#4A2C5A'
    },
    atmosphere: {
      density: 0.35,
      color: '#FFB6C1',
      particles: 'cells'
    },
    lighting: {
      ambient: { color: '#2D1F3D', intensity: 0.3 },
      main: { color: '#FFB6C1', intensity: 0.85 },
      rim: { color: '#FF69B4', intensity: 0.9 }
    }
  },
  
  FALLOPIAN_EXPRESS: {
    name: 'Fallopian Express',
    colors: {
      primary: '#87CEEB',
      secondary: '#4682B4',
      accent: '#00CED1',
      warning: '#FF4500',
      background: '#1E3A5F',
      fog: '#2E5A7F'
    },
    atmosphere: {
      density: 0.25,
      color: '#87CEEB',
      particles: 'fluid'
    },
    lighting: {
      ambient: { color: '#1E3A5F', intensity: 0.35 },
      main: { color: '#87CEEB', intensity: 1.1 },
      rim: { color: '#00CED1', intensity: 0.7 }
    }
  },
  
  IMMUNE_SYSTEM: {
    name: 'Immune System',
    colors: {
      primary: '#4169E1',
      secondary: '#6495ED',
      accent: '#00BFFF',
      warning: '#FF0000',
      background: '#0D1B2A',
      fog: '#1B3A5C'
    },
    atmosphere: {
      density: 0.45,
      color: '#4169E1',
      particles: 'antibodies'
    },
    lighting: {
      ambient: { color: '#0D1B2A', intensity: 0.25 },
      main: { color: '#4169E1', intensity: 0.7 },
      rim: { color: '#00BFFF', intensity: 1.0 }
    }
  }
} as const;

export type BiomeThemeName = keyof typeof BIOME_VISUAL_THEMES;

// === GUIDELINES ДЛЯ ЧИТАБЕЛЬНОСТІ ===

export const VISUAL_CLARITY_GUIDELINES = {
  // Гравець - завжди видимий
  player: {
    minSilhouetteContrast: 0.7,
    rimLighting: true,
    glowOnDarkBackgrounds: true,
    outlineEnabled: true,
    outlineWidth: OUTLINE_STYLE.usage.player,
    minSize: 0.5 // в ігрових одиницях
  },
  
  // Перешкоди - читабельні здалеку
  obstacles: {
    minSilhouetteContrast: 0.8,
    highContrastColors: true,
    distinctShapes: true,
    warningIndicator: 'color_shift',
    outlineEnabled: true,
    outlineWidth: OUTLINE_STYLE.usage.obstacle,
    // Кольорова сигналізація
    dangerColor: COLOR_PALETTE.game.obstacleDanger,
    warningColor: COLOR_PALETTE.game.obstacleWarning,
    safeColor: COLOR_PALETTE.game.safe
  },
  
  // Збірні предмети - виділяються
  collectibles: {
    glowEnabled: true,
    sparkleEffect: true,
    contrastWithBackground: 'high',
    outlineEnabled: true,
    outlineWidth: OUTLINE_STYLE.usage.collectible,
    glowColor: COLOR_PALETTE.game.collectible,
    // Анімація пульсації
    pulseSpeed: 2,
    pulseAmount: 0.2
  },
  
  // UI елементи
  ui: {
    minTouchTarget: 44, // pixels - стандарт доступності
    contrastRatio: 4.5, // WCAG AA
    fontMinSize: 14,
    iconMinSize: 24
  }
} as const;

// === ARV НАПРЯМ ===

export const ART_DIRECTION = {
  // Силуетна читабельність
  silhouette: {
    player: 'always_clear',
    obstacles: 'high_contrast',
    collectibles: 'glowing',
    background: 'subtle'
  },
  
  // Використання кольорів
  colors: {
    playerAction: COLOR_PALETTE.game.collectible,
    danger: COLOR_PALETTE.game.obstacleDanger,
    safe: COLOR_PALETTE.game.safe,
    collectible: COLOR_PALETTE.game.collectible,
    powerup: COLOR_PALETTE.game.powerup,
    shield: COLOR_PALETTE.game.shield,
    speed: COLOR_PALETTE.game.speed
  },
  
  // Візуальна мова
  language: {
    curves: 'organic_rounded',
    edges: 'soft_with_outline',
    shapes: 'geometric_organic_hybrid',
    // Анімаційні принципи
    animation: {
      anticipation: true,
      squashStretch: true,
      followThrough: true,
      slowInSlowOut: true
    }
  }
} as const;

// === VISUAL IDENTITY ОСНОВНИЙ ОБ'ЄКТ ===

export const VISUAL_IDENTITY = {
  name: 'Bio-Comic Runner',
  version: '2.4.0',
  
  // Color palette
  palette: COLOR_PALETTE,
  
  // Typography
  typography: TYPOGRAPHY,
  
  // Styles
  outline: OUTLINE_STYLE,
  shading: SHADING_STYLE,
  
  // Biome themes
  biomes: BIOME_VISUAL_THEMES,
  
  // Guidelines
  clarity: VISUAL_CLARITY_GUIDELINES,
  
  // Art direction
  artDirection: ART_DIRECTION
};

// Helper functions

// Отримати колір для типу об'єкта
export const getColorForType = (type: 'player' | 'obstacle' | 'collectible' | 'powerup'): string => {
  switch (type) {
    case 'player': return COLOR_PALETTE.game.player;
    case 'obstacle': return COLOR_PALETTE.game.obstacleDanger;
    case 'collectible': return COLOR_PALETTE.game.collectible;
    case 'powerup': return COLOR_PALETTE.game.powerup;
  }
};

// Отримати налаштування біому
export const getBiomeTheme = (biome: BiomeThemeName) => {
  return BIOME_VISUAL_THEMES[biome];
};

// Створити кольорову схему для об'єкта
export const createObjectColorScheme = (
  baseColor: string,
  type: 'player' | 'obstacle' | 'collectible' | 'environment'
): { color: THREE.Color; rimColor: THREE.Color; emissive: THREE.Color } => {
  const base = new THREE.Color(baseColor);
  
  let rim: THREE.Color;
  let emissive: THREE.Color;
  
  switch (type) {
    case 'player':
      rim = new THREE.Color(COLOR_PALETTE.game.playerRim);
      emissive = new THREE.Color('#000000');
      break;
    case 'obstacle':
      rim = new THREE.Color(COLOR_PALETTE.game.obstacleDanger);
      emissive = new THREE.Color(COLOR_PALETTE.game.obstacleDanger).multiplyScalar(0.2);
      break;
    case 'collectible':
      rim = new THREE.Color(COLOR_PALETTE.game.collectible);
      emissive = new THREE.Color(COLOR_PALETTE.game.collectible).multiplyScalar(0.5);
      break;
    case 'environment':
    default:
      rim = base.clone().multiplyScalar(1.2);
      emissive = new THREE.Color('#000000');
  }
  
  return { color: base, rimColor: rim, emissive };
};

export default VISUAL_IDENTITY;