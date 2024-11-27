import { TrashIcon } from "lucide-react";
import { deleteGame } from "@/app/lib/actions";
import { Game } from "@/app/lib/definitions";
import { auth } from "@/auth";

export async function DeleteGame({ game }: { game: Game }) {
  const session = await auth();

  // If user is not logged in, don't render the delete button
  if (!session?.user) {
    return null;
  }

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