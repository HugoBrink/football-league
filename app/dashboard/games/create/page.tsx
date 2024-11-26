import { createGame } from "@/app/lib/actions";
import { fetchPlayersNames } from "@/app/lib/data";


export default async function Page(){

    const players = await fetchPlayersNames();
    // TODO: Create a separted Component for the players selection
    // with a client side so it can be updated when a player is selected

    return (
        <form action={createGame} className="flex flex-col items-center gap-2">
            <h1>Novo jogo</h1>
            <label htmlFor="date">Data do jogo:</label>
            <input type="date" id="date" name="date"
                // Optional: you can also add a default value of today's date
                defaultValue={new Date().toLocaleDateString('en-GB').split('/').reverse().join('-')}
            />
           
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center gap-2">
                    <h1>Brancos</h1>
                    <label className="text-bold" htmlFor="captain-brancos">Capitão Brancos</label>
                    <select id="captain-brancos" name="captain-brancos">
                    {players.map((player: { id: string, name: string }, index: number) => (
                        <option key={index} value={player.id}>{player.name}</option>
                    ))}
                </select>
                <label className="text-bold" htmlFor="players-brancos">Jogadores Brancos</label>
                {[...Array(6)].map((_, index) => (
                    <select 
                        key={index} 
                        id={`players-brancos-${index + 1}`}
                        name={`players-brancos[]`}
                >
                    {players.map((player: { id: string, name: string }, index: number) => (
                            <option key={index} value={player.id}>{player.name}</option>
                        ))}
                    </select>
                ))}
                </div>
                <div className="flex flex-col items-center gap-2">
                    <h1>Pretos</h1>
                    <label className="text-bold" htmlFor="captain-pretos">Capitão Pretos</label>
                    <select id="captain-pretos" name="captain-pretos">
                        {players.map((player: { id: string, name: string }, index: number) => (
                        <option key={index} value={player.id}>{player.name}</option>
                    ))}
                </select>
                <label className="text-bold" htmlFor="players-pretos">Jogadores Pretos</label>
                {[...Array(6)].map((_, index) => (
                    <select 
                        key={index} 
                        id={`players-pretos-${index + 1}`}
                        name={`players-pretos[]`}
                >
                    {players.map((player: { id: string, name: string }, index: number) => (
                            <option key={index} value={player.id}>{player.name}</option>
                        ))}
                    </select>
                ))}
                </div>
            </div>
                    <h1>Resultado</h1>
                <div className="flex flex-row items-center gap-4">
                    <label htmlFor="brancos-score">Brancos</label>
                    <input type="number" id="brancos-score" name="brancos-score" defaultValue={0} />
                    <label htmlFor="pretos-score">Pretos</label>
                    <input type="number" id="pretos-score" name="pretos-score" defaultValue={0} />
                </div>
            <button type="submit">Criar Jogo</button>
        </form>
    )
}