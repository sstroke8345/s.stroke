"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
    ChatSessionState, 
    ChatBotResponse, 
    processInitialMessage, 
    handleIntentNextStep, 
    preloadAthletes,
    detectIntent,
    QuickOption,
    ChatUserTarget
} from "@/lib/chat-engine";
import { 
    LessonFormCard, 
    TrainingFormCard, 
    ConsultationFormCard, 
    PlanJournalFormCard, 
    ScoreHoleCard, 
    NavigateCard 
} from "./ChatActionCards";
import { CreateLessonContent } from "@/app/(main)/lessons/create/page";
import { 
    Send, 
    Mic, 
    MicOff, 
    Sparkles, 
    RefreshCw, 
    Bot, 
    User as UserIcon, 
    Loader2, 
    X, 
    ExternalLink, 
    Search, 
    BookOpen,
    ArrowDown,
    ArrowUp,
    ThumbsUp,
    ThumbsDown,
    Copy,
    Check,
    MoreHorizontal
} from "lucide-react";

import { 
    getSavedChatSessions, 
    getActiveChatSessionId, 
    setActiveChatSessionId, 
    saveChatSession 
} from "@/lib/chat-session-storage";

export interface ChatMessage {
    id: string;
    sender: "user" | "bot";
    text: string;
    options?: QuickOption[];
    actionCard?: string;
    timestamp: string;
    isStreaming?: boolean;
}

interface ChatFeedProps {
    coachName: string;
    coachId?: string;
    onHistoryUpdate?: (history: ChatMessage[]) => void;
}

// Gemini 인라인 토큰 파서 (URL, 출처 뱃지, 볼드체, 인라인 코드)
function parseInlineGeminiTokens(text: string): React.ReactNode[] {
    if (!text) return [];

    // URL, [출처 뱃지], **볼드**, `코드`
    const regex = /(https?:\/\/[^\s\)\],]+|\[[가-힣A-Za-z0-9\s\.\-]{2,24}\](?!\()|\*\*[^*]+\*\*|`[^`]+`)/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
        if (!part) return null;

        // 1. URL (클릭 가능한 웹사이트 링크)
        if (/^https?:\/\//.test(part)) {
            return (
                <a
                    key={index}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 font-semibold underline underline-offset-2 hover:text-blue-700 dark:hover:text-blue-300 inline-flex items-center gap-0.5 mx-0.5 break-all"
                >
                    {part}
                    <ExternalLink size={12} className="inline shrink-0 opacity-70" />
                </a>
            );
        }

        // 2. 출처/기관 뱃지 e.g. [한국대학골프연맹]
        if (/^\[[가-힣A-Za-z0-9\s\.\-]{2,24}\]$/.test(part)) {
            const badgeContent = part.slice(1, -1);
            return (
                <span
                    key={index}
                    className="inline-flex items-center px-2 py-0.5 mx-1 my-0.5 text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-full border border-zinc-200/80 dark:border-zinc-700 select-all align-middle shadow-xs"
                >
                    {badgeContent}
                </span>
            );
        }

        // 3. 볼드체 e.g. **공식 웹사이트**
        if (/^\*\*[^*]+\*\*$/.test(part)) {
            return (
                <strong key={index} className="font-bold text-zinc-900 dark:text-zinc-100">
                    {part.slice(2, -2)}
                </strong>
            );
        }

        // 4. 인라인 코드 e.g. `code`
        if (/^`[^`]+`$/.test(part)) {
            return (
                <code key={index} className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-brand-navy dark:text-blue-300 rounded text-xs font-mono">
                    {part.slice(1, -1)}
                </code>
            );
        }

        // 일반 텍스트
        return <span key={index}>{part}</span>;
    });
}

// Gemini 스타일 마크다운 블록 렌더러
function GeminiMarkdownRenderer({ text }: { text: string }) {
    if (!text) return null;
    const lines = text.split("\n");

    return (
        <div className="space-y-1.5 leading-relaxed">
            {lines.map((line, lIdx) => {
                const trimmed = line.trim();
                if (!trimmed) {
                    return <div key={lIdx} className="h-1.5" />;
                }

                // 글머리 기호(•, -, *, ㅇ, o, 1., 2.) 목록 감지
                const bulletMatch = trimmed.match(/^([•\-\*ㅇo]|\d+\.)\s+/);
                if (bulletMatch) {
                    const bulletSymbol = bulletMatch[1];
                    const contentAfterBullet = trimmed.slice(bulletMatch[0].length);
                    return (
                        <div key={lIdx} className="pl-1.5 flex items-start gap-1.5 my-0.5">
                            <span className="text-zinc-400 dark:text-zinc-500 font-semibold shrink-0 select-none">
                                {bulletSymbol === "ㅇ" || bulletSymbol === "o" ? "○" : bulletSymbol}
                            </span>
                            <div className="flex-1">
                                {parseInlineGeminiTokens(contentAfterBullet)}
                            </div>
                        </div>
                    );
                }

                return (
                    <div key={lIdx} className="my-0.5">
                        {parseInlineGeminiTokens(line)}
                    </div>
                );
            })}
        </div>
    );
}

function TypewriterText({ text }: { text: string }) {
    const [displayed, setDisplayed] = useState("");
    const fullTextRef = useRef(text);
    fullTextRef.current = text;

    useEffect(() => {
        let currentIdx = 0;
        setDisplayed("");

        // 한 번에 출력할 글자 수 (긴 글은 더 빠르게 4~6글자씩 부드럽게)
        const step = text.length > 300 ? 6 : (text.length > 100 ? 4 : 2);
        const timer = setInterval(() => {
            currentIdx += step;
            if (currentIdx >= fullTextRef.current.length) {
                setDisplayed(fullTextRef.current);
                clearInterval(timer);
            } else {
                setDisplayed(fullTextRef.current.slice(0, currentIdx));
            }
        }, 12);

        return () => clearInterval(timer);
    }, [text]);

    const isTyping = displayed.length < text.length;

    return (
        <div className="relative">
            <GeminiMarkdownRenderer text={displayed} />
            {isTyping && (
                <span className="inline-block w-1.5 h-3.5 bg-blue-500 ml-0.5 animate-pulse rounded-sm align-middle" />
            )}
        </div>
    );
}

// 한글 초성 추출 헬퍼 (초성 검색 지원)
function getChoseong(str: string): string {
    const CHOSUNG = [
        'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
    ];
    let result = '';
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i) - 44032;
        if (code >= 0 && code <= 11171) {
            result += CHOSUNG[Math.floor(code / 588)];
        } else {
            result += str.charAt(i);
        }
    }
    return result;
}

export function ChatFeed({ coachName, coachId, onHistoryUpdate }: ChatFeedProps) {
    const router = useRouter();
    const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
        return getActiveChatSessionId() || `session_${Date.now()}`;
    });
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState("");
    const [athletes, setAthletes] = useState<ChatUserTarget[]>([]);
    const [sessionState, setSessionState] = useState<ChatSessionState | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [placeholder, setPlaceholder] = useState("S.STROKE에게 질문하기...");
    const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
    const [modalAthlete, setModalAthlete] = useState<string>("");
    const [modalPart, setModalPart] = useState<string>("shot");

    // 대규모 선수 검색 모달 상태
    const [isAthleteSearchOpen, setIsAthleteSearchOpen] = useState(false);
    const [athleteSearchQuery, setAthleteSearchQuery] = useState("");

    // Gemini UI 인터랙션 (스크롤 하단 버튼 및 복사 피드백)
    const [showScrollBottom, setShowScrollBottom] = useState(false);
    const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const isNotBottom = scrollHeight - scrollTop - clientHeight > 60;
        setShowScrollBottom(isNotBottom);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        setShowScrollBottom(false);
    };

    const handleCopyText = (id: string, text: string) => {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
            navigator.clipboard.writeText(text);
            setCopiedMsgId(id);
            setTimeout(() => setCopiedMsgId(null), 2000);
        }
    };

    // 1. Initial greeting, load athletes, and listen for session changes
    useEffect(() => {
        preloadAthletes().then(list => setAthletes(list));

        const loadSession = (sid: string | null) => {
            if (!sid) {
                const newId = `session_${Date.now()}`;
                setCurrentSessionId(newId);
                setMessages([]);
                setSessionState(null);
                return;
            }
            const allSessions = getSavedChatSessions();
            const found = allSessions.find(s => s.id === sid);
            if (found && Array.isArray(found.messages)) {
                setCurrentSessionId(found.id);
                setMessages(found.messages);
            } else {
                setCurrentSessionId(sid);
                setMessages([]);
            }
            setSessionState(null);
        };

        const activeId = getActiveChatSessionId();
        if (activeId) {
            loadSession(activeId);
        } else {
            const savedLegacy = localStorage.getItem("s_stroke_chat_history");
            if (savedLegacy) {
                try {
                    const parsed = JSON.parse(savedLegacy);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        const newId = `session_${Date.now()}`;
                        saveChatSession(newId, parsed);
                        setCurrentSessionId(newId);
                        setMessages(parsed);
                        return;
                    }
                } catch (e) { }
            }
            setMessages([]);
        }

        const handleSessionEvent = (e: any) => {
            const targetId = e?.detail?.sessionId;
            loadSession(targetId);
        };

        window.addEventListener("s_stroke_chat_session_change", handleSessionEvent);
        return () => window.removeEventListener("s_stroke_chat_session_change", handleSessionEvent);
    }, [coachName]);

    const prevMessagesRef = useRef<ChatMessage[]>([]);

    // 2. Save history to LocalStorage & Session only when messages actually change
    useEffect(() => {
        if (messages.length > 0 && messages !== prevMessagesRef.current) {
            prevMessagesRef.current = messages;
            localStorage.setItem("s_stroke_chat_history", JSON.stringify(messages.slice(-30)));
            saveChatSession(currentSessionId, messages);
            if (onHistoryUpdate) onHistoryUpdate(messages);
        }
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, currentSessionId, onHistoryUpdate]);

    // 3. Web Speech Recognition Setup
    useEffect(() => {
        if (typeof window !== "undefined") {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const reco = new SpeechRecognition();
                reco.lang = "ko-KR";
                reco.continuous = false;
                reco.interimResults = false;

                reco.onresult = (e: any) => {
                    const transcript = e.results[0][0].transcript;
                    setInputText(transcript);
                    setIsListening(false);
                };
                reco.onerror = () => setIsListening(false);
                reco.onend = () => setIsListening(false);

                recognitionRef.current = reco;
            }
        }
    }, []);

    const toggleSpeech = () => {
        if (!recognitionRef.current) {
            alert("이 브라우저는 음성 인식을 지원하지 않습니다.");
            return;
        }
        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (e) {
                setIsListening(false);
            }
        }
    };

    // 4. Handle Send
    const handleSend = async (textToSend?: string) => {
        const text = (textToSend || inputText).trim();
        if (!text || isLoading) return;

        const userMsg: ChatMessage = {
            id: `usr_${Date.now()}`,
            sender: "user",
            text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        setInputText("");

        // Check if user input matches a specific system menu or ongoing task
        const freshIntent = detectIntent(text);
        const tClean = text.toLowerCase().replace(/\s+/g, "");
        const isScoreTrainingReq = (tClean.includes("스코어") || tClean.includes("성적") || tClean.includes("통계")) && 
            (tClean.includes("훈련") || tClean.includes("제안") || tClean.includes("추천") || tClean.includes("드릴") || tClean.includes("연습") || tClean.includes("보완"));
        const isOngoingSession = !isScoreTrainingReq && sessionState && sessionState.intent !== "UNKNOWN" && sessionState.step !== "INIT";
        const isSwitchingTask = freshIntent !== "UNKNOWN" && sessionState && freshIntent !== sessionState.intent;

        // If NOT an ongoing form/step AND the intent is UNKNOWN (general question / conversational request)
        if (!isOngoingSession && freshIntent === "UNKNOWN") {
            setIsLoading(true);
            const botMsgId = `bot_${Date.now()}`;
            // 🚀 즉시 봇 말풍선을 생성하여 Gemini 실시간 스트리밍 대기 모드로 진입
            setMessages(prev => [...prev, {
                id: botMsgId,
                sender: "bot",
                text: "",
                isStreaming: true,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);

            try {
                const res = await fetch("/api/chat-assistant", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message: text,
                        athletes,
                        stream: true,
                        previousContext: sessionState ? { intent: sessionState.intent, athleteName: sessionState.athleteName } : null
                    })
                });

                if (res.ok && res.body) {
                    const reader = res.body.getReader();
                    const decoder = new TextDecoder();
                    let sseBuffer = "";
                    let accumulatedText = "";
                    let aiResult: any = null;

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        sseBuffer += decoder.decode(value, { stream: true });
                        const lines = sseBuffer.split("\n");
                        sseBuffer = lines.pop() || "";

                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (!trimmed.startsWith("data: ")) continue;
                            try {
                                const data = JSON.parse(trimmed.slice(6));
                                if (data.type === "chunk" && data.text) {
                                    accumulatedText += data.text;
                                    setMessages(prev => prev.map(m => m.id === botMsgId ? {
                                        ...m,
                                        text: accumulatedText,
                                        isStreaming: true
                                    } : m));
                                } else if (data.type === "done") {
                                    aiResult = data.result;
                                }
                            } catch (e) {}
                        }
                    }

                    if (aiResult) {
                        const finalReply = aiResult.replyMessage || accumulatedText || "답변을 생성하지 못했습니다.";

                        // 1. 날씨 정보(WEATHER_INFO), 일반 질문(GENERAL_CHAT), 스코어 기반 훈련 추천(RECOMMEND_TRAINING_FROM_SCORE) - 실시간 스트리밍 완료 후 확정
                        if (aiResult.intent === "WEATHER_INFO" || aiResult.intent === "GENERAL_CHAT" || aiResult.intent === "RECOMMEND_TRAINING_FROM_SCORE") {
                            setMessages(prev => prev.map(m => m.id === botMsgId ? {
                                ...m,
                                text: finalReply,
                                options: aiResult.options || undefined,
                                isStreaming: false
                            } : m));
                            if (aiResult.athleteName) {
                                setSessionState(prev => prev ? { ...prev, athleteName: aiResult.athleteName } : { intent: "UNKNOWN", step: "INIT", athleteName: aiResult.athleteName });
                            }
                            setIsLoading(false);
                            return;
                        }

                        // 2. 화면 이동 및 메뉴 조회 인텐트인 경우 (VIEW_LESSONS, VIEW_TRAININGS, VIEW_SCORES, NAVIGATE)
                        const isNavigationOrView = ["NAVIGATE", "VIEW_LESSONS", "VIEW_TRAININGS", "VIEW_SCORES"].includes(aiResult.intent);
                        if (isNavigationOrView) {
                            const newInit = processInitialMessage(text, athletes);
                            const athleteName = aiResult.athleteName || newInit.nextState.athleteName || "";
                            let finalUrl = aiResult.targetUrl || newInit.nextState.targetUrl || "/";
                            let finalTitle = aiResult.title || newInit.nextState.targetTitle || "해당 메뉴";

                            if (aiResult.intent === "VIEW_LESSONS") {
                                finalUrl = athleteName ? `/lessons?athlete=${encodeURIComponent(athleteName)}` : "/lessons";
                                finalTitle = athleteName ? `${athleteName} 선수 레슨 내역` : "레슨 목록";
                            } else if (aiResult.intent === "VIEW_TRAININGS") {
                                finalUrl = athleteName ? `/training?athlete=${encodeURIComponent(athleteName)}` : "/training";
                                finalTitle = athleteName ? `${athleteName} 선수 훈련 내역` : "훈련 목록";
                            } else if (aiResult.intent === "VIEW_SCORES") {
                                finalUrl = athleteName ? `/scores?athlete=${encodeURIComponent(athleteName)}` : "/scores";
                                finalTitle = athleteName ? `${athleteName} 선수 스코어 내역` : "스코어 현황";
                            }

                            const navState: ChatSessionState = {
                                intent: "NAVIGATE",
                                step: "NAVIGATE",
                                targetUrl: finalUrl,
                                targetTitle: finalTitle,
                                athleteName: athleteName || undefined
                            };
                            setSessionState(navState);

                            setMessages(prev => prev.map(m => m.id === botMsgId ? {
                                ...m,
                                text: finalReply,
                                isStreaming: false,
                                actionCard: "NAVIGATE_CARD",
                                options: [
                                    { label: `👉 ${finalTitle} 바로 열기`, value: finalUrl, accent: true },
                                    { label: "🏠 홈 화면", value: "/" }
                                ]
                            } : m));
                            setIsLoading(false);

                            // 🚀 메뉴로 자동 진입 (화면 깜빡임 없이 매끄럽게 페이지 이동)
                            setTimeout(() => {
                                router.push(finalUrl);
                            }, 600);
                            return;
                        }

                        // 3. 시스템 작성 인텐트인 경우 (CREATE_LESSON, CREATE_TRAINING 등)
                        if (aiResult.intent && aiResult.intent !== "UNKNOWN") {
                            const newInit = processInitialMessage(text, athletes);
                            if (aiResult.category) newInit.nextState.lessonCategory = aiResult.category;
                            if (aiResult.content) {
                                newInit.nextState.lessonContent = aiResult.content;
                                newInit.nextState.trainingComment = aiResult.content;
                            }
                            if (aiResult.athleteName && !newInit.nextState.athleteName) {
                                newInit.nextState.athleteName = aiResult.athleteName;
                                const matched = athletes.find(a => a.name === aiResult.athleteName);
                                if (matched) newInit.nextState.athleteId = matched.id;
                            }
                            setSessionState(newInit.nextState);
                            
                            if (aiResult.intent === "CREATE_LESSON") {
                                setModalAthlete(newInit.nextState.athleteName || "");
                                setModalPart(newInit.nextState.lessonCategory || "shot");
                                setIsLessonModalOpen(true);
                            } else if (newInit.nextState.targetUrl && ["CREATE_SCORE", "CREATE_TRAINING", "CREATE_PLAN", "CREATE_JOURNAL", "CREATE_CONSULTATION"].includes(aiResult.intent)) {
                                setTimeout(() => {
                                    router.push(newInit.nextState.targetUrl!);
                                }, 600);
                            }

                            setMessages(prev => prev.map(m => m.id === botMsgId ? {
                                ...m,
                                text: finalReply,
                                isStreaming: false,
                                actionCard: newInit.response.actionCard,
                                options: newInit.response.options
                            } : m));
                            setIsLoading(false);
                            return;
                        }
                    } else if (accumulatedText) {
                        setMessages(prev => prev.map(m => m.id === botMsgId ? {
                            ...m,
                            text: accumulatedText,
                            isStreaming: false
                        } : m));
                        setIsLoading(false);
                        return;
                    }
                }
            } catch (err) {
                console.error("Chat assistant API call failed, falling back to local engine:", err);
                setMessages(prev => prev.filter(m => m.id !== botMsgId));
            } finally {
                setIsLoading(false);
            }
        }

        // Process message through Zero-Token Rule Engine
        let result: { nextState: ChatSessionState; response: ChatBotResponse };

        if (!sessionState || sessionState.intent === "UNKNOWN" || sessionState.step === "INIT" || isSwitchingTask) {
            result = processInitialMessage(text, athletes);
        } else {
            const next = { ...sessionState };
            if (next.step === "AWAITING_ATHLETE") {
                const found = athletes.find(a => text.includes(a.name));
                next.athleteName = found ? found.name : text;
                next.athleteId = found?.id;
                result = handleIntentNextStep(next, text);
            } else {
                result = handleIntentNextStep(next, text);
            }
        }

        setSessionState(result.nextState);
        if (result.response.inputPlaceholder) {
            setPlaceholder(result.response.inputPlaceholder);
        }

        // Direct Auto-Open of the Authentic Lesson Modal if CREATE_LESSON
        if (result.nextState.intent === "CREATE_LESSON" || result.response.actionCard === "LESSON_FORM") {
            setModalAthlete(result.nextState.athleteName || "");
            setModalPart(result.nextState.lessonCategory || "shot");
            setIsLessonModalOpen(true);
        }

        // Auto-navigate for VIEW / NAVIGATE / CREATE intents
        if (result.nextState.targetUrl && (
            result.nextState.intent === "NAVIGATE" || 
            result.nextState.intent === "VIEW_LESSONS" || 
            result.nextState.intent === "VIEW_TRAININGS" || 
            result.nextState.intent === "VIEW_SCORES" ||
            result.nextState.intent === "CREATE_SCORE" ||
            result.nextState.intent === "CREATE_TRAINING" ||
            result.nextState.intent === "CREATE_PLAN" ||
            result.nextState.intent === "CREATE_JOURNAL" ||
            result.nextState.intent === "CREATE_CONSULTATION"
        )) {
            setTimeout(() => {
                router.push(result.nextState.targetUrl!);
            }, 600);
        }

        // Add Bot Response
        setTimeout(() => {
            const botMsg: ChatMessage = {
                id: `bot_${Date.now()}`,
                sender: "bot",
                text: result.response.message,
                options: result.response.options,
                actionCard: result.response.actionCard,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, botMsg]);
        }, 200);
    };

    // 실시간 이름 및 초성 필터링 (100명, 1000명 중 초고속 탐색)
    const filteredAthletes = athletes.filter(a => {
        const q = athleteSearchQuery.trim().toLowerCase();
        if (!q) return true;
        const nameLower = a.name.toLowerCase();
        if (nameLower.includes(q)) return true;
        const chosung = getChoseong(a.name);
        return chosung.includes(q);
    });

    const handleOptionClick = (opt: QuickOption) => {
        if (opt.value === "__RESET_CHAT__") {
            handleResetChat();
            return;
        }
        if (opt.value === "__SEARCH_ATHLETE__") {
            setAthleteSearchQuery("");
            setIsAthleteSearchOpen(true);
            return;
        }
        if (opt.value.startsWith("/")) {
            router.push(opt.value);
            return;
        }
        handleSend(opt.value);
    };

    const handleCardCompleted = (summaryText: string) => {
        const completeMsg: ChatMessage = {
            id: `bot_comp_${Date.now()}`,
            sender: "bot",
            text: summaryText,
            options: [
                { label: "✏️ 다른 레슨 작성", value: "레슨 작성" },
                { label: "🏋️ 이어서 훈련 등록", value: "훈련 작성" },
                { label: "✨ 새 대화로 시작 (화면 비우기)", value: "__RESET_CHAT__", accent: true }
            ],
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, completeMsg]);
        setSessionState(null);
        setPlaceholder("S.STROKE에게 질문하기...");
    };

    const handleResetChat = () => {
        const newId = `session_${Date.now()}`;
        setCurrentSessionId(newId);
        setActiveChatSessionId(null);
        localStorage.removeItem("s_stroke_chat_history");
        setSessionState(null);
        setMessages([]);
    };

    const isHistoryEmpty = messages.length === 0 || (messages.length === 1 && messages[0].id === "msg_welcome");

    return (
        <div className="flex flex-col h-[calc(100dvh-64px)] md:h-screen w-full max-w-2xl mx-auto px-3 sm:px-4 relative overflow-hidden">
            {/* Top Bar for Active Chat (새 대화 버튼) */}
            {!isHistoryEmpty && (
                <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/80 mb-2">
                    <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                        <Sparkles size={13} className="text-blue-500" />
                        진행 중인 코칭 대화
                    </span>
                    <button
                        onClick={handleResetChat}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-brand-navy hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        title="대화 내용을 비우고 처음 홈으로 돌아갑니다"
                    >
                        <RefreshCw size={12} />
                        <span>새 대화</span>
                    </button>
                </div>
            )}

            {/* Chat Messages / Centered Empty State */}
            <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className={`flex-1 space-y-6 pt-2 px-1 scroll-smooth scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
                    isHistoryEmpty 
                        ? "overflow-hidden flex flex-col justify-center items-center my-auto" 
                        : "overflow-y-auto pb-36"
                }`}
            >
                {isHistoryEmpty ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-2 select-none my-auto py-4 sm:py-8 max-w-xl mx-auto">
                        {/* Gemini Aura Background Light & Glowing Icon */}
                        <div className="relative mb-5">
                            <div className="absolute -inset-4 bg-gradient-to-tr from-blue-500/20 via-indigo-500/20 to-rose-500/20 blur-2xl rounded-full" />
                            <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-[2rem] bg-gradient-to-tr from-blue-600 via-indigo-500 to-rose-400 shadow-2xl shadow-indigo-500/30 ring-4 ring-white/60 dark:ring-zinc-900/60">
                                <Sparkles size={36} className="text-white animate-pulse" />
                            </div>
                        </div>

                        {/* Title with Gradient Text */}
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-5 text-zinc-900 dark:text-zinc-50">
                            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-500 bg-clip-text text-transparent">
                                {coachName || "코치"}님
                            </span>
                            , 무엇을 시작할까요?
                        </h1>

                        {/* Secondary Quick Micro Chips */}
                        <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                            <span className="text-xs font-semibold text-zinc-400 mr-1">빠른 실행:</span>
                            {[
                                { label: "🔍 최근 레슨 조회", prompt: "최근 레슨 조회" },
                                { label: "⛳ 스코어 작성", prompt: "스코어 작성" },
                            ].map((chip, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSend(chip.prompt)}
                                    className="px-3.5 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 text-xs sm:text-sm font-medium transition-colors shadow-xs"
                                >
                                    {chip.label}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isLatestBotMsg = msg.sender === "bot" && idx === messages.length - 1;
                        
                        // ── 1. USER MESSAGE (제미나이 스타일 우측 둥근 말풍선) ──
                        if (msg.sender === "user") {
                            return (
                                <div key={msg.id} className="flex flex-col items-end ml-auto max-w-[85%] sm:max-w-[75%] space-y-1.5">
                                    <div className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-4 py-3 sm:px-5 sm:py-3.5 rounded-[1.5rem] text-[15px] sm:text-base leading-relaxed whitespace-pre-wrap select-text shadow-xs">
                                        {msg.text}
                                    </div>
                                    <div className="flex items-center gap-2 px-2 text-[11px] text-zinc-400">
                                        <span>{msg.timestamp}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopyText(msg.id, msg.text)}
                                            className="hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-0.5"
                                            title="텍스트 복사"
                                        >
                                            {copiedMsgId === msg.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                        </button>
                                    </div>
                                </div>
                            );
                        }

                        // ── 2. BOT / GEMINI RESPONSE (말풍선 없이 깔끔한 와이드 문서형 + 실시간 스트리밍) ──
                        return (
                            <div key={msg.id} className="w-full mr-auto space-y-3 py-1.5 text-zinc-900 dark:text-zinc-100">
                                <div className="text-[15px] sm:text-base leading-relaxed select-text">
                                    {msg.isStreaming ? (
                                        <div>
                                            {msg.text ? (
                                                <>
                                                    <GeminiMarkdownRenderer text={msg.text} />
                                                    <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse rounded-xs align-middle" />
                                                </>
                                            ) : (
                                                <div className="flex items-center gap-2.5 text-sm sm:text-base text-zinc-500 dark:text-zinc-400 py-1">
                                                    <Sparkles size={17} className="text-blue-500 animate-spin" />
                                                    <span className="animate-pulse">답변을 생성하고 있습니다...</span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <GeminiMarkdownRenderer text={msg.text} />
                                    )}
                                </div>

                                {/* Gemini-Style Subtle Action Bar (👍, 👎, 📋, ⋯) - 스트리밍 완료 후 노출 */}
                                {!msg.isStreaming && msg.text && (
                                    <div className="flex items-center gap-1.5 pt-1 text-zinc-400">
                                        <button 
                                            type="button" 
                                            className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                                            title="좋은 답변"
                                        >
                                            <ThumbsUp size={15} />
                                        </button>
                                        <button 
                                            type="button" 
                                            className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                                            title="아쉬운 답변"
                                        >
                                            <ThumbsDown size={15} />
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => handleCopyText(msg.id, msg.text)}
                                            className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors flex items-center gap-1"
                                            title="답변 복사"
                                        >
                                            {copiedMsgId === msg.id ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                                        </button>
                                        <button 
                                            type="button" 
                                            className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                                            title="더보기"
                                        >
                                            <MoreHorizontal size={15} />
                                        </button>
                                        <span className="text-[11px] text-zinc-400 ml-2">{msg.timestamp}</span>
                                    </div>
                                )}

                                {/* Quick Choice Chips */}
                                {!msg.actionCard && msg.options && msg.options.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-1.5">
                                        {msg.options.map((opt, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleOptionClick(opt)}
                                                className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all shadow-xs ${
                                                    opt.accent
                                                        ? "bg-brand-navy text-white hover:bg-brand-navy-dark shadow-brand-navy/10 scale-[1.02]"
                                                        : "bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-brand-navy/40 hover:bg-zinc-50"
                                                }`}
                                            >
                                                {opt.label}
                                                {opt.subtext && <span className="block text-[11px] opacity-60 font-normal">{opt.subtext}</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Dedicated Action Cards (Modal/Forms) */}
                                {msg.actionCard === "LESSON_FORM" && sessionState && (
                                    <div className="w-full">
                                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                                                    <BookOpen size={16} className="text-brand-navy dark:text-brand-navy-light shrink-0" />
                                                    {sessionState.athleteName ? `${sessionState.athleteName} 선수 레슨 작성` : "레슨 작성"}
                                                </h4>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setModalAthlete(sessionState.athleteName || "");
                                                    setModalPart(sessionState.lessonCategory || "shot");
                                                    setIsLessonModalOpen(true);
                                                }}
                                                className="w-full py-2.5 bg-brand-red hover:bg-brand-red-dark text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 active:scale-[0.98]"
                                            >
                                                <span>📋 레슨 작성 열기</span>
                                                <ExternalLink size={15} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {msg.actionCard === "TRAINING_FORM" && sessionState && (
                                    <TrainingFormCard
                                        session={sessionState}
                                        coachName={coachName}
                                        coachId={coachId}
                                        onCompleted={handleCardCompleted}
                                    />
                                )}
                                {msg.actionCard === "PLAN_FORM" && sessionState && (
                                    <PlanJournalFormCard
                                        session={sessionState}
                                        coachName={coachName}
                                        coachId={coachId}
                                        isPlan={true}
                                        onCompleted={handleCardCompleted}
                                    />
                                )}
                                {msg.actionCard === "JOURNAL_FORM" && sessionState && (
                                    <PlanJournalFormCard
                                        session={sessionState}
                                        coachName={coachName}
                                        coachId={coachId}
                                        isPlan={false}
                                        onCompleted={handleCardCompleted}
                                    />
                                )}
                                {msg.actionCard === "CONSULTATION_FORM" && sessionState && (
                                    <ConsultationFormCard
                                        session={sessionState}
                                        coachName={coachName}
                                        coachId={coachId}
                                        onCompleted={handleCardCompleted}
                                    />
                                )}
                                {msg.actionCard === "SCORE_HOLE_CARD" && sessionState && (
                                    <ScoreHoleCard session={sessionState} />
                                )}
                                {msg.actionCard === "NAVIGATE_CARD" && sessionState && (
                                    <NavigateCard session={sessionState} />
                                )}
                            </div>
                        );
                    })
                )}

                {/* AI Thinking / Loading State (스트리밍 버블이 없을 때만 별도 표시) */}
                {isLoading && !messages.some(m => m.isStreaming) && (
                    <div className="w-full mr-auto py-2 flex items-center gap-2.5 text-sm sm:text-base text-zinc-500 dark:text-zinc-400">
                        <Sparkles size={17} className="text-blue-500 animate-spin" />
                        <span className="animate-pulse">답변을 생성하고 있습니다...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Scroll to Bottom Floating Action Button (Gemini Style) */}
            {showScrollBottom && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 animate-bounce">
                    <button
                        type="button"
                        onClick={scrollToBottom}
                        className="w-9 h-9 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-lg flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all hover:scale-105 active:scale-95"
                        title="최신 내용 보기"
                    >
                        <ArrowDown size={16} />
                    </button>
                </div>
            )}

            {/* Gemini-Style Bottom Gradient Fade Mask (텍스트가 입력창 뒤로 스크롤될 때 부드럽게 페이드아웃) */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-zinc-50 via-zinc-50/90 to-transparent dark:from-zinc-950 dark:via-zinc-950/90 dark:to-transparent z-10" />

            {/* Floating Gemini-Style Capsule Pill Input Bar */}
            <div className="absolute bottom-3 sm:bottom-5 inset-x-3 sm:inset-x-6 max-w-xl mx-auto z-20">
                <form
                    onSubmit={e => { e.preventDefault(); handleSend(); }}
                    className="flex items-center gap-1.5 sm:gap-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full border border-zinc-200/90 dark:border-zinc-800 shadow-xl shadow-zinc-300/40 dark:shadow-black/60 focus-within:ring-2 focus-within:ring-blue-500/30 transition-all"
                >
                    <button
                        type="button"
                        onClick={handleResetChat}
                        className="w-8 h-8 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
                        title="새 대화 시작"
                    >
                        <RefreshCw size={15} />
                    </button>

                    <input
                        type="text"
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        placeholder={isListening ? "듣고 있습니다..." : placeholder || "S.STROKE에게 질문하기..."}
                        className="flex-1 min-w-0 bg-transparent text-[15px] sm:text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none px-1.5"
                    />

                    <button
                        type="button"
                        onClick={toggleSpeech}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${
                            isListening 
                                ? "bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30" 
                                : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                        title={isListening ? "음성 인식 중지" : "음성으로 말하기"}
                    >
                        {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>

                    <button
                        type="submit"
                        disabled={!inputText.trim()}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${
                            inputText.trim()
                                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm hover:scale-105 active:scale-95"
                                : "bg-zinc-100 text-zinc-300 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed"
                        }`}
                        title="전송 (Enter)"
                    >
                        <ArrowUp size={16} strokeWidth={2.5} />
                    </button>
                </form>
            </div>

            {/* ── Official GLA Lesson Full Popup Modal (이전 레슨 작성 페이지 그대로 팝업) ── */}
            {isLessonModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
                    <div className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-zinc-950 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-y-auto my-auto">
                        <CreateLessonContent
                            isModal={true}
                            initialPlayer={modalAthlete}
                            initialPart={modalPart}
                            onClose={() => {
                                setIsLessonModalOpen(false);
                                handleCardCompleted(`✅ **${modalAthlete || "선수"}** 선수의 **레슨** 작성이 완료되었습니다!`);
                            }}
                        />
                    </div>
                </div>
            )}

            {/* ── Athlete Search Modal (대규모 선수 대비 초성/이름 실시간 검색 팝업) ── */}
            {isAthleteSearchOpen && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
                    onClick={() => setIsAthleteSearchOpen(false)}
                >
                    <div 
                        className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
                            <div className="flex items-center gap-2">
                                <Search size={18} className="text-brand-navy dark:text-brand-navy-light" />
                                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                    대상 선택 (선수/코치/관리자) <span className="text-xs font-normal text-zinc-400">({athletes.length}명)</span>
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsAthleteSearchOpen(false)}
                                className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
                            <div className="relative">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                                <input
                                    type="text"
                                    autoFocus
                                    value={athleteSearchQuery}
                                    onChange={(e) => setAthleteSearchQuery(e.target.value)}
                                    placeholder="이름 또는 초성 검색 (예: hwang, 슈퍼, 황)"
                                    className="w-full pl-9 pr-14 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
                                />
                                {athleteSearchQuery && (
                                    <button
                                        onClick={() => setAthleteSearchQuery("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 font-medium"
                                    >
                                        지우기
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Athlete List (Scrollable) */}
                        <div className="max-h-72 overflow-y-auto p-2 space-y-1">
                            {filteredAthletes.length === 0 ? (
                                <p className="text-center py-8 text-xs text-zinc-400">
                                    일치하는 사용자가 없습니다.
                                </p>
                            ) : (
                                filteredAthletes.map((a) => (
                                    <button
                                        key={a.id}
                                        type="button"
                                        onClick={() => {
                                            setIsAthleteSearchOpen(false);
                                            handleSend(a.name);
                                        }}
                                        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-left hover:bg-brand-navy/10 hover:text-brand-navy dark:hover:bg-brand-navy/20 dark:hover:text-white transition-colors group"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 group-hover:bg-brand-navy group-hover:text-white flex items-center justify-center text-xs font-bold transition-colors">
                                                {a.name.slice(0, 1)}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-brand-navy dark:group-hover:text-white">
                                                    {a.name}
                                                </span>
                                                {a.role && (
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                                                        a.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' :
                                                        a.role === 'coach' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' :
                                                        'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                                                    }`}>
                                                        {a.role === 'admin' ? '관리자' : a.role === 'coach' ? '코치' : '선수'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-[11px] text-zinc-400 font-medium">선택</span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
