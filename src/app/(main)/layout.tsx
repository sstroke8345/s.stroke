import { SideNav } from "@/components/layout/SideNav";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col md:flex-row h-[100dvh] md:h-screen bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
            {/* Left Sidebar Menu */}
            <SideNav />

            {/* Main content area */}
            <div className="flex-1 min-w-0 h-full overflow-y-auto">
                {children}
            </div>
        </div>
    );
}
