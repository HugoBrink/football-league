import { fetchGame, fetchPlayers } from "@/app/lib/data"
import { DeleteGame } from "../../../components/DeleteGame"
import { EditGame } from "../../../components/EditGame"
import { Game } from "@/app/lib/definitions"

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

    const playerMap = new Map(players.map(player => [player.id, player.name]))

    return (
        <div className="w-full flex flex-col items-center gap-2 ">
            <h1>
                Games ID: {game.numero}
            </h1>
            <p>Date: {new Date(game.date).toLocaleDateString('pt-PT')}</p>
            <div className="grid grid-cols-2 gap-8 text-center ">
                <div className="flex flex-col items-center justify-center">
                    <p className="font-bold">Brancos</p>
                    <p>{playerMap.get(BigInt(game?.brancos_captain || ''))}</p>
                    <ul className="list-inside">
                        {players.map((player: { id: any, name: string }, index: number) => (
                            <option key={index} value={player.id}>{player.name}</option>
                        ))}
                    </ul>
                </div>
                <div className="flex flex-col items-center justify-center">
                    <p className="font-bold">Pretos</p>
                    <p>{playerMap.get(BigInt(game?.pretos_captain || ''))}</p>
                    <ul className="list-inside">
                        {players.map((player: { id: any, name: string }, index: number) => (
                            <option key={index} value={player.id}>{player.name}</option>
                        ))}
                    </ul>
                </div>
            </div>
            <p>Score:</p>
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
