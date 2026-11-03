import { createClient } from "./supabase/client";

// ── Types ─────────────────────────────────────────────────────────

export type IntentType = 
    | "CREATE_LESSON"
    | "VIEW_LESSONS"
    | "CREATE_TRAINING"
    | "VIEW_TRAININGS"
    | "CREATE_CONSULTATION"
    | "CREATE_PLAN"
    | "CREATE_JOURNAL"
    | "CREATE_SCORE"
    | "VIEW_SCORES"
    | "NAVIGATE"
    | "UNKNOWN";

export type LessonCategory = "shot" | "pitch" | "bunker" | "approach" | "putt" | "physical" | "field" | "etc";
export type PlanJournalType = "good" | "miss" | "field";
export type ConsultationCategory = "regular" | "urgent" | "admission" | "etc";

export interface ShotStep {
    shotNumber: number;
    location: string;
    distance?: number | string;
}

export interface ScoreHoleState {
    holeNumber: number;
    par: number;
    shots: ShotStep[];
    currentShotIndex: number;
    isFinished: boolean;
}

export interface ChatSessionState {
    intent: IntentType;
    step: string;
    athleteId?: string;
    athleteName?: string;
    
    // Lesson Fields
    lessonCategory?: LessonCategory;
    lessonTitle?: string;
    lessonContent?: string;

    // Training Fields
    trainingCategory?: string;
    trainingCount?: number;
    trainingComment?: string;

    // Consultation Fields
    consultationType?: ConsultationCategory;
    consultationContent?: string;

    // Plan & Journal Fields
    pjType?: PlanJournalType;
    pjTitle?: string;
    pjContent?: string;

    // Score Tracking Fields
    scoreCourse?: string;
    scoreHoles?: ScoreHoleState[];
    activeHoleIndex?: number;

    // Navigate Fields
    targetUrl?: string;
    targetTitle?: string;
}

export interface QuickOption {
    label: string;
    value: string;
    subtext?: string;
    accent?: boolean;
}

export interface ChatBotResponse {
    message: string;
    options?: QuickOption[];
    showInput?: boolean;
    inputPlaceholder?: string;
    actionCard?: "LESSON_FORM" | "TRAINING_FORM" | "CONSULTATION_FORM" | "PLAN_FORM" | "JOURNAL_FORM" | "SCORE_HOLE_CARD" | "NAVIGATE_CARD" | "LESSON_LIST";
    isCompleted?: boolean;
    data?: any;
}

// ── Constants ─────────────────────────────────────────────────────


export interface NavCategoryGroup {
    categoryName: string;
    keywords: string[];
    subItems: { title: string; href: string }[];
}

export const SYSTEM_MENU_CATEGORIES: NavCategoryGroup[] = [
    {
        categoryName: "시스템 관리",
        keywords: ["시스템관리", "시스템", "시스템설정", "환경설정"],
        subItems: [
            { title: "🏢 지점 관리", href: "/system/branches" },
            { title: "🏌️ 선수 관리", href: "/system/athletes" },
            { title: "👔 코치 관리", href: "/system/coaches" },
            { title: "👨‍👩‍👧 학부모 관리", href: "/system/parents" },
            { title: "🔒 권한 관리", href: "/system/permissions" },
            { title: "📋 메뉴 관리", href: "/system/menu-management" },
            { title: "🔢 출석체크 번호 입력", href: "/operations/attendance/kiosk" },
        ]
    },
    {
        categoryName: "운영/관리",
        keywords: ["운영관리", "운영/관리", "운영", "관리메뉴"],
        subItems: [
            { title: "📊 운영 통계", href: "/admin/statistics" },
            { title: "📝 선수 레포트 작성", href: "/admin/player-reports" },
            { title: "👥 담임 선수 배정", href: "/admin/assigned-athletes" },
            { title: "🏆 대회 성적 관리", href: "/admin/tournament-results" },
            { title: "⚙️ 스윙 오류 관리", href: "/system/lesson-list" },
            { title: "🏋️ 훈련 리스트 관리", href: "/system/training-list" },
            { title: "🎯 챌린지 컨텐츠 관리", href: "/system/challenge-list" },
            { title: "📱 스마트 패스 관리", href: "/operations/qr-check" },
        ]
    },
    {
        categoryName: "라운지",
        keywords: ["라운지", "라운지메뉴"],
        subItems: [
            { title: "📢 공지사항", href: "/community" },
            { title: "🗳️ 투표", href: "/admin/polls" },
            { title: "💬 상담", href: "/consultations" },
            { title: "📋 훈련계획", href: "/admin/training-plan" },
            { title: "📔 훈련일지", href: "/admin/training-journal" },
            { title: "📍 출석 체크", href: "/operations/attendance" },
            { title: "✅ 할일", href: "/operations/todos" },
            { title: "🧠 골프IQ", href: "/course-management" },
            { title: "⛳ 코스 정보", href: "/course-info" },
            { title: "📑 선수 레포트", href: "/operations/reports" },
            { title: "🎓 담임 코치 선택", href: "/coach-selection" },
            { title: "📲 스마트 패스", href: "/my-qr" },
        ]
    },
    {
        categoryName: "참가 대회",
        keywords: ["참가대회", "대회메뉴"],
        subItems: [
            { title: "📅 대회 스케쥴", href: "/schedule/tournaments" },
            { title: "🏆 대회 결과", href: "/schedule/tournament-results" },
        ]
    },
    {
        categoryName: "스케쥴",
        keywords: ["스케쥴메뉴", "스케줄메뉴"],
        subItems: [
            { title: "📅 전체 스케쥴", href: "/schedule" },
            { title: "✈️ 출장 스케쥴", href: "/schedule/coach-trips" },
        ]
    },
    {
        categoryName: "스코어",
        keywords: ["스코어메뉴", "스코어통계메뉴"],
        subItems: [
            { title: "⛳ 스코어", href: "/scores" },
            { title: "📊 스코어 통계", href: "/scores/stats" },
            { title: "📈 항목별 통계", href: "/scores/category-stats" },
            { title: "🏆 토너먼트", href: "/scores/tournaments" },
        ]
    }
];

export function findSystemCategory(text: string): NavCategoryGroup | null {
    const t = text.toLowerCase().replace(/\s+/g, "");
    for (const cat of SYSTEM_MENU_CATEGORIES) {
        if (cat.keywords.some(k => t === k.replace(/\s+/g, "") || t.includes(k.replace(/\s+/g, "")))) {
            return cat;
        }
    }
    return null;
}

export interface NavRoute {
    title: string;
    href: string;
    keywords: string[];
}

export const ALL_SYSTEM_NAV_ROUTES: NavRoute[] = [
    // 기본
    { title: "홈", href: "/", keywords: ["홈", "메인", "처음으로", "홈화면"] },
    { title: "레슨", href: "/lessons", keywords: ["레슨", "레슨목록", "레슨조회", "레슨피드", "레슨보기"] },
    { title: "훈련", href: "/training", keywords: ["훈련", "훈련목록", "훈련조회", "과제목록", "훈련과제"] },
    { title: "챌린지", href: "/training/challenges", keywords: ["챌린지", "도전과제", "챌린지목록"] },
    
    // 대회
    { title: "대회 스케쥴", href: "/schedule/tournaments", keywords: ["대회스케쥴", "대회일정", "대회스케줄", "참가대회"] },
    { title: "대회 결과", href: "/schedule/tournament-results", keywords: ["대회결과", "대회성적", "대회스코어"] },

    // 스케쥴
    { title: "스케쥴", href: "/schedule", keywords: ["스케쥴", "스케줄", "일정", "캘린더", "달력"] },
    { title: "출장 스케쥴", href: "/schedule/coach-trips", keywords: ["출장스케쥴", "출장스케줄", "출장일정", "출장"] },

    // 스코어
    { title: "스코어", href: "/scores", keywords: ["스코어", "스코어목록", "스코어조회", "라운드기록"] },
    { title: "스코어 통계", href: "/scores/stats", keywords: ["스코어통계", "평균타수", "타수통계"] },
    { title: "항목별 통계", href: "/scores/category-stats", keywords: ["항목별통계", "카테고리통계", "세부통계"] },
    { title: "토너먼트", href: "/scores/tournaments", keywords: ["토너먼트", "토너먼트스코어"] },

    // 라운지
    { title: "공지사항", href: "/community", keywords: ["공지사항", "공지", "커뮤니티"] },
    { title: "투표", href: "/admin/polls", keywords: ["투표", "설문", "폴"] },
    { title: "상담", href: "/consultations", keywords: ["상담", "상담일지", "면담", "학부모상담"] },
    { title: "훈련계획", href: "/admin/training-plan", keywords: ["훈련계획", "플랜", "훈련플랜"] },
    { title: "훈련일지", href: "/admin/training-journal", keywords: ["훈련일지", "저널", "훈련저널"] },
    { title: "출석 체크", href: "/operations/attendance", keywords: ["출석체크", "출석", "출결", "출석부"] },
    { title: "할일", href: "/operations/todos", keywords: ["할일", "투두", "todo", "업무"] },
    { title: "골프IQ", href: "/course-management", keywords: ["골프iq", "골프아이큐", "코스매니지먼트", "야디지북", "홀공략"] },
    { title: "코스 정보", href: "/course-info", keywords: ["코스정보", "골프장정보", "골프장코스"] },
    { title: "선수 레포트", href: "/operations/reports", keywords: ["선수레포트", "선수리포트", "레포트", "리포트"] },
    { title: "담임 코치 선택", href: "/coach-selection", keywords: ["담임코치선택", "코치선택", "담당코치"] },
    { title: "스마트 패스", href: "/my-qr", keywords: ["스마트패스", "내qr", "내큐알", "qr코드"] },

    // 운영/관리
    { title: "운영 통계", href: "/admin/statistics", keywords: ["운영통계", "센터통계", "아카데미통계"] },
    { title: "선수 레포트 작성", href: "/admin/player-reports", keywords: ["선수레포트작성", "리포트작성", "레포트발행"] },
    { title: "담임 선수 배정", href: "/admin/assigned-athletes", keywords: ["담임선수배정", "선수배정", "배정선수"] },
    { title: "대회 성적 관리", href: "/admin/tournament-results", keywords: ["대회성적관리", "대회결과관리"] },
    { title: "스윙 오류 관리", href: "/system/lesson-list", keywords: ["스윙오류관리", "스윙오류", "오류목록"] },
    { title: "훈련 리스트 관리", href: "/system/training-list", keywords: ["훈련리스트관리", "훈련종목관리"] },
    { title: "챌린지 컨텐츠 관리", href: "/system/challenge-list", keywords: ["챌린지컨텐츠관리", "챌린지관리"] },
    { title: "스마트 패스 관리", href: "/operations/qr-check", keywords: ["스마트패스관리", "qr관리", "큐알체크"] },

    // 시스템 관리
    { title: "출석체크 번호 입력", href: "/operations/attendance/kiosk", keywords: ["키오스크", "출석체크번호", "번호입력", "출석번호"] },
    { title: "지점 관리", href: "/system/branches", keywords: ["지점관리", "지점", "분점관리"] },
    { title: "선수 관리", href: "/system/athletes", keywords: ["선수관리", "선수목록", "원생관리"] },
    { title: "코치 관리", href: "/system/coaches", keywords: ["코치관리", "코치목록", "강사관리"] },
    { title: "학부모 관리", href: "/system/parents", keywords: ["학부모관리", "학부모목록", "학부모"] },
    { title: "권한 관리", href: "/system/permissions", keywords: ["권한관리", "권한설정", "역할관리"] },
    { title: "메뉴 관리", href: "/system/menu-management", keywords: ["메뉴관리", "메뉴설정", "사이드바관리"] }
];

export function findSystemNavRoute(text: string): NavRoute | null {
    const t = text.toLowerCase().replace(/\s+/g, "");

    // 외부 웹사이트/홈페이지 문의나 협회/연맹, 질문형 단어는 시스템 내부 이동에서 제외 (Gemini AI로 전달)
    if (
        t.includes("홈페이지") || 
        t.includes("웹사이트") || 
        t.includes("사이트") || 
        t.includes("협회") || 
        t.includes("연맹") || 
        t.includes("링크")
    ) {
        return null;
    }

    for (const route of ALL_SYSTEM_NAV_ROUTES) {
        // '홈'이나 '메인' 같은 초단기 키워드는 문맥상 홈페이지/홈런 등이 아닌 단독/명확한 이동일 때만 매칭
        if (route.href === "/") {
            if (t === "홈" || t === "메인" || t === "홈화면" || t === "메인화면" || t === "처음으로" || t === "첫화면" || t === "홈으로" || t === "메인으로") {
                return route;
            }
            continue;
        }

        if (route.keywords.some(k => t.includes(k.replace(/\s+/g, "")))) {
            return route;
        }
    }
    return null;
}


export const LESSON_CATEGORIES: { key: LessonCategory; label: string }[] = [
    { key: "shot", label: "샷 (Shot)" },
    { key: "putt", label: "퍼팅 (Putt)" },
    { key: "approach", label: "어프로치 (Approach)" },
    { key: "bunker", label: "벙커 (Bunker)" },
    { key: "pitch", label: "피치샷 (Pitch)" },
    { key: "physical", label: "피지컬 (Physical)" },
    { key: "field", label: "필드 (Field)" },
    { key: "etc", label: "기타 (Etc)" }
];

export const PLAN_JOURNAL_TYPES: { key: PlanJournalType; label: string; desc: string }[] = [
    { key: "good", label: "굿샷 (Good Shot)", desc: "잘 맞은 샷 분석 및 성공 요인" },
    { key: "miss", label: "미스샷 (Miss Shot)", desc: "실수 원인 및 보완 계획" },
    { key: "field", label: "필드 노트 (Field)", desc: "코스 매니지먼트 및 실전 메모" }
];

export const CONSULTATION_TYPES: { key: ConsultationCategory; label: string }[] = [
    { key: "regular", label: "정기 상담" },
    { key: "urgent", label: "수시 상담" },
    { key: "admission", label: "진학/진로 상담" },
    { key: "etc", label: "일반 면담" }
];

export const BALL_LOCATIONS = [
    { label: "페어웨이", code: "FW" },
    { label: "러프", code: "RO" },
    { label: "그린 (온그린)", code: "GR" },
    { label: "어프로치", code: "GA" },
    { label: "벙커", code: "GB" },
    { label: "페어웨이벙커", code: "FB" },
    { label: "홀인 (종료)", code: "HI" },
    { label: "오비 (OB)", code: "OB" },
    { label: "패널티 (해저드)", code: "PA" }
];

// ── Cache for Athlete Names ──────────────────────────────────────

let athleteCache: { id: string; name: string }[] = [];

export async function preloadAthletes(): Promise<{ id: string; name: string }[]> {
    if (athleteCache.length > 0) return athleteCache;
    try {
        const supabase = createClient();
        const { data, error } = await supabase.from("users").select("id, name").eq("role", "athlete");
        if (data && !error) {
            athleteCache = (data as Array<{ id: string; name: string | null }>).filter((u: { id: string; name: string | null }) => !!u.name) as { id: string; name: string }[];
        }
    } catch (e) {
        console.error("Failed to preload athletes:", e);
    }
    return athleteCache;
}

// ── Athlete Name Extractor ───────────────────────────────────────

export function extractAthleteName(text: string, athletes: { id: string; name: string }[]): { id?: string; name?: string } {
    const cleaned = text.replace(/\s+/g, "");
    
    // 1. Direct inclusion
    for (const a of athletes) {
        if (cleaned.includes(a.name) || text.includes(a.name)) {
            return a;
        }
    }
    
    // 2. Regex for common 2-4 character Korean names if followed by 선수/회원
    const nameMatch = text.match(/([가-힣]{2,4})\s*(?:선수|회원|프로)/);
    if (nameMatch && nameMatch[1]) {
        const found = athletes.find(a => a.name === nameMatch[1]);
        if (found) return found;
        return { name: nameMatch[1] };
    }

    return {};
}

// ── Intent Classifier (Zero-Token Rule Engine) ───────────────────

export function detectIntent(text: string): IntentType {
    const t = text.toLowerCase().replace(/\s+/g, "");

    // 1. 조회 / 목록 관련 (명확한 조회 키워드가 포함된 경우만)
    const isExplicitQuery = t.includes("조회") || t.includes("목록") || t.includes("현황") || t.includes("내역") || t.includes("검색") || t.includes("찾아") || t.includes("보기") || t.includes("피드");
    if (isExplicitQuery) {
        if (t.includes("레슨")) return "VIEW_LESSONS";
        if (t.includes("훈련") || t.includes("과제")) return "VIEW_TRAININGS";
        if (t.includes("스코어") || t.includes("통계")) return "VIEW_SCORES";
    }

    // 2. 명확한 등록/작성/추가/배정 액션 키워드가 결합된 경우만 로컬에서 처리
    const isCreateAction = t.includes("작성") || t.includes("등록") || t.includes("배정") || t.includes("입력") || t.includes("추가");

    if (isCreateAction) {
        if (t.includes("훈련계획") || t.includes("플랜")) return "CREATE_PLAN";
        if (t.includes("훈련일지") || t.includes("저널")) return "CREATE_JOURNAL";
        if (t.includes("상담") || t.includes("면담")) return "CREATE_CONSULTATION";
        if (t.includes("스코어")) return "CREATE_SCORE";
        if (t.includes("레슨")) return "CREATE_LESSON";
        if (t.includes("훈련") || t.includes("과제")) return "CREATE_TRAINING";
    }

    // 3. 외부 웹사이트/홈페이지, 협회/연맹 등 정보 검색 질문은 내부 이동 감지에서 완전 제외 -> Gemini AI에게 위임
    if (t.includes("홈페이지") || t.includes("웹사이트") || t.includes("사이트") || t.includes("협회") || t.includes("연맹") || t.includes("알려줘") || t.includes("주소")) {
        return "UNKNOWN";
    }

    // 4. 시스템 메뉴 이동 감지 (화면, 이동, 가줘, 열어줘 또는 단독 메뉴 키워드)
    const isNavAction = t.includes("이동") || t.includes("가줘") || t.includes("열어") || t.includes("화면") || t.includes("페이지") || t.includes("보여줘");
    
    // 3-1. 대분류 카테고리 (예: 시스템 관리, 운영 관리 등) 감지
    const matchedCategory = findSystemCategory(text);
    if (matchedCategory) {
        return "NAVIGATE";
    }

    const matchedRoute = findSystemNavRoute(text);
    if (matchedRoute && (isNavAction || t.length <= 8)) {
        return "NAVIGATE";
    }

    // 그 외 모든 질문, 대화, 문맥 판단은 Gemini AI에게 위임
    return "UNKNOWN";
}

// ── Step Processor ───────────────────────────────────────────────

export function processInitialMessage(
    input: string, 
    athletes: { id: string; name: string }[]
): { nextState: ChatSessionState; response: ChatBotResponse } {
    const intent = detectIntent(input);
    const athlete = extractAthleteName(input, athletes);

    const state: ChatSessionState = {
        intent,
        step: "INIT",
        athleteId: athlete.id,
        athleteName: athlete.name
    };

    // Process each intent directly (all creation forms have athlete search/selection built-in)
    return handleIntentNextStep(state, input);
}

export function handleIntentNextStep(state: ChatSessionState, input: string): { nextState: ChatSessionState; response: ChatBotResponse } {
    const athleteName = state.athleteName || "선수";

    switch (state.intent) {
        case "CREATE_LESSON": {
            // Check category in input
            const matchedCat = LESSON_CATEGORIES.find(c => input.includes(c.label.split(" ")[0]) || input.toLowerCase().includes(c.key));
            if (matchedCat) {
                state.lessonCategory = matchedCat.key;
                state.step = "AWAITING_LESSON_CONTENT";
                return {
                    nextState: state,
                    response: {
                        message: `${athleteName} 선수의 **${matchedCat.label}** 레슨 내용을 입력해주세요:`,
                        showInput: true,
                        inputPlaceholder: "레슨 지도 내용 입력 (예: 백스윙 탑에서 코킹 유지...)",
                        actionCard: "LESSON_FORM"
                    }
                };
            }

            // Ask for category
            state.step = "AWAITING_LESSON_CATEGORY";
            return {
                nextState: state,
                response: {
                    message: `${athleteName} 선수의 **레슨 작성**을 시작합니다. 파트를 선택해주세요:`,
                    options: LESSON_CATEGORIES.map(c => ({ label: c.label, value: c.key })),
                    showInput: true,
                    inputPlaceholder: "파트 입력 (예: 샷, 퍼팅)..."
                }
            };
        }

        case "CREATE_TRAINING": {
            const playerParam = athleteName !== "선수" ? `?player=${encodeURIComponent(athleteName)}` : "";
            const targetUrl = `/training/create${playerParam}`;
            state.targetUrl = targetUrl;
            state.targetTitle = athleteName !== "선수" ? `${athleteName} 훈련 작성` : "훈련 작성";
            const title = state.targetTitle;
            return {
                nextState: state,
                response: {
                    message: athleteName !== "선수"
                        ? `🏋️ **${athleteName}** 선수의 **훈련 작성** 화면으로 이동합니다.`
                        : `🏋️ **훈련 작성** 화면으로 이동합니다.`,
                    options: [
                        { label: `👉 ${title} 바로가기`, value: targetUrl, accent: true },
                        { label: "🏠 메인 메뉴", value: "처음으로" }
                    ],
                    actionCard: "NAVIGATE_CARD",
                    isCompleted: true
                }
            };
        }

        case "CREATE_PLAN": {
            const playerParam = athleteName !== "선수" ? `?player=${encodeURIComponent(athleteName)}` : "";
            const targetUrl = `/admin/training-plan/create${playerParam}`;
            state.targetUrl = targetUrl;
            state.targetTitle = athleteName !== "선수" ? `${athleteName} 훈련계획 작성` : "훈련계획 작성";
            const title = state.targetTitle;
            return {
                nextState: state,
                response: {
                    message: athleteName !== "선수"
                        ? `📋 **${athleteName}** 선수의 **훈련계획 작성** 화면으로 이동합니다.`
                        : `📋 **훈련계획 작성** 화면으로 이동합니다.`,
                    options: [
                        { label: `👉 ${title} 바로가기`, value: targetUrl, accent: true },
                        { label: "🏠 메인 메뉴", value: "처음으로" }
                    ],
                    actionCard: "NAVIGATE_CARD",
                    isCompleted: true
                }
            };
        }

        case "CREATE_JOURNAL": {
            const playerParam = athleteName !== "선수" ? `?player=${encodeURIComponent(athleteName)}` : "";
            const targetUrl = `/admin/training-journal/create${playerParam}`;
            state.targetUrl = targetUrl;
            state.targetTitle = athleteName !== "선수" ? `${athleteName} 훈련일지 작성` : "훈련일지 작성";
            const title = state.targetTitle;
            return {
                nextState: state,
                response: {
                    message: athleteName !== "선수"
                        ? `📔 **${athleteName}** 선수의 **훈련일지 작성** 화면으로 이동합니다.`
                        : `📔 **훈련일지 작성** 화면으로 이동합니다.`,
                    options: [
                        { label: `👉 ${title} 바로가기`, value: targetUrl, accent: true },
                        { label: "🏠 메인 메뉴", value: "처음으로" }
                    ],
                    actionCard: "NAVIGATE_CARD",
                    isCompleted: true
                }
            };
        }

        case "CREATE_CONSULTATION": {
            const playerParam = athleteName !== "선수" ? `?player=${encodeURIComponent(athleteName)}` : "";
            const targetUrl = `/consultations/create${playerParam}`;
            state.targetUrl = targetUrl;
            state.targetTitle = athleteName !== "선수" ? `${athleteName} 상담일지 작성` : "상담일지 작성";
            const title = state.targetTitle;
            return {
                nextState: state,
                response: {
                    message: athleteName !== "선수"
                        ? `💬 **${athleteName}** 선수의 **상담일지 작성** 화면으로 이동합니다.`
                        : `💬 **상담일지 작성** 화면으로 이동합니다.`,
                    options: [
                        { label: `👉 ${title} 바로가기`, value: targetUrl, accent: true },
                        { label: "🏠 메인 메뉴", value: "처음으로" }
                    ],
                    actionCard: "NAVIGATE_CARD",
                    isCompleted: true
                }
            };
        }

        case "CREATE_SCORE": {
            const playerParam = athleteName !== "선수" ? `?player=${encodeURIComponent(athleteName)}` : "";
            const targetUrl = `/scores/create${playerParam}`;
            state.targetUrl = targetUrl;
            state.targetTitle = athleteName !== "선수" ? `${athleteName} 스코어 입력` : "스코어카드 작성";
            const title = state.targetTitle;
            return {
                nextState: state,
                response: {
                    message: athleteName !== "선수"
                        ? `🚩 **${athleteName}** 선수의 **정식 스코어카드 작성** 화면으로 이동합니다.`
                        : `🚩 **정식 스코어카드 작성** 화면으로 이동합니다.`,
                    options: [
                        { label: `👉 ${title} 바로가기`, value: targetUrl, accent: true },
                        { label: "🏠 메인 메뉴", value: "처음으로" }
                    ],
                    actionCard: "NAVIGATE_CARD",
                    isCompleted: true
                }
            };
        }

        case "VIEW_LESSONS": {
            const athleteParam = athleteName !== "선수" ? `?athlete=${encodeURIComponent(athleteName)}` : "";
            const targetUrl = `/lessons${athleteParam}`;
            state.targetUrl = targetUrl;
            state.targetTitle = `${athleteName} 레슨 기록`;
            return {
                nextState: state,
                response: {
                    message: `🔍 **${athleteName}** 선수의 레슨 기록 및 피드를 조회합니다.`,
                    options: [
                        { label: `👉 ${athleteName} 레슨 목록 바로가기`, value: targetUrl, accent: true },
                        { label: "✏️ 새 레슨 작성하기", value: `${athleteName} 레슨 작성` }
                    ],
                    actionCard: "NAVIGATE_CARD",
                    isCompleted: true
                }
            };
        }

        case "VIEW_TRAININGS": {
            const targetUrl = `/training`;
            state.targetUrl = targetUrl;
            state.targetTitle = `${athleteName} 훈련 기록`;
            return {
                nextState: state,
                response: {
                    message: `🏋️ **${athleteName}** 선수의 훈련 현황 및 챌린지를 확인합니다.`,
                    options: [
                        { label: `👉 훈련 대시보드 바로가기`, value: targetUrl, accent: true },
                        { label: "➕ 새 훈련 등록하기", value: `${athleteName} 훈련 등록` }
                    ],
                    actionCard: "NAVIGATE_CARD",
                    isCompleted: true
                }
            };
        }

        case "VIEW_SCORES": {
            const targetUrl = `/scores`;
            state.targetUrl = targetUrl;
            state.targetTitle = `${athleteName} 스코어 기록`;
            return {
                nextState: state,
                response: {
                    message: `🚩 **${athleteName}** 선수의 라운드 스코어 및 통계를 확인합니다.`,
                    options: [
                        { label: `👉 스코어 기록실 바로가기`, value: targetUrl, accent: true },
                        { label: "⛳ 새 스코어카드 작성", value: `${athleteName} 스코어 작성` }
                    ],
                    actionCard: "NAVIGATE_CARD",
                    isCompleted: true
                }
            };
        }

        case "NAVIGATE": {
            // A. 대분류 카테고리(예: '시스템 관리')인 경우 -> 해당 하위 메뉴 단추들만 표시
            const matchedCat = findSystemCategory(input);
            if (matchedCat) {
                return {
                    nextState: state,
                    response: {
                        message: `📂 **${matchedCat.categoryName}** 메뉴입니다. 이동하실 항목을 선택해주세요:`,
                        options: matchedCat.subItems.map(item => ({
                            label: item.title,
                            value: item.href,
                            accent: false
                        })),
                        showInput: true
                    }
                };
            }

            // B. 특정 단일 세부 메뉴인 경우 -> 바로가기 카드 표시
            const matched = findSystemNavRoute(input);
            const targetUrl = matched ? matched.href : (state.targetUrl || "/");
            const targetTitle = matched ? matched.title : (state.targetTitle || "해당 메뉴");

            state.targetUrl = targetUrl;
            state.targetTitle = targetTitle;

            return {
                nextState: state,
                response: {
                    message: `**${targetTitle}** 화면으로 이동합니다.`,
                    options: [
                        { label: `👉 ${targetTitle} 열기`, value: targetUrl, accent: true }
                    ],
                    actionCard: "NAVIGATE_CARD",
                    isCompleted: true
                }
            };
        }

        default: {
            return {
                nextState: state,
                response: {
                    message: "코치님, 원하시는 작업이나 질문을 말씀해주세요.",
                    showInput: true,
                    inputPlaceholder: "예: 000 어프로치 레슨 작성, 000 훈련 등록, 시스템 관리..."
                }
            };
        }
    }
}
