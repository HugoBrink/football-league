import { fetchGlobalStandings } from "@/app/lib/data";
import { AggregatedPlayer } from "@/app/lib/definitions";

export const dynamic = 'force-dynamic';

export default async function GlobalStandingsSeason({ params }: { params: Promise<{ season: string }> }) {
    const { season } = await params;
    const seasonNumber = Number(season);
    const standings = await fetchGlobalStandings(seasonNumber);

    return (
        <div>
            <div className="flex justify-between items-center w-full sm:pt-0 px-6 pt-4">
                <div className="gap-2 flex flex-col items-center">
                    <h1 className="text-gray-900">Classificacao Geral — Season {seasonNumber}</h1>
                    <p className="text-sm text-gray-600">Todas as ligas combinadas (arquivo)</p>
                </div>
            </div>
            <div className="mt-6">
                <div className="inline-block min-w-full align-middle">
                    <div className="sm:rounded-lg bg-gray-50 py-4 cursor-default">
                        <table className="min-w-full text-gray-900">
                            <thead className="rounded-lg text-left text-sm font-normal">
                                <tr>
                                    <th scope="col" className="font-medium"></th>
                                    <th scope="col"><div className="mobile-row">Nome</div></th>
                                    <th scope="col"><div className="mobile-row">Ligas</div></th>
                                    <th scope="col" className="mobile-row">
                                        <span className="hidden sm:inline">Pontos</span>
                                        <span className="sm:hidden">P</span>
                                    </th>
                                    <th scope="col"><div className="mobile-row"><span className="hidden sm:inline">Jogos</span><span className="sm:hidden">J</span></div></th>
                                    <th scope="col"><div className="mobile-row"><span className="hidden sm:inline">Vitorias</span><span className="sm:hidden">V</span></div></th>
                                    <th scope="col"><div className="mobile-row"><span className="hidden sm:inline">Derrotas</span><span className="sm:hidden">D</span></div></th>
                                    <th scope="col"><div className="mobile-row"><span className="hidden sm:inline">Empates</span><span className="sm:hidden">E</span></div></th>
                                    <th scope="col"><div className="mobile-row"><span className="hidden sm:inline">Dif. Golos</span><span className="sm:hidden">DG</span></div></th>
                                    <th scope="col"><div className="mobile-row"><span className="hidden sm:inline">% Vitorias</span><span className="sm:hidden">%V</span></div></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {standings.map((player: AggregatedPlayer, index: number) => (
                                    <tr key={player.name} className="w-full border-b py-3 text-sm last-of-type:border-none">
                                        <td className="whitespace-nowrap py-3 sm:pl-6 pl-2 sm:pr-3 font-bold">{index + 1}</td>
                                        <td className="whitespace-nowrap py-3 pl-1 pr-3"><p>{player.name}</p></td>
                                        <td className="whitespace-nowrap py-3 px-3">
                                            <div className="flex gap-1">
                                                {player.leagues.map(l => (
                                                    <span key={l} className="px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 capitalize">{l}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-3">{player.points}</td>
                                        <td className="whitespace-nowrap py-3 pl-6 pr-3">{player.games}</td>
                                        <td className="whitespace-nowrap py-3 pl-6 pr-3">{player.wins}</td>
                                        <td className="whitespace-nowrap py-3 pl-6 pr-3">{player.losses}</td>
                                        <td className="whitespace-nowrap py-3 pl-6 pr-3">{player.draws}</td>
                                        <td className="whitespace-nowrap py-3 pl-6 pr-3">{player.goals_diff}</td>
                                        <td className="whitespace-nowrap py-3">
                                            {player.wins && player.games ? (player.wins / player.games * 100).toFixed(2) + '%' : '0.00%'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
