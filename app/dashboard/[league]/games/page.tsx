import Add from "@/app/components/Add";
import { fetchGames, fetchPlayersNames, getLeagueBySlug } from "@/app/lib/data";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function Games({ params }: { params: Promise<{ league: string }> }) {
    const { league: leagueSlug } = await params;
    const league = await getLeagueBySlug(leagueSlug);
    if (!league) notFound();

    const [games, players] = await Promise.all([
        fetchGames(league.current_season, league.id),
        fetchPlayersNames(league.current_season, league.id)
    ]);

    const playerMap = new Map(players.map((player) => [BigInt(player.id), player.name]));

    return (
        <div>
            <div className="flex justify-between items-center w-[80%] pb-5">
                <div className="flex flex-col items-center gap-2 p-4 sm:p-0">
                    <h1>Jogos — {league.name}</h1>
                    <Link href={`/dashboard/${leagueSlug}`} className="bg-slate-400 text-white rounded-md px-2 py-1 sm:hidden">
                        Voltar para a Liga
                    </Link>
                </div>
                <Add type="games" leagueSlug={leagueSlug} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {games.map((game: any) => (
                    <Link key={game.id} href={`/dashboard/${leagueSlug}/games/${game.id}`}>
                        <div className="flex flex-col w-full border-2 border-gray-300 rounded-lg p-4 items-center min-w-32 min-h-32">
                            <p>Jogo numero: {game.numero}</p>
                            <p className="text-sm text-gray-500">{new Date(game.date).toLocaleDateString('pt-PT')}</p>
                            <div className="flex sm:flex-row flex-col items-center sm:gap-2">
                                <p className="whitespace-nowrap">{playerMap.get(BigInt(game.brancos_captain ?? '0')) ?? '-'}</p> vs
                                <p>{playerMap.get(BigInt(game.pretos_captain ?? '0')) ?? '-'}</p>
                            </div>
                            <p>{game.brancos_score} - {game.pretos_score}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
