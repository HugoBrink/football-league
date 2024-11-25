import AddGame from "@/app/components/AddGame"
import Link from "next/link"

const games = [
    { id: 1, date: "21/11/2024", brancos: { captain: "John Doe", players: ["Player 1", "Player 2", "Player 3"] }, pretos: { captain: "Jane Doe", players: ["Player 4", "Player 5", "Player 6"] }, score: "1-0" },
    { id: 2, date: "21/11/2024", brancos: { captain: "John Doe", players: ["Player 1", "Player 2", "Player 3"] }, pretos: { captain: "Jane Doe", players: ["Player 4", "Player 5", "Player 6"] }, score: "0-1" },
    { id: 3, date: "28/11/2024", brancos: { captain: "John Doe", players: ["Player 1", "Player 2", "Player 3"] }, pretos: { captain: "Jane Doe", players: ["Player 4", "Player 5", "Player 6"] }, score: "2-0" },
]


export default function Games() {
    return (
        <div>
            <div className="flex justify-between items-center w-[80%] pb-5">
                <h1>Games</h1>
                <AddGame />
            </div>
            <div className="grid grid-cols-3 gap-4">
                {games.map((game) => (
                    <Link key={game.id} href={`/dashboard/games/${game.id}`}>
                        <div className="flex flex-col w-full border-2 border-gray-300 rounded-lg p-4 items-center">
                            <p>{game.date}</p>
                            <p className="font-bold">Brancos - Pretos</p>
                            <p>{game.brancos.captain} - {game.pretos.captain}</p>
                            <p>{game.score}</p>
                        </div>
                    </Link>

                ))}
            </div>
        </div>
    )
}
