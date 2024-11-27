import { fetchGame, fetchPlayers } from "@/app/lib/data"
import { DeleteGame } from "../../../components/DeleteGame"
import { EditGame } from "../../../components/EditGame"
import { Game } from "@/app/lib/definitions"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function Page(props: { params: Promise<{ id: string }> }) {
    const params = await props.params
    const id = params.id

    const [game, players] = await Promise.all([
        fetchGame(id),
        fetchPlayers()
    ])

    if (!game) {
        return <div>Game not found</div>
    }

    const playerMap: Map<bigint, string> = new Map(players.map((player: { id: any, name: string }) => [BigInt(player.id), player.name]))

    return (
        <div className="w-full flex flex-col items-center gap-2 ">
            <div className="w-full sm:w-fit flex flex-row items-center justify-center bg-gray-800 p-4 rounded-md text-white">
                <Link href="/dashboard/games" className="mr-4">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <h1>
                    Games ID: {game.numero}
                </h1>
            </div>
            <p className="text-gray-400 text-sm">Date: {new Date(game.date).toLocaleDateString('pt-PT')}</p>

            <div className="grid grid-cols-2 gap-8 text-left ">
                <div className="flex flex-col items-center justify-center gap-2">
                    <p className="font-bold pb-4">Brancos</p>
                    <p className="font-semibold pb-2">{playerMap.get(BigInt(game?.brancos_captain || ''))}</p>
                    <ul className="list-inside">
                        {game.brancos_players?.map((player: any, index: number) => (
                            <option key={index} value={player.id}>{playerMap.get(BigInt(player))}</option>
                        ))}
                    </ul>
                </div>
                <div className="flex flex-col items-center justify-center gap-2">
                    <p className="font-bold pb-4">Pretos</p>
                    <p className="font-semibold pb-2">{playerMap.get(BigInt(game?.pretos_captain || ''))}</p>
                    <ul className="list-inside">
                        {game.pretos_players?.map((player: any, index: number) => (
                            <option key={index} value={player.id}>{playerMap.get(BigInt(player))}</option>
                        ))}
                    </ul>
                </div>
            </div>
            <p className="font-bold">Resultado:</p>
            <p>
                {game?.brancos_score} - {game?.pretos_score}
            </p>
            <div className="flex gap-2">
                <DeleteGame game={game as Game} />
                <EditGame game={game as Game} />
            </div>
        </div>
    )
}
