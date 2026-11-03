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
    QuickOption 
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
import { Send, Mic, MicOff, Sparkles, RefreshCw, Bot, User as UserIcon, Loader2, X, ExternalLink, Search, BookOpen } from "lucide-react";

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
}

interface ChatFeedProps {
    coachName: string;
    coachId?: string;
    onHistoryUpdate?: (history: ChatMessage[]) => void;
}

function TypewriterText({ text }: { text: string }) {
    const [displayed, setDisplayed] = useState("");
    const fullTextRef = useRef(text);
    fullTextRef.current = text;

    useEffect(() => {
        let currentIdx = 0;
        setDisplayed("");

        // 한 번에 출력할 글자 수 (긴 글은 더 빠르게 4~6글자씩 부드럽게)
        const step = text.length > 300 ? 5 : (text.length > 100 ? 3 : 2);
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

    return (
        <span>
            {displayed}
            {displayed.length < text.length && (
                <span className="inline-block w-1.5 h-3.5 bg-blue-500 ml-0.5 animate-pulse rounded-sm align-middle" />
            )}
        </span>
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
    const [athletes, setAthletes] = useState<{ id: string; name: string }[]>([]);
    const [sessionState, setSessionState] = useState<ChatSessionState | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [placeholder, setPlaceholder] = useState("예: 황정욱 어프로치 레슨 작성, 김민수 훈련 등록...");
    const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
    const [modalAthlete, setModalAthlete] = useState<string>("");
    const [modalPart, setModalPart] = useState<string>("shot");

    // 대규모 선수 검색 모달 상태
    const [isAthleteSearchOpen, setIsAthleteSearchOpen] = useState(false);
    const [athleteSearchQuery, setAthleteSearchQuery] = useState("");

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

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
        const isOngoingSession = sessionState && sessionState.intent !== "UNKNOWN" && sessionState.step !== "INIT";
        const isSwitchingTask = freshIntent !== "UNKNOWN" && sessionState && freshIntent !== sessionState.intent;

        // If NOT an ongoing form/step AND the intent is UNKNOWN (general question / conversational request)
        if (!isOngoingSession && freshIntent === "UNKNOWN") {
            setIsLoading(true);
            try {
                const res = await fetch("/api/chat-assistant", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message: text,
                        athletes,
                        previousContext: sessionState ? { intent: sessionState.intent, athleteName: sessionState.athleteName } : null
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    const aiResult = data?.result;

                    if (aiResult) {
                        // 1. 날씨 정보(WEATHER_INFO) 또는 일반 질문/지식 답변(GENERAL_CHAT) - 단추 없이 깔끔한 답변 텍스트만 출력
                        if (aiResult.intent === "WEATHER_INFO" || aiResult.intent === "GENERAL_CHAT") {
                            const botMsg: ChatMessage = {
                                id: `bot_${Date.now()}`,
                                sender: "bot",
                                text: aiResult.replyMessage || "답변을 생성하지 못했습니다.",
                                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            };
                            setMessages(prev => [...prev, botMsg]);
                            setIsLoading(false);
                            return;
                        }

                        // 2. 메뉴 이동 인텐트인 경우 (NAVIGATE)
                        if (aiResult.intent === "NAVIGATE") {
                            const newInit = processInitialMessage(text, athletes);
                            const finalUrl = aiResult.targetUrl || newInit.nextState.targetUrl || "/";
                            const finalTitle = aiResult.title || newInit.nextState.targetTitle || "해당 메뉴";
                            const navState: ChatSessionState = {
                                intent: "NAVIGATE",
                                step: "NAVIGATE",
                                targetUrl: finalUrl,
                                targetTitle: finalTitle
                            };
                            setSessionState(navState);
                            const botMsg: ChatMessage = {
                                id: `bot_${Date.now()}`,
                                sender: "bot",
                                text: aiResult.replyMessage || `**${finalTitle}** 화면으로 이동합니다.`,
                                actionCard: "NAVIGATE_CARD",
                                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            };
                            setMessages(prev => [...prev, botMsg]);
                            setIsLoading(false);
                            return;
                        }

                        // 3. 시스템 작성 인텐트인 경우 (CREATE_LESSON, CREATE_TRAINING 등)
                        if (aiResult.intent && aiResult.intent !== "UNKNOWN") {
                            const newInit = processInitialMessage(text, athletes);
                            // Merge extracted fields from AI if available
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
                            }

                            const botMsg: ChatMessage = {
                                id: `bot_${Date.now()}`,
                                sender: "bot",
                                text: aiResult.replyMessage || newInit.response.message,
                                actionCard: newInit.response.actionCard,
                                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            };
                            setMessages(prev => [...prev, botMsg]);
                            setIsLoading(false);
                            return;
                        }
                    }
                }
            } catch (err) {
                console.error("Chat assistant API call failed, falling back to local engine:", err);
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
        setPlaceholder("예: 황정욱 어프로치 레슨 작성, 김민수 훈련 등록...");
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
        <div className="flex flex-col h-[calc(100vh-64px)] w-full max-w-2xl mx-auto px-4 relative">
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
            <div className="flex-1 overflow-y-auto space-y-4 pb-28 pt-1">
                {isHistoryEmpty ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-2 select-none my-auto py-6 sm:py-10 max-w-xl mx-auto">
                        {/* Gemini Aura Background Light & Glowing Icon */}
                        <div className="relative mb-5">
                            <div className="absolute -inset-4 bg-gradient-to-tr from-blue-500/20 via-indigo-500/20 to-rose-500/20 blur-2xl rounded-full" />
                            <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-[2rem] bg-gradient-to-tr from-blue-600 via-indigo-500 to-rose-400 shadow-2xl shadow-indigo-500/30 ring-4 ring-white/60 dark:ring-zinc-900/60">
                                <Sparkles size={36} className="text-white animate-pulse" />
                            </div>
                        </div>

                        {/* Title with Gradient Text */}
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-6 text-zinc-900 dark:text-zinc-50">
                            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-500 bg-clip-text text-transparent">
                                {coachName || "코치"}님
                            </span>
                            , 무엇을 작성할까요?
                        </h1>



                        {/* Secondary Quick Micro Chips */}
                        <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                            <span className="text-[11px] font-semibold text-zinc-400 mr-1">빠른 실행:</span>
                            {[
                                { label: "🔍 최근 레슨 조회", prompt: "최근 레슨 조회" },
                                { label: "⛳ 스코어 작성", prompt: "스코어 작성" },
                            ].map((chip, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSend(chip.prompt)}
                                    className="px-2.5 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 text-[11px] font-medium transition-colors"
                                >
                                    {chip.label}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isLatestBotMsg = msg.sender === "bot" && idx === messages.length - 1;
                        return (
                            <div
                                key={msg.id}
                                className={`flex gap-2.5 max-w-[92%] sm:max-w-[85%] ${
                                    msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                                }`}
                            >
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs shadow-sm ${
                                    msg.sender === "user" 
                                        ? "bg-brand-navy text-white" 
                                        : "bg-gradient-to-tr from-blue-600 to-indigo-500 text-white"
                                }`}>
                                    {msg.sender === "user" ? <UserIcon size={14} /> : <Sparkles size={14} />}
                                </div>

                                <div className="space-y-2">
                                    <div className={`p-4 rounded-3xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                                        msg.sender === "user"
                                            ? "bg-brand-navy text-white rounded-tr-none"
                                            : "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-100 dark:border-zinc-800 rounded-tl-none"
                                    }`}>
                                        {msg.sender === "bot" && isLatestBotMsg ? (
                                            <TypewriterText text={msg.text} />
                                        ) : (
                                            msg.text
                                        )}
                                    </div>

                                {/* Hide quick chips if an action card is active to avoid UI duplication */}
                                {!msg.actionCard && msg.options && msg.options.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {msg.options.map((opt, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleOptionClick(opt)}
                                                className={`px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all shadow-sm ${
                                                    opt.accent
                                                        ? "bg-brand-navy text-white hover:bg-brand-navy-dark shadow-brand-navy/10 scale-[1.02]"
                                                        : "bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-brand-navy/40 hover:bg-zinc-50"
                                                }`}
                                            >
                                                {opt.label}
                                                {opt.subtext && <span className="block text-[10px] opacity-60 font-normal">{opt.subtext}</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {msg.actionCard === "LESSON_FORM" && sessionState && (
                                    <div className="w-full">
                                        {/* Direct launcher for Official Lesson Modal */}
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

                                <span className="block text-[10px] text-zinc-400 px-1">
                                    {msg.timestamp}
                                </span>
                            </div>
                        </div>
                    );
                    })
                )}

                {/* AI Thinking / Loading Bubble */}
                {isLoading && (
                    <div className="flex gap-2.5 max-w-[85%] mr-auto items-center">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs shadow-sm bg-gradient-to-tr from-blue-600 to-indigo-500 text-white animate-spin">
                            <Sparkles size={14} />
                        </div>
                        <div className="p-3.5 rounded-3xl rounded-tl-none bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2 shadow-sm">
                            <Loader2 size={13} className="animate-spin text-blue-500" />
                            <span>답변을 생성하고 있습니다...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Gemini-Style Bottom Gradient Fade Mask (텍스트가 입력창 뒤로 스크롤될 때 부드럽게 페이드아웃) */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-zinc-50 via-zinc-50/90 to-transparent dark:from-zinc-950 dark:via-zinc-950/90 dark:to-transparent z-10" />

            {/* Floating Gemini-Style Capsule Pill Input Bar */}
            <div className="absolute bottom-4 left-3 right-3 sm:left-4 sm:right-4 max-w-2xl mx-auto z-20">
                <form
                    onSubmit={e => { e.preventDefault(); handleSend(); }}
                    className="flex items-center gap-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl px-4 py-3 sm:py-3.5 rounded-full border border-zinc-200/90 dark:border-zinc-800 shadow-2xl shadow-zinc-300/50 dark:shadow-black/70 focus-within:ring-2 focus-within:ring-brand-navy/30 dark:focus-within:ring-blue-500/30 transition-all"
                >
                    <button
                        type="button"
                        onClick={handleResetChat}
                        className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
                        title="새 대화 시작"
                    >
                        <RefreshCw size={17} />
                    </button>

                    <input
                        type="text"
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        placeholder={isListening ? "말씀을 듣고 있습니다..." : placeholder || "S.STROKE 코치에게 자연스럽게 입력..."}
                        className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none px-2"
                    />

                    <button
                        type="button"
                        onClick={toggleSpeech}
                        className={`p-2 rounded-full transition-all shrink-0 ${
                            isListening 
                                ? "bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30" 
                                : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                        title={isListening ? "음성 인식 중지" : "음성으로 말하기"}
                    >
                        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>

                    {inputText.trim() && (
                        <button
                            type="submit"
                            className="p-2 sm:p-2.5 bg-brand-navy hover:bg-brand-navy-dark text-white rounded-full transition-all shadow-md shadow-brand-navy/20 shrink-0 hover:scale-105 active:scale-95"
                            title="전송"
                        >
                            <Send size={15} />
                        </button>
                    )}
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
                                    선수 선택 <span className="text-xs font-normal text-zinc-400">({athletes.length}명)</span>
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
                                    placeholder="선수 이름 또는 초성 검색 (예: ㅎㅈㅇ, 황)"
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
                                    일치하는 선수가 없습니다.
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
                                            <span className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-brand-navy dark:group-hover:text-white">
                                                {a.name}
                                            </span>
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
