import { Crown } from 'lucide-react';

interface PodiumPlayer {
    name: string;
    avatar?: string;
    score: number;
}

interface PodiumProps {
    players: PodiumPlayer[];
}

const Podium = ({ players }: PodiumProps) => {
    if (players.length === 0) return null;

    const top3 = players.slice(0, 3);
    // Display order: 2nd, 1st, 3rd for visual drama
    const displayOrder = top3.length >= 3
        ? [top3[1], top3[0], top3[2]]
        : top3.length === 2
            ? [top3[1], top3[0]]
            : [top3[0]];

    const heights = ['h-32', 'h-44', 'h-24']; // 2nd, 1st, 3rd
    const podiumStyles = ['podium-2', 'podium-1', 'podium-3'];
    const delays = ['0.3s', '0.6s', '0.15s']; // 3rd reveals first, then 2nd, then 1st
    const glows = [
        '0 0 25px rgba(192, 192, 192, 0.3)',
        '0 0 40px rgba(255, 215, 0, 0.5), 0 0 80px rgba(255, 215, 0, 0.2)',
        '0 0 20px rgba(205, 127, 50, 0.3)',
    ];
    const rankLabels = ['🥈', '🥇', '🥉'];
    const originalRanks = [2, 1, 3];

    return (
        <div className="flex flex-col items-center gap-6 animate-fade-in">
            <h2 className="font-outfit text-4xl font-black text-center">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FFD700] via-[#FF3CAC] to-[#00DCFF]">
                    🏆 Final Podium
                </span>
            </h2>

            <div className="flex items-end justify-center gap-3 md:gap-5 w-full max-w-lg">
                {displayOrder.map((player, i) => {
                    if (!player) return null;
                    const rank = originalRanks[i] || i + 1;
                    const heightClass = heights[i] || 'h-24';
                    const podiumClass = podiumStyles[i] || 'podium-3';
                    const delay = delays[i] || '0.2s';
                    const glow = glows[i] || '';
                    const label = rankLabels[i] || `#${rank}`;

                    return (
                        <div key={i} className="flex flex-col items-center flex-1" style={{ maxWidth: '140px' }}>
                            {/* Player info */}
                            <div
                                className="flex flex-col items-center mb-3 animate-slide-up"
                                style={{ animationDelay: delay }}
                            >
                                <div
                                    className="text-4xl mb-1 animate-rank-pop"
                                    style={{ animationDelay: `calc(${delay} + 0.3s)` }}
                                >
                                    {player.avatar || '🎮'}
                                </div>
                                <p className="font-outfit font-bold text-sm text-foreground truncate max-w-[120px] text-center">
                                    {player.name}
                                </p>
                                <p className="font-outfit font-black text-xs text-primary">
                                    {player.score.toLocaleString()} pts
                                </p>
                            </div>

                            {/* Podium bar */}
                            <div
                                className={`podium-bar ${podiumClass} ${heightClass} w-full rounded-t-xl flex flex-col items-center justify-start pt-3 relative`}
                                style={{ animationDelay: delay, boxShadow: glow }}
                            >
                                <span className="text-2xl">{label}</span>
                                {rank === 1 && (
                                    <Crown size={20} className="text-yellow-900 mt-1 animate-rank-pop" style={{ animationDelay: '1s' }} />
                                )}

                                {/* Shimmer effect on 1st place */}
                                {rank === 1 && (
                                    <div className="absolute inset-0 overflow-hidden rounded-t-xl">
                                        <div
                                            className="absolute inset-0 opacity-30"
                                            style={{
                                                background: 'linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)',
                                                animation: 'light-streak 3s linear infinite',
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Podium;
