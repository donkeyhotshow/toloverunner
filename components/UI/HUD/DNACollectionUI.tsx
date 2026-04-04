/**
 * DNA Collection UI - v2.4.0
 * Shows collected DNA cards with filtering and sorting
 */

// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useStore } from '../../../store';

type RarityFilter = 'all' | 'common' | 'rare' | 'epic' | 'legendary';
type SortBy = 'rarity' | 'date' | 'name';

const RARITY_COLORS: Record<string, string> = {
    common: '#FFFFFF',
    rare: '#4488FF',
    epic: '#AA44FF',
    legendary: '#FFD700'
};

export const DNACollectionUI: React.FC = () => {
    const dnaCards = useStore(s => s.dnaCards) || [];
    const [isOpen, setIsOpen] = useState(false);
    const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');
    const [sortBy, setSortBy] = useState<SortBy>('rarity');

    // Filter and sort cards
    const filteredCards = useMemo(() => {
        let cards = [...dnaCards];

        // Filter by rarity
        if (rarityFilter !== 'all') {
            cards = cards.filter(c => c.rarity === rarityFilter);
        }

        // Sort
        cards.sort((a, b) => {
            if (sortBy === 'rarity') {
                const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
                return (rarityOrder[a.rarity] || 3) - (rarityOrder[b.rarity] || 3);
            } else if (sortBy === 'name') {
                return a.name.localeCompare(b.name);
            }
            return 0; // date - would need timestamp
        });

        return cards;
    }, [dnaCards, rarityFilter, sortBy]);

    // Count by rarity
    const counts = useMemo(() => ({
        all: dnaCards.length,
        common: dnaCards.filter(c => c.rarity === 'common').length,
        rare: dnaCards.filter(c => c.rarity === 'rare').length,
        epic: dnaCards.filter(c => c.rarity === 'epic').length,
        legendary: dnaCards.filter(c => c.rarity === 'legendary').length
    }), [dnaCards]);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    position: 'absolute',
                    bottom: '20px',
                    right: '20px',
                    padding: '12px 20px',
                    background: 'linear-gradient(135deg, #AA44FF 0%, #4488FF 100%)',
                    border: '2px solid #FFD700',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(170, 68, 255, 0.4)'
                }}
            >
                🧬 DNA Collection ({counts.all})
            </button>
        );
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px',
            zIndex: 10000,
            overflow: 'auto'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                maxWidth: '800px',
                marginBottom: '20px'
            }}>
                <h1 style={{
                    color: '#FFD700',
                    fontSize: '32px',
                    margin: 0,
                    textShadow: '0 0 20px rgba(255, 215, 0, 0.5)'
                }}>
                    🧬 DNA Collection
                </h1>
                <button
                    onClick={() => setIsOpen(false)}
                    style={{
                        padding: '10px 20px',
                        background: '#FF4444',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#FFFFFF',
                        fontSize: '16px',
                        cursor: 'pointer'
                    }}
                >
                    ✕ Close
                </button>
            </div>

            {/* Filters */}
            <div style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '20px',
                flexWrap: 'wrap',
                justifyContent: 'center'
            }}>
                {/* Rarity filters */}
                {(['all', 'common', 'rare', 'epic', 'legendary'] as RarityFilter[]).map(rarity => (
                    <button
                        key={rarity}
                        onClick={() => setRarityFilter(rarity)}
                        style={{
                            padding: '8px 16px',
                            background: rarityFilter === rarity 
                                ? RARITY_COLORS[rarity] || '#666'
                                : 'rgba(255, 255, 255, 0.1)',
                            border: `2px solid ${RARITY_COLORS[rarity] || '#666'}`,
                            borderRadius: '20px',
                            color: rarityFilter === rarity ? '#000' : '#FFF',
                            fontSize: '14px',
                            cursor: 'pointer',
                            textTransform: 'capitalize'
                        }}
                    >
                        {rarity} ({counts[rarity]})
                    </button>
                ))}
            </div>

            {/* Sort */}
            <div style={{ marginBottom: '20px' }}>
                <span style={{ color: '#FFF', marginRight: '10px' }}>Sort by:</span>
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                    style={{
                        padding: '8px 16px',
                        background: '#333',
                        border: '2px solid #AAA',
                        borderRadius: '8px',
                        color: '#FFF',
                        fontSize: '14px'
                    }}
                >
                    <option value="rarity">Rarity</option>
                    <option value="name">Name</option>
                </select>
            </div>

            {/* Cards Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '15px',
                width: '100%',
                maxWidth: '800px'
            }}>
                {filteredCards.map((card, index) => (
                    <div
                        key={`${card.id}-${index}`}
                        style={{
                            background: `linear-gradient(135deg, ${card.color}33 0%, ${card.color}11 100%)`,
                            border: `3px solid ${card.color}`,
                            borderRadius: '12px',
                            padding: '15px',
                            textAlign: 'center',
                            boxShadow: `0 0 20px ${card.color}44`
                        }}
                    >
                        {/* Card name */}
                        <div style={{
                            color: card.color,
                            fontWeight: 'bold',
                            fontSize: '14px',
                            marginBottom: '8px'
                        }}>
                            {card.name}
                        </div>

                        {/* Rarity */}
                        <div style={{
                            color: card.color,
                            fontSize: '12px',
                            textTransform: 'uppercase',
                            marginBottom: '8px'
                        }}>
                            {card.rarity}
                        </div>

                        {/* Stars */}
                        <div style={{
                            color: '#FFD700',
                            fontSize: '18px',
                            letterSpacing: '2px'
                        }}>
                            {'★'.repeat(card.starLevel)}
                        </div>

                        {/* Effect */}
                        <div style={{
                            color: '#AAA',
                            fontSize: '11px',
                            marginTop: '8px'
                        }}>
                            {card.effect.type}: +{card.effect.value}
                        </div>
                    </div>
                ))}
            </div>

            {filteredCards.length === 0 && (
                <div style={{
                    color: '#666',
                    fontSize: '18px',
                    textAlign: 'center',
                    marginTop: '40px'
                }}>
                    No cards found. Destroy enemies to collect DNA cards!
                </div>
            )}
        </div>
    );
};

export default DNACollectionUI;
