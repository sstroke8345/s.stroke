"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
    Activity,
    Home,
    BookOpen,
    Dumbbell,
    Calendar,
    Flag,
    Settings,
    ChevronDown,
    ChevronRight,
    MoreHorizontal,
    Search,
    Bell,
    Menu,
    X,
    ClipboardList,
    Server,
    LogOut,
    UserCircle,
    MessageSquare,
    Trophy,
    Medal,
    Sparkles,
    Trash2,
    Plus
} from "lucide-react";

// Menu configuration based on user request
// Menu configuration with keys matching the Permissions Management page
const menuItems = [
    {
        key: "home",
        title: "Home",
        icon: Home,
        href: "/",
    },
    {
        key: "lessons",
        title: "레슨",
        icon: BookOpen,
        href: "/lessons",
    },
    {
        key: "training",
        title: "훈련",
        icon: Dumbbell,
        href: "/training",
    },
    {
        key: "challenges",
        title: "챌린지",
        icon: Trophy,
        href: "/training/challenges",
    },
    {
        title: "참가 대회",
        icon: Medal,
        subItems: [
            { key: "tournament-schedule", title: "대회 스케쥴", href: "/schedule/tournaments" },
            { key: "tournament-results-view", title: "대회 결과", href: "/schedule/tournament-results" },
        ],
    },
    {
        title: "스케쥴",
        icon: Calendar,
        subItems: [
            { key: "schedule", title: "스케쥴", href: "/schedule" },
            { key: "coach-trip-schedule", title: "출장 스케쥴", href: "/schedule/coach-trips" },
        ],
    },
    {
        title: "스코어",
        icon: Flag,
        subItems: [
            { key: "scores", title: "스코어", href: "/scores" },
            { key: "scores-stats", title: "스코어 통계", href: "/scores/stats" },
            { key: "scores-category-stats", title: "항목별 통계", href: "/scores/category-stats" },
            { key: "scores-tournaments", title: "토너먼트", href: "/scores/tournaments" },
        ],
    },
    {
        title: "라운지",
        icon: MessageSquare,
        subItems: [
            { key: "community", title: "공지사항", href: "/community" },
            { key: "polls", title: "투표", href: "/admin/polls" },
            { key: "consultations", title: "상담", href: "/consultations" },
            { key: "training-plan", title: "훈련계획", href: "/admin/training-plan" },
            { key: "training-journal", title: "훈련일지", href: "/admin/training-journal" },
            { key: "attendance", title: "출석 체크", href: "/operations/attendance" },
            { key: "todo-list", title: "할일", href: "/operations/todos" },
            { key: "course-management", title: "골프IQ", href: "/course-management" },
            { key: "course-info", title: "코스 정보", href: "/course-info" },
            { key: "reports", title: "선수 레포트", href: "/operations/reports" },
            { key: "coach-selection", title: "담임 코치 선택", href: "/coach-selection" },
            { key: "my-qr", title: "스마트 패스", href: "/my-qr" },
        ],
    },
    {
        title: "운영/관리",
        icon: Settings,
        subItems: [
            { key: "statistics", title: "운영 통계", href: "/admin/statistics" },
            { key: "player-reports", title: "선수 레포트 작성", href: "/admin/player-reports" },
            { key: "assigned-athletes", title: "담임 선수 배정", href: "/admin/assigned-athletes" },
            { key: "tournament-results", title: "대회 성적 관리", href: "/admin/tournament-results" },
            { key: "lesson-list", title: "스윙 오류 관리", href: "/system/lesson-list" },
            { key: "training-list", title: "훈련 리스트 관리", href: "/system/training-list" },
            { key: "challenge-list", title: "챌린지 컨텐츠 관리", href: "/system/challenge-list" },
            { key: "qr-check", title: "스마트 패스 관리", href: "/operations/qr-check" },
        ],
    },
    {
        title: "시스템 관리",
        icon: Server,
        subItems: [
            { key: "attendance-kiosk", title: "출석체크 번호 입력", href: "/operations/attendance/kiosk" },
            { key: "branches", title: "지점 관리", href: "/system/branches" },
            { key: "athletes", title: "선수 관리", href: "/system/athletes" },
            { key: "coaches", title: "코치 관리", href: "/system/coaches" },
            { key: "parents", title: "학부모 관리", href: "/system/parents" },
            { key: "permissions", title: "권한 관리", href: "/system/permissions" },
            { key: "menu-management", title: "메뉴 관리", href: "/system/menu-management" },
        ],
    },
    {
        title: "테스트",
        icon: ClipboardList,
        subItems: [
            { key: "temp-training", title: "훈련 (임시)", href: "/admin/training-temp" },
            { key: "temp-swing-skeleton", title: "스윙 테스트 (임시)", href: "/training/swing-skeleton" },
            { key: "temp-swing-test", title: "복습 카메라 (임시)", href: "/training/swing-test" },
        ],
    },
];

import { 
    getSavedChatSessions, 
    getActiveChatSessionId, 
    setActiveChatSessionId, 
    startNewChatSession,
    deleteChatSession, 
    clearAllChatSessions,
    ChatSessionItem 
} from "@/lib/chat-session-storage";

export function SideNav() {
    const router = useRouter();
    const pathname = usePathname();
    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
    const [isAllMenuOpen, setIsAllMenuOpen] = useState(false);
    const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(true);
    const [showAllSessions, setShowAllSessions] = useState(false);
    const [chatSessions, setChatSessions] = useState<ChatSessionItem[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [profileLink, setProfileLink] = useState("/");
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [userBranch, setUserBranch] = useState<string | null>(null);
    const [permissions, setPermissions] = useState<any[]>([]);

    // Close mobile menu when pathname changes
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    // Load saved chat sessions and subscribe to changes
    useEffect(() => {
        const refreshSessions = () => {
            setChatSessions(getSavedChatSessions());
            setActiveChatId(getActiveChatSessionId());
        };
        refreshSessions();

        window.addEventListener("s_stroke_chat_history_updated", refreshSessions);
        window.addEventListener("s_stroke_chat_session_change", refreshSessions);

        return () => {
            window.removeEventListener("s_stroke_chat_history_updated", refreshSessions);
            window.removeEventListener("s_stroke_chat_session_change", refreshSessions);
        };
    }, []);

    useEffect(() => {
        const supabase = createClient();
        const getProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from("users")
                    .select("id, role, name, branch")
                    .eq("id", user.id)
                    .single();

                const role = profile?.role || user.user_metadata?.role || "athlete";
                const name = profile?.name || user.user_metadata?.name || "사용자";
                const branch = profile?.branch || user.user_metadata?.branch || "";

                setUserRole(role);
                setUserName(name);
                setUserBranch(branch);
                if (role === "coach" || role === "admin" || role === "headquarter" || role === "office") {
                    setProfileLink(`/system/coaches/${user.id}`);
                } else if (role === "athlete") {
                    setProfileLink(`/system/athletes/${user.id}`);
                }
            } else {
                setUserRole("guest");
            }
        };
        getProfile();

        // Load permissions from Supabase
        const getPermissions = async () => {
            const { data, error } = await supabase.from('role_permissions').select('*');
            if (data && !error) {
                // Group by menuKey
                const permMap: any[] = [];
                const grouped = data.reduce((acc: any, curr: any) => {
                    if (!acc[curr.menu_key]) {
                        acc[curr.menu_key] = {
                            menuKey: curr.menu_key,
                            permissions: {}
                        };
                    }
                    acc[curr.menu_key].permissions[curr.role] = {
                        read: curr.can_read,
                        write: curr.can_write
                    };
                    return acc;
                }, {});
                for (const key in grouped) {
                    permMap.push(grouped[key]);
                }
                setPermissions(permMap);
            } else {
                setPermissions([]);
            }
        };
        getPermissions();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            if (session?.user) {
                getProfile();
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const canShowMenu = (item: any) => {
        if (!userRole) return false;

        const isSuperAdmin = userRole === "admin" || userRole === "super_admin" || userRole === "superadmin" || userName === "슈퍼관리자";
        if (isSuperAdmin) return true;

        const isHQOrOffice = userRole === "headquarter" || userRole === "office";

        // Hide Admin & System menus explicitly for athletes
        if (userRole === "athlete" && (item.title === "운영/관리" || item.title === "시스템 관리" || item.title === "테스트")) {
            return false;
        }

        // Hide System menus explicitly for coaches
        if (userRole === "coach" && item.title === "시스템 관리") {
            return false;
        }

        if (item.title === "테스트") {
            if (!isHQOrOffice) {
                return false;
            }
        }

        if (item.subItems) {
            // Folder is visible if any sub-item is visible
            return item.subItems.some((sub: any) => canShowSubItem(sub));
        }

        const perm = permissions.find(p => p.menuKey === item.key);
        if (!perm) return true; // Default to visible if not in perm table (e.g. newly added)

        return perm.permissions[userRole]?.read;
    };

    const canShowSubItem = (sub: any) => {
        if (!userRole) return false;
        
        const isSuperAdmin = userRole === "admin" || userRole === "super_admin" || userRole === "superadmin" || userName === "슈퍼관리자";
        if (isSuperAdmin) return true;

        const perm = permissions.find(p => p.menuKey === sub.key);
        if (!perm) return true;

        return perm.permissions[userRole]?.read;
    };

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
    };

    const toggleMenu = (title: string) => {
        setOpenMenus((prev) => ({
            ...prev,
            [title]: !prev[title],
        }));
    };

    // Format today's date
    const today = new Date();
    const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };
    const formattedDate = today.toLocaleDateString('en-GB', dateOptions);

    return (
        <>
            {/* Mobile Header with new design layout */}
            <div className="md:hidden flex items-center justify-between bg-white dark:bg-zinc-950 px-4 h-16 sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800/60">

                {/* Left: Menu Trigger */}
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-2 -ml-2 text-zinc-900 dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors"
                >
                    <Menu size={24} />
                </button>

                {/* Right: Profile Avatar aligned to the right */}
                <div className="flex items-center gap-1.5 ml-auto">
                    <button
                        onClick={() => {
                            startNewChatSession();
                            if (pathname !== "/") {
                                router.push("/");
                            }
                        }}
                        className="w-9 h-9 rounded-full text-zinc-600 dark:text-zinc-400 hover:text-brand-navy dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center justify-center transition-colors"
                        title="새 대화 시작 (홈)"
                    >
                        <Home size={20} />
                    </button>
                    <Link
                        href={profileLink}
                        className="w-9 h-9 rounded-full bg-brand-navy/10 text-brand-navy dark:bg-brand-navy/20 dark:text-brand-navy-light flex items-center justify-center font-black text-sm hover:scale-105 transition-transform border border-brand-navy/20 shadow-sm"
                        title="프로필"
                    >
                        {userName ? userName.slice(0, 1) : "S"}
                    </Link>
                </div>
            </div>

            {/* Backdrop for mobile */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar (Fixed on Mobile, Sticky on Desktop) */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-[280px] sm:w-64 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 transform transition-transform duration-300 ease-in-out md:sticky md:top-0 md:h-screen overflow-y-auto
                ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
            `}>
                <div className="p-6">
                    <div className="flex flex-col gap-4 mb-6">
                        <div className="flex items-center justify-between">
                            <Link href="/" className="flex items-center justify-center w-full px-3 py-2.5 bg-brand-navy rounded-xl shadow-md group border border-brand-navy-dark">
                                <span className="text-white font-black text-xl tracking-widest transition-transform group-hover:scale-105">S.STROKE</span>
                            </Link>
                            {/* Mobile Close Button */}
                            <button
                                className="p-1 -mr-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 md:hidden transition-colors ml-4"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex flex-row items-center justify-center gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800/60">
                            <Link href={profileLink} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-zinc-400 hover:text-brand-navy dark:hover:text-brand-navy-light hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all focus:outline-none">
                                <UserCircle size={24} strokeWidth={1.5} />
                                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{userName}</span>
                            </Link>

                            <button
                                onClick={handleLogout}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400 transition-colors" title="로그아웃"
                            >
                                <LogOut size={18} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>


                    {/* Collapsible: Recent Chat Sessions (최근 대화 기록) */}
                    <div className="mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center justify-between px-2 py-1.5">
                            <button
                                onClick={() => setIsChatHistoryOpen(prev => !prev)}
                                className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                            >
                                <MessageSquare size={13} className="text-brand-navy" />
                                <span>최근 대화 기록 ({chatSessions.length})</span>
                                {isChatHistoryOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>

                            <button
                                onClick={() => {
                                    startNewChatSession();
                                    if (pathname !== "/") {
                                        router.push("/");
                                    }
                                }}
                                className="flex items-center gap-1 text-[11px] font-bold text-brand-navy hover:underline"
                                title="새 대화 시작"
                            >
                                <Plus size={12} />
                                <span>새 대화</span>
                            </button>
                        </div>

                        {isChatHistoryOpen && (
                            <div className="mt-1 space-y-0.5 animate-fadeIn">
                                {chatSessions.length === 0 ? (
                                    <p className="px-3 py-1.5 text-xs text-zinc-400">저장된 대화 기록이 없습니다.</p>
                                ) : (
                                    <>
                                        {(showAllSessions ? chatSessions : chatSessions.slice(0, 10)).map(session => {
                                            const isSelected = pathname === "/" && activeChatId === session.id;
                                            return (
                                                <div
                                                    key={session.id}
                                                    className={`group flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                                                        isSelected
                                                            ? "bg-brand-navy/10 text-brand-navy font-bold dark:bg-brand-navy/20 dark:text-white"
                                                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200"
                                                    }`}
                                                    onClick={() => {
                                                        setActiveChatSessionId(session.id);
                                                        if (pathname !== "/") {
                                                            router.push("/");
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2 truncate flex-1 mr-1">
                                                        <MessageSquare size={12} className={isSelected ? "text-brand-navy shrink-0" : "text-zinc-400 shrink-0"} />
                                                        <span className="truncate">{session.title}</span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteChatSession(session.id);
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 rounded transition-opacity shrink-0"
                                                        title="대화 삭제"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        {chatSessions.length > 10 && (
                                            <button
                                                onClick={() => setShowAllSessions(prev => !prev)}
                                                className="w-full text-center py-1 mt-0.5 text-[11px] font-medium text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                                            >
                                                {showAllSessions ? "접기" : `+ ${chatSessions.length - 10}개 더보기`}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Collapsible: All Menus (전체 메뉴 아래로 펼치기) */}
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <button
                            onClick={() => setIsAllMenuOpen(prev => !prev)}
                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200 border border-zinc-200/60 dark:border-zinc-800 transition-all shadow-sm"
                        >
                            <span className="flex items-center gap-2">
                                <Menu size={16} className="text-brand-navy" />
                                전체 메뉴 둘러보기
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-zinc-400 font-normal">
                                {isAllMenuOpen ? "접기" : "펼치기"}
                                {isAllMenuOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                            </span>
                        </button>

                        {/* All Nested Foldable Menus List */}
                        {isAllMenuOpen && (
                            <nav className="space-y-1 mt-2 pl-1 animate-fadeIn">
                                {menuItems
                                    .filter(item => canShowMenu(item))
                                    .map((item) => {
                                        const Icon = item.icon;
                                        const filteredSubItems = item.subItems?.filter(sub => canShowSubItem(sub));

                                        if (!item.subItems) {
                                            const isActive = pathname === item.href;
                                            return (
                                                <Link
                                                    key={item.title}
                                                    href={item.href!}
                                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                                                        isActive
                                                            ? "bg-brand-navy/10 text-brand-navy dark:bg-brand-navy/20 dark:text-white"
                                                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-zinc-900 dark:hover:text-zinc-100"
                                                    }`}
                                                >
                                                    <Icon size={17} />
                                                    {item.title}
                                                </Link>
                                            );
                                        }

                                        // Foldable subcategory
                                        const isMenuOpen = openMenus[item.title];
                                        const isAnyChildActive = item.subItems?.some(
                                            sub => pathname === sub.href || pathname.startsWith(sub.href + '/')
                                        );

                                        return (
                                            <div key={item.title} className="space-y-1">
                                                <button
                                                    onClick={() => toggleMenu(item.title)}
                                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                                                        isAnyChildActive
                                                            ? "text-brand-navy dark:text-white font-bold"
                                                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <Icon size={16} className={isAnyChildActive ? "text-brand-navy dark:text-brand-navy-light" : "text-zinc-400"} />
                                                        {item.title}
                                                    </div>
                                                    {isMenuOpen ? (
                                                        <ChevronDown size={14} className="text-zinc-400" />
                                                    ) : (
                                                        <ChevronRight size={14} className="text-zinc-400" />
                                                    )}
                                                </button>

                                                {isMenuOpen && (
                                                    <div className="pl-8 space-y-0.5 mt-0.5 mb-1.5 border-l-2 border-zinc-100 dark:border-zinc-800 ml-3">
                                                        {filteredSubItems?.map((sub) => {
                                                            const isSubActive = pathname === sub.href;
                                                            return (
                                                                <Link
                                                                    key={sub.title}
                                                                    href={sub.href}
                                                                    onClick={() => {
                                                                        if (sub.href === "/admin/player-reports") {
                                                                            sessionStorage.removeItem("gla_report_athlete_id");
                                                                        }
                                                                    }}
                                                                    className={`block px-3 py-1.5 rounded-lg text-xs transition-colors ${
                                                                        isSubActive
                                                                            ? "bg-brand-navy/10 text-brand-navy font-bold dark:bg-brand-navy/20 dark:text-white"
                                                                            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                                                                    }`}
                                                                >
                                                                    {sub.title}
                                                                </Link>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                            </nav>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
}
