'use server'

import { clearTournament, createInitialBracket } from "@/app/lib/tournament";
import { getLeagueBySlug } from "@/app/lib/data";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function createTournamentBracket(leagueSlug: string, playerIds: string[]) {
    const league = await getLeagueBySlug(leagueSlug);
    if (!league) throw new Error('League not found');
    await createInitialBracket(playerIds, league.current_season, league.id);
    revalidatePath(`/dashboard/${leagueSlug}/tournament`);
}

export async function clearTournamentAction(leagueSlug: string) {
    const session = await auth();
    if (!session?.user) throw new Error('Not authorized');
    const league = await getLeagueBySlug(leagueSlug);
    if (!league) throw new Error('League not found');
    await clearTournament(league.current_season, league.id);
    revalidatePath(`/dashboard/${leagueSlug}/tournament`);
}
