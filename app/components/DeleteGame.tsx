import { TrashIcon } from "lucide-react";
import { deleteGame } from "@/app/lib/actions";
import { Game } from "@/app/lib/definitions";

export function DeleteGame({ game }: { game: Game }) {
    const deleteGameWithId = deleteGame.bind(null, game);
   
    return (
      <form action={deleteGameWithId}>
        <button type="submit" className="rounded-md border p-2 hover:bg-gray-400">
          <span className="sr-only">Delete</span>
          <TrashIcon className="w-4" />
        </button>
      </form>
    );
  }