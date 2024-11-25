import SideNav from "../components/SideNav";

export default function Layout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex flex-row w-full">
            <div className="w-1/4 h-screen hidden sm:flex">
                <SideNav />
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-8">{children}</div>
        </div>
    );
}
