import React from 'react';
import { Sparkles } from 'lucide-react';

const AVATARS = [
    '🦁', '🐯', '🦊', '🐻', '🐼', '🐨', '🐭', '🐰',
    '🤖', '👾', '🚀', '⭐', '🔥', '💎', '🌈', '🍦',
    '🍕', '🎮', '🏀', '🎸', '🎨', '🧠', '⚡', '🐉'
];

interface AvatarSelectorProps {
    selectedAvatar: string | null;
    onSelect: (avatar: string) => void;
    className?: string;
}

const AvatarSelector = ({ selectedAvatar, onSelect, className = "" }: AvatarSelectorProps) => {
    const randomize = () => {
        const random = AVATARS[Math.floor(Math.random() * AVATARS.length)];
        onSelect(random);
    };

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block ml-1">
                    Pick your Avatar
                </label>
                <button
                    onClick={randomize}
                    type="button"
                    className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                >
                    <Sparkles size={10} /> Randomize
                </button>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 sm:gap-2">
                {AVATARS.map((avatar) => (
                    <button
                        key={avatar}
                        type="button"
                        onClick={() => onSelect(avatar)}
                        className={`
              w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-lg sm:text-xl rounded-xl transition-all duration-200
              ${selectedAvatar === avatar
                                ? 'bg-primary/20 border-2 border-primary scale-110 shadow-[0_0_15px_hsl(var(--primary)/0.3)]'
                                : 'bg-[hsl(var(--muted))] border border-[hsl(var(--border))] hover:border-primary/40 hover:bg-primary/10 hover:scale-105'
                            }
            `}
                    >
                        {avatar}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default AvatarSelector;
export { AVATARS };
