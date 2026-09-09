import { Game } from "@/app/lib/definitions";

export function getWinningAndLosingTeams(game: Game) {
    let winningTeam: string[];
    let losingTeam: string[];
    let isDraw: boolean = false;

    const bScore = game.brancos_score ?? 0;
    const pScore = game.pretos_score ?? 0;

    if (bScore === pScore) {
        isDraw = true;
        winningTeam = [...game.brancos_players, game.brancos_captain];
        losingTeam = [...game.pretos_players, game.pretos_captain];
    } else if (bScore > pScore) {
        winningTeam = [...game.brancos_players, game.brancos_captain];
        losingTeam = [...game.pretos_players, game.pretos_captain];
    } else {
        winningTeam = [...game.pretos_players, game.pretos_captain];
        losingTeam = [...game.brancos_players, game.brancos_captain];
    }
    return { winningTeam, losingTeam, isDraw };
}
