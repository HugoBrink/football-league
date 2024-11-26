import { PencilIcon } from "lucide-react";
import Link from "next/link";
import React from "react";
import { Game } from "../lib/definitions";

export function EditGame({ game }: { game: Game }) {
    return (
        <Link
            href={`/dashboard/games/${game.id}/edit`}
            className="rounded-md border p-2 hover:bg-gray-100"
        >
            <PencilIcon className="w-5" />
        </Link>
    );
}
