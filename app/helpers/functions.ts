import { Game } from "@/app/lib/definitions";

export function getWinningAndLosingTeams(game: Game) { 
    let winningTeam: string[];
    let losingTeam: string[];
    if (game.brancos_score > game.pretos_score) { 
        winningTeam = [...game.brancos_players, game.brancos_captain];
        losingTeam = [...game.pretos_players, game.pretos_captain];
    } else {
        winningTeam = [...game.pretos_players, game.pretos_captain];
        losingTeam = [...game.brancos_players, game.brancos_captain];
    }
    return { winningTeam, losingTeam };
}