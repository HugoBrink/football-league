import prisma from "./client";
import { Game, Player } from "./definitions";

// Pure data access functions
export async function fetchPlayers() {
    return await prisma.players.findMany({ 
        orderBy: { points: 'desc' } 
    });
}

export async function fetchPlayersNames() {
    return await prisma.players.findMany({
        select: {
            id: true,
            name: true
        },
        orderBy: { points: 'desc' }
    });
}

export async function getPlayerById(id: string) {
    return await prisma.players.findUnique({ 
        where: { id: BigInt(id) } 
    });
}

export async function fetchGames() {
    return await prisma.games.findMany({
        orderBy: { date: 'desc' }
    });
}

export async function fetchGame(id: string) {
    return await prisma.games.findUnique({ 
        where: { id: Number(id) } 
    });
}

