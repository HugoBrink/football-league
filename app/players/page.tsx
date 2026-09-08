import { computeLongestLosingStreak, computeLongestUnbeatenStreak, computeSeasonStats, fetchTopPlayersByGoalsDiff, fetchTopPlayersByPoints, fetchTopPlayersByWins, getAllLeagues, getLeagueBySlug } from "../lib/data";
import SeasonSelect from "./SeasonSelect";

export const dynamic = 'force-dynamic';

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function Players({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const sp = await searchParams;
    const leagueParam = Array.isArray(sp?.league) ? sp?.league[0] : sp?.league;

    const leagues = await getAllLeagues();
    const league = leagueParam
        ? await getLeagueBySlug(leagueParam)
        : leagues[0];

    if (!league) return <div>Liga nao encontrada</div>;

    const seasonParam = Array.isArray(sp?.season) ? sp?.season[0] : sp?.season;
    const season = seasonParam ? Number(seasonParam) : league.current_season;

    const [topByPoints, topByWins, topByGoalsDiff, unbeaten, losing, seasonStats] = await Promise.all([
        fetchTopPlayersByPoints(5, season, league.id),
        fetchTopPlayersByWins(5, season, league.id),
        fetchTopPlayersByGoalsDiff(5, season, league.id),
        computeLongestUnbeatenStreak(season, league.id),
        computeLongestLosingStreak(season, league.id),
        computeSeasonStats(season, league.id)
    ]);

    const bestUnbeaten = unbeaten[0];
    const worstLosing = losing[0];

    const seasonsList = Array.from({ length: Math.max(league.current_season, season) }, (_, i) => i + 1);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">{league.name} — Season {season} — Destaques</h2>
                    <p className="text-sm text-gray-500">Estatisticas calculadas a partir de vitorias, pontos e goal difference.</p>
                </div>
                <SeasonSelect season={season} seasons={seasonsList} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-lg border p-4">
                    <h3 className="font-semibold text-center">Maior Streak sem perder</h3>
                    {bestUnbeaten ? (
                        <div className="mt-2">
                            <div className="text-lg font-semibold">{bestUnbeaten.name}</div>
                            <div className="text-gray-600">{bestUnbeaten.bestStreak} jogos</div>
                            {bestUnbeaten.startDate && bestUnbeaten.endDate && (
                                <div className="text-sm text-gray-500">
                                    {new Date(bestUnbeaten.startDate).toLocaleDateString()} — {new Date(bestUnbeaten.endDate).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                    ) : <div className="mt-2 text-gray-600">Sem dados</div>}
                </div>

                <div className="rounded-lg border p-4">
                    <h3 className="font-semibold text-center">Maior Streak de Derrotas</h3>
                    {worstLosing ? (
                        <div className="mt-2">
                            <div className="text-lg font-semibold">{worstLosing.name}</div>
                            <div className="text-gray-600">{worstLosing.bestStreak} jogos</div>
                            {worstLosing.startDate && worstLosing.endDate && (
                                <div className="text-sm text-gray-500">
                                    {new Date(worstLosing.startDate).toLocaleDateString()} — {new Date(worstLosing.endDate).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                    ) : <div className="mt-2 text-gray-600">Sem dados</div>}
                </div>

                <div className="rounded-lg border p-4">
                    <h3 className="font-semibold text-center">Ironman — Mais Jogos</h3>
                    {seasonStats.byGamesPlayed[0] ? (
                        <div className="mt-2">
                            <div className="text-lg font-semibold">{seasonStats.byGamesPlayed[0].name}</div>
                            <div className="text-gray-600">{seasonStats.byGamesPlayed[0].games} jogos</div>
                        </div>
                    ) : <div className="mt-2 text-gray-600">Sem dados</div>}
                </div>

                <div className="rounded-lg border p-4">
                    <h3 className="font-semibold text-center">Mais vezes Capitao</h3>
                    {seasonStats.byCaptainGames[0] ? (
                        <div className="mt-2">
                            <div className="text-lg font-semibold">{seasonStats.byCaptainGames[0].name}</div>
                            <div className="text-gray-600">{seasonStats.byCaptainGames[0].captainGames} vezes</div>
                        </div>
                    ) : <div className="mt-2 text-gray-600">Sem dados</div>}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-lg border p-4">
                    <h3 className="font-semibold text-center">Mais Pontos</h3>
                    <ol className="mt-2 list-decimal list-inside space-y-1">
                        {topByPoints.map((p) => (
                            <li key={String(p.id)} className="flex justify-between">
                                <span>{p.name}</span>
                                <span className="text-gray-600">{p.points ?? 0} pts</span>
                            </li>
                        ))}
                    </ol>
                </div>

                <div className="rounded-lg border p-4">
                    <h3 className="font-semibold text-center">Mais Vitorias</h3>
                    <ol className="mt-2 list-decimal list-inside space-y-1">
                        {topByWins.map((p) => (
                            <li key={String(p.id)} className="flex justify-between">
                                <span>{p.name}</span>
                                <span className="text-gray-600">{p.wins ?? 0} V</span>
                            </li>
                        ))}
                    </ol>
                </div>

                <div className="rounded-lg border p-4">
                    <h3 className="font-semibold text-center">Melhor Goal Diff</h3>
                    <ol className="mt-2 list-decimal list-inside space-y-1">
                        {topByGoalsDiff.map((p) => (
                            <li key={String(p.id)} className="flex justify-between">
                                <span>{p.name}</span>
                                <span className="text-gray-600">{p.goals_diff ?? 0}</span>
                            </li>
                        ))}
                    </ol>
                </div>

                <div className="rounded-lg border p-4">
                    <h3 className="font-semibold text-center">Pior Goal Diff</h3>
                    <ol className="mt-2 list-decimal list-inside space-y-1">
                        {seasonStats.byWorstGD.slice(0, 5).map(e => (
                            <li key={e.id} className="flex justify-between">
                                <span>{e.name}</span>
                                <span className="text-gray-600">{e.goalsDiff}</span>
                            </li>
                        ))}
                    </ol>
                </div>

                <div className="rounded-lg border p-4">
                    <h3 className="font-semibold text-center">Melhor Win Rate</h3>
                    <ol className="mt-2 list-decimal list-inside space-y-1">
                        {seasonStats.byWinRate.slice(0, 5).map(e => (
                            <li key={e.id} className="flex justify-between">
                                <span>{e.name}</span>
                                <span className="text-gray-600">{(e.winRate * 100).toFixed(0)}%</span>
                            </li>
                        ))}
                    </ol>
                </div>

                <div className="rounded-lg border p-4">
                    <h3 className="font-semibold text-center">Top Capitaes</h3>
                    <ol className="mt-2 list-decimal list-inside space-y-1">
                        {seasonStats.byCaptainGames.slice(0, 5).map(e => (
                            <li key={e.id} className="flex justify-between">
                                <span>{e.name}</span>
                                <span className="text-gray-600">{e.captainGames}</span>
                            </li>
                        ))}
                    </ol>
                </div>

                <div className="rounded-lg border p-4">
                    <h3 className="font-semibold text-center">Forma (Ultimos 5)</h3>
                    <ol className="mt-2 list-decimal list-inside space-y-1">
                        {seasonStats.byFormLast5.slice(0, 5).map(e => (
                            <li key={e.id} className="flex justify-between">
                                <span>{e.name}</span>
                                <span className="text-gray-600">{e.last5} pts</span>
                            </li>
                        ))}
                    </ol>
                </div>

                <div className="rounded-lg border p-4">
                    <h3 className="font-semibold text-center">Goleadas a favor ({'>='}3)</h3>
                    <ol className="mt-2 list-decimal list-inside space-y-1">
                        {seasonStats.byBlowoutWins.slice(0, 5).map(e => (
                            <li key={e.id} className="flex justify-between">
                                <span>{e.name}</span>
                                <span className="text-gray-600">{e.blowoutWins}</span>
                            </li>
                        ))}
                    </ol>
                </div>

                <div className="rounded-lg border p-4">
                    <h3 className="font-semibold text-center">Goleadas contra ({'>='}3)</h3>
                    <ol className="mt-2 list-decimal list-inside space-y-1">
                        {seasonStats.byBlowoutLosses.slice(0, 5).map(e => (
                            <li key={e.id} className="flex justify-between">
                                <span>{e.name}</span>
                                <span className="text-gray-600">{e.blowoutLosses}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </div>
    );
}
