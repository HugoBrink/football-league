import MobileHamburger from "../components/MobileHamburger";
import SideNav from "../components/SideNav";
import { getAllLeagues, getLeagueSeasons } from "../lib/data";

export default async function Layout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const leagues = await getAllLeagues();
    const leagueData = await Promise.all(
        leagues.map(async (l) => {
            const allSeasons = await getLeagueSeasons(l.id);
            const pastSeasons = allSeasons
                .filter(s => s < l.current_season)
                .sort((a, b) => b - a);
            return {
                id: l.id,
                slug: l.slug,
                name: l.name,
                city: l.city,
                current_season: l.current_season,
                pastSeasons,
            };
        })
    );

    return (
        <div className="flex sm:flex-row flex-col w-full">
            <div className="sm:hidden w-full">
                <MobileHamburger leagues={leagueData} />
            </div>
            <div className="w-1/4 hidden sm:flex">
                <SideNav />
            </div>
            <div className="flex-1 overflow-y-auto md:p-8 p-4">{children}</div>
        </div>
    );
}
