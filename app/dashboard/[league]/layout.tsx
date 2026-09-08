import { getLeagueBySlug } from "@/app/lib/data";
import { notFound } from "next/navigation";

export default async function LeagueLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ league: string }>;
}) {
    const { league: leagueSlug } = await params;
    const league = await getLeagueBySlug(leagueSlug);
    if (!league) notFound();

    return <>{children}</>;
}
