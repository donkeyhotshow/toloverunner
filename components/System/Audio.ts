/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DEPRECATED: This file is kept for backward compatibility.
 * Please use UnifiedAudioManager from core/audio/UnifiedAudioManager.ts instead.
 *
 * All methods delegate to the unified audio system to prevent conflicts
 * and ensure synchronized volume control.
 */

import { unifiedAudio } from '../../core/audio/UnifiedAudioManager';

/**
 * @deprecated Use unifiedAudio from core/audio/UnifiedAudioManager.ts instead
 * This class now acts as a facade that delegates to the unified audio system.
 */
export class AudioController {
    // Delegate all state to unified audio manager
    get ctx() { return null; } // No longer expose raw context
    get masterGain() { return null; }
    get musicGain() { return null; }
    get sfxGain() { return null; }

    isPlayingMusic = false;

    constructor() {
        // console.warn('AudioController is deprecated. Use unifiedAudio from core/audio/UnifiedAudioManager.ts instead.');
    }

    init() {
        unifiedAudio.init();
    }

    setMuffled(isMuffled: boolean) {
        unifiedAudio.setMuffled(isMuffled);
    }

    updateTempo(gameSpeed: number) {
        unifiedAudio.updateTempo(gameSpeed);
    }

    toggleMusic(shouldPlay: boolean) {
        this.isPlayingMusic = shouldPlay;
        unifiedAudio.toggleMusic(shouldPlay);
    }

    ensureContext() {
        unifiedAudio.init();
        return true;
    }

    playClick() {
        unifiedAudio.playSFX('click');
    }

    playGemCollect() {
        unifiedAudio.playSFX('gem');
    }

    playPowerUp() {
        unifiedAudio.playSFX('powerup');
    }

    playJump(isDouble = false) {
        unifiedAudio.playSFX(isDouble ? 'doubleJump' : 'jump');
    }

    playSwipe() {
        unifiedAudio.playSFX('swipe');
    }

    playDamage() {
        unifiedAudio.playSFX('damage');
    }

    playGameOver() {
        unifiedAudio.playSFX('gameOver');
    }

    playRespawn() {
        unifiedAudio.playSFX('respawn');
    }

    playShield() {
        unifiedAudio.playSFX('shield');
    }

    playCollect() {
        unifiedAudio.playSFX('coin');
    }

    playHit() {
        unifiedAudio.playSFX('hit');
    }
}

/**
 * @deprecated Use unifiedAudio from core/audio/UnifiedAudioManager.ts instead
 */
export const audio = new AudioController();
