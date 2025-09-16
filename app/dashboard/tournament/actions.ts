'use server'

import { clearTournament, createInitialBracket } from "@/app/lib/tournament";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function createTournamentBracket(playerIds: string[]) {
    await createInitialBracket(playerIds);
    revalidatePath('/dashboard/tournament');
}

export async function clearTournamentAction() {
    const session = await auth();

    if (!session?.user) {
        throw new Error('Not authorized');
    }

    await clearTournament();
    revalidatePath('/dashboard/tournament');
}
