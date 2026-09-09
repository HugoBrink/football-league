import { computeEloSnapshotForGame, fetchGame, getLeagueBySlug } from "@/app/lib/data";
import GameEloBreakdown from "@/app/components/GameEloBreakdown";
import GameVoteResults from "@/app/components/GameVoteResults";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ id: string; season: string; league: string }> }) {
    const { id, season, league: leagueSlug } = await params;
    const seasonNumber = Number(season);
    const league = await getLeagueBySlug(leagueSlug);
    if (!league) notFound();

    const game = await fetchGame(id);
    if (!game) return <div>Game not found</div>;

    const hasResult = game.brancos_score != null && game.pretos_score != null;
    const eloSnapshot = hasResult ? await computeEloSnapshotForGame(league.id, game.id as number) : null;

    return (
        <div className="w-full flex flex-col items-center gap-2">
            <div className="w-full sm:w-fit flex flex-row items-center justify-center bg-gray-800 p-4 rounded-md text-white">
                <Link href={`/dashboard/${leagueSlug}/season/${seasonNumber}/games`} className="mr-4">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <h1>Jogo #{game.numero}</h1>
            </div>
            <p className="text-gray-600 text-sm">Data: {new Date(game.date).toLocaleDateString('pt-PT')}</p>
            {hasResult ? (
                <p className="text-xl font-bold">{game.brancos_score} - {game.pretos_score}</p>
            ) : (
                <p className="text-sm font-medium text-amber-600">⏳ Resultado por adicionar</p>
            )}

            {eloSnapshot && (
                <div className="w-full mt-2">
                    <GameEloBreakdown snapshot={eloSnapshot} />
                </div>
            )}

            <div className="w-full mt-4 pt-4 border-t">
                <GameVoteResults gameId={game.id as number} gameNumero={game.numero} leagueId={league.id} />
            </div>
        </div>
    );
}
