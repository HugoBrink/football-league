import { fetchPlayerAllSeasons, fetchPlayerMVPStats, getAllLeagues, computeEloRatings } from "@/app/lib/data";
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

    const [seasonRows, session, mvpStats, eloData] = await Promise.all([
        fetchPlayerAllSeasons(playerName, league.id),
        auth(),
        fetchPlayerMVPStats(playerName, league.id),
        computeEloRatings(league.id),
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
