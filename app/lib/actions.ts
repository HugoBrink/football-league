'use server'

import { redirect } from "next/navigation";
import prisma from "./client";
import { Game, Player } from "./definitions";
import { z } from "zod";
import { getPlayerById } from "./data";
import { revalidatePath } from "next/cache";
import { getWinningAndLosingTeams } from "../helpers/functions";

const gameSchema = z.object({
    id: z.string(),
    date: z.coerce.date(),
    brancos_score: z.coerce.number(),
    pretos_score: z.coerce.number(),
    goal_difference: z.number(),
    brancos_captain: z.string(),
    brancos_players: z.array(z.string()),
    pretos_captain: z.string(),
    pretos_players: z.array(z.string()),
});

const CreateGame = gameSchema.omit({ id: true });

async function batchUpdatePlayers(
    playerIds: string[], 
    { games = 1, wins = 0, losses = 0, points = 0, goalsDiff = 0 }
) {
    const playerIdsBigInt = playerIds.map(id => BigInt(id));
    return prisma.players.updateMany({
        where: {
            id: { in: playerIdsBigInt }
        },
        data: {
            games: { increment: games },
            wins: { increment: wins },
            losses: { increment: losses },
            points: { increment: points },
            goals_diff: { increment: goalsDiff }
        }
    });
}

export async function createPlayer(formData: FormData) {
    const name = formData.get('name') as string;

    await prisma.players.create({ data: { name } });

    redirect('/dashboard/players/create');
}


export async function deletePlayer(id: string) {
    return await prisma.players.delete({ 
        where: { id: BigInt(id) } 
    });
}

export async function createGame(formData: FormData) {
    const rawFormData = {
        date: formData.get('date'),
        brancos_score: formData.get('brancos-score'),
        pretos_score: formData.get('pretos-score'),
        goal_difference: Number(formData.get('brancos-score')) - Number(formData.get('pretos-score')),
        brancos_captain: formData.get('captain-brancos'),
        brancos_players: formData.getAll('players-brancos[]'),
        pretos_captain: formData.get('captain-pretos'),
        pretos_players: formData.getAll('players-pretos[]'),
    };

    const parsedFormData = CreateGame.safeParse(rawFormData);

    if (!parsedFormData.success) {
        console.log(parsedFormData.error.flatten().fieldErrors);
        return {
            message: "Invalid form data"
        };
    }
   
    const { brancos_players, pretos_players, goal_difference, brancos_captain, pretos_captain } = parsedFormData.data;
    
    const { winningTeam, losingTeam } = getWinningAndLosingTeams(parsedFormData.data);

    const absGoalDifference = Math.abs(goal_difference);

    await Promise.all([
        batchUpdatePlayers(winningTeam, {
            wins: 1,
            points: 3,
            goalsDiff: absGoalDifference
        }),
        batchUpdatePlayers(losingTeam, {
            losses: 1,
            points: 1,
            goalsDiff: -absGoalDifference
        })
    ]);

    const game = await prisma.games.create({ 
        data: parsedFormData.data 
    });
    revalidatePath('/dashboard');
    redirect('/dashboard/games');
}


export async function deleteGame(game: Game) {
    console.log(game)
    // update the players with the game deleted
    const { winningTeam, losingTeam } = getWinningAndLosingTeams(game);
    const absGoalDifference = Math.abs(game.goal_difference);
    
    await Promise.all([
        batchUpdatePlayers(winningTeam, { games: -1, wins: -1, points: -3, goalsDiff: -absGoalDifference }),
        batchUpdatePlayers(losingTeam, { games: -1, losses: -1, points: -1, goalsDiff: absGoalDifference })
    ]);
    await prisma.games.delete({ where: { id: game.id } });
    redirect('/dashboard/games');
}

