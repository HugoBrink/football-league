import { fetchPlayerAllSeasons, fetchPlayerMVPStats, getAllLeagues, computeEloRatings, computePlayerEloHistory } from "@/app/lib/data";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import RenamePlayerForm from "./RenamePlayerForm";

export const dynamic = 'force-dynamic';

export default async function PlayerProfilePage({ params, searchParams }: {
    params: Promise<{ name: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { name: encodedName } = await params;
    const playerName = decodeURIComponent(encodedName);
    const sp = await searchParams;
    const leagueParam = Array.isArray(sp?.league) ? sp?.league[0] : sp?.league;

    const leagues = await getAllLeagues();
    const league = leagueParam
        ? leagues.find(l => l.slug === leagueParam)
        : leagues[0];

    if (!league) notFound();

    const [seasonRows, session, mvpStats, eloData, eloHistory] = await Promise.all([
        fetchPlayerAllSeasons(playerName, league.id),
        auth(),
        fetchPlayerMVPStats(playerName, league.id),
        computeEloRatings(league.id),
        computePlayerEloHistory(playerName, league.id),
    ]);

    if (seasonRows.length === 0) notFound();

    const playerElo = eloData.find(e => e.name === playerName);

    // Aggregate stats across all seasons
    const totals = seasonRows.reduce(
        (acc, p) => ({
            games: acc.games + (p.games ?? 0),
            wins: acc.wins + (p.wins ?? 0),
            losses: acc.losses + (p.losses ?? 0),
            draws: acc.draws + (p.draws ?? 0),
            points: acc.points + (p.points ?? 0),
            goalsDiff: acc.goalsDiff + (p.goals_diff ?? 0),
        }),
        { games: 0, wins: 0, losses: 0, draws: 0, points: 0, goalsDiff: 0 }
    );

    const winRate = totals.games > 0 ? (totals.wins / totals.games * 100).toFixed(0) : '0';
    const isAdmin = !!session?.user;

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href={`/players?league=${league.slug}`} className="text-gray-400 hover:text-gray-600">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">{playerName}</h1>
                    <p className="text-sm text-gray-500">{league.name}</p>
                </div>
                {playerElo && (
                    <div className="text-right">
                        <div className="text-2xl font-bold tabular-nums">{playerElo.elo}</div>
                        <div className="text-xs text-gray-500">Elo Rating</div>
                    </div>
                )}
            </div>

            {/* Admin: Rename */}
            {isAdmin && (
                <RenamePlayerForm playerName={playerName} leagueId={league.id} leagueSlug={league.slug} />
            )}

            {/* Overall Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Jogos', value: totals.games },
                    { label: 'Vitórias', value: totals.wins },
                    { label: 'Empates', value: totals.draws },
                    { label: 'Derrotas', value: totals.losses },
                    { label: 'Pontos', value: totals.points },
                    { label: 'Goal Diff', value: totals.goalsDiff > 0 ? `+${totals.goalsDiff}` : String(totals.goalsDiff) },
                    { label: 'Win Rate', value: `${winRate}%` },
                    { label: 'Elo Peak', value: playerElo ? playerElo.peak : '-' },
                ].map(stat => (
                    <div key={stat.label} className="rounded-lg border p-3 text-center">
                        <div className="text-lg font-bold">{stat.value}</div>
                        <div className="text-xs text-gray-500">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Season Breakdown */}
            <div>
                <h2 className="font-semibold text-sm mb-2">Por Season</h2>
                <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-2 text-left font-medium">Season</th>
                                <th className="px-3 py-2 text-center font-medium">J</th>
                                <th className="px-3 py-2 text-center font-medium">V</th>
                                <th className="px-3 py-2 text-center font-medium">E</th>
                                <th className="px-3 py-2 text-center font-medium">D</th>
                                <th className="px-3 py-2 text-center font-medium">Pts</th>
                                <th className="px-3 py-2 text-center font-medium">GD</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {seasonRows.map(row => (
                                <tr key={String(row.id)}>
                                    <td className="px-3 py-2 font-medium">S{row.season}</td>
                                    <td className="px-3 py-2 text-center">{row.games ?? 0}</td>
                                    <td className="px-3 py-2 text-center">{row.wins ?? 0}</td>
                                    <td className="px-3 py-2 text-center">{row.draws ?? 0}</td>
                                    <td className="px-3 py-2 text-center">{row.losses ?? 0}</td>
                                    <td className="px-3 py-2 text-center font-medium">{row.points ?? 0}</td>
                                    <td className="px-3 py-2 text-center">{row.goals_diff ?? 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MVP Stats */}
            {mvpStats.totalVotes > 0 && (
                <div>
                    <h2 className="font-semibold text-sm mb-2">Prémios MVP</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: '⭐ Melhor em Campo', value: mvpStats.bestPlayer },
                            { label: '⚡ Desequilibrador', value: mvpStats.disruptor },
                            { label: '🧱 Muralha', value: mvpStats.wall },
                            { label: '⚽ Melhor Golo', value: mvpStats.bestGoal },
                        ].map(stat => (
                            <div key={stat.label} className="rounded-lg border p-3 text-center">
                                <div className="text-lg font-bold">{stat.value}x</div>
                                <div className="text-xs text-gray-500">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Elo History */}
            {eloHistory.length > 0 && (
                <div>
                    <h2 className="font-semibold text-sm mb-2">Histórico Elo</h2>
                    <div className="rounded-lg border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-2 py-1.5 text-left font-medium">#</th>
                                        <th className="px-2 py-1.5 text-left font-medium">Jogo</th>
                                        <th className="px-2 py-1.5 text-center font-medium">Res.</th>
                                        <th className="px-2 py-1.5 text-right font-medium">Antes</th>
                                        <th className="px-2 py-1.5 text-right font-medium">Δ</th>
                                        <th className="px-2 py-1.5 text-right font-medium">Depois</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {[...eloHistory].reverse().map((entry) => {
                                        const teamCaptain = entry.playerTeam === 'brancos' ? entry.captainBrancos : entry.captainPretos;
                                        const oppCaptain = entry.playerTeam === 'brancos' ? entry.captainPretos : entry.captainBrancos;
                                        const teamAvg = entry.playerTeam === 'brancos' ? entry.brancosAvgElo : entry.pretosAvgElo;
                                        const oppAvg = entry.playerTeam === 'brancos' ? entry.pretosAvgElo : entry.brancosAvgElo;
                                        const teamScore = entry.playerTeam === 'brancos' ? entry.brancosScore : entry.pretosScore;
                                        const oppScore = entry.playerTeam === 'brancos' ? entry.pretosScore : entry.brancosScore;

                                        return (
                                            <tr key={entry.gameId} className="hover:bg-gray-50">
                                                <td className="px-2 py-1.5 text-gray-400">{entry.season}</td>
                                                <td className="px-2 py-1.5">
                                                    <Link
                                                        href={`/dashboard/${league.slug}/games/${entry.gameId}`}
                                                        className="text-blue-600 hover:underline font-medium"
                                                    >
                                                        #{entry.gameNumero}
                                                    </Link>
                                                    <span className="text-gray-400 ml-1">
                                                        {new Date(entry.date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}
                                                    </span>
                                                    <div className="text-[10px] mt-0.5 leading-tight">
                                                        <span className={`font-bold text-gray-700 ${entry.result === 'win' ? 'underline' : ''}`}>
                                                            {teamCaptain ? `©${teamCaptain}` : entry.playerTeam === 'brancos' ? 'Brancos' : 'Pretos'}
                                                        </span>
                                                        <span className="text-gray-400 tabular-nums ml-0.5">({teamAvg})</span>
                                                        <span className="text-gray-400"> vs </span>
                                                        <span className={`text-gray-500 ${entry.result === 'loss' ? 'underline' : ''}`}>
                                                            {oppCaptain ? `©${oppCaptain}` : entry.playerTeam === 'brancos' ? 'Pretos' : 'Brancos'}
                                                        </span>
                                                        <span className="text-gray-400 tabular-nums ml-0.5">({oppAvg})</span>
                                                    </div>
                                                </td>
                                                <td className="px-2 py-1.5 text-center">
                                                    <span className={`font-bold ${
                                                        entry.result === 'win' ? 'text-green-600' :
                                                        entry.result === 'loss' ? 'text-red-500' : 'text-gray-500'
                                                    }`}>
                                                        {teamScore}-{oppScore}
                                                    </span>
                                                </td>
                                                <td className="px-2 py-1.5 text-right tabular-nums text-gray-500">{entry.eloBefore}</td>
                                                <td className={`px-2 py-1.5 text-right tabular-nums font-bold ${
                                                    entry.delta > 0 ? 'text-green-600' : entry.delta < 0 ? 'text-red-500' : 'text-gray-500'
                                                }`}>
                                                    {entry.delta > 0 ? '+' : ''}{entry.delta}
                                                </td>
                                                <td className="px-2 py-1.5 text-right tabular-nums font-bold">{entry.eloAfter}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Elo Chart link */}
            {playerElo && (
                <div className="text-center">
                    <Link
                        href={`/players/elo?league=${league.slug}`}
                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                        Ver gráfico Elo completo →
                    </Link>
                </div>
            )}
        </div>
    );
}
