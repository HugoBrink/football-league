
const games = [
    { id: 1, date: "21/11/2024", brancos: { captain: "John Doe", players: ["Player 1", "Player 2", "Player 3"] }, pretos: { captain: "Jane Doe", players: ["Player 4", "Player 5", "Player 6"] }, score: "1-0" },
    { id: 2, date: "21/11/2024", brancos: { captain: "John Doe", players: ["Player 1", "Player 2", "Player 3"] }, pretos: { captain: "Jane Doe", players: ["Player 4", "Player 5", "Player 6"] }, score: "0-1" },
    { id: 3, date: "28/11/2024", brancos: { captain: "John Doe", players: ["Player 1", "Player 2", "Player 3"] }, pretos: { captain: "Jane Doe", players: ["Player 4", "Player 5", "Player 6"] }, score: "2-0" },
]



export default async function Page(props: { params: Promise<{ id: string }>}) {
    const params = await props.params
    const id = params.id

    const game = games.find(game => game.id === parseInt(id)) // replace by db query

    return (
        <div className="w-full flex flex-col items-center gap-2 ">
            <h1>
                Games ID: {id}
            </h1>
            <p>Date: {game?.date}</p>
            <div className="grid grid-cols-2 w-44 ">
                <div className="flex flex-col items-center">
                    <p className="font-bold">Brancos</p>
                    <p>{game?.brancos.captain}</p>
                    <ul className="list-inside">{game?.brancos.players.map(player => <li key={player}>{player}</li>)}</ul>
                </div>
                <div className="flex flex-col items-center">
                    <p className="font-bold">Pretos</p>
                    <p>{game?.pretos.captain}</p>
                    <ul className="list-inside">{game?.pretos.players.map(player => <li key={player}>{player}</li>)}</ul>
                </div>
            </div>
            <p>Score:</p>
            <p>
                {game?.score}
            </p>
        </div>
    )
}
