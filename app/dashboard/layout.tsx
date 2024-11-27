import SideNav from "../components/SideNav";

export default function Layout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex flex-row w-full">
            <div className="w-1/4 hidden sm:flex">
                <SideNav />
            </div>
            <div className="flex-1 overflow-y-auto md:p-8 p-4">{children}</div>
        </div>
    );
}
