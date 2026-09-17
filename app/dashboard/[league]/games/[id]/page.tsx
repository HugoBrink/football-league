import { computeEloSnapshotForGame, fetchGame, fetchGameComments, fetchGamePlayerNames, fetchGameTeamsWithElo, fetchVoterNames, fetchPaidPlayers, getLeagueBySlug } from "@/app/lib/data";
import { DeleteGame } from "@/app/components/DeleteGame";
import { EditGame } from "@/app/components/EditGame";
import GameEloBreakdown from "@/app/components/GameEloBreakdown";
import GameVoteResults from "@/app/components/GameVoteResults";
import GameComments from "@/app/components/GameComments";
import AddResultForm from "@/app/components/AddResultForm";
import AdminPaymentToggle from "@/app/components/AdminPaymentToggle";
import { detectCupMatchesForGame, getRoundName, calculateTotalRounds, fetchTournamentMatches } from "@/app/lib/tournament";
import EloSimulation from "@/app/components/EloSimulation";
import { Game } from "@/app/lib/definitions";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";

export default async function Page({ params }: { params: Promise<{ id: string; league: string }> }) {
    const { id, league: leagueSlug } = await params;
    const league = await getLeagueBySlug(leagueSlug);
    if (!league) notFound();

    const game = await fetchGame(id);
    if (!game) return <div>Game not found</div>;

    const hasResult = game.brancos_score != null && game.pretos_score != null;
    const gameId = game.id as number;

    const brancosIds = [
        ...(game.brancos_players as any[]).map(String),
        ...(game.brancos_captain ? [String(game.brancos_captain)] : []),
    ];
    const pretosIds = [
        ...(game.pretos_players as any[]).map(String),
        ...(game.pretos_captain ? [String(game.pretos_captain)] : []),
    ];

    const [eloSnapshot, teamsWithElo, session, voters, paidPlayers, playerNames, comments, cupMatches, allTournamentMatches] = await Promise.all([
        hasResult ? computeEloSnapshotForGame(league.id, gameId) : null,
        fetchGameTeamsWithElo(gameId),
        auth(),
        fetchVoterNames(gameId),
        fetchPaidPlayers(gameId),
        fetchGamePlayerNames(gameId),
        fetchGameComments(gameId),
        detectCupMatchesForGame(brancosIds, pretosIds, league.current_season, league.id, new Date(game.date), gameId),
        fetchTournamentMatches(league.current_season, league.id),
    ]);

    const voterSet = new Set(voters);
    const paidSet = new Set(paidPlayers);

    return (
        <div className="w-full flex flex-col items-center gap-2">
            <div className="w-full sm:w-fit flex flex-row items-center justify-center bg-gray-800 p-4 rounded-md text-white">
                <Link href={`/dashboard/${leagueSlug}/games`} className="mr-4">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <h1>Jogo #{game.numero}</h1>
            </div>
            <p className="text-gray-600 text-sm">Data: {new Date(game.date).toLocaleDateString('pt-PT')}</p>

            {hasResult ? (
                <p className="text-xl font-bold">{game.brancos_score} - {game.pretos_score}</p>
            ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-amber-700 text-sm font-medium">
                    ⏳ Resultado por adicionar
                </div>
            )}

            {/* Pre-game Elo preview (no result yet) */}
            {!hasResult && teamsWithElo && (
                <div className="w-full mt-2">
                    <div className="w-full max-w-2xl mx-auto space-y-3">
                        <div className="text-center">
                            <h3 className="font-semibold text-sm">Elo Preview (pré-jogo)</h3>
                            {(() => {
                                const diff = teamsWithElo.brancosAvg - teamsWithElo.pretosAvg;
                                const label = diff > 5 ? 'Brancos favoritos' : diff < -5 ? 'Pretos favoritos' : 'Equipas equilibradas';
                                return <p className="text-xs text-gray-500">{label} ({Math.abs(diff)} pts diferença)</p>;
                            })()}
                        </div>
                        <div className="flex gap-4">
                            {[
                                { label: 'Brancos', players: teamsWithElo.brancos, avg: teamsWithElo.brancosAvg, bg: 'bg-gray-100' },
                                { label: 'Pretos', players: teamsWithElo.pretos, avg: teamsWithElo.pretosAvg, bg: 'bg-gray-800 text-white' },
                            ].map(team => (
                                <div key={team.label} className="flex-1 min-w-0">
                                    <div className={`text-center rounded-t-lg py-2 px-3 ${team.bg}`}>
                                        <div className="font-bold text-sm">{team.label}</div>
                                        <div className="text-xs mt-1 opacity-70">Elo médio: {team.avg}</div>
                                    </div>
                                    <div className="border border-t-0 rounded-b-lg divide-y">
                                        {team.players.map(p => (
                                            <div key={p.name} className="flex items-center gap-2 px-3 py-2 text-sm">
                                                <span className="flex-1 font-medium">
                                                    {p.name}
                                                    {p.isCaptain && <span className="ml-1 text-xs text-yellow-600">©</span>}
                                                </span>
                                                <span className="text-xs text-gray-500 tabular-nums">{p.elo}</span>
                                                {voterSet.has(p.name) && <span title="Votou" className="text-xs">🗳️</span>}
                                                {paidSet.has(p.name) && <span title="Pagou 5.90€" className="text-xs">💰</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <EloSimulation brancosAvg={teamsWithElo.brancosAvg} pretosAvg={teamsWithElo.pretosAvg} />

                    {session?.user && (
                        <div className="mt-4">
                            <AddResultForm gameId={gameId} leagueSlug={leagueSlug} />
                        </div>
                    )}
                </div>
            )}

            {/* Post-game Elo breakdown (has result) */}
            {hasResult && eloSnapshot && (
                <div className="w-full mt-2">
                    <GameEloBreakdown snapshot={eloSnapshot} voterSet={voterSet} paidSet={paidSet} />
                </div>
            )}

            {/* Cup matches detected */}
            {cupMatches.length > 0 && (
                <div className="w-full max-w-2xl mx-auto mt-3">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
                        <h4 className="text-sm font-semibold text-yellow-800 flex items-center gap-1.5">
                            🏆 {!hasResult ? 'Jogos da Taça neste jogo' : 'Jogos da Taça decididos'}
                        </h4>
                        {cupMatches.map(cm => {
                            const totalRounds = calculateTotalRounds(allTournamentMatches.filter(m => m.round === 1).length * 2);
                            const roundName = getRoundName(cm.round, totalRounds);
                            return (
                                <div key={cm.matchId} className="flex items-center gap-2 text-sm">
                                    <span className="text-xs font-medium text-yellow-600 bg-yellow-100 rounded px-1.5 py-0.5">
                                        {roundName}
                                    </span>
                                    <span className={cm.player1Team === 'brancos' ? 'text-gray-600' : 'text-gray-900 font-medium'}>
                                        {cm.player1Name}
                                    </span>
                                    <span className="text-yellow-500 font-bold text-xs">vs</span>
                                    <span className={cm.player2Team === 'brancos' ? 'text-gray-600' : 'text-gray-900 font-medium'}>
                                        {cm.player2Name}
                                    </span>
                                </div>
                            );
                        })}
                        {!hasResult && (
                            <p className="text-xs text-yellow-600">O resultado deste jogo decide automaticamente estes confrontos da taça.</p>
                        )}
                    </div>
                </div>
            )}

            {/* Admin: Payment management */}
            {session?.user && playerNames.length > 0 && (
                <div className="w-full max-w-md mx-auto mt-4 rounded-lg border p-4 space-y-3">
                    <h3 className="font-semibold text-center text-sm">
                        💰 Pagamentos
                        <span className="ml-1 font-normal text-xs text-gray-400">
                            ({paidPlayers.length}/{playerNames.length} pagos)
                        </span>
                    </h3>
                    <div className="space-y-1.5">
                        {playerNames.map(name => (
                            <AdminPaymentToggle
                                key={name}
                                gameId={gameId}
                                playerName={name}
                                isPaid={paidSet.has(name)}
                            />
                        ))}
                    </div>
                </div>
            )}

            <div className="w-full mt-4 pt-4 border-t">
                <GameVoteResults gameId={gameId} gameNumero={game.numero} leagueId={league.id} showAdminControls={!!session?.user} />
            </div>

            <div className="w-full max-w-2xl mx-auto mt-4">
                <GameComments gameId={gameId} comments={comments} isAdmin={!!session?.user} />
            </div>

            {session?.user && (
                <div className="flex gap-2 mt-2">
                    <DeleteGame game={game as Game} leagueSlug={leagueSlug} />
                    <EditGame game={game as Game} leagueSlug={leagueSlug} />
                </div>
            )}
        </div>
    );
}
