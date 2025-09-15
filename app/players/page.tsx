import { computeLongestLosingStreak, computeLongestUnbeatenStreak, computeSeasonStats, CURRENT_SEASON, fetchTopPlayersByGoalsDiff, fetchTopPlayersByPoints, fetchTopPlayersByWins } from "../lib/data";
import SeasonSelect from "./SeasonSelect";

type SearchParams = { [key: string]: string | string[] | undefined }
type PageProps = { searchParams?: SearchParams | Promise<SearchParams> }

export default async function Players({ searchParams }: PageProps) {
    const sp: SearchParams | undefined = searchParams && typeof (searchParams as any).then === 'function'
        ? await (searchParams as Promise<SearchParams>)
        : (searchParams as SearchParams | undefined);
    const seasonParam = Array.isArray(sp?.season) ? sp?.season[0] : sp?.season;
    const season = seasonParam ? Number(seasonParam) : CURRENT_SEASON;

    const [topByPoints, topByWins, topByGoalsDiff, unbeaten, losing, seasonStats] = await Promise.all([
        fetchTopPlayersByPoints(5, season),
        fetchTopPlayersByWins(5, season),
        fetchTopPlayersByGoalsDiff(5, season),
        computeLongestUnbeatenStreak(season),
        computeLongestLosingStreak(season),
        computeSeasonStats(season)
    ]);

    const bestUnbeaten = unbeaten[0];
    const worstLosing = losing[0];

    // naive seasons list: 1..CURRENT_SEASON (or at least 1..max found later)
    const seasonsList = Array.from({ length: Math.max(CURRENT_SEASON, season) }, (_, i) => i + 1);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Season {season} — Destaques</h2>
                    <p className="text-sm text-gray-500">Estatísticas calculadas a partir de vitórias, pontos e goal difference. </p>
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
                    ) : (
                        <div className="mt-2 text-gray-600">Sem dados</div>
                    )}
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
                    ) : (
                        <div className="mt-2 text-gray-600">Sem dados</div>
                    )}
                </div>

                <div className="rounded-lg border p-4">
                    <h3 className="font-semibold text-center">Ironman — Mais Jogos</h3>
                    {seasonStats.byGamesPlayed[0] ? (
                        <div className="mt-2">
                            <div className="text-lg font-semibold">{seasonStats.byGamesPlayed[0].name}</div>
                            <div className="text-gray-600">{seasonStats.byGamesPlayed[0].games} jogos</div>
                        </div>
                    ) : (
                        <div className="mt-2 text-gray-600">Sem dados</div>
                    )}
                </div>

                <div className="rounded-lg border p-4">
                    <h3 className="font-semibold text-center">Mais vezes Capitão</h3>
                    {seasonStats.byCaptainGames[0] ? (
                        <div className="mt-2">
                            <div className="text-lg font-semibold">{seasonStats.byCaptainGames[0].name}</div>
                            <div className="text-gray-600">{seasonStats.byCaptainGames[0].captainGames} vezes</div>
                        </div>
                    ) : (
                        <div className="mt-2 text-gray-600">Sem dados</div>
                    )}
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
                    <h3 className="font-semibold text-center">Mais Vitórias</h3>
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
                    <h3 className="font-semibold text-center">Top Capitães</h3>
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
                    <h3 className="font-semibold text-center">Forma (Últimos 5)</h3>
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
                    <h3 className="font-semibold text-center">Goleadas a favor (≥3)</h3>
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
                    <h3 className="font-semibold text-center">Goleadas contra (≥3)</h3>
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
    )
}
