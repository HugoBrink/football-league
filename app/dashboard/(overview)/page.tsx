import Table from "../../components/Table"
import { fetchPlayers } from "../../lib/data"
import Add from "../../components/Add";
import React from "react";
import Link from "next/link";

export default async function Dashboard() {

    const players = await fetchPlayers();

    return (
        <div>
            <div className="flex justify-between items-center w-full sm:pt-0 px-6 pt-4">
                <div className="gap-2 flex flex-col items-center">
                    <h1>Grupeta do futebol</h1>
                    <Link href="/dashboard/games"
                        className="bg-slate-400 text-white rounded-md px-2 py-1 sm:hidden">
                        Ver Jogos
                    </Link>
                </div>
                <Add type="players" />
                <Add type="games" />
            </div>

            <Table players={players} />
        </div>
    )
}
