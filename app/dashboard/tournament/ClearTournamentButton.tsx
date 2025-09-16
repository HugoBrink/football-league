'use client'

import { clearTournamentAction } from "./actions";

export default function ClearTournamentButton() {
    return (
        <form action={clearTournamentAction}>
            <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                onClick={(e) => {
                    if (!confirm('Tem certeza que quer limpar o torneio? Esta ação não pode ser desfeita.')) {
                        e.preventDefault();
                    }
                }}
            >
                Limpar Torneio
            </button>
        </form>
    )
}
