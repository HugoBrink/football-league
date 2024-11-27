import prisma from "./client";

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
    const game = await prisma.games.findUnique({ 
        where: { id: Number(id) } 
    });
    if (game) {
        return { ...game, brancos_players: game.brancos_players as any, pretos_players: game.pretos_players as any }
    }
    return null
}

