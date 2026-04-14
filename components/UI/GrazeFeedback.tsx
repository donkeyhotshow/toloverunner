import React, { useEffect, useState, useRef } from 'react';
import { UI_LAYERS } from '../../constants';
import { eventBus } from '../../utils/eventBus';

export const GrazeFeedback: React.FC = () => {
    const [messages, setMessages] = useState<{ id: number; x: number; y: number }[]>([]);
    const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

    useEffect(() => {
        const timeoutsSnapshot = timeoutsRef.current;
        const unsub = eventBus.on('player:graze', () => {
            const id = Date.now();
            const newMessage = {
                id,
                x: 40 + Math.random() * 20,
                y: 40 + Math.random() * 20
            };
            setMessages(prev => [...prev.slice(-3), newMessage]);

            const timeout = setTimeout(() => {
                setMessages(prev => prev.filter(m => m.id !== id));
                timeoutsRef.current.delete(timeout);
            }, 800);

            timeoutsRef.current.add(timeout);
        });

        return () => {
            unsub();
            timeoutsSnapshot.forEach(timeout => clearTimeout(timeout));
            timeoutsSnapshot.clear();
        };
    }, []);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden font-comic" style={{ zIndex: UI_LAYERS.GRAZE }}>
            {messages.map(m => (
                <div
                    key={m.id}
                    className="absolute animate-comic-pop text-[#00FF00] font-black text-4xl italic"
                    style={{
                        left: `${m.x}%`,
                        top: `${m.y}%`,
                        textShadow: '3px 3px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000, 1px 1px 0px #000'
                    }}
                >
                    CLOSE CALL!
                </div>
            ))}
            <style>{`
                @keyframes comic-pop {
                    0% { transform: scale(0) rotate(-20deg); opacity: 0; }
                    20% { transform: scale(1.5) rotate(10deg); opacity: 1; }
                    80% { transform: scale(1.2) rotate(5deg); opacity: 1; }
                    100% { transform: scale(1.0) translateY(-100px); opacity: 0; }
                }
                .animate-comic-pop {
                    animation: comic-pop 0.8s forwards;
                }
            `}</style>
        </div>
    );
};
