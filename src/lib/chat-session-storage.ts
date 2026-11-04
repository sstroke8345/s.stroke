// Chat session management in localStorage

export interface ChatSessionItem {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
    messages: any[];
}

const STORAGE_KEY_SESSIONS = "s_stroke_chat_sessions_v1";
const STORAGE_KEY_ACTIVE_ID = "s_stroke_active_chat_id";
const MAX_SESSIONS = 30; // 최대 대화 세션 수
const MAX_MESSAGES_PER_SESSION = 30; // 세션당 최대 메시지 수

// Get all saved chat sessions sorted by updatedAt descending (최대 30개 보장)
export function getSavedChatSessions(): ChatSessionItem[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            const sorted = parsed.sort((a, b) => b.updatedAt - a.updatedAt);
            if (sorted.length > MAX_SESSIONS) {
                const trimmed = sorted.slice(0, MAX_SESSIONS);
                localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(trimmed));
                return trimmed;
            }
            return sorted;
        }
    } catch (e) {
        console.error("Failed to parse chat sessions:", e);
    }
    return [];
}

// Get active session ID
export function getActiveChatSessionId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
}

// Set active session ID and notify
export function setActiveChatSessionId(sessionId: string | null) {
    if (typeof window === "undefined") return;
    const currentActive = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
    if (currentActive === sessionId) return; // 이미 활성화된 세션이면 중복 이벤트 방지

    if (sessionId) {
        localStorage.setItem(STORAGE_KEY_ACTIVE_ID, sessionId);
    } else {
        localStorage.removeItem(STORAGE_KEY_ACTIVE_ID);
    }
    window.dispatchEvent(new CustomEvent("s_stroke_chat_session_change", { detail: { sessionId } }));
}

// Start a fresh new chat session
export function startNewChatSession() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY_ACTIVE_ID);
    localStorage.removeItem("s_stroke_chat_history");
    window.dispatchEvent(new CustomEvent("s_stroke_chat_session_change", { detail: { sessionId: null } }));
}

// Save or update a session
export function saveChatSession(sessionId: string, messages: any[], customTitle?: string): ChatSessionItem {
    const sessions = getSavedChatSessions();
    const existingIndex = sessions.findIndex(s => s.id === sessionId);

    // Auto-generate title from first user message if not given
    let title = customTitle;
    if (!title) {
        const firstUserMsg = messages.find((m: any) => m.sender === "user");
        title = firstUserMsg ? firstUserMsg.text.slice(0, 24) : "새 코칭 대화";
    }

    const now = Date.now();
    let updatedItem: ChatSessionItem;
    // 대화방 내부 메시지도 최근 30개까지만 보관 (오래된 메시지 자동 정리)
    const trimmedMessages = Array.isArray(messages) ? messages.slice(-MAX_MESSAGES_PER_SESSION) : [];

    if (existingIndex >= 0) {
        updatedItem = {
            ...sessions[existingIndex],
            title: title || sessions[existingIndex].title,
            messages: trimmedMessages,
            updatedAt: now,
        };
        sessions[existingIndex] = updatedItem;
    } else {
        updatedItem = {
            id: sessionId,
            title: title || "새 코칭 대화",
            createdAt: now,
            updatedAt: now,
            messages: trimmedMessages,
        };
        sessions.unshift(updatedItem);
    }

    // 최신 순으로 정렬 후 최대 30개만 남기고 나머지는 자동 영구 삭제 (FIFO)
    const trimmedSessions = sessions
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, MAX_SESSIONS);

    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(trimmedSessions));
    localStorage.setItem(STORAGE_KEY_ACTIVE_ID, sessionId);
    window.dispatchEvent(new CustomEvent("s_stroke_chat_history_updated"));
    return updatedItem;
}

// Delete a session
export function deleteChatSession(sessionId: string) {
    const sessions = getSavedChatSessions().filter(s => s.id !== sessionId);
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));

    const activeId = getActiveChatSessionId();
    if (activeId === sessionId) {
        setActiveChatSessionId(null);
    }
    window.dispatchEvent(new CustomEvent("s_stroke_chat_history_updated"));
}

// Clear all sessions
export function clearAllChatSessions() {
    localStorage.removeItem(STORAGE_KEY_SESSIONS);
    localStorage.removeItem(STORAGE_KEY_ACTIVE_ID);
    localStorage.removeItem("s_stroke_chat_history");
    window.dispatchEvent(new CustomEvent("s_stroke_chat_history_updated"));
    window.dispatchEvent(new CustomEvent("s_stroke_chat_session_change", { detail: { sessionId: null } }));
}
