import MobileHamburger from "../components/MobileHamburger";
import SideNav from "../components/SideNav";
import { getAllLeagues } from "../lib/data";

export default async function Layout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const leagues = await getAllLeagues();
    const leagueData = leagues.map(l => ({
        id: l.id,
        slug: l.slug,
        name: l.name,
        city: l.city,
        current_season: l.current_season,
    }));

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
