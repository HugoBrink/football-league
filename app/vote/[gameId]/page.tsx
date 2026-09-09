import { fetchGameByNumero, fetchGamePlayerNames, fetchGameTeamsWithElo, fetchVoteResults, fetchVoterNames, fetchPaidPlayers, fetchVotingSession } from "@/app/lib/data";
import { notFound } from "next/navigation";
import VoteForm from "./VoteForm";
import PaymentButton from "./PaymentButton";

export const dynamic = 'force-dynamic';

export default async function VotePage({ params }: { params: Promise<{ gameId: string }> }) {
    const { gameId: gameIdStr } = await params;
    const numero = Number(gameIdStr);
    if (isNaN(numero)) notFound();

    const game = await fetchGameByNumero(numero);
    if (!game) notFound();

    const gameId = game.id as number;

    const [session, playerNames, teamsWithElo, voters, paidPlayers] = await Promise.all([
        fetchVotingSession(gameId),
        fetchGamePlayerNames(gameId),
        fetchGameTeamsWithElo(gameId),
        fetchVoterNames(gameId),
        fetchPaidPlayers(gameId),
    ]);

    const isOpen = session?.is_open ?? false;
    const hasResult = game.brancos_score != null && game.pretos_score != null;
    const voterSet = new Set(voters);
    const paidSet = new Set(paidPlayers);

    let results = null;
    if (!isOpen && session) {
        results = await fetchVoteResults(gameId);
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4">
            <div className="w-full max-w-md space-y-4">
                {/* Game header */}
                <div className="bg-white rounded-lg border p-4 text-center space-y-2">
                    <h1 className="text-lg font-bold">Jogo #{game.numero}</h1>
                    <p className="text-sm text-gray-500">
                        {new Date(game.date).toLocaleDateString('pt-PT')}
                    </p>
                    {hasResult && (
                        <>
                            <div className="flex items-center justify-center gap-4 text-2xl font-bold">
                                <span>Brancos</span>
                                <span>{game.brancos_score} - {game.pretos_score}</span>
                                <span>Pretos</span>
                            </div>
                            <p className="text-sm font-medium text-gray-600">
                                {game.brancos_score === game.pretos_score
                                    ? 'Empate'
                                    : game.brancos_score! > game.pretos_score! ? 'Vitória Brancos' : 'Vitória Pretos'}
                            </p>
                        </>
                    )}
                    {!hasResult && (
                        <p className="text-sm font-medium text-amber-600">⏳ Resultado por adicionar</p>
                    )}
                </div>

                {/* Teams with Elo */}
                {teamsWithElo && (
                    <div className="bg-white rounded-lg border p-4 space-y-2">
                        <h2 className="font-semibold text-center text-sm">Equipas</h2>
                        <div className="flex gap-3">
                            {[
                                { label: 'Brancos', players: teamsWithElo.brancos, avg: teamsWithElo.brancosAvg, bg: 'bg-gray-100', text: '' },
                                { label: 'Pretos', players: teamsWithElo.pretos, avg: teamsWithElo.pretosAvg, bg: 'bg-gray-800 text-white', text: 'text-gray-100' },
                            ].map(team => (
                                <div key={team.label} className="flex-1">
                                    <div className={`text-center rounded-t-lg py-1.5 px-2 ${team.bg}`}>
                                        <div className="font-bold text-xs">{team.label}</div>
                                        <div className="text-[10px] opacity-70">Elo: {team.avg}</div>
                                    </div>
                                    <div className="border border-t-0 rounded-b-lg divide-y">
                                        {team.players.map(p => (
                                            <div key={p.name} className="flex items-center gap-1 px-2 py-1.5 text-xs">
                                                <span className="flex-1 font-medium truncate">
                                                    {p.name}
                                                    {p.isCaptain && <span className="ml-0.5 text-yellow-600">©</span>}
                                                </span>
                                                <span className="text-gray-400 tabular-nums">{p.elo}</span>
                                                {voterSet.has(p.name) && <span title="Votou" className="ml-0.5">🗳️</span>}
                                                {paidSet.has(p.name) && <span title="Pagou" className="ml-0.5">💰</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {(() => {
                            const diff = teamsWithElo.brancosAvg - teamsWithElo.pretosAvg;
                            const label = diff > 5 ? 'Brancos favoritos' : diff < -5 ? 'Pretos favoritos' : 'Equipas equilibradas';
                            return <p className="text-[10px] text-gray-400 text-center">{label} ({Math.abs(diff)} pts diferença)</p>;
                        })()}
                    </div>
                )}

                {/* Payment Section — always visible, above voting */}
                <div className="bg-white rounded-lg border p-4 space-y-2">
                    <h2 className="font-semibold text-center text-sm">💰 Pagamento (5,90€)</h2>
                    <p className="text-xs text-gray-400 text-center">Clica no teu nome para marcar como pago</p>
                    <div className="space-y-1.5">
                        {playerNames.map(name => (
                            <PaymentButton
                                key={name}
                                gameId={gameId}
                                playerName={name}
                                isPaid={paidSet.has(name)}
                            />
                        ))}
                    </div>
                    <p className="text-xs text-gray-400 text-center">
                        {paidPlayers.length}/{playerNames.length} pagos
                    </p>
                </div>

                {/* Voting Section */}
                {!session ? (
                    <div className="bg-white rounded-lg border p-6 text-center text-gray-500">
                        Votação não disponível para este jogo.
                    </div>
                ) : isOpen ? (
                    <VoteForm
                        gameId={gameId}
                        playerNames={playerNames}
                    />
                ) : results ? (
                    <div className="bg-white rounded-lg border p-4 space-y-4">
                        <h2 className="font-semibold text-center">Resultados da Votação</h2>
                        <p className="text-xs text-gray-500 text-center">{results.totalVotes} voto{results.totalVotes !== 1 ? 's' : ''}</p>

                        {[
                            { label: '⭐ Melhor em Campo', data: results.bestPlayer },
                            { label: '⚡ Maior Desequilibrador', data: results.disruptor },
                            { label: '🧱 Maior Muralha', data: results.wall },
                            { label: '⚽ Melhor Golo', data: results.bestGoal },
                        ].map(cat => (
                            <div key={cat.label}>
                                <h3 className="text-sm font-medium mb-1">{cat.label}</h3>
                                {cat.data.length === 0 ? (
                                    <p className="text-xs text-gray-400">Sem votos</p>
                                ) : (
                                    <div className="space-y-1">
                                        {cat.data.map((entry, i) => (
                                            <div key={entry.name} className="flex items-center gap-2 text-sm">
                                                <span className={`font-medium ${i === 0 ? 'text-yellow-600' : ''}`}>
                                                    {i === 0 ? '🏆 ' : ''}{entry.name}
                                                </span>
                                                <span className="text-gray-400 ml-auto">{entry.votes} voto{entry.votes !== 1 ? 's' : ''}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
