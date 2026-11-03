"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  BookOpen,
  Dumbbell,
  Flag,
  ClipboardList,
  Calendar,
  MessageSquare,
  PenTool,
  Trophy,
  Plus,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Target,
  User,
  Users,
  Settings,
  X,
  Bell,
  BarChart3,
  Lightbulb,
  Award,
  Video,
  FileText,
  PieChart
} from "lucide-react";
import { cn, getKstDateStr } from "@/lib/utils";
import { getStoredEvents } from "@/lib/schedule-sync";
import { getPolls, Vote, VOTE_TYPE_COLORS, VOTE_TYPE_LABELS } from "@/lib/vote-sync";
import { getNotices, Notice, getPlainText } from "@/lib/notice-sync";
import { format, isSameDay, formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";

import { PageTitle, SectionTitle, LabelText } from "@/components/ui/Typography";
import { ChatFeed } from "@/components/chat/ChatFeed";

/* ──────── Master Shortcut Library ──────── */
const ALL_SHORTCUTS = [
  { id: "lessons", title: "레슨", icon: BookOpen, color: "bg-blue-50 border-transparent text-blue-500 dark:bg-blue-500/10 dark:border-transparent dark:text-blue-400", href: "/lessons" },
  { id: "training", title: "훈련", icon: Dumbbell, color: "bg-emerald-50 border-transparent text-emerald-500 dark:bg-emerald-500/10 dark:border-transparent dark:text-emerald-400", href: "/training" },
  { id: "challenges", title: "챌린지", icon: Trophy, color: "bg-rose-50 border-transparent text-rose-500 dark:bg-rose-500/10 dark:border-transparent dark:text-rose-400", href: "/training/challenges" },
  { id: "tournament-schedule", title: "대회 스케쥴", icon: Calendar, color: "bg-teal-50 border-transparent text-teal-500 dark:bg-teal-500/10 dark:border-transparent dark:text-teal-400", href: "/admin/tournament-schedule" },
  { id: "tournament-results", title: "대회 결과", icon: Award, color: "bg-amber-50 border-transparent text-amber-500 dark:bg-amber-500/10 dark:border-transparent dark:text-amber-400", href: "/admin/tournament-results" },
  { id: "schedule", title: "스케쥴", icon: Calendar, color: "bg-cyan-50 border-transparent text-cyan-500 dark:bg-cyan-500/10 dark:border-transparent dark:text-cyan-400", href: "/schedule" },
  { id: "scores", title: "스코어", icon: Flag, color: "bg-sky-50 border-transparent text-sky-500 dark:bg-sky-500/10 dark:border-transparent dark:text-sky-400", href: "/scores" },
  { id: "category-stats", title: "항목별 통계", icon: PieChart, color: "bg-pink-50 border-transparent text-pink-500 dark:bg-pink-500/10 dark:border-transparent dark:text-pink-400", href: "/scores/category-stats" },
  { id: "community", title: "공지사항", icon: Bell, color: "bg-indigo-50 border-transparent text-indigo-500 dark:bg-indigo-500/10 dark:border-transparent dark:text-indigo-400", href: "/community" },
  { id: "polls", title: "투표", icon: BarChart3, color: "bg-violet-50 border-transparent text-violet-500 dark:bg-violet-500/10 dark:border-transparent dark:text-violet-400", href: "/admin/polls" },
  { id: "consultations", title: "상담", icon: MessageSquare, color: "bg-amber-50 border-transparent text-amber-500 dark:bg-amber-500/10 dark:border-transparent dark:text-amber-400", href: "/consultations" },
  { id: "training-plan", title: "훈련계획", icon: Target, color: "bg-orange-50 border-transparent text-orange-500 dark:bg-orange-500/10 dark:border-transparent dark:text-orange-400", href: "/admin/training-plan" },
  { id: "training-journal", title: "훈련일지", icon: PenTool, color: "bg-fuchsia-50 border-transparent text-fuchsia-500 dark:bg-fuchsia-500/10 dark:border-transparent dark:text-fuchsia-400", href: "/admin/training-journal" },
  { id: "todos", title: "할일", icon: ClipboardList, color: "bg-zinc-50 border-transparent text-zinc-500 dark:bg-zinc-500/10 dark:border-transparent dark:text-zinc-400", href: "/operations/todos" },
];

const typeConfigs: Record<string, { label: string; gradient: string; icon: any; koLabel: string }> = {
  lesson: { label: "LESSON", gradient: "from-blue-400 to-blue-600", icon: BookOpen, koLabel: "레슨" },
  training: { label: "TRAINING", gradient: "from-emerald-400 to-emerald-600", icon: Dumbbell, koLabel: "훈련" },
  consultation: { label: "CONSULT", gradient: "from-pink-400 to-pink-600", icon: MessageSquare, koLabel: "상담" },
  score: { label: "SCORE", gradient: "from-sky-400 to-sky-600", icon: Flag, koLabel: "스코어" },
  etc: { label: "ETC", gradient: "from-zinc-400 to-zinc-600", icon: FileText, koLabel: "기타" },
};

const categoryLabels: Record<string, string> = {
  shot: "Shot",
  short_game: "Short Game",
  around_green: "Around Green",
  putting: "Putting",
  physical: "Physical",
  mental: "Mental",
  etc: "Etc",
  basic: "기본기",
  preview: "예습",
  review: "복습"
};

const typeLabels: Record<string, string> = {
  lesson: "레슨",
  training: "훈련",
  consultation: "상담",
  todo: "할일",
  schedule: "일정",
  journal: "일지",
  poll: "투표",
  score: "스코어"
};

function FeedCard({ item }: { item: any }) {
  const config = typeConfigs[item.type] || typeConfigs.etc;
  const Icon = config.icon;
  const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ko });
  const dStr = new Date(item.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
  const dateStr = dStr.slice(2).replace(/-/g, '.');
  const playerName = item.users?.name || "선수";
  const authorName = item.coach?.name || "관리자";

  const categoryDisplay = categoryLabels[item.category] || item.category;

  // Parse title for tags like [예습], [기본기], [복습]
  const tagMatch = item.title?.match(/^\[(.+?)\]/);
  const tag = tagMatch ? tagMatch[1] : null;
  const displayTitle = tag ? item.title.replace(`[${tag}]`, "").trim() : item.title;

  const finalTitle = categoryDisplay && displayTitle && displayTitle !== playerName
    ? `[${categoryDisplay}] ${displayTitle}`
    : (displayTitle || "기록");

  return (
    <Link
      href={`/${item.type === 'score' ? 'scores' : item.type === 'consultation' ? 'consultations' : item.type === 'training' ? 'training' : item.type + 's'}/${item.id}`}
      className="block bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 py-4 px-5 shadow-sm hover:border-brand-navy/30 hover:shadow-md transition-all group shrink-0 w-[70vw] sm:w-[260px] max-w-[280px] h-32 flex flex-col justify-between"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
            <Icon size={16} />
          </div>
          <span className="text-sm font-bold text-zinc-600 dark:text-zinc-300">
            {config.koLabel}
            {item.type === 'lesson' && categoryDisplay && ` | ${categoryDisplay}`}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-auto">
        <span className="text-[11px] font-bold text-zinc-400 shrink-0">
          {dateStr} <span className="opacity-40 font-normal mx-0.5">|</span> {authorName}
        </span>
        <span className="text-sm font-bold text-zinc-600 dark:text-zinc-300 truncate mr-2">
          {playerName}
        </span>
      </div>
    </Link>
  );
}

interface UserProfile {
  id: string;
  name: string;
  role: string;
  assigned_athletes?: string;
  branch?: string;
}


export default function Home() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedShortcutIds, setSelectedShortcutIds] = useState<string[]>(['lessons', 'training', 'challenges', 'schedule', 'scores', 'community', 'consultations']);
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [isPollSheetOpen, setIsPollSheetOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('user_shortcuts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const validIds = parsed.filter((id: string) => ALL_SHORTCUTS.some(s => s.id === id));
        if (validIds.length > 0) {
          setSelectedShortcutIds(validIds);
        }
      } catch (e) { }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded && selectedShortcutIds.length > 0) {
      localStorage.setItem('user_shortcuts', JSON.stringify(selectedShortcutIds));
    }
  }, [selectedShortcutIds, isLoaded]);
  const [todayTimeline, setTodayTimeline] = useState<any[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<any[]>([]);
  const [pendingPolls, setPendingPolls] = useState<Vote[]>([]);
  const [recentNotice, setRecentNotice] = useState<Notice | null>(null);
  const bannerScrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function initialize() {
      setIsLoading(true);
      const supabase = createClient();
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase.from("users").select("id, name, role, assigned_athletes, branch").eq("id", user.id).single();
        if (!profile) return;

        setCurrentUser(profile);

        const todayStr = getKstDateStr();

        // Fetch today's records for completion checks
        const { data: todayRecords } = await supabase
          .from("records")
          .select("id, type, title, category, created_at")
          .eq("user_id", user.id)
          .gte("created_at", todayStr + "T00:00:00+09:00")
          .lte("created_at", todayStr + "T23:59:59+09:00");

        // Fetch today's scores
        const { data: todayScores } = await supabase
          .from("scorecards")
          .select("id, round_date, total_score, course_name, created_at")
          .eq("athlete_id", user.id)
          .eq("round_date", todayStr);

        // Fetch active trainings (period-based)
        const { data: activeTrainings } = await supabase
          .from("records")
          .select("*")
          .eq("user_id", user.id)
          .eq("type", "training")
          .lte("training_start", todayStr)
          .gte("training_end", todayStr);

        // Fetch active polls
        const { data: activePolls } = await supabase
          .from("polls")
          .select("id, title, start_date, end_date")
          .lte("start_date", todayStr)
          .gte("end_date", todayStr);

        const { data: pollResponses } = await supabase
          .from("poll_responses")
          .select("poll_id, vote_date")
          .eq("user_id", user.id);

        const allPolls = await getPolls(10);
        const ongoingUnvoted = allPolls.filter(p => {
          const isOngoing = p.status === "ongoing" && todayStr >= p.startDate && todayStr <= p.endDate;
          
          if (!isOngoing) return false;

          // Permission check: Branch & Role
          const isMasterBranch = profile && (profile.role === 'office' || profile.role === 'headquarter');
          
          const pollTypes = p.type.split(',').map(t => t.trim());
          const hasRolePermission = isMasterBranch || pollTypes.includes("all") || (profile && pollTypes.includes(profile.role));

          const pollBranches = p.branch.split(',').map(b => b.trim());
          const hasBranchPermission = isMasterBranch || pollBranches.includes("전체") || (profile && profile.branch && pollBranches.includes(profile.branch));

          if (!hasRolePermission || !hasBranchPermission) return false;

          let hasNotVoted = true;
          if (p.isRecurring) {
            const now = new Date();
            const effectiveDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
            const yyyy = effectiveDate.getFullYear();
            const mm = String(effectiveDate.getMonth() + 1).padStart(2, '0');
            const dd = String(effectiveDate.getDate()).padStart(2, '0');
            const voteDateStr = `${yyyy}-${mm}-${dd}`;

            const votedToday = pollResponses?.some((pr: any) => pr.poll_id === p.id && pr.vote_date === voteDateStr);
            hasNotVoted = !votedToday;
          } else {
            hasNotVoted = !pollResponses?.some((pr: any) => pr.poll_id === p.id);
          }

          return hasNotVoted;
        });
        setPendingPolls(ongoingUnvoted);
        const allNotices = await getNotices(10);
        const filteredNotices = allNotices.filter(n => {
          const isMasterBranch = profile && (profile.role === 'office' || profile.role === 'headquarter');
          if (profile && profile.role === 'admin' || isMasterBranch) return true;
          
          const baseBranch = profile?.branch ? profile.branch.replace('점', '') : '';
          const hasBranch = n.branch === '전체' || n.branch.includes(baseBranch) || n.authorId === user.id;
          const hasRole = n.type === 'all' || (profile && profile.role === 'coach') || (profile && profile.role === n.type) || n.authorId === user.id;
          
          return hasBranch && hasRole;
        });
        
        if (filteredNotices.length > 0) {
          setRecentNotice(filteredNotices.sort((a, b) => b.date.localeCompare(a.date))[0]);
        }


        const schedules = await getStoredEvents(todayStr, todayStr);
        const todaySchedules = schedules.filter(e => isSameDay(new Date(e.start), new Date()));
        const { data: todos } = await supabase.from("todos").select("*").eq("user_id", user.id).eq("due_date", todayStr);

        const autoItems = [];
        if (profile.role === "athlete") {
          // 1. Mandatory Daily Journal
          autoItems.push({
            id: 'journal-auto',
            time: "20:00",
            title: "훈련일지 작성",
            type: 'journal',
            completed: todayRecords?.some((r: any) => r.type === 'journal') || false
          });

          // 2. Active Trainings
          (activeTrainings || []).forEach((at: any) => {
            const isCompletedInLogs = at.completion_logs?.some((log: string) => {
              try {
                const ts = log.startsWith('{') ? JSON.parse(log).timestamp : log;
                return getKstDateStr(ts) === todayStr;
              } catch { return false; }
            });

            autoItems.push({
              id: `training-auto-${at.id}`,
              time: "종일",
              title: at.title,
              type: 'training',
              completed: isCompletedInLogs || false
            });
          });

          // 3. Active Polls
          (activePolls || []).forEach((p: any) => {
            autoItems.push({
              id: `poll-auto-${p.id}`,
              time: "종일",
              title: `[투표] ${p.title}`,
              type: 'poll',
              completed: pollResponses?.some((pr: any) => pr.poll_id === p.id) || false
            });
          });
        }

        const timeline = [
          ...autoItems,
          ...todaySchedules.map(s => {
            // Check if there's a matching record today
            const isCompletedByRecord = todayRecords?.some((r: any) =>
              r.type === s.type &&
              (r.title === s.title || s.title?.includes(r.title || "") || r.title?.includes(s.title || ""))
            );
            return {
              id: s.id,
              time: new Date(s.start).toLocaleTimeString('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' }),
              title: s.title,
              type: 'schedule',
              completed: s.status === 'completed' || isCompletedByRecord
            };
          }),
          ...(todos || []).map((t: any) => ({
            id: t.id,
            time: "종일",
            title: t.title,
            type: 'todo',
            completed: t.is_completed
          })),
          // Add records that are NOT journals and NOT matched to schedules or trainings
          ...(todayRecords || []).filter((r: any) => {
            const isJournal = r.type === 'journal';
            const isUsedInTraining = false;
            const matchesSchedule = todaySchedules.some(s =>
              r.type === s.type &&
              (r.title === s.title || s.title?.includes(r.title || "") || r.title?.includes(s.title || ""))
            );
            return !isJournal && !isUsedInTraining && !matchesSchedule;
          }).map((r: any) => ({
            id: `record-${r.id}`,
            time: new Date(r.created_at).toLocaleTimeString('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' }),
            title: r.title || typeLabels[r.type] || "기록",
            type: r.type,
            completed: true
          })),
          // Add scorecards from today
          ...(todayScores || []).map((s: any) => ({
            id: `score-${s.id}`,
            time: new Date(s.created_at).toLocaleTimeString('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' }),
            title: `${s.course_name} 스코어 입력`,
            type: 'score',
            completed: true
          }))
        ].sort((a, b) => a.time.localeCompare(b.time));
        setTodayTimeline(timeline);

        try {
          const { data: updates } = await supabase
            .from("records")
            .select(`id, type, title, created_at, category, users!records_user_id_fkey(name), coach:users!records_coach_id_fkey(name)`)
            .in("type", ["lesson", "training"])
            .order("created_at", { ascending: false })
            .limit(5);
          setRecentUpdates(updates || []);
        } catch {
          setRecentUpdates([]);
        }

      } catch (error) {
        console.error("Home initialization failed:", error);
      } finally {
        setIsLoading(false);
      }
    }
    initialize();
  }, []);

  // Auto-show poll bottom sheet on mobile when pending polls exist
  useEffect(() => {
    if (!isLoading && pendingPolls.length > 0) {
      const hiddenDate = localStorage.getItem('poll_sheet_hidden_date');
      const now = new Date();
      const effectiveDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
      const todayStr = `${effectiveDate.getFullYear()}-${String(effectiveDate.getMonth() + 1).padStart(2, '0')}-${String(effectiveDate.getDate()).padStart(2, '0')}`;
      if (hiddenDate !== todayStr) {
        const timer = setTimeout(() => setIsPollSheetOpen(true), 600);
        return () => clearTimeout(timer);
      }
    }
  }, [isLoading, pendingPolls]);

  const handleToggleItem = async (item: any) => {
    const supabase = createClient();
    const isCurrentlyCompleted = item.completed;
    const todayStr = getKstDateStr();

    try {
      if (item.type === 'todo') {
        const { error } = await supabase
          .from("todos")
          .update({ is_completed: !isCurrentlyCompleted })
          .eq("id", item.id);
        if (error) throw error;
      } else if (item.type === 'schedule') {
        const { error } = await supabase
          .from("schedules")
          .update({ status: isCurrentlyCompleted ? 'scheduled' : 'completed' })
          .eq("id", item.id);
        if (error) throw error;
      } else if (item.type === 'training') {
        // Find the record and update completion_logs
        const { data: record } = await supabase
          .from("records")
          .select("id, completion_logs")
          .eq("id", item.id.replace('training-auto-', ''))
          .single();

        if (record) {
          let logs = [];
          if (record.completion_logs) {
            logs = Array.isArray(record.completion_logs) ? record.completion_logs : [record.completion_logs];
          }

          if (!isCurrentlyCompleted) {
            // Add today's log
            logs.push(JSON.stringify({ timestamp: new Date().toISOString(), type: 'quick-complete' }));
          } else {
            // Remove today's log
            logs = logs.filter((log: string) => {
              try {
                const ts = log.startsWith('{') ? JSON.parse(log).timestamp : log;
                return getKstDateStr(ts) !== todayStr;
              } catch { return true; }
            });
          }

          const { error } = await supabase
            .from("records")
            .update({ completion_logs: logs })
            .eq("id", record.id);
          if (error) throw error;
        }
      } else {
        // For journal or poll, redirecting is better as they require user input
        if (item.type === 'journal') {
          router.push('/admin/training-journal/create');
        }
        return;
      }

      setTodayTimeline(prev => prev.map(i => i.id === item.id ? { ...i, completed: !isCurrentlyCompleted } : i));
    } catch (err) {
      console.error("Toggle failed:", err);
    }
  };

  const isCoach = currentUser?.role === "coach";
  const isAdmin = currentUser?.role === "admin";
  const isLessonWriter = currentUser?.role === "coach" || currentUser?.role === "admin" || currentUser?.role === "headquarter" || currentUser?.role === "office";

  return (
    <div className="w-full h-full flex flex-col">
      {/* ─── Conversational Assistant (Gemini Live Workspace Core) ─── */}
      <section className="w-full flex-1 flex flex-col relative overflow-hidden">
        <ChatFeed 
          coachName={currentUser?.name || "코치"} 
          coachId={currentUser?.id} 
        />
      </section>


      {/* ─── Poll Bottom Sheet (Mobile) ─── */}
      {isPollSheetOpen && pendingPolls.length > 0 && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-50 sm:hidden animate-fade-in"
            onClick={() => setIsPollSheetOpen(false)}
          />
          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden animate-slide-up">
            <div className="bg-white dark:bg-zinc-900 rounded-t-[2rem] shadow-2xl border-t border-zinc-200 dark:border-zinc-700 px-6 pt-4 pb-8" style={{ minHeight: '33vh' }}>
              {/* Handle bar */}
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-600 rounded-full" />
              </div>

              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-500">
                  <BarChart3 size={16} />
                </div>
                <span className="text-xs font-bold text-violet-500 uppercase tracking-wider">참여하지 않은 투표 ({pendingPolls.length}건)</span>
              </div>

              <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2 pb-1">
                {pendingPolls.map((poll, index) => (
                  <Link
                    key={poll.id}
                    href={`/admin/polls/${poll.id}`}
                    onClick={() => setIsPollSheetOpen(false)}
                    className={cn(
                      "block rounded-2xl p-4 active:scale-[0.98] transition-all border shrink-0",
                      index % 2 === 0
                        ? "bg-violet-50/50 dark:bg-violet-900/10 border-violet-100/50 dark:border-violet-800/20"
                        : "bg-blue-50/50 dark:bg-blue-900/10 border-blue-100/50 dark:border-blue-800/20"
                    )}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <h4 className="text-lg font-black text-zinc-900 dark:text-zinc-50 truncate flex-1">
                        {getPlainText(poll.title)}
                      </h4>
                      <span className="shrink-0 text-[13px] font-bold text-brand-navy dark:text-blue-400 flex items-center gap-1 bg-white/60 dark:bg-black/20 px-3 py-1.5 rounded-full shadow-sm">
                        투표하기 <ArrowUpRight size={14} />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => {
                    setIsPollSheetOpen(false);
                    const now = new Date();
                    const effectiveDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
                    const dateStr = `${effectiveDate.getFullYear()}-${String(effectiveDate.getMonth() + 1).padStart(2, '0')}-${String(effectiveDate.getDate()).padStart(2, '0')}`;
                    localStorage.setItem('poll_sheet_hidden_date', dateStr);
                  }}
                  className="py-3 px-4 text-sm font-bold text-zinc-500 hover:text-zinc-700 transition-colors"
                >
                  오늘은 그만보기
                </button>
                <button
                  onClick={() => setIsPollSheetOpen(false)}
                  className="py-3 px-4 text-sm font-bold text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}