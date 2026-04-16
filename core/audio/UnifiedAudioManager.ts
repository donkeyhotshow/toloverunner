/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Unified Audio Manager - Единая аудио система
 * Решает проблему двух параллельных аудио систем
 * Предотвращает конфликты AudioContext и синхронизирует громкость
 */

import { RUN_SPEED_BASE } from '../../constants';
import { eventBus } from '../../utils/eventBus';
import { DynamicAudioManager, DynamicSoundManifest } from './DynamicAudioManager';
import { AudioCacheConfig } from './DynamicAudioCache';

// Типы звуковых эффектов
export type SFXType =
    | 'click' | 'jump' | 'doubleJump' | 'swipe' | 'dash'
    | 'coin' | 'gem' | 'powerup' | 'shield' | 'magnet' | 'speedBoost'
    | 'hit' | 'damage' | 'gameOver' | 'respawn' | 'win'
    | 'comboTrigger' | 'perfectTiming' | 'levelUp'
    | 'narrator_welcome' | 'narrator_danger' | 'narrator_egg' | 'narrator_failure';

const EVENT_TO_SFX: Partial<Record<string, SFXType>> = {
    'player:collect': 'coin',
    'player:hit': 'hit',
    'player:death': 'gameOver',
    'player:jump': 'jump',
    'player:dash': 'dash',
    'player:graze': 'swipe',
    'system:play-sound': 'levelUp'
};

// Типы музыкальных треков
export type MusicIntensity = 'calm' | 'medium' | 'intense';

// Настройки громкости
export interface VolumeSettings {
    master: number;
    music: number;
    sfx: number;
}

// Haptic паттерны
export interface HapticPattern {
    duration: number;
    strongMagnitude: number;
    weakMagnitude: number;
}

// Предустановленные haptic паттерны
export const HAPTIC_PATTERNS: Record<string, HapticPattern> = {
    light: { duration: 15, strongMagnitude: 0.2, weakMagnitude: 0.1 },
    medium: { duration: 50, strongMagnitude: 0.5, weakMagnitude: 0.3 },
    heavy: { duration: 100, strongMagnitude: 0.8, weakMagnitude: 0.5 },
    success: { duration: 200, strongMagnitude: 0.6, weakMagnitude: 0.3 },
    error: { duration: 300, strongMagnitude: 1.0, weakMagnitude: 0.7 },
    combo: { duration: 150, strongMagnitude: 0.7, weakMagnitude: 0.4 },
};

class UnifiedAudioManager {
    private static instance: UnifiedAudioManager;

    // Единственный AudioContext
    private ctx: AudioContext | null = null;

    // Узлы усиления
    private masterGain: GainNode | null = null;
    private musicGain: GainNode | null = null;
    private sfxGain: GainNode | null = null;

    // Фильтры
    private lowPassFilter: BiquadFilterNode | null = null;

    // Предгенерированные буферы для оптимизации
    private buffers: Map<string, AudioBuffer> = new Map();

    // Состояние музыки
    private isPlayingMusic = false;
    private currentIntensity: MusicIntensity = 'calm';
    private musicSchedulerId: number | null = null;
    private nextNoteTime = 0;
    private current16thNote = 0;

    // Настройки
    private volumeSettings: VolumeSettings = {
        master: 0.7,
        music: 0.35,
        sfx: 0.8
    };

    // Музыкальные параметры
    private baseTempo = 110;
    private currentTempo = 110;
    private dnbTempo = 174; // Класичний темп Drum & Bass
    private bassLine = [65.41, 65.41, 65.41, 65.41, 77.78, 77.78, 77.78, 77.78, 58.27, 58.27, 58.27, 58.27, 43.65, 43.65, 43.65, 43.65];
    
    // Стан World Bible
    private missionStartTime = 0;
    private isDnBPhase = false;
    private lastNarratorTime = 0;

    // Состояние инициализации
    private initialized = false;
    private hapticSupported = false;

    // Кеш для динамічного завантаження
    private dynamicAudioManager: DynamicAudioManager | null = null;
    
    // Конфігурація кешу
    private cacheConfig: AudioCacheConfig = {
        maxCacheSizeMB: 32,
        preloadPriority: ['coin', 'jump', 'dash', 'hit', 'powerup'],
        evictionPolicy: 'LRU',
        lfuMinAge: 1000
    };

    /** Отписки от eventBus для снятия в destroy() */
    private eventBusUnsubs: (() => void)[] = [];

    /** Очистка при закрытии вкладки (beforeunload) */
    private beforeUnloadBound: (() => void) | null = null;

    private constructor() {
        this.checkHapticSupport();
    }

    public static getInstance(): UnifiedAudioManager {
        if (!UnifiedAudioManager.instance) {
            UnifiedAudioManager.instance = new UnifiedAudioManager();
        }
        return UnifiedAudioManager.instance;
    }

    /**
     * Инициализация аудио системы (вызывать после пользовательского взаимодействия)
     */
    public async init(): Promise<boolean> {
        if (this.initialized && this.ctx?.state === 'running') {
            return true;
        }

        try {
            // Создаем или возобновляем AudioContext
            if (!this.ctx) {
                this.ctx = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
            }

            if (this.ctx.state === 'suspended') {
                await this.ctx.resume();
            }

            // Создаем граф узлов
            this.setupAudioGraph();

            // Предгенерируем буферы
            this.generateBuffers();

            // Ініціалізуємо DynamicAudioManager
            this.initDynamicAudio();

            this.initialized = true;
            this.startListening();
            if (typeof window !== 'undefined' && !this.beforeUnloadBound) {
                this.beforeUnloadBound = () => this.destroy();
                window.addEventListener('beforeunload', this.beforeUnloadBound);
            }
            if (import.meta.env.DEV) {
                console.log('🎵 Unified Audio Manager initialized');
            }
            return true;
        } catch (error) {
            console.warn('Failed to initialize audio:', error);
            return false;
        }
    }

    private setupAudioGraph(): void {
        if (!this.ctx) return;

        // Low-pass фильтр для эффекта приглушения
        this.lowPassFilter = this.ctx.createBiquadFilter();
        this.lowPassFilter.type = 'lowpass';
        this.lowPassFilter.frequency.value = 22000;
        this.lowPassFilter.connect(this.ctx.destination);

        // Master gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.volumeSettings.master;
        this.masterGain.connect(this.lowPassFilter);

        // Music gain
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = this.volumeSettings.music;
        this.musicGain.connect(this.masterGain);

        // SFX gain
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this.volumeSettings.sfx;
        this.sfxGain.connect(this.masterGain);
    }

    private generateBuffers(): void {
        if (!this.ctx) return;

        // Jump noise buffer
        const jumpSize = this.ctx.sampleRate * 0.2;
        const jumpBuffer = this.ctx.createBuffer(1, jumpSize, this.ctx.sampleRate);
        const jumpData = jumpBuffer.getChannelData(0);
        for (let i = 0; i < jumpSize; i++) {
            jumpData[i] = (Math.random() * 2 - 1);
        }
        this.buffers.set('jump', jumpBuffer);

        // Swipe noise buffer
        const swipeSize = this.ctx.sampleRate * 0.1;
        const swipeBuffer = this.ctx.createBuffer(1, swipeSize, this.ctx.sampleRate);
        const swipeData = swipeBuffer.getChannelData(0);
        for (let i = 0; i < swipeSize; i++) {
            swipeData[i] = (Math.random() * 2 - 1);
        }
        this.buffers.set('swipe', swipeBuffer);

        // Snare buffer
        const snareSize = this.ctx.sampleRate * 0.1;
        const snareBuffer = this.ctx.createBuffer(1, snareSize, this.ctx.sampleRate);
        const snareData = snareBuffer.getChannelData(0);
        for (let i = 0; i < snareSize; i++) {
            snareData[i] = (Math.random() * 2 - 1) * 0.5;
        }
        this.buffers.set('snare', snareBuffer);
    }

    private checkHapticSupport(): void {
        this.hapticSupported = 'vibrate' in navigator;
    }

    private startListening(): void {
        this.stopListening();
        const unsub = (fn: () => void) => {
            this.eventBusUnsubs.push(fn);
        };
        unsub(eventBus.on('player:collect', (data) => this.playSFX('coin', { volume: 0.8, pitch: 1.0 + (data.points > 100 ? 0.2 : 0) })));
        unsub(eventBus.on('player:hit', () => this.playSFX('hit', { volume: 0.9, pitch: 0.8 })));
        unsub(eventBus.on('player:death', () => {
            this.playSFX('gameOver', { pitch: 0.5 });
            // Duck music: fade out volume and apply low-pass filter for cinematic "death" feel
            if (this.ctx && this.musicGain && this.ctx.state !== 'closed') {
                const t = this.ctx.currentTime;
                this.musicGain.gain.cancelScheduledValues(t);
                this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
                this.musicGain.gain.linearRampToValueAtTime(0.08, t + 0.8);
            }
            this.setMuffled(true);
        }));
        unsub(eventBus.on('player:jump', () => {
            this.playSFX('jump', { volume: 0.6 });
            // Restore music on first jump — signals player restarted
            if (this.ctx && this.musicGain && this.ctx.state !== 'closed') {
                const t = this.ctx.currentTime;
                this.musicGain.gain.cancelScheduledValues(t);
                this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
                this.musicGain.gain.linearRampToValueAtTime(this.volumeSettings.music, t + 0.4);
            }
            this.setMuffled(false);
        }));
        unsub(eventBus.on('player:dash', () => this.playSFX('dash', { volume: 0.7, pitch: 1.2 })));
        unsub(eventBus.on('player:graze', () => this.playSFX('swipe', { volume: 0.4 })));
        unsub(eventBus.on('system:play-sound', (data) => {
            const soundKey = data?.sound as string | undefined;
            const sfx = (soundKey && EVENT_TO_SFX[soundKey]) || (data?.sound as SFXType) || 'levelUp';
            this.playSFX(sfx, { volume: data?.volume, pitch: data?.pitch });
        }));
    }

    /**
     * Снять все подписки на eventBus (вызывать при destroy или переинициализации).
     */
    private stopListening(): void {
        this.eventBusUnsubs.forEach((fn) => fn());
        this.eventBusUnsubs.length = 0;
    }

    /**
     * Остановка менеджера: снять подписки, освободить контекст (при необходимости пересоздать через getInstance().init()).
     */
    public destroy(): void {
        this.stopListening();
        if (typeof window !== 'undefined' && this.beforeUnloadBound) {
            window.removeEventListener('beforeunload', this.beforeUnloadBound);
            this.beforeUnloadBound = null;
        }
        if (this.dynamicAudioManager) {
            this.dynamicAudioManager.dispose();
            this.dynamicAudioManager = null;
        }
        if (this.ctx?.state !== 'closed') {
            this.ctx?.close().catch(() => {});
        }
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.lowPassFilter = null;
        this.buffers.clear();
        this.initialized = false;
    }

    // ==================== VOLUME CONTROL ====================

    public setMasterVolume(volume: number): void {
        this.volumeSettings.master = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.volumeSettings.master;
        }
    }

    public setMusicVolume(volume: number): void {
        this.volumeSettings.music = Math.max(0, Math.min(1, volume));
        if (this.musicGain) {
            this.musicGain.gain.value = this.volumeSettings.music;
        }
    }

    public setSFXVolume(volume: number): void {
        this.volumeSettings.sfx = Math.max(0, Math.min(1, volume));
        if (this.sfxGain) {
            this.sfxGain.gain.value = this.volumeSettings.sfx;
        }
    }

    public getVolumeSettings(): VolumeSettings {
        return { ...this.volumeSettings };
    }

    public setMuffled(isMuffled: boolean): void {
        if (!this.ctx || !this.lowPassFilter || this.ctx.state === 'closed') return;

        const t = this.ctx.currentTime;
        const targetFreq = isMuffled ? 400 : 22000;

        try {
            this.lowPassFilter.frequency.cancelScheduledValues(t);
            this.lowPassFilter.frequency.exponentialRampToValueAtTime(targetFreq, t + 0.5);
        } catch (e) {
            console.warn('Audio: setMuffled failed', e);
        }
    }

    // ==================== SOUND EFFECTS ====================

    public playSFX(type: SFXType, options?: { volume?: number; pitch?: number }): void {
        if (!this.ensureContext()) return;

        const volume = options?.volume ?? 1.0;
        const pitch = options?.pitch ?? 1.0;

        switch (type) {
            case 'click':
                this._playClick();
                break;
            case 'jump':
                this._playJump(false);
                break;
            case 'doubleJump':
                this._playJump(true);
                break;
            case 'swipe':
                this._playSwipe();
                break;
            case 'dash':
                this._playDash();
                break;
            case 'coin':
            case 'gem':
                this._playCollect(volume, pitch);
                break;
            case 'powerup':
            case 'shield':
            case 'magnet':
            case 'speedBoost':
                this._playPowerUp();
                break;
            case 'hit':
            case 'damage':
                this._playDamage();
                break;
            case 'gameOver':
                this._playGameOver();
                break;
            case 'respawn':
                this._playRespawn();
                break;
            case 'comboTrigger':
                this.playComboTrigger(volume, pitch);
                break;
            case 'perfectTiming':
                this.playPerfectTiming();
                break;
            default:
                this.playGenericSFX(volume, pitch);
        }
    }

    private ensureContext(): boolean {
        if (!this.ctx) {
            this.init();
        }

        if (!this.ctx) return false;

        // CRITICAL: Handle context states
        if (this.ctx.state === 'closed') {
            this.ctx = null;
            this.init();
        } else if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }

        return !!(this.ctx && this.sfxGain && this.ctx.state !== 'closed');
    }

    private _playClick(): void {
        const ctx = this.ctx;
        if (!ctx || !this.sfxGain) return;

        try {
            const t = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, t);
            osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);

            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            
            osc.start(t);
            osc.stop(t + 0.05);

            // Cleanup
            osc.onended = () => {
                osc.disconnect();
                gain.disconnect();
            };
        } catch (e) {
            console.warn('Audio: playClick failed', e);
        }
    }

    private _playJump(isDouble: boolean): void {
        if (!this.ctx || !this.sfxGain) return;

        const jumpBuffer = this.buffers.get('jump');
        if (!jumpBuffer) return;

        try {
            const t = this.ctx.currentTime;

            // Water splash
            const noise = this.ctx.createBufferSource();
            noise.buffer = jumpBuffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(400, t);
            filter.frequency.exponentialRampToValueAtTime(1200, t + 0.15);

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.3, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.sfxGain);
            noise.start(t);

            // Bubble pop
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            const startFreq = isDouble ? 600 : 300;
            osc.frequency.setValueAtTime(startFreq, t);
            osc.frequency.exponentialRampToValueAtTime(startFreq * 2, t + 0.1);

            const oscGain = this.ctx.createGain();
            oscGain.gain.setValueAtTime(0.2, t);
            oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

            osc.connect(oscGain);
            oscGain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.15);
        } catch (e) {
            console.warn('Audio: playJump failed', e);
        }
    }

    private _playSwipe(): void {
        if (!this.ctx || !this.sfxGain) return;

        const swipeBuffer = this.buffers.get('swipe');
        if (!swipeBuffer) return;

        try {
            const t = this.ctx.currentTime;

            const noise = this.ctx.createBufferSource();
            noise.buffer = swipeBuffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(600, t);
            filter.frequency.exponentialRampToValueAtTime(1200, t + 0.1);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);
            noise.start(t);
        } catch (e) {
            console.warn('Audio: playSwipe failed', e);
        }
    }

    private _playDash(): void {
        if (!this.ctx || !this.sfxGain) return;

        try {
            const t = this.ctx.currentTime;

            // Whoosh sound
            const osc = this.ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, t);
            osc.frequency.exponentialRampToValueAtTime(800, t + 0.15);
            osc.frequency.exponentialRampToValueAtTime(100, t + 0.3);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.15, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 1500;

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.3);
        } catch (e) {
            console.warn('Audio: playDash failed', e);
        }
    }

    private _playCollect(volume: number, pitch: number): void {
        if (!this.ctx || !this.sfxGain) return;

        try {
            const t = this.ctx.currentTime;
            const variation = (Math.random() * 200) - 100;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime((800 + variation) * pitch, t);
            osc.frequency.linearRampToValueAtTime((1600 + variation) * pitch, t + 0.1);

            gain.gain.setValueAtTime(0.2 * volume, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.15);
        } catch (e) {
            console.warn('Audio: playCollect failed', e);
        }
    }

    private _playPowerUp(): void {
        if (!this.ctx || !this.sfxGain) return;

        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, t);
            osc.frequency.linearRampToValueAtTime(1200, t + 0.4);

            gain.gain.setValueAtTime(0.3, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.4);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.4);
        } catch (e) {
            console.warn('Audio: playPowerUp failed', e);
        }
    }

    private _playDamage(): void {
        if (!this.ctx || !this.sfxGain) return;

        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, t);
            osc.frequency.exponentialRampToValueAtTime(40, t + 0.3);

            gain.gain.setValueAtTime(0.4, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.3);
        } catch (e) {
            console.warn('Audio: playDamage failed', e);
        }
    }

    private _playGameOver(): void {
        if (!this.ctx || !this.sfxGain) return;

        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(400, t);
            osc.frequency.exponentialRampToValueAtTime(50, t + 1.5);

            gain.gain.setValueAtTime(0.5, t);
            gain.gain.linearRampToValueAtTime(0, t + 1.5);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 1.5);
        } catch (e) {
            console.warn('Audio: playGameOver failed', e);
        }
    }

    private _playRespawn(): void {
        if (!this.ctx || !this.sfxGain) return;

        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(200, t);
            osc.frequency.linearRampToValueAtTime(800, t + 0.5);

            gain.gain.setValueAtTime(0.3, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.5);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.5);
        } catch (e) {
            console.warn('Audio: playRespawn failed', e);
        }
    }

    private playComboTrigger(volume: number, pitch: number): void {
        if (!this.ctx || !this.sfxGain) return;

        try {
            const t = this.ctx.currentTime;

            // Arpeggio effect
            const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

            notes.forEach((freq, i) => {
                const osc = this.ctx!.createOscillator();
                const gain = this.ctx!.createGain();

                osc.type = 'sine';
                osc.frequency.value = freq * pitch;

                const noteTime = t + i * 0.05;
                gain.gain.setValueAtTime(0, noteTime);
                gain.gain.linearRampToValueAtTime(0.15 * volume, noteTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.01, noteTime + 0.15);

                osc.connect(gain);
                gain.connect(this.sfxGain!);
                osc.start(noteTime);
                osc.stop(noteTime + 0.15);
            });
        } catch (e) {
            console.warn('Audio: playComboTrigger failed', e);
        }
    }

    private playPerfectTiming(): void {
        if (!this.ctx || !this.sfxGain) return;

        try {
            const t = this.ctx.currentTime;

            // Sparkle sound
            for (let i = 0; i < 5; i++) {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                const freq = 1000 + i * 200 + Math.random() * 100;
                osc.frequency.value = freq;

                const noteTime = t + i * 0.03;
                gain.gain.setValueAtTime(0, noteTime);
                gain.gain.linearRampToValueAtTime(0.1, noteTime + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.01, noteTime + 0.1);

                osc.connect(gain);
                gain.connect(this.sfxGain);
                osc.start(noteTime);
                osc.stop(noteTime + 0.1);
            }
        } catch (e) {
            console.warn('Audio: playPerfectTiming failed', e);
        }
    }

    private playGenericSFX(volume: number, pitch: number): void {
        if (!this.ctx || !this.sfxGain) return;

        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = 440 * pitch;

            gain.gain.setValueAtTime(0.2 * volume, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.1);
        } catch (e) {
            console.warn('Audio: playGenericSFX failed', e);
        }
    }

    // ==================== MUSIC ENGINE ====================

    public toggleMusic(shouldPlay: boolean): void {
        this.isPlayingMusic = shouldPlay;

        if (shouldPlay) {
            if (!this.ctx) this.init();

            if (this.ctx) {
                if (this.ctx.state === 'suspended') {
                    this.ctx.resume().catch(() => { });
                }
                this.current16thNote = 0;
                this.nextNoteTime = this.ctx.currentTime + 0.1;
                this.missionStartTime = Date.now();
                this.isDnBPhase = false;
                this.lastNarratorTime = 0;
                this.scheduler();
            }
        } else {
            if (this.musicSchedulerId !== null) {
                window.clearTimeout(this.musicSchedulerId);
                this.musicSchedulerId = null;
            }
        }
    }

    public updateMusicIntensity(intensity: number, tempo: number): void {
        // Определяем уровень интенсивности
        if (intensity < 0.3) {
            this.currentIntensity = 'calm';
        } else if (intensity < 0.7) {
            this.currentIntensity = 'medium';
        } else {
            this.currentIntensity = 'intense';
        }

        // Обновляем темп
        this.updateTempo(RUN_SPEED_BASE + tempo * 50);
    }

    public updateTempo(gameSpeed: number): void {
        if (!this.ctx) return;
        
        // World Bible: Перехід у DnB після 120с
        const missionDuration = (Date.now() - this.missionStartTime) / 1000;
        if (missionDuration > 120 && !this.isDnBPhase) {
            this.isDnBPhase = true;
            this.playNarrator('narrator_danger'); // "Warning: Fluid pressure rising!"
        }

        const base = this.isDnBPhase ? this.dnbTempo : this.baseTempo;
        const speedDiff = Math.max(0, gameSpeed - RUN_SPEED_BASE);
        const targetTempo = base + (speedDiff * 0.5);
        this.currentTempo += (targetTempo - this.currentTempo) * 0.1;

        // Іноді диктор коментує успіх/невдачу
        this.checkNarratorTrigger(missionDuration);
    }

    private checkNarratorTrigger(duration: number): void {
        if (duration - this.lastNarratorTime > 30 && Math.random() > 0.7) {
            const lines: SFXType[] = ['narrator_welcome', 'narrator_danger'];
            this.playNarrator(lines[Math.floor(Math.random() * lines.length)]!);
            this.lastNarratorTime = duration;
        }
    }

    private playNarrator(type: SFXType): void {
        this.playSFX(type, { volume: 1.2, pitch: 0.9 }); // Глибокий, іронічний голос
    }

    private scheduler(): void {
        if (!this.isPlayingMusic || !this.ctx) return;

        if (this.nextNoteTime < this.ctx.currentTime - 0.5) {
            this.nextNoteTime = this.ctx.currentTime + 0.1;
        }

        const scheduleAheadTime = 0.1;
        while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
            this.scheduleNote(this.current16thNote, this.nextNoteTime);
            this.nextNote();
        }

        this.musicSchedulerId = window.setTimeout(() => this.scheduler(), 25);
    }

    private nextNote(): void {
        const secondsPerBeat = 60.0 / this.currentTempo;
        this.nextNoteTime += 0.25 * secondsPerBeat;
        this.current16thNote++;
        if (this.current16thNote === 32) this.current16thNote = 0;
    }

    private scheduleNote(beatNumber: number, time: number): void {
        if (!this.ctx || !this.musicGain || this.ctx.state !== 'running') return;

        // Интенсивность влияет на громкость и количество элементов
        const intensityMultiplier = this.currentIntensity === 'calm' ? 0.5 :
            this.currentIntensity === 'medium' ? 0.75 : 1.0;

        if (beatNumber % 4 === 0) {
            this.playKick(time, intensityMultiplier);
        }
        if (beatNumber % 8 === 4 && this.currentIntensity !== 'calm') {
            this.playSnare(time, intensityMultiplier);
        }
        if (beatNumber % 2 === 0) {
            this.playHat(time, beatNumber % 4 === 2, intensityMultiplier);
        }
        if (beatNumber % 4 !== 0 || Math.random() > 0.5) {
            const noteIndex = Math.floor(beatNumber / 4);
            const freq = this.bassLine[noteIndex % this.bassLine.length];
            if (freq !== undefined) this.playBass(time, freq, intensityMultiplier);
        }
        if (beatNumber % 4 === 0 && this.currentIntensity === 'intense') {
            this.playArp(time, beatNumber, intensityMultiplier);
        }
    }

    private playKick(time: number, intensity: number): void {
        if (!this.ctx || !this.musicGain || this.ctx.state === 'closed') return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.frequency.setValueAtTime(150, time);
            osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.4);

            gain.gain.setValueAtTime(0.8 * intensity, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);

            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(time);
            osc.stop(time + 0.4);
        } catch (e) {
            console.warn('Audio: playKick failed', e);
        }
    }

    private playSnare(time: number, intensity: number): void {
        const snareBuffer = this.buffers.get('snare');
        if (!snareBuffer || !this.ctx || !this.musicGain || this.ctx.state === 'closed') return;

        try {
            const noise = this.ctx.createBufferSource();
            noise.buffer = snareBuffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 1500;

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.3 * intensity, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicGain);
            noise.start(time);
        } catch (e) {
            console.warn('Audio: playSnare failed', e);
        }
    }

    private playHat(time: number, open: boolean, intensity: number): void {
        if (!this.ctx || !this.musicGain || this.ctx.state === 'closed') return;

        try {
            const gain = this.ctx.createGain();
            const osc = this.ctx.createOscillator();

            osc.type = 'square';
            osc.frequency.setValueAtTime(open ? 800 : 1200, time);

            gain.gain.setValueAtTime(0.05 * intensity, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + (open ? 0.05 : 0.02));

            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(time);
            osc.stop(time + 0.1);
        } catch (e) {
            console.warn('Audio: playHat failed', e);
        }
    }

    private playBass(time: number, freq: number, intensity: number): void {
        if (!this.ctx || !this.musicGain || this.ctx.state === 'closed') return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time);

            gain.gain.setValueAtTime(0.3 * intensity, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(time);
            osc.stop(time + 0.2);
        } catch (e) {
            console.warn('Audio: playBass failed', e);
        }
    }

    private playArp(time: number, beat: number, intensity: number): void {
        if (!this.ctx || !this.musicGain || this.ctx.state === 'closed') return;

        try {
            const notes = [261.63, 311.13, 392.00, 523.25];
            const note = notes[(beat / 4) % notes.length];
            if (note === undefined) return;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(note, time);

            gain.gain.setValueAtTime(0.05 * intensity, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(time);
            osc.stop(time + 0.1);
        } catch (e) {
            console.warn('Audio: playArp failed', e);
        }
    }

    // ==================== HAPTIC FEEDBACK ====================

    public playHaptic(pattern: HapticPattern | keyof typeof HAPTIC_PATTERNS): void {
        if (!this.hapticSupported) return;

        const hapticPattern = typeof pattern === 'string' ? HAPTIC_PATTERNS[pattern] : pattern;
        if (!hapticPattern) return;

        // Простая вибрация для мобильных устройств
        if ('vibrate' in navigator) {
            navigator.vibrate(hapticPattern.duration);
        }
    }

    public isHapticSupported(): boolean {
        return this.hapticSupported;
    }

    // ==================== DYNAMIC AUDIO (CACHE & LAZY LOADING) ====================

    /**
     * Ініціалізувати DynamicAudioManager
     */
    private initDynamicAudio(): void {
        if (!this.ctx || !this.masterGain) return;
        
        this.dynamicAudioManager = DynamicAudioManager.getInstance(this.cacheConfig);
        this.dynamicAudioManager.init(this.ctx, this.masterGain);
        
        if (import.meta.env.DEV) {
            console.log('🎵 Dynamic Audio Manager integrated');
        }
    }

    /**
     * Зареєструвати маніфест динамічних звуків
     */
    public registerDynamicSounds(manifest: DynamicSoundManifest[]): void {
        if (!this.dynamicAudioManager) {
            console.warn('[UnifiedAudio] DynamicAudioManager not initialized');
            return;
        }
        this.dynamicAudioManager.registerManifest(manifest);
    }

    /**
     * Відтворити динамічний звук
     */
    public playDynamicSound(
        soundId: string, 
        options?: { volume?: number; rate?: number; loop?: boolean }
    ): void {
        if (!this.dynamicAudioManager) {
            console.warn('[UnifiedAudio] DynamicAudioManager not initialized');
            return;
        }
        this.dynamicAudioManager.play(soundId, options);
    }

    /**
     * Отримати статистику кешу
     */
    public getCacheStats() {
        if (!this.dynamicAudioManager) return null;
        return this.dynamicAudioManager.getCacheStats();
    }

    /**
     * Очистити кеш динамічних звуків
     */
    public clearDynamicCache(): void {
        if (this.dynamicAudioManager) {
            this.dynamicAudioManager.clearCache();
        }
    }

    /**
     * Встановити максимальний розмір кешу
     */
    public setMaxCacheSize(mb: number): void {
        if (this.dynamicAudioManager) {
            this.dynamicAudioManager.setMaxCacheSize(mb);
        }
    }

    // ==================== CLEANUP ====================

    public dispose(): void {
        this.toggleMusic(false);

        // CRITICAL FIX: Clear music scheduler interval to prevent memory leaks
        if (this.musicSchedulerId !== null) {
            window.clearTimeout(this.musicSchedulerId);
            this.musicSchedulerId = null;
        }

        // Очищуємо DynamicAudioManager
        if (this.dynamicAudioManager) {
            this.dynamicAudioManager.dispose();
            this.dynamicAudioManager = null;
        }

        if (this.ctx && this.ctx.state !== 'closed') {
            this.ctx.close().catch(() => { });
        }

        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.lowPassFilter = null;
        this.buffers.clear();
        this.initialized = false;
    }

    // ==================== LEGACY COMPATIBILITY ====================
    // Методы для обратной совместимости со старым AudioController

    public playClick(): void { this.playSFX('click'); }
    public playJump(isDouble = false): void { this.playSFX(isDouble ? 'doubleJump' : 'jump'); }
    public playSwipe(): void { this.playSFX('swipe'); }
    public playGemCollect(): void { this.playSFX('gem'); }
    public playPowerUp(): void { this.playSFX('powerup'); }
    public playDamage(): void { this.playSFX('damage'); }
    public playGameOver(): void { this.playSFX('gameOver'); }
    public playRespawn(): void { this.playSFX('respawn'); }
    public playShield(): void { this.playSFX('shield'); }
    public playCollect(): void { this.playSFX('coin'); }
    public playHit(): void { this.playSFX('hit'); }

    // Алиасы для init
    public init_legacy(): void { this.init(); }
}

// Экспорт синглтона
export const unifiedAudio = UnifiedAudioManager.getInstance();

// Экспорт для обратной совместимости
export const audio = unifiedAudio;
