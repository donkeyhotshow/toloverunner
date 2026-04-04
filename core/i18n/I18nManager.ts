/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * IManager - Система локализации
 * Решает проблему отсутствия локализации и поддержки RTL языков
 */

// Поддерживаемые языки
export type SupportedLanguage = 'en' | 'ru' | 'es' | 'de' | 'fr' | 'ja' | 'ko' | 'zh' | 'ar' | 'he';

// RTL языки
export const RTL_LANGUAGES: SupportedLanguage[] = ['ar', 'he'];

// Типы переводов
export interface TranslationKeys {
    // Меню
    'menu.play': string;
    'menu.shop': string;
    'menu.settings': string;
    'menu.credits': string;
    'menu.quit': string;

    // Игровой процесс
    'game.score': string;
    'game.distance': string;
    'game.lives': string;
    'game.combo': string;
    'game.perfectTiming': string;
    'game.paused': string;
    'game.resume': string;
    'game.restart': string;
    'game.mainMenu': string;

    // Game Over
    'gameOver.title': string;
    'gameOver.score': string;
    'gameOver.bestScore': string;
    'gameOver.newRecord': string;
    'gameOver.playAgain': string;
    'gameOver.share': string;

    // Магазин
    'shop.title': string;
    'shop.coins': string;
    'shop.buy': string;
    'shop.owned': string;
    'shop.maxLevel': string;
    'shop.doubleJump': string;
    'shop.doubleJumpDesc': string;
    'shop.magnet': string;
    'shop.magnetDesc': string;
    'shop.luck': string;
    'shop.luckDesc': string;
    'shop.extraLife': string;
    'shop.extraLifeDesc': string;
    'shop.heal': string;
    'shop.healDesc': string;

    // Настройки
    'settings.title': string;
    'settings.music': string;
    'settings.sfx': string;
    'settings.haptic': string;
    'settings.language': string;
    'settings.accessibility': string;
    'settings.colorblind': string;
    'settings.screenReader': string;
    'settings.reducedMotion': string;

    // Power-ups
    'powerup.shield': string;
    'powerup.magnet': string;
    'powerup.speedBoost': string;

    // Туториал
    'tutorial.welcome': string;
    'tutorial.swipeMove': string;
    'tutorial.tapJump': string;
    'tutorial.collectCoins': string;
    'tutorial.avoidEnemies': string;
    'tutorial.ready': string;

    // Общие
    'common.loading': string;
    'common.error': string;
    'common.retry': string;
    'common.cancel': string;
    'common.confirm': string;
    'common.yes': string;
    'common.no': string;
    'common.ok': string;
    'common.back': string;
    'common.close': string;
    'common.save': string;

    // Accessibility
    'a11y.jumpButton': string;
    'a11y.leftButton': string;
    'a11y.rightButton': string;
    'a11y.pauseButton': string;
    'a11y.scoreDisplay': string;
    'a11y.livesDisplay': string;
    'a11y.comboDisplay': string;
}

// Английские переводы (по умолчанию)
const EN_TRANSLATIONS: TranslationKeys = {
    // Меню
    'menu.play': 'Play',
    'menu.shop': 'Shop',
    'menu.settings': 'Settings',
    'menu.credits': 'Credits',
    'menu.quit': 'Quit',

    // Игровой процесс
    'game.score': 'Score',
    'game.distance': 'Distance',
    'game.lives': 'Lives',
    'game.combo': 'Combo',
    'game.perfectTiming': 'Perfect Timing!',
    'game.paused': 'Paused',
    'game.resume': 'Resume',
    'game.restart': 'Restart',
    'game.mainMenu': 'Main Menu',

    // Game Over
    'gameOver.title': 'Game Over',
    'gameOver.score': 'Score',
    'gameOver.bestScore': 'Best Score',
    'gameOver.newRecord': 'New Record!',
    'gameOver.playAgain': 'Play Again',
    'gameOver.share': 'Share',

    // Магазин
    'shop.title': 'Shop',
    'shop.coins': 'Coins',
    'shop.buy': 'Buy',
    'shop.owned': 'Owned',
    'shop.maxLevel': 'Max Level',
    'shop.doubleJump': 'Double Jump',
    'shop.doubleJumpDesc': 'Jump again in mid-air',
    'shop.magnet': 'Coin Magnet',
    'shop.magnetDesc': 'Attract nearby coins',
    'shop.luck': 'Lucky Charm',
    'shop.luckDesc': 'Increase rare item drops',
    'shop.extraLife': 'Extra Life',
    'shop.extraLifeDesc': 'Start with more lives',
    'shop.heal': 'Heal',
    'shop.healDesc': 'Restore one life',

    // Настройки
    'settings.title': 'Settings',
    'settings.music': 'Music',
    'settings.sfx': 'Sound Effects',
    'settings.haptic': 'Vibration',
    'settings.language': 'Language',
    'settings.accessibility': 'Accessibility',
    'settings.colorblind': 'Colorblind Mode',
    'settings.screenReader': 'Screen Reader',
    'settings.reducedMotion': 'Reduced Motion',

    // Power-ups
    'powerup.shield': 'Shield Active',
    'powerup.magnet': 'Magnet Active',
    'powerup.speedBoost': 'Speed Boost',

    // Туториал
    'tutorial.welcome': 'Welcome to the game!',
    'tutorial.swipeMove': 'Swipe left or right to move',
    'tutorial.tapJump': 'Tap to jump',
    'tutorial.collectCoins': 'Collect coins for points',
    'tutorial.avoidEnemies': 'Avoid enemies',
    'tutorial.ready': 'Ready? Let\'s go!',

    // Общие
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.retry': 'Retry',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.ok': 'OK',
    'common.back': 'Back',
    'common.close': 'Close',
    'common.save': 'Save',

    // Accessibility
    'a11y.jumpButton': 'Jump button',
    'a11y.leftButton': 'Move left button',
    'a11y.rightButton': 'Move right button',
    'a11y.pauseButton': 'Pause game button',
    'a11y.scoreDisplay': 'Current score: {score}',
    'a11y.livesDisplay': '{lives} lives remaining',
    'a11y.comboDisplay': 'Combo: {combo}x multiplier'
};

// Русские переводы
const RU_TRANSLATIONS: TranslationKeys = {
    // Меню
    'menu.play': 'Играть',
    'menu.shop': 'Магазин',
    'menu.settings': 'Настройки',
    'menu.credits': 'Авторы',
    'menu.quit': 'Выход',

    // Игровой процесс
    'game.score': 'Очки',
    'game.distance': 'Дистанция',
    'game.lives': 'Жизни',
    'game.combo': 'Комбо',
    'game.perfectTiming': 'Идеальный тайминг!',
    'game.paused': 'Пауза',
    'game.resume': 'Продолжить',
    'game.restart': 'Заново',
    'game.mainMenu': 'Главное меню',

    // Game Over
    'gameOver.title': 'Игра окончена',
    'gameOver.score': 'Очки',
    'gameOver.bestScore': 'Лучший результат',
    'gameOver.newRecord': 'Новый рекорд!',
    'gameOver.playAgain': 'Играть снова',
    'gameOver.share': 'Поделиться',

    // Магазин
    'shop.title': 'Магазин',
    'shop.coins': 'Монеты',
    'shop.buy': 'Купить',
    'shop.owned': 'Куплено',
    'shop.maxLevel': 'Макс. уровень',
    'shop.doubleJump': 'Двойной прыжок',
    'shop.doubleJumpDesc': 'Прыгайте ещё раз в воздухе',
    'shop.magnet': 'Магнит монет',
    'shop.magnetDesc': 'Притягивает ближайшие монеты',
    'shop.luck': 'Талисман удачи',
    'shop.luckDesc': 'Увеличивает шанс редких предметов',
    'shop.extraLife': 'Доп. жизнь',
    'shop.extraLifeDesc': 'Начинайте с большим количеством жизней',
    'shop.heal': 'Лечение',
    'shop.healDesc': 'Восстановить одну жизнь',

    // Настройки
    'settings.title': 'Настройки',
    'settings.music': 'Музыка',
    'settings.sfx': 'Звуковые эффекты',
    'settings.haptic': 'Вибрация',
    'settings.language': 'Язык',
    'settings.accessibility': 'Доступность',
    'settings.colorblind': 'Режим дальтоника',
    'settings.screenReader': 'Экранный диктор',
    'settings.reducedMotion': 'Уменьшить анимации',

    // Power-ups
    'powerup.shield': 'Щит активен',
    'powerup.magnet': 'Магнит активен',
    'powerup.speedBoost': 'Ускорение',

    // Туториал
    'tutorial.welcome': 'Добро пожаловать в игру!',
    'tutorial.swipeMove': 'Свайпните влево или вправо для движения',
    'tutorial.tapJump': 'Нажмите для прыжка',
    'tutorial.collectCoins': 'Собирайте монеты для очков',
    'tutorial.avoidEnemies': 'Избегайте врагов',
    'tutorial.ready': 'Готовы? Поехали!',

    // Общие
    'common.loading': 'Загрузка...',
    'common.error': 'Ошибка',
    'common.retry': 'Повторить',
    'common.cancel': 'Отмена',
    'common.confirm': 'Подтвердить',
    'common.yes': 'Да',
    'common.no': 'Нет',
    'common.ok': 'ОК',
    'common.back': 'Назад',
    'common.close': 'Закрыть',
    'common.save': 'Сохранить',

    // Accessibility
    'a11y.jumpButton': 'Кнопка прыжка',
    'a11y.leftButton': 'Кнопка движения влево',
    'a11y.rightButton': 'Кнопка движения вправо',
    'a11y.pauseButton': 'Кнопка паузы',
    'a11y.scoreDisplay': 'Текущий счёт: {score}',
    'a11y.livesDisplay': 'Осталось жизней: {lives}',
    'a11y.comboDisplay': 'Комбо: множитель {combo}x'
};

// Все переводы
const TRANSLATIONS: Record<SupportedLanguage, TranslationKeys> = {
    en: EN_TRANSLATIONS,
    ru: RU_TRANSLATIONS,
    // Заглушки для других языков (используют английский)
    es: EN_TRANSLATIONS,
    de: EN_TRANSLATIONS,
    fr: EN_TRANSLATIONS,
    ja: EN_TRANSLATIONS,
    ko: EN_TRANSLATIONS,
    zh: EN_TRANSLATIONS,
    ar: EN_TRANSLATIONS,
    he: EN_TRANSLATIONS
};

// Названия языков
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
    en: 'English',
    ru: 'Русский',
    es: 'Español',
    de: 'Deutsch',
    fr: 'Français',
    ja: '日本語',
    ko: '한국어',
    zh: '中文',
    ar: 'العربية',
    he: 'עברית'
};

class I18nManager {
    private static instance: I18nManager;
    private currentLanguage: SupportedLanguage = 'en';
    private listeners: Set<() => void> = new Set();

    private constructor() {
        this.detectLanguage();
    }

    public static getInstance(): I18nManager {
        if (!I18nManager.instance) {
            I18nManager.instance = new I18nManager();
        }
        return I18nManager.instance;
    }

    /**
     * Автоматическое определение языка
     */
    private detectLanguage(): void {
        // Проверяем сохранённый язык
        const saved = localStorage.getItem('game_language');
        if (saved && this.isValidLanguage(saved)) {
            this.currentLanguage = saved as SupportedLanguage;
            return;
        }

        // Определяем по браузеру
        const browserLang = navigator.language?.split('-')[0] ?? 'en';
        if (this.isValidLanguage(browserLang)) {
            this.currentLanguage = browserLang as SupportedLanguage;
        }
    }

    private isValidLanguage(lang: string): boolean {
        return Object.keys(TRANSLATIONS).includes(lang);
    }

    /**
     * Получение текущего языка
     */
    public getLanguage(): SupportedLanguage {
        return this.currentLanguage;
    }

    /**
     * Установка языка
     */
    public setLanguage(lang: SupportedLanguage): void {
        if (!this.isValidLanguage(lang)) {
            console.warn(`Language ${lang} is not supported`);
            return;
        }

        this.currentLanguage = lang;
        localStorage.setItem('game_language', lang);

        // Обновляем направление текста
        document.documentElement.dir = this.isRTL() ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;

        // Уведомляем слушателей
        this.notifyListeners();
    }

    /**
     * Проверка RTL языка
     */
    public isRTL(): boolean {
        return RTL_LANGUAGES.includes(this.currentLanguage);
    }

    /**
     * Получение перевода
     */
    public t(key: keyof TranslationKeys, params?: Record<string, string | number>): string {
        const translations = TRANSLATIONS[this.currentLanguage] || TRANSLATIONS.en;
        let text = translations[key] || EN_TRANSLATIONS[key] || key;

        // Подстановка параметров
        if (params) {
            Object.entries(params).forEach(([paramKey, value]) => {
                text = text.replace(`{${paramKey}}`, String(value));
            });
        }

        return text;
    }

    /**
     * Получение всех доступных языков
     */
    public getAvailableLanguages(): Array<{ code: SupportedLanguage; name: string }> {
        return Object.entries(LANGUAGE_NAMES).map(([code, name]) => ({
            code: code as SupportedLanguage,
            name
        }));
    }

    /**
     * Подписка на изменение языка
     */
    public subscribe(callback: () => void): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    private notifyListeners(): void {
        this.listeners.forEach(callback => callback());
    }

    /**
     * Форматирование числа согласно локали
     */
    public formatNumber(num: number): string {
        return new Intl.NumberFormat(this.currentLanguage).format(num);
    }

    /**
     * Форматирование времени
     */
    public formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Форматирование даты
     */
    public formatDate(date: Date): string {
        return new Intl.DateTimeFormat(this.currentLanguage, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(date);
    }
}

// Экспорт синглтона
export const i18n = I18nManager.getInstance();

// Хелпер функция для удобства
export const t = (key: keyof TranslationKeys, params?: Record<string, string | number>): string => {
    return i18n.t(key, params);
};
