const players = ["Player 1", "Player 2", "Player 3", "Player 4", "Player 5", "Player 6"]


export default function Page(){
    return (
        <form className="flex flex-col items-center gap-2">
            <h1>Novo jogo</h1>
            <label htmlFor="date">Data do jogo:</label>
            <input type="date" id="date"  pattern="\d{2}/\d{2}/\d{4}"
                placeholder="dd/mm/yyyy"
                // Optional: you can also add a default value of today's date
                defaultValue={new Date().toLocaleDateString('en-GB').split('/').reverse().join('-')}
            />
           
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center gap-4">
                    <h1>Brancos</h1>
                    <label className="text-bold" htmlFor="captain-brancos">Capitão Brancos</label>
                    <select id="captain-brancos">
                    {players.map((player, index) => (
                        <option key={index} value={player}>{player}</option>
                    ))}
                </select>
                <label className="text-bold" htmlFor="players-brancos">Jogadores Brancos</label>
                {[...Array(6)].map((_, index) => (
                    <select 
                        key={index} 
                        id={`players-brancos-${index + 1}`}
                >
                    {players.map((player) => (
                            <option key={player} value={player}>{player}</option>
                        ))}
                    </select>
                ))}
                </div>
                <div className="flex flex-col items-center gap-4">
                    <h1>Pretos</h1>
                    <label className="text-bold" htmlFor="captain-brancos">Capitão Pretos</label>
                    <select id="captain-brancos">
                        {players.map((player, index) => (
                        <option key={index} value={player}>{player}</option>
                    ))}
                </select>
                <label className="text-bold" htmlFor="players-brancos">Jogadores Pretos</label>
                {[...Array(6)].map((_, index) => (
                    <select 
                        key={index} 
                        id={`players-brancos-${index + 1}`}
                >
                    {players.map((player) => (
                            <option key={player} value={player}>{player}</option>
                        ))}
                    </select>
                ))}
                </div>
            </div>
            <button type="submit">Criar Jogo</button>
        </form>
    )
}