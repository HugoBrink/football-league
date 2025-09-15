import Table from "@/app/components/Table";
import { fetchPlayers } from "@/app/lib/data";
import Link from "next/link";

export default async function SeasonOverview(props: { params: Promise<{ season: string }> }) {
    const params = await props.params
    const seasonNumber = Number(params.season)

    const players = await fetchPlayers(seasonNumber);

    return (
        <div>
            <div className="flex justify-between items-center w-full sm:pt-0 px-6 pt-4">
                <div className="gap-2 flex flex-col items-center">
                    <h1>Grupeta do futebol — Season {seasonNumber}</h1>
                    <Link href={`/dashboard/season/${seasonNumber}/games`}
                        className="bg-slate-400 text-white rounded-md px-2 py-1 ">
                        Ver Jogos
                    </Link>
                </div>
                {/* No Add buttons in archive */}
            </div>

            <Table players={players} />
        </div>
    )
}
