import { fetchVoteResults, fetchVotingSession } from "@/app/lib/data";
import Link from "next/link";
import CloseVotingButton from "./CloseVotingButton";
import OpenVotingButton from "./OpenVotingButton";
import CopyLinkButton from "./CopyLinkButton";

type Props = {
    gameId: number;
    gameNumero: number;
    leagueId?: number;
    showAdminControls?: boolean;
};

export default async function GameVoteResults({ gameId, gameNumero, leagueId, showAdminControls }: Props) {
    const session = await fetchVotingSession(gameId);

    // No session at all — admin can open one
    if (!session) {
        if (showAdminControls && leagueId) {
            return (
                <div className="w-full max-w-md mx-auto rounded-lg border p-4 text-center space-y-2">
                    <p className="text-xs text-gray-400">Sem votação para este jogo.</p>
                    <OpenVotingButton gameId={gameId} leagueId={leagueId} />
                </div>
            );
        }
        return null;
    }

    const isOpen = session.is_open;
    const results = await fetchVoteResults(gameId);

    if (isOpen) {
        return (
            <div className="w-full max-w-md mx-auto rounded-lg border p-4 space-y-3">
                <h3 className="font-semibold text-center text-sm">Votação MVP</h3>
                <div className="text-center space-y-2">
                    <p className="text-sm text-amber-600 font-medium">🗳️ Votação em curso…</p>
                    <p className="text-xs text-gray-500">
                        {results.totalVotes} voto{results.totalVotes !== 1 ? 's' : ''} submetido{results.totalVotes !== 1 ? 's' : ''}. Resultados por apurar.
                    </p>
                    <div className="flex items-center justify-center gap-2">
                        <Link
                            href={`/vote/${gameNumero}`}
                            className="inline-block bg-blue-600 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                            Votar
                        </Link>
                        <CopyLinkButton path={`/vote/${gameNumero}`} />
                    </div>
                    {showAdminControls && (
                        <div className="pt-2">
                            <CloseVotingButton gameId={gameId} />
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Voting closed — show results + admin can reopen
    const categories = [
        { label: '⭐ Melhor em Campo', data: results.bestPlayer },
        { label: '⚡ Maior Desequilibrador', data: results.disruptor },
        { label: '🧱 Maior Muralha', data: results.wall },
        { label: '⚽ Melhor Golo', data: results.bestGoal },
    ];

    return (
        <div className="w-full max-w-md mx-auto rounded-lg border p-4 space-y-3">
            <h3 className="font-semibold text-center text-sm">Resultados MVP</h3>
            <p className="text-xs text-gray-500 text-center">
                {results.totalVotes} voto{results.totalVotes !== 1 ? 's' : ''}
                {results.totalVotes === 0 && ' — sem votos'}
            </p>
            {results.totalVotes > 0 && (
                <div className="grid grid-cols-2 gap-3">
                    {categories.map(cat => (
                        <div key={cat.label} className="rounded border p-2">
                            <h4 className="text-xs font-medium mb-1">{cat.label}</h4>
                            {cat.data.length === 0 ? (
                                <p className="text-xs text-gray-400">—</p>
                            ) : (
                                <div className="space-y-0.5">
                                    {cat.data.slice(0, 3).map((entry, i) => (
                                        <div key={entry.name} className="flex items-center gap-1 text-xs">
                                            <span className={i === 0 ? 'font-semibold' : 'text-gray-500'}>
                                                {i === 0 ? '🏆 ' : `${i + 1}. `}{entry.name}
                                            </span>
                                            <span className="text-gray-400 ml-auto">{entry.votes}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {showAdminControls && leagueId && (
                <div className="text-center pt-1">
                    <OpenVotingButton gameId={gameId} leagueId={leagueId} />
                </div>
            )}
        </div>
    );
}
