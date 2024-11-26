import Add from "@/app/components/Add"
import { fetchGames, fetchPlayersNames } from "@/app/lib/data";
import { Game } from "@/app/lib/definitions";
import Link from "next/link"


export default async function Games() {
    const games = await fetchGames();
    const players = await fetchPlayersNames();

    const playerMap = new Map(players.map(player => [player.id, player.name]))    

    return (
        <div>
            <div className="flex justify-between items-center w-[80%] pb-5">
                <h1>Games</h1>
                <Add type="games" />
            </div>
            <div className="grid grid-cols-3 gap-4">
                {games.map((game) => (
                    <Link key={game.id} href={`/dashboard/games/${game.id}`}>
                        <div className="flex flex-col w-full border-2 border-gray-300 rounded-lg p-4 items-center">
                        <p>{new Date(game.date).toLocaleDateString('pt-PT')}</p>
                        <p className="font-bold">Brancos - Pretos</p>
                            <p>{playerMap.get(BigInt(game.brancos_captain || ''))} - {playerMap.get(BigInt(game.pretos_captain || ''))}</p>
                            <p>{game.brancos_score} - {game.pretos_score}</p>
                        </div>
                    </Link>

                ))}
            </div>
        </div>
    )
}
