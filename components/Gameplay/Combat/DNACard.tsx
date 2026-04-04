// @ts-nocheck
/**
 * DNA_CARD - Card Collection System v2.4.0
 * Cards drop from enemies and provide upgrades
 */

import React, { useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { Mesh } from 'three';
import { useStore } from '../../../store';
import { eventBus } from '../../../utils/eventBus';
import type { DNACard as DNACardType } from '../../../types';

// Rarity colors
const RARITY_COLORS = {
    common: '#FFFFFF',    // White
    rare: '#4488FF',     // Blue
    epic: '#AA44FF',     // Purple
    legendary: '#FFD700' // Gold
};

// Card definitions
const CARD_DEFINITIONS: Record<string, Omit<DNACardType, 'id' | 'owned'>> = {
    'magnet_1': { name: 'Магніт +10%', rarity: 'common', color: RARITY_COLORS.common, effect: { type: 'magnet_duration', value: 10 }, starLevel: 1 },
    'magnet_2': { name: 'Магніт +25%', rarity: 'rare', color: RARITY_COLORS.rare, effect: { type: 'magnet_duration', value: 25 }, starLevel: 2 },
    'magnet_3': { name: 'Магніт +50%', rarity: 'epic', color: RARITY_COLORS.epic, effect: { type: 'magnet_duration', value: 50 }, starLevel: 3 },
    'double_jump': { name: 'Подвійний стрибок', rarity: 'epic', color: RARITY_COLORS.epic, effect: { type: 'double_jump', value: 1 }, starLevel: 1 },
    'shield_1': { name: 'Щит 60с', rarity: 'common', color: RARITY_COLORS.common, effect: { type: 'shield_interval', value: 60 }, starLevel: 1 },
    'shield_2': { name: 'Щит 45с', rarity: 'rare', color: RARITY_COLORS.rare, effect: { type: 'shield_interval', value: 45 }, starLevel: 2 },
    'shield_3': { name: 'Щит 30с', rarity: 'legendary', color: RARITY_COLORS.legendary, effect: { type: 'shield_interval', value: 30 }, starLevel: 3 },
    'speed_1': { name: 'Швидкість +5%', rarity: 'common', color: RARITY_COLORS.common, effect: { type: 'speed_boost', value: 5 }, starLevel: 1 },
    'speed_2': { name: 'Швидкість +10%', rarity: 'rare', color: RARITY_COLORS.rare, effect: { type: 'speed_boost', value: 10 }, starLevel: 2 },
    'score_1': { name: 'Очки +10%', rarity: 'common', color: RARITY_COLORS.common, effect: { type: 'score_multiplier', value: 10 }, starLevel: 1 },
    'score_2': { name: 'Очки +25%', rarity: 'rare', color: RARITY_COLORS.rare, effect: { type: 'score_multiplier', value: 25 }, starLevel: 2 },
    'score_3': { name: 'Очки +50%', rarity: 'legendary', color: RARITY_COLORS.legendary, effect: { type: 'score_multiplier', value: 50 }, starLevel: 3 }
};

interface DNA_CARDProps {
    cardId: string;
    position: [number, number, number];
    onCollect?: (card: DNACardType) => void;
    autoCollect?: boolean;
}

export const DNA_CARD: React.FC<DNA_CARDProps> = ({
    cardId,
    position,
    onCollect,
    autoCollect = false
}) => {
    const [isCollected, setIsCollected] = useState(false);
    const [rotation, setRotation] = useState(0);
    const cardRef = React.useRef<Mesh>(null);

    const cardDef = CARD_DEFINITIONS[cardId];

    // Animate card rotation
    useFrame((_, delta) => {
        if (!isCollected && cardRef.current) {
            setRotation(prev => prev + delta * 2);
            cardRef.current.rotation.y = rotation;
            cardRef.current.position.y = position[1] + Math.sin(Date.now() * 0.003) * 0.2;
        }
    });

    // Auto collect after delay
    useEffect(() => {
        if (autoCollect) {
            const timer = setTimeout(() => {
                handleCollect();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [autoCollect]);

    const handleCollect = () => {
        if (isCollected) return;

        setIsCollected(true);

        const card: DNACardType = {
            id: cardId,
            ...cardDef,
            owned: true
        };

        // Update store
        useStore.setState(state => {
            const cards = state.dnaCards || [];
            return {
                dnaCards: [...cards, card]
            };
        });

        // Emit event
        eventBus.emit('dna_card_collected', { cardId, card });

        onCollect?.(card);
    };

    if (isCollected || !cardDef) {
        return null;
    }

    return (
        <group position={position}>
            {/* Card mesh */}
            <mesh
                ref={cardRef}
                onClick={handleCollect}
                onPointerEnter={() => document.body.style.cursor = 'pointer'}
                onPointerLeave={() => document.body.style.cursor = 'default'}
            >
                <planeGeometry args={[1.5, 2]} />
                <meshToonMaterial
                    color={cardDef.color}
                    side={2} // DoubleSide
                    transparent
                    opacity={0.9}
                />
            </mesh>

            {/* Card content */}
            <Text
                position={[0, 0.3, 0.1]}
                fontSize={0.2}
                color="#000000"
                anchorX="center"
                anchorY="middle"
            >
                {cardDef.name}
            </Text>

            {/* Rarity indicator */}
            <Text
                position={[0, -0.5, 0.1]}
                fontSize={0.15}
                color={cardDef.color}
                anchorX="center"
                anchorY="middle"
            >
                {cardDef.rarity.toUpperCase()}
            </Text>

            {/* Star level */}
            <Text
                position={[0, -0.8, 0.1]}
                fontSize={0.25}
                color="#FFD700"
                anchorX="center"
                anchorY="middle"
            >
                {'★'.repeat(cardDef.starLevel)}
            </Text>

            {/* Glow effect */}
            <mesh position={[0, 0, -0.1]}>
                <planeGeometry args={[1.7, 2.2]} />
                <meshBasicMaterial
                    color={cardDef.color}
                    transparent
                    opacity={0.3}
                />
            </mesh>
        </group>
    );
};

// Spawn random card from enemy
export const spawnRandomCard = (rarity?: 'common' | 'rare' | 'epic' | 'legendary'): string => {
    const availableCards = Object.keys(CARD_DEFINITIONS).filter(id => {
        if (!rarity) return true;
        return CARD_DEFINITIONS[id].rarity === rarity;
    });

    // Weight by rarity if not specified
    if (!rarity) {
        const rand = Math.random();
        if (rand < 0.6) {
            return spawnRandomCard('common');
        } else if (rand < 0.85) {
            return spawnRandomCard('rare');
        } else if (rand < 0.95) {
            return spawnRandomCard('epic');
        } else {
            return spawnRandomCard('legendary');
        }
    }

    return availableCards[Math.floor(Math.random() * availableCards.length)] || 'magnet_1';
};

// Apply card effects
export const applyCardEffect = (card: DNACardType): void => {
    useStore.getState();

    switch (card.effect.type) {
        case 'magnet_duration':
            // Modify magnet duration - handled in gameplay
            console.log(`[DNA] Applied magnet +${card.effect.value}%`);
            break;
        case 'double_jump':
            // Enable double jump - handled in player state
            console.log(`[DNA] Enabled double jump`);
            break;
        case 'shield_interval':
            // Modify shield auto-proc interval
            console.log(`[DNA] Shield interval: ${card.effect.value}s`);
            break;
        case 'speed_boost':
            // Apply permanent speed bonus
            console.log(`[DNA] Speed +${card.effect.value}%`);
            break;
        case 'score_multiplier':
            // Apply score multiplier
            console.log(`[DNA] Score +${card.effect.value}%`);
            break;
    }
};

export default DNA_CARD;
