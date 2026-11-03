"use client";

import React from "react";
import Link from "next/link";
import { ChatSessionState } from "@/lib/chat-engine";
import { ArrowRight, BookOpen, Dumbbell, Flag, Target, PenTool, MessageSquare, ExternalLink } from "lucide-react";

interface ActionCardProps {
    session: ChatSessionState;
    coachName?: string;
    coachId?: string;
    onCompleted?: (summaryText: string) => void;
    isPlan?: boolean;
}

export function NavigateCard({ session }: { session: ChatSessionState }) {
    const title = session.targetTitle || "페이지 이동";
    
    let buttonColor = "bg-brand-navy hover:bg-brand-navy-dark";
    let Icon = BookOpen;
    
    if (title.includes("훈련") && !title.includes("일지") && !title.includes("계획")) {
        buttonColor = "bg-emerald-600 hover:bg-emerald-700";
        Icon = Dumbbell;
    } else if (title.includes("스코어")) {
        buttonColor = "bg-brand-navy hover:bg-brand-navy-dark";
        Icon = Flag;
    } else if (title.includes("훈련계획")) {
        buttonColor = "bg-orange-600 hover:bg-orange-700";
        Icon = Target;
    } else if (title.includes("훈련일지")) {
        buttonColor = "bg-fuchsia-600 hover:bg-fuchsia-700";
        Icon = PenTool;
    } else if (title.includes("상담")) {
        buttonColor = "bg-amber-600 hover:bg-amber-700";
        Icon = MessageSquare;
    }

    return (
        <div className="w-full">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Icon size={16} className="text-brand-navy dark:text-brand-navy-light shrink-0" />
                        {title}
                    </h4>
                </div>

                <Link
                    href={session.targetUrl || "/"}
                    className={`w-full py-2.5 ${buttonColor} text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 active:scale-[0.98]`}
                >
                    <span>📋 {title} 열기</span>
                    <ArrowRight size={15} />
                </Link>
            </div>
        </div>
    );
}

// Fallback legacy cards redirecting to official pages
export function TrainingFormCard({ session }: ActionCardProps) {
    const athlete = session.athleteName || "선수";
    return (
        <NavigateCard 
            session={{
                ...session,
                targetUrl: `/training/create?player=${encodeURIComponent(athlete)}`,
                targetTitle: `${athlete} 훈련 작성`
            }} 
        />
    );
}

export function PlanJournalFormCard({ session, isPlan }: ActionCardProps) {
    const athlete = session.athleteName || "선수";
    return (
        <NavigateCard 
            session={{
                ...session,
                targetUrl: isPlan ? `/admin/training-plan/create?player=${encodeURIComponent(athlete)}` : `/admin/training-journal/create?player=${encodeURIComponent(athlete)}`,
                targetTitle: isPlan ? `${athlete} 훈련계획 작성` : `${athlete} 훈련일지 작성`
            }} 
        />
    );
}

export function ConsultationFormCard({ session }: ActionCardProps) {
    const athlete = session.athleteName || "선수";
    return (
        <NavigateCard 
            session={{
                ...session,
                targetUrl: `/consultations/create?player=${encodeURIComponent(athlete)}`,
                targetTitle: `${athlete} 상담일지 작성`
            }} 
        />
    );
}

export function ScoreHoleCard({ session }: { session: ChatSessionState }) {
    const athlete = session.athleteName || "선수";
    return (
        <NavigateCard 
            session={{
                ...session,
                targetUrl: `/scores/create?player=${encodeURIComponent(athlete)}`,
                targetTitle: `${athlete} 스코어카드 작성`
            }} 
        />
    );
}

export function LessonFormCard({ session }: ActionCardProps) {
    return <NavigateCard session={session} />;
}
