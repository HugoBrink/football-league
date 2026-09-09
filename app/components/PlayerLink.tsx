import Link from "next/link";

export default function PlayerLink({ name, leagueSlug }: { name: string; leagueSlug?: string }) {
    const href = leagueSlug
        ? `/players/${encodeURIComponent(name)}?league=${leagueSlug}`
        : `/players/${encodeURIComponent(name)}`;

    return (
        <Link href={href} className="hover:underline hover:text-blue-600 transition-colors">
            {name}
        </Link>
    );
}
