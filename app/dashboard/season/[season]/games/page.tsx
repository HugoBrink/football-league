import { fetchGames, fetchPlayersNames } from "@/app/lib/data";
import Link from "next/link";

export default async function SeasonGames(props: { params: Promise<{ season: string }> }) {
    const params = await props.params
    const seasonNumber = Number(params.season)

    const [games, players] = await Promise.all([
        fetchGames(seasonNumber),
        fetchPlayersNames(seasonNumber),
    ]);

    const playerMap: Map<bigint, string> = new Map(players.map((player: { id: any, name: string }) => [BigInt(player.id), player.name]))

    return (
        <div>
            <div className="flex justify-between items-center w-[80%] pb-5">
                <div className="flex flex-col items-center gap-2 p-4 sm:p-0">
                    <h1>Games — Season {seasonNumber}</h1>
                    <Link href={`/dashboard/season/${seasonNumber}`} className="bg-slate-400 text-white rounded-md px-2 py-1 ">
                        Voltar para a Liga
                    </Link>
                </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {games.map((game: any) => (
                    <Link key={game.id} href={`/dashboard/season/${seasonNumber}/games/${game.id}`}>
                    <div key={game.id} className="flex flex-col w-full border-2 border-gray-300 rounded-lg p-4 items-center min-w-32 min-h-32">
                        <p>Jogo número: {game.numero}</p>
                        <p className="text-sm text-gray-500">{new Date(game.date).toLocaleDateString('pt-PT')}</p>
                        <div className="flex sm:flex-row flex-col items-center sm:gap-2">
                            <p className="whitespace-nowrap">{(playerMap.get(BigInt(game.brancos_captain ?? '0')) ?? '-')}</p> vs
                            <p>{(playerMap.get(BigInt(game.pretos_captain ?? '0')) ?? '-')}</p>
                        </div>
                        <p>{game.brancos_score} - {game.pretos_score}</p>
                    </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
