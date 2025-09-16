import { updateGame } from '@/app/lib/actions';
import { fetchTournamentMatches } from '@/app/lib/tournament';
import { fetchGame, fetchPlayers } from '../../../../lib/data';

export default async function Page(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const id = params.id;

    const [game, players, tournamentMatches] = await Promise.all([
        fetchGame(id),
        fetchPlayers(),
        fetchTournamentMatches()
    ])
    if (!game) {
        return <div>Game not found</div>
    }

    // Find tournament match for this game
    const tournamentMatch = tournamentMatches.find(m => m.game_id === game.id);
    // Get other pending matches (for changing tournament match)
    const pendingMatches = tournamentMatches.filter(m => !m.game_id || m.game_id === game.id);

    const updateGameAction = updateGame.bind(null, game as any);

    return (
        <form action={updateGameAction} className="flex flex-col items-center gap-2 ">
            <h1>Editar jogo número: {game?.numero}</h1>

            {pendingMatches.length > 0 && (
                <div className="w-full max-w-md">
                    <label htmlFor="tournament-match-id" className="block text-sm font-medium text-gray-700">
                        Jogo da Taça Mocamfe (opcional)
                    </label>
                    <select
                        id="tournament-match-id"
                        name="tournament-match-id"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        defaultValue={tournamentMatch?.id ?? ''}
                    >
                        <option value="">Selecionar jogo do torneio...</option>
                        {pendingMatches.map(match => {
                            const player = players.find(p => String(p.id) === String(match.player_id))?.name ?? '?';
                            const opponent = match.opponent_id
                                ? players.find(p => String(p.id) === String(match.opponent_id))?.name ?? '?'
                                : 'TBD';
                            const roundName = match.round === 1 ? 'Primeira Ronda'
                                : match.round === 2 ? 'Quartos de Final'
                                : match.round === 3 ? 'Semi Final'
                                : 'Final';
                            return (
                                <option key={match.id} value={match.id}>
                                    {roundName}: {player} vs {opponent}
                                </option>
                            );
                        })}
                    </select>
                </div>
            )}

            <label htmlFor="date">Data do jogo:</label>
            <input type="date" id="date" name="date"
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
