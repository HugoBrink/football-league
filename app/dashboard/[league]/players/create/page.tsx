import { createPlayer } from "@/app/lib/actions";
import { getLeagueBySlug } from "@/app/lib/data";
import { notFound } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ league: string }> }) {
    const { league: leagueSlug } = await params;
    const league = await getLeagueBySlug(leagueSlug);
    if (!league) notFound();

    const createPlayerWithLeague = createPlayer.bind(null, leagueSlug);

    return (
        <div>
            <h1>Criar novo jogador — {league.name}</h1>
            <form action={createPlayerWithLeague} className="flex flex-col items-center gap-2">
                <label htmlFor="name">Nome</label>
                <input autoFocus required className="border-2 border-gray-300 rounded-md p-2" type="text" id="name" name="name" />
                <button type="submit">Criar Jogador</button>
            </form>
        </div>
    );
}
