/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LevelPatternLibrary - Бібліотека міні-сегментів для процедурної генерації
 * Відповідає GDD v2.2.0 Pattern Library
 */

import { ExtendedObstacleType } from './LevelObjectTypes';

export enum PatternDifficulty {
    EASY = 'EASY',
    MEDIUM = 'MEDIUM',
    HARD = 'HARD',
    EXTREME = 'EXTREME'
}

// Рівень Z-позиції для перешкод або монет
export enum VerticalLevel {
    LOW = 'low', // Слайд
    HI = 'hi'    // Стрибок
}

// Тип елемента в паттерні
export type PatternElement = {
    type: ExtendedObstacleType | 'coin' | 'crystal' | 'magnet' | 'shield';
    lane: number; // -1 (L), 0 (C), 1 (R) - або -2...2 якщо 5 смуг
    z: number;    // Відносний Z в межах сегмента
    yLevel?: VerticalLevel;
    bonusValue?: number;
    description?: string;
};

// Структура сегмента
export interface LevelSegment {
    id: string;
    difficulty: PatternDifficulty;
    name: string;
    idea: string;
    length: number; // В одиницях (наприклад, 30 або 60)
    elements: PatternElement[];
    nextPossible?: string[]; // Бажані наступні паттерни (опціонально)
    optimalRotation?: number; // Смуга, по якій треба йти (для підказок монет)
}

/**
 * БІБЛІОТЕКА ПАТТЕРНІВ
 */
export const LEVEL_PATTERNS: LevelSegment[] = [
    // --- EASY (E01-E05) ---
    {
        id: 'SEG-E01',
        difficulty: PatternDifficulty.EASY,
        name: 'Ліво-Право-Центр',
        idea: 'Проста зміна доріжок, монети вказують маршрут',
        length: 30,
        elements: [
            { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: -1, z: 2 },
            { type: 'coin', lane: 1, z: 2 },
            { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: 0, z: 12 },
            { type: 'coin', lane: -1, z: 12 },
            { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: -1, z: 24 },
            { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: 1, z: 24 },
            { type: 'coin', lane: 0, z: 24 }
        ]
    },
    {
        id: 'SEG-E02',
        difficulty: PatternDifficulty.EASY,
        name: 'Тунель Глистів',
        idea: 'Два глисти по боках, центр вільний і засипаний монетами',
        length: 40,
        elements: [
            { type: ExtendedObstacleType.GLOBUS_WORM, lane: -1, z: 20 },
            { type: ExtendedObstacleType.GLOBUS_WORM, lane: 1, z: 20 },
            { type: 'coin', lane: 0, z: 5 },
            { type: 'coin', lane: 0, z: 10 },
            { type: 'coin', lane: 0, z: 15 },
            { type: 'crystal', lane: 0, z: 20 },
            { type: 'coin', lane: 0, z: 25 },
            { type: 'coin', lane: 0, z: 30 },
            { type: 'coin', lane: 0, z: 35 }
        ]
    },
    {
        id: 'SEG-E03',
        difficulty: PatternDifficulty.EASY,
        name: 'Стрибок через бактерію',
        idea: 'Одна бактерія на центрі, обхід або стрибок',
        length: 20,
        elements: [
            { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: 0, z: 10 },
            { type: 'coin', lane: -1, z: 10 },
            { type: 'coin', lane: 1, z: 10 },
            { type: 'coin', lane: 0, z: 10, yLevel: VerticalLevel.HI },
            { type: 'coin', lane: 0, z: 12, yLevel: VerticalLevel.HI },
            { type: 'coin', lane: 0, z: 8, yLevel: VerticalLevel.HI }
        ]
    },
    {
        id: 'SEG-E04',
        difficulty: PatternDifficulty.EASY,
        name: 'Відкритий коридор',
        idea: 'Пауза-передишка. Все вільно, купа монет',
        length: 40,
        elements: [
            { type: 'coin', lane: -1, z: 5 }, { type: 'coin', lane: 0, z: 5 }, { type: 'coin', lane: 1, z: 5 },
            { type: 'coin', lane: -1, z: 15 }, { type: 'crystal', lane: 0, z: 15 }, { type: 'coin', lane: 1, z: 15 },
            { type: 'coin', lane: -1, z: 25 }, { type: 'coin', lane: 0, z: 25 }, { type: 'coin', lane: 1, z: 25 },
            { type: 'coin', lane: -1, z: 35 }, { type: 'crystal', lane: 0, z: 35 }, { type: 'coin', lane: 1, z: 35 }
        ]
    },
    {
        id: 'SEG-E05',
        difficulty: PatternDifficulty.EASY,
        name: 'Імунна клітина — урок',
        idea: 'Одна імунна клітина, повільно рухається (вчимо механіку)',
        length: 30,
        elements: [
            { type: ExtendedObstacleType.IMMUNE_CELL, lane: 0, z: 15, description: 'L-R-3S' },
            { type: 'coin', lane: 0, z: 5 },
            { type: 'coin', lane: 0, z: 10 },
            { type: 'coin', lane: 0, z: 15 },
            { type: 'coin', lane: 0, z: 20 },
            { type: 'coin', lane: 0, z: 25 }
        ]
    },

    // --- MEDIUM (M01-M08) ---
    {
        id: 'SEG-M01',
        difficulty: PatternDifficulty.MEDIUM,
        name: 'Зигзаг',
        idea: 'Класичний зигзаг — базовий паттерн середньої складності',
        length: 50,
        elements: [
            { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: -1, z: 10 },
            { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: 0, z: 20 },
            { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: -1, z: 30 },
            { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: 0, z: 40 },
            { type: 'coin', lane: 1, z: 10 },
            { type: 'coin', lane: 1, z: 20 },
            { type: 'coin', lane: 1, z: 30 },
            { type: 'coin', lane: 1, z: 40 }
        ]
    },
    {
        id: 'SEG-M02',
        difficulty: PatternDifficulty.MEDIUM,
        name: 'Глист + Вірус',
        idea: 'Глист на центрі, вірус праворуч — заїхати на глиста зверху',
        length: 40,
        elements: [
            { type: ExtendedObstacleType.GLOBUS_WORM, lane: 0, z: 20 },
            { type: ExtendedObstacleType.VIRUS_KILLER, lane: 1, z: 20 },
            { type: 'coin', lane: 0, z: 10, yLevel: VerticalLevel.HI },
            { type: 'coin', lane: 0, z: 15, yLevel: VerticalLevel.HI },
            { type: 'crystal', lane: 0, z: 20, yLevel: VerticalLevel.HI },
            { type: 'coin', lane: 0, z: 25, yLevel: VerticalLevel.HI },
            { type: 'coin', lane: 0, z: 30, yLevel: VerticalLevel.HI }
        ]
    },
    {
        id: 'SEG-M03',
        difficulty: PatternDifficulty.MEDIUM,
        name: 'Колонія бактерій',
        idea: 'Бактерії займають 2 доріжки, вільна доріжка чергується',
        length: 60,
        elements: [
            { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: -1, z: 10 }, { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: 0, z: 10 }, { type: 'coin', lane: 1, z: 10 },
            { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: 0, z: 30 }, { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: 1, z: 30 }, { type: 'coin', lane: -1, z: 30 },
            { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: -1, z: 50 }, { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: 1, z: 50 }, { type: 'coin', lane: 0, z: 50 }
        ]
    },
    {
        id: 'SEG-M04',
        difficulty: PatternDifficulty.MEDIUM,
        name: 'Вертикальний слалом',
        idea: 'Бактерії низькі та високі чергуються — стрибок і слайд',
        length: 50,
        elements: [
            { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: 0, z: 10, description: 'low' },
            { type: 'coin', lane: 0, z: 10, yLevel: VerticalLevel.HI },
            { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: 0, z: 20, description: 'hi' },
            { type: 'coin', lane: 0, z: 20, yLevel: VerticalLevel.LOW },
            { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: 0, z: 30, description: 'low' },
            { type: 'coin', lane: 0, z: 30, yLevel: VerticalLevel.HI },
            { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: 0, z: 40, description: 'hi' },
            { type: 'coin', lane: 0, z: 40, yLevel: VerticalLevel.LOW }
        ]
    },
    {
        id: 'SEG-M05',
        difficulty: PatternDifficulty.MEDIUM,
        name: 'Імунна погоня',
        idea: 'Імунна клітина рухається в тому ж напрямку, треба обійти',
        length: 50,
        elements: [
            { type: ExtendedObstacleType.IMMUNE_CELL, lane: 0, z: 25, description: 'STAY-C' },
            { type: 'coin', lane: -1, z: 10 }, { type: 'coin', lane: -1, z: 20 }, { type: 'coin', lane: -1, z: 30 },
            { type: 'coin', lane: 1, z: 10 }, { type: 'coin', lane: 1, z: 20 }, { type: 'coin', lane: 1, z: 30 }
        ]
    },
    {
        id: 'SEG-M06',
        difficulty: PatternDifficulty.MEDIUM,
        name: 'Діагональна стіна',
        idea: 'Мембрани по діагоналі — один вільний кут',
        length: 60,
        elements: [
            { type: ExtendedObstacleType.CELL_MEMBRANE, lane: -1, z: 10 }, { type: ExtendedObstacleType.CELL_MEMBRANE, lane: 0, z: 10 }, { type: 'coin', lane: 1, z: 10 },
            { type: ExtendedObstacleType.CELL_MEMBRANE, lane: -1, z: 30 }, { type: ExtendedObstacleType.CELL_MEMBRANE, lane: 1, z: 30 }, { type: 'coin', lane: 0, z: 30 },
            { type: ExtendedObstacleType.CELL_MEMBRANE, lane: 0, z: 50 }, { type: ExtendedObstacleType.CELL_MEMBRANE, lane: 1, z: 50 }, { type: 'coin', lane: -1, z: 50 }
        ]
    },
    {
        id: 'SEG-M07',
        difficulty: PatternDifficulty.MEDIUM,
        name: 'Дощ монет',
        idea: 'Спеціальна зона — монети падають зверху',
        length: 40,
        elements: [
            { type: 'coin', lane: -1, z: 5 }, { type: 'coin', lane: 0, z: 6 }, { type: 'coin', lane: 1, z: 7 },
            { type: 'coin', lane: -1, z: 10 }, { type: 'coin', lane: 0, z: 11 }, { type: 'coin', lane: 1, z: 12 },
            { type: 'coin', lane: -1, z: 15 }, { type: 'coin', lane: 0, z: 16 }, { type: 'coin', lane: 1, z: 17 },
            { type: 'magnet', lane: 0, z: 25 }
        ]
    },
    {
        id: 'SEG-M08',
        difficulty: PatternDifficulty.MEDIUM,
        name: 'Бактерія-охоронець',
        idea: 'Бактерія блокує монети — треба стрибнути',
        length: 30,
        elements: [
            { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: -1, z: 15, description: 'low' },
            { type: 'coin', lane: -1, z: 10 }, { type: 'coin', lane: -1, z: 15, yLevel: VerticalLevel.HI }, { type: 'coin', lane: -1, z: 20 }
        ]
    },

    // --- HARD (H01-H07) ---
    {
        id: 'SEG-H01',
        difficulty: PatternDifficulty.HARD,
        name: 'Вірусна алея',
        idea: 'Віруси блокують 2 доріжки, вільна міняється',
        length: 60,
        elements: [
            { type: ExtendedObstacleType.VIRUS_KILLER, lane: -1, z: 10 }, { type: ExtendedObstacleType.VIRUS_KILLER, lane: 0, z: 10 }, { type: 'coin', lane: 1, z: 10 },
            { type: ExtendedObstacleType.VIRUS_KILLER, lane: 0, z: 30 }, { type: ExtendedObstacleType.VIRUS_KILLER, lane: 1, z: 30 }, { type: 'coin', lane: -1, z: 30 },
            { type: ExtendedObstacleType.VIRUS_KILLER, lane: -1, z: 50 }, { type: ExtendedObstacleType.VIRUS_KILLER, lane: 1, z: 50 }, { type: 'coin', lane: 0, z: 50 }
        ]
    },
    {
        id: 'SEG-H02',
        difficulty: PatternDifficulty.HARD,
        name: 'Глист + Вірус + Бактерія',
        idea: 'Три типи ворогів одночасно',
        length: 60,
        elements: [
            { type: ExtendedObstacleType.GLOBUS_WORM, lane: -1, z: 30 },
            { type: ExtendedObstacleType.VIRUS_KILLER, lane: 0, z: 15 },
            { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: 1, z: 45 },
            { type: 'crystal', lane: -1, z: 30, yLevel: VerticalLevel.HI }
        ]
    },
    {
        id: 'SEG-H03',
        difficulty: PatternDifficulty.HARD,
        name: 'Імунна + Вірус',
        idea: 'Клітина назустріч + вірус на доріжці',
        length: 50,
        elements: [
            { type: ExtendedObstacleType.IMMUNE_CELL, lane: 0, z: 25, description: 'C-APPROACH' },
            { type: ExtendedObstacleType.VIRUS_KILLER, lane: 1, z: 25 },
            { type: 'coin', lane: -1, z: 10 }, { type: 'coin', lane: -1, z: 20 }, { type: 'coin', lane: -1, z: 30 }, { type: 'coin', lane: -1, z: 40 }
        ]
    },
    {
        id: 'SEG-H04',
        difficulty: PatternDifficulty.HARD,
        name: 'Подвійний тунель',
        idea: 'Глист + мембрани — заїхати на глиста',
        length: 50,
        elements: [
            { type: ExtendedObstacleType.CELL_MEMBRANE, lane: -1, z: 25 },
            { type: ExtendedObstacleType.GLOBUS_WORM, lane: 0, z: 25 },
            { type: ExtendedObstacleType.CELL_MEMBRANE, lane: 1, z: 25 },
            { type: 'magnet', lane: 0, z: 25, yLevel: VerticalLevel.HI }
        ]
    },
    {
        id: 'SEG-H05',
        difficulty: PatternDifficulty.HARD,
        name: 'Хвиля перешкод',
        idea: 'Все одночасно, швидка реакція',
        length: 70,
        elements: [
            { type: ExtendedObstacleType.VIRUS_KILLER, lane: -1, z: 10 }, { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: 0, z: 10 }, { type: ExtendedObstacleType.VIRUS_KILLER, lane: 1, z: 10 },
            { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: -1, z: 30 }, { type: ExtendedObstacleType.CELL_MEMBRANE, lane: 0, z: 30 }, { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: 1, z: 30 },
            { type: ExtendedObstacleType.VIRUS_KILLER, lane: -1, z: 50 }, { type: 'shield', lane: 0, z: 50 }, { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: 1, z: 50 }
        ]
    },
    {
        id: 'SEG-H06',
        difficulty: PatternDifficulty.HARD,
        name: 'Зворотній зигзаг',
        idea: 'Монети ведуть в небезпеку',
        length: 60,
        elements: [
            { type: 'coin', lane: -1, z: 10 }, { type: 'coin', lane: -1, z: 20 }, { type: ExtendedObstacleType.VIRUS_KILLER, lane: -1, z: 40 },
            { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: 0, z: 10 }, { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: 0, z: 30 },
            { type: 'coin', lane: 1, z: 30 }, { type: 'coin', lane: 1, z: 40 }, { type: 'coin', lane: 1, z: 50 }
        ]
    },
    {
        id: 'SEG-H07',
        difficulty: PatternDifficulty.HARD,
        name: 'Вертикальне пекло',
        idea: 'Бактерії різних висот на всіх доріжках',
        length: 50,
        elements: [
            { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: -1, z: 10, description: 'hi' },
            { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: 0, z: 10, description: 'low' },
            { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: 1, z: 25, description: 'hi' },
            { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: 0, z: 25, description: 'low' },
            { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: -1, z: 40, description: 'low' }
        ]
    },

    // --- EXTREME (X01-X04) ---
    {
        id: 'SEG-X01',
        difficulty: PatternDifficulty.EXTREME,
        name: 'Вірусний лабіринт',
        idea: 'Вузький прохід серед вірусів',
        length: 80,
        elements: [
            { type: ExtendedObstacleType.VIRUS_KILLER, lane: -1, z: 10 }, { type: ExtendedObstacleType.VIRUS_KILLER, lane: 1, z: 10 },
            { type: ExtendedObstacleType.VIRUS_KILLER, lane: 0, z: 25 }, { type: ExtendedObstacleType.VIRUS_KILLER, lane: 1, z: 25 },
            { type: ExtendedObstacleType.VIRUS_KILLER, lane: -1, z: 40 }, { type: ExtendedObstacleType.VIRUS_KILLER, lane: 0, z: 40 }
        ]
    },
    {
        id: 'SEG-X02',
        difficulty: PatternDifficulty.EXTREME,
        name: 'Boss Globus',
        idea: 'Великий глист займає 2 доріжки',
        length: 80,
        elements: [
            { type: ExtendedObstacleType.GLOBUS_WORM, lane: -1, z: 40 },
            { type: ExtendedObstacleType.GLOBUS_WORM, lane: 0, z: 40 },
            { type: 'coin', lane: 1, z: 10 }, { type: 'coin', lane: 1, z: 20 }, { type: 'coin', lane: 1, z: 30 },
            { type: 'crystal', lane: 0, z: 40, yLevel: VerticalLevel.HI },
            { type: 'magnet', lane: -1, z: 40, yLevel: VerticalLevel.HI }
        ]
    },
    {
        id: 'SEG-X03',
        difficulty: PatternDifficulty.EXTREME,
        name: 'Імунна армія',
        idea: 'Три імунні клітини назустріч одночасно',
        length: 100,
        elements: [
            { type: ExtendedObstacleType.IMMUNE_CELL, lane: -1, z: 50, description: 'APPROACH-L' },
            { type: ExtendedObstacleType.IMMUNE_CELL, lane: 0, z: 50, description: 'APPROACH-C' },
            { type: ExtendedObstacleType.IMMUNE_CELL, lane: 1, z: 50, description: 'APPROACH-R' },
            { type: 'crystal', lane: 0, z: 30 }, { type: 'crystal', lane: 0, z: 70 }
        ]
    },
    {
        id: 'SEG-X04',
        difficulty: PatternDifficulty.EXTREME,
        name: 'Тотальний хаос',
        idea: 'Всі типи перешкод одночасно',
        length: 120,
        elements: [
            { type: ExtendedObstacleType.VIRUS_KILLER, lane: -1, z: 20 }, { type: ExtendedObstacleType.GLOBUS_WORM, lane: 1, z: 40 },
            { type: ExtendedObstacleType.BACTERIA_BLOCKER, lane: 0, z: 60 }, { type: ExtendedObstacleType.CELL_MEMBRANE, lane: -1, z: 80 },
            { type: 'coin', lane: 0, z: 10 }, { type: 'coin', lane: 1, z: 30 }, { type: 'crystal', lane: -1, z: 50 }
        ]
    }
];

export default LEVEL_PATTERNS;
