import React from 'react'
import { fetchGame, fetchPlayers } from '../../../../lib/data'
import { updateGame } from '@/app/lib/actions';

export default async function Page(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const id = params.id;


    const [game, players] = await Promise.all([
        fetchGame(id),
        fetchPlayers()
    ])
    if (!game) {
        return <div>Game not found</div>
    }

    const updateGameAction = updateGame.bind(null, game as any);


    return (
        <form action={updateGameAction} className="flex flex-col items-center gap-2 ">
            <h1>Editar jogo número: {game?.numero}</h1>
            <label htmlFor="date">Data do jogo:</label>
            <input type="date" id="date" name="date"
                // Optional: you can also add a default value of today's date
                defaultValue={new Date(game?.date).toLocaleDateString('en-GB').split('/').reverse().join('-')}
            />

            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center gap-2">
                    <h1>Brancos</h1>
                    <label className="text-bold" htmlFor="captain-brancos">Capitão Brancos</label>
                    <select id="captain-brancos" name="captain-brancos" defaultValue={game?.brancos_captain || ''}>
                        {players.map((player: { id: any, name: string }, index: number) => (
                            <option key={index} value={player.id}>{player.name}</option>
                        ))}
                    </select>
                    <label className="text-bold" htmlFor="players-brancos">Jogadores Brancos</label>
                    {[...Array(6)].map((_, index) => (
                        <select
                            key={index}
                            id={`players-brancos-${index + 1}`}
                            name={`players-brancos[]`}
                            defaultValue={Array.isArray(game?.brancos_players) ? String(game.brancos_players[index] || '') : ''}
                        >
                            {players.map((player: { id: any, name: string }, index: number) => (
                                <option key={index} value={player.id}>{player.name}</option>
                            ))}
                        </select>
                    ))}
                </div>
                <div className="flex flex-col items-center gap-2">
                    <h1>Pretos</h1>
                    <label className="text-bold" htmlFor="captain-pretos">Capitão Pretos</label>
                    <select id="captain-pretos" name="captain-pretos" defaultValue={game?.pretos_captain || ''}>
                        {players.map((player: { id: any, name: string }, index: number) => (
                            <option key={index} value={player.id}>{player.name}</option>
                        ))}
                    </select>
                    <label className="text-bold" htmlFor="players-pretos">Jogadores Pretos</label>
                    {[...Array(6)].map((_, index) => (
                        <select
                            key={index}
                            id={`players-pretos-${index + 1}`}
                            name={`players-pretos[]`}
                            defaultValue={Array.isArray(game?.pretos_players) ? String(game.pretos_players[index] || '') : ''}
                        >
                            {players.map((player: { id: any, name: string }, index: number) => (
                                <option key={index} value={player.id}>{player.name}</option>
                            ))}
                        </select>
                    ))}
                </div>
            </div>
            <h1>Resultado</h1>
            <div className="flex flex-row items-center gap-4">
                <label htmlFor="brancos-score">Brancos</label>
                <input type="number" id="brancos-score" name="brancos-score" defaultValue={game?.brancos_score || 0} />
                <label htmlFor="pretos-score">Pretos</label>
                <input type="number" id="pretos-score" name="pretos-score" defaultValue={game?.pretos_score || 0} />
            </div>
            <button type="submit">Editar Jogo</button>
        </form>
    )
}
