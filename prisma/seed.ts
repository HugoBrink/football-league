import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Create leagues (upsert to be idempotent)
    const porto = await prisma.leagues.upsert({
        where: { slug: 'porto' },
        update: {},
        create: {
            name: 'Liga do Porto',
            slug: 'porto',
            city: 'Porto',
            current_season: 3,
        },
    });

    const lisboa = await prisma.leagues.upsert({
        where: { slug: 'lisboa' },
        update: {},
        create: {
            name: 'Liga de Lisboa',
            slug: 'lisboa',
            city: 'Lisboa',
            current_season: 3,
        },
    });

    console.log('Created leagues:', porto, lisboa);

    // Update all existing games/players/tournament to Porto league
    const gamesUpdated = await prisma.games.updateMany({
        where: { league_id: 1 },
        data: { league_id: porto.id },
    });
    console.log(`Updated ${gamesUpdated.count} games to Porto league (id: ${porto.id})`);

    const playersUpdated = await prisma.players.updateMany({
        where: { league_id: 1 },
        data: { league_id: porto.id },
    });
    console.log(`Updated ${playersUpdated.count} players to Porto league (id: ${porto.id})`);

    const tournamentUpdated = await prisma.tournament_mocamfe.updateMany({
        where: { league_id: 1 },
        data: { league_id: porto.id },
    });
    console.log(`Updated ${tournamentUpdated.count} tournament matches to Porto league (id: ${porto.id})`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
