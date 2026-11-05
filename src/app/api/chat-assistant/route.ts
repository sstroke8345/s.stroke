import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Athlete {
  id: string;
  name: string;
}

// ── 경량화된 초고속 시스템 프롬프트 (토큰 수 60% 절감) ──
const COMPACT_SYSTEM_PROMPT = `당신은 'S.STROKE'의 AI 코칭 어시스턴트입니다.
절대 '아카데미'라는 단어를 붙이지 마세요. 브랜드 이름은 오직 'S.STROKE'입니다.
코치님의 입력을 분석하여 정확한 intent와 응답을 JSON으로 출력하세요.

[Intent 가이드]
1. CREATE_LESSON: 레슨 일지 작성/등록 (category, content)
2. CREATE_TRAINING: 훈련 과제 배정/등록 (content)
3. CREATE_PLAN: 훈련계획 수립 (pjType)
4. CREATE_JOURNAL: 훈련일지 작성 (pjType)
5. CREATE_CONSULTATION: 상담일지 기록 (consultationType)
6. CREATE_SCORE: 스코어카드 기록 (par, location, distance)
7. VIEW_LESSONS: 레슨조회 (/lessons)
8. VIEW_TRAININGS: 훈련조회 (/training)
9. VIEW_SCORES: 스코어조회 (/scores)
10. NAVIGATE: 시스템 내부 메뉴 화면으로 이동 (title, targetUrl 설정)
    - 출석체크: /operations/attendance, 출석키오스크: /operations/attendance/kiosk
    - 대회스케쥴: /schedule/tournaments, 대회결과: /schedule/tournament-results
    - 전체스케쥴: /schedule, 출장스케쥴: /schedule/coach-trips
    - 스코어통계: /scores/stats, 항목별통계: /scores/category-stats
    - 공지사항: /community, 투표: /admin/polls, 할일: /operations/todos
    - 골프IQ(코스매니지먼트): /course-management, 코스정보: /course-info, 선수레포트: /operations/reports
    - 스마트패스: /my-qr, 운영통계: /admin/statistics, 담임선수배정: /admin/assigned-athletes, 레포트작성: /admin/player-reports
    - 스윙오류관리: /system/lesson-list, 훈련종목관리: /system/training-list, 챌린지관리: /system/challenge-list, QR관리: /operations/qr-check
    - 지점관리: /system/branches, 선수관리: /system/athletes, 코치관리: /system/coaches, 학부모관리: /system/parents, 권한관리: /system/permissions, 메뉴관리: /system/menu-management
11. WEATHER_INFO: 골프장 날씨/바람/기상 (locationName, lat, lon, targetDate)
12. GENERAL_CHAT: 골프 질문, 협회/연맹 사이트, 규정, 드릴/스윙 조언, 일상 대화
    - Google Gemini처럼 정중하고 명확하며 가독성 높은 마크다운 형식으로 작성하세요.
    - '아카데미'라는 단어를 일절 사용하지 마세요. 소속이나 브랜드를 지칭할 때는 반드시 'S.STROKE'로만 단독 표기하세요. (예: "S.STROKE 아카데미" ❌ -> "S.STROKE" ⭕)
    - 웹사이트/협회 안내 시 정확한 공식 URL(https://...)을 꼭 제공하세요:
      * 한국대학골프연맹(KCGF): https://www.kcgf.org [한국대학골프연맹]
      * 대한골프협회(KGA): https://www.golfkorea.org [KGA 대한골프협회]
      * 한국프로골프협회(KPGA): https://www.kpga.co.kr [KPGA]
      * 한국여자프로골프협회(KLPGA): https://klpga.co.kr [KLPGA]
      * 한국중고등학교골프연맹(KJGA): https://www.kjga.or.kr [한국중고골프연맹]
    - 안내 문장 및 링크 뒤에 Gemini 스타일의 출처/참고 뱃지 태그(예: [한국대학골프연맹], [공식 웹사이트])를 포함하세요.
    - 주요 제목은 **볼드체**로 작성하고, 글머리 기호(ㅇ 또는 •)를 적절히 활용하세요.

반드시 아래 JSON 형식으로만 응답:
{
  "intent": "CREATE_LESSON" | "CREATE_TRAINING" | "CREATE_PLAN" | "CREATE_JOURNAL" | "CREATE_CONSULTATION" | "CREATE_SCORE" | "VIEW_LESSONS" | "VIEW_TRAININGS" | "VIEW_SCORES" | "NAVIGATE" | "WEATHER_INFO" | "GENERAL_CHAT",
  "athleteName": string | null,
  "category": string | null,
  "title": string | null,
  "content": string | null,
  "pjType": string | null,
  "consultationType": string | null,
  "par": number | null,
  "location": string | null,
  "distance": string | null,
  "targetUrl": string | null,
  "locationName": string | null,
  "lat": number | null,
  "lon": number | null,
  "targetDate": string | null,
  "replyMessage": string
}`;

// 주요 골프장 및 지역 좌표 매핑 사전
const KNOWN_GOLF_LOCATIONS: { keywords: string[]; name: string; lat: number; lon: number }[] = [
  { keywords: ["화랑", "진천"], name: "골프존카운티 화랑 (충북 진천)", lat: 36.855, lon: 127.435 },
  { keywords: ["안성", "골프존카운티안성", "H밸리", "Q밸리", "W밸리"], name: "골프존카운티 안성 (경기 안성)", lat: 37.008, lon: 127.279 },
  { keywords: ["선산", "구미", "제이스"], name: "골프존카운티 선산 (경북 구미)", lat: 36.119, lon: 128.344 },
  { keywords: ["감포"], name: "골프존카운티 감포 (경북 경주)", lat: 35.801, lon: 129.497 },
  { keywords: ["사천"], name: "골프존카운티 사천 (경남 사천)", lat: 35.084, lon: 128.085 },
  { keywords: ["순천"], name: "골프존카운티 순천 (전남 순천)", lat: 34.950, lon: 127.487 },
  { keywords: ["영암"], name: "골프존카운티 영암45 (전남 영암)", lat: 34.739, lon: 126.495 },
  { keywords: ["무주"], name: "골프존카운티 무주 (전북 무주)", lat: 35.981, lon: 127.662 },
  { keywords: ["청통"], name: "골프존카운티 청통 (경북 영천)", lat: 35.973, lon: 128.938 },
  { keywords: ["제주", "엘리시안", "나인브릿지", "테디밸리", "블랙스톤제주", "라온", "핀크스"], name: "제주도 골프장", lat: 33.394, lon: 126.368 },
  { keywords: ["용인", "남부", "플라자cc", "태광", "골드", "코리아", "은화삼", "해솔리아"], name: "경기 용인 권역", lat: 37.241, lon: 127.177 },
  { keywords: ["여주", "남여주", "자유cc", "신라", "솔모로", "스카이밸리", "페럼"], name: "경기 여주 권역", lat: 37.298, lon: 127.637 },
  { keywords: ["이천", "블랙스톤이천", "사우스스프링스", "비에이비스타", "뉴스프링빌"], name: "경기 이천 권역", lat: 37.272, lon: 127.435 },
  { keywords: ["가평", "베네스트", "크리스탈밸리", "프리스틴밸리"], name: "경기 가평 권역", lat: 37.831, lon: 127.509 },
  { keywords: ["포천", "일동레이크", "몽베르", "포천힐스", "베어크리크"], name: "경기 포천 권역", lat: 37.894, lon: 127.200 },
  { keywords: ["인천", "잭니클라우스", "클럽72", "스카이72", "베어즈베스트", "드림파크"], name: "인천/영종도 권역", lat: 37.456, lon: 126.705 },
  { keywords: ["춘천", "라비에벨", "제이드팰리스", "로드힐스", "더플레이어스"], name: "강원 춘천 권역", lat: 37.881, lon: 127.729 },
  { keywords: ["원주", "오크밸리", "센추리21"], name: "강원 원주 권역", lat: 37.342, lon: 127.920 }
];

// 실시간 스트리밍 중 JSON 내부의 replyMessage 문자열 토큰을 추출하는 파서
class ReplyExtractor {
  private started = false;
  private ended = false;
  private buffer = "";

  feed(text: string): string {
    if (this.ended) return "";
    this.buffer += text;

    if (!this.started) {
      const marker = '"replyMessage":';
      const mIdx = this.buffer.indexOf(marker);
      if (mIdx !== -1) {
        const qIdx = this.buffer.indexOf('"', mIdx + marker.length);
        if (qIdx !== -1) {
          this.started = true;
          const afterQuote = this.buffer.slice(qIdx + 1);
          this.buffer = "";
          return this.processContent(afterQuote);
        }
      }
      return "";
    }

    return this.processContent(text);
  }

  private processContent(str: string): string {
    let out = "";
    let i = 0;
    while (i < str.length) {
      if (str[i] === "\\" && i + 1 < str.length) {
        const next = str[i + 1];
        if (next === "n") out += "\n";
        else if (next === "t") out += "\t";
        else if (next === '"') out += '"';
        else if (next === "\\") out += "\\";
        else out += next;
        i += 2;
      } else if (str[i] === '"' && !this.ended) {
        this.ended = true;
        break;
      } else {
        out += str[i];
        i++;
      }
    }
    return out;
  }
}

function getWeatherStatus(code: number): { text: string; icon: string } {
  if (code === 0) return { text: "맑음", icon: "☀️" };
  if (code === 1 || code === 2) return { text: "대체로 맑음", icon: "🌤️" };
  if (code === 3) return { text: "흐림", icon: "☁️" };
  if (code >= 45 && code <= 48) return { text: "안개", icon: "🌫️" };
  if (code >= 51 && code <= 55) return { text: "이슬비", icon: "🌦️" };
  if (code >= 61 && code <= 65) return { text: "비", icon: "🌧️" };
  if (code >= 71 && code <= 77) return { text: "눈", icon: "❄️" };
  if (code >= 80 && code <= 82) return { text: "소나기", icon: "🌦️" };
  if (code >= 95) return { text: "뇌우", icon: "⛈️" };
  return { text: "구름 많음", icon: "⛅" };
}

function getWindDirectionText(deg: number): string {
  const dirs = ["북풍", "북동풍", "동풍", "남동풍", "남풍", "남서풍", "서풍", "북서풍"];
  const index = Math.round(((deg %= 360) < 0 ? deg + 360 : deg) / 45) % 8;
  return dirs[index];
}

async function fetchRealtimeWeather(aiParsed: any, userMessage: string): Promise<string> {
  const query = `${userMessage} ${aiParsed.locationName || ""}`.toLowerCase();
  
  let targetLoc = KNOWN_GOLF_LOCATIONS.find(loc => 
    loc.keywords.some(k => query.includes(k.toLowerCase()))
  );

  let lat = targetLoc ? targetLoc.lat : (aiParsed.lat || 37.566);
  let lon = targetLoc ? targetLoc.lon : (aiParsed.lon || 126.978);
  let displayName = targetLoc ? targetLoc.name : (aiParsed.locationName || "해당 골프장/지역");

  let dayOffset = 1; // 기본: 내일 라운드
  if (query.includes("오늘") || aiParsed.targetDate === "today") {
    dayOffset = 0;
  } else if (query.includes("모레")) {
    dayOffset = 2;
  }

  const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,winddirection_10m_dominant&timezone=Asia%2FSeoul`;
  
  const res = await fetch(apiUrl);
  if (!res.ok) {
    throw new Error(`Open-Meteo returned status ${res.status}`);
  }
  const data = await res.json();
  const daily = data?.daily;

  if (!daily || !daily.time || daily.time.length <= dayOffset) {
    throw new Error("Invalid weather data received");
  }

  const targetDateStr = daily.time[dayOffset];
  const minTemp = Math.round(daily.temperature_2m_min[dayOffset]);
  const maxTemp = Math.round(daily.temperature_2m_max[dayOffset]);
  const pop = daily.precipitation_probability_max ? daily.precipitation_probability_max[dayOffset] : 0;
  const windKmH = daily.windspeed_10m_max[dayOffset];
  const windMs = (windKmH / 3.6).toFixed(1);
  const windDirDeg = daily.winddirection_10m_dominant[dayOffset];
  const windDirText = getWindDirectionText(windDirDeg);
  const status = getWeatherStatus(daily.weathercode[dayOffset]);

  const dateObj = new Date(targetDateStr);
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const formattedDate = `${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일(${dayNames[dateObj.getDay()]})`;
  const labelPrefix = dayOffset === 0 ? "오늘" : (dayOffset === 1 ? "내일" : "모레");

  let windAdvice = "";
  const windVal = parseFloat(windMs);
  if (windVal < 2.0) {
    windAdvice = "바람이 거의 없어 클럽별 캐리 거리를 그대로 믿고 핀을 직접 공략하기 매우 좋은 조건입니다.";
  } else if (windVal < 4.0) {
    windAdvice = `약간의 ${windDirText}이 예상됩니다. 맞바람 시 반 클럽 정도 여유 있게 선택하고, 런 발생을 고려해 탄도를 조절하세요.`;
  } else {
    windAdvice = `바람이 다소 강합니다(${windMs}m/s). 맞바람에는 한두 클럽 길게 잡고 그립을 짧게 쥐어 펀치샷 위주로 탄도를 낮춰 공략하는 것을 추천합니다.`;
  }

  let attireAdvice = "";
  const tempDiff = maxTemp - minTemp;
  if (minTemp < 10) {
    attireAdvice = `일교차(${tempDiff}°C)가 크므로 아침 티오프 시에는 가벼운 바람막이나 조끼를 착용하시고, 기온이 오르는 오후에는 편안한 반팔/이너웨어로 조절할 수 있도록 준비하세요.`;
  } else if (maxTemp >= 28) {
    attireAdvice = "기온이 다소 높으니 수분 섭취를 충분히 하시고 자외선 차단과 쿨링 이너웨어를 준비하세요.";
  } else {
    attireAdvice = "라운드하기에 아주 쾌적한 기온입니다. 가벼운 스트레칭 후 기분 좋게 티샷을 시작하세요.";
  }

  let rainAlert = "";
  if (pop >= 60) {
    rainAlert = `\n⚠️ **우천 주의:** 강수 확률이 ${pop}%로 높습니다. 레인코트와 우산, 여분의 장갑을 꼭 챙기세요!`;
  } else if (pop >= 30) {
    rainAlert = `\n💡 **강수 안내:** 강수 확률은 ${pop}%로 낮은 편이나, 이동 시 갑작스러운 소나기에 대비해 방수 웨어를 지참하시면 좋습니다.`;
  }

  return `**${displayName}**의 **${labelPrefix}(${formattedDate})** 실시간 기상 예보입니다! ⛳

${status.icon} **기상 현황 및 예보**
• **날씨:** ${status.text} ${status.icon}
• **기온:** 최저 **${minTemp}°C** / 최고 **${maxTemp}°C** (일교차 약 ${tempDiff}°C)
• **바람:** **${windDirText} ${windMs} m/s**
• **강수 확률:** **${pop}%**${rainAlert}

💡 **라운드 실전 코칭 팁**
• **바람 공략:** ${windAdvice}
• **복장/체온:** ${attireAdvice}`;
}

export async function POST(req: NextRequest) {
  try {
    let bodyText = "";
    try {
      bodyText = await req.text();
    } catch (e) {
      return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
    }

    if (!bodyText) {
      return NextResponse.json({ error: "Empty request body" }, { status: 400 });
    }

    let payload: any = {};
    try {
      payload = JSON.parse(bodyText);
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON: " + bodyText }, { status: 400 });
    }

    const { message, athletes, previousContext } = payload;
    const apiKey = process.env.GEMINI_API_KEY;

    // ── ⚡ [초고속 패스 1: 주요 골프장 날씨 질문 즉시 처리 (0.05초)] ──
    const isWeatherQuestion = message && (
      message.includes("날씨") || 
      message.includes("비 오나") || 
      message.includes("바람") || 
      message.includes("기온")
    );

    if (isWeatherQuestion) {
      const matchedGolfCourse = KNOWN_GOLF_LOCATIONS.find(loc => 
        loc.keywords.some(k => message.includes(k))
      );
      if (matchedGolfCourse) {
        try {
          const quickWeatherText = await fetchRealtimeWeather(
            { locationName: matchedGolfCourse.name, lat: matchedGolfCourse.lat, lon: matchedGolfCourse.lon },
            message
          );
          if (payload.stream) {
            const encoder = new TextEncoder();
            const stream = new ReadableStream({
              start(controller) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "chunk", text: quickWeatherText })}\n\n`));
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: "done",
                  result: { intent: "WEATHER_INFO", replyMessage: quickWeatherText },
                  modelUsed: "instant-weather-engine"
                })}\n\n`));
                controller.close();
              }
            });
            return new Response(stream, {
              headers: {
                "Content-Type": "text/event-stream; charset=utf-8",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
              }
            });
          }
          return NextResponse.json({
            result: {
              intent: "WEATHER_INFO",
              replyMessage: quickWeatherText
            },
            modelUsed: "instant-weather-engine"
          });
        } catch (fastWeatherErr) {
          console.warn("Fast weather engine fallback to Gemini:", fastWeatherErr);
        }
      }
    }

    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
    }

    const athleteNamesList = (athletes || []).map((a: Athlete) => a.name).join(", ");
    const userPrompt = `
[등록된 선수]: ${athleteNamesList || "없음"}
[이전 맥락]: ${previousContext ? JSON.stringify(previousContext) : "없음"}
[메시지]: "${message}"
`;

    // 가장 빠르고 지연시간(Latency)이 짧은 초경량 무료 모델 우선 배치
    const candidateModels = Array.from(
      new Set([
        process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-3.5-flash-lite",
        "gemini-3.5-flash",
        "gemini-3.6-flash"
      ])
    );

    // ── 🌊 [실시간 스트리밍 모드: 토큰 단위 실시간 전송 (Gemini App 경험)] ──
    if (payload.stream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          let success = false;
          let lastErr = "";

          for (const model of candidateModels) {
            try {
              const abortCtrl = new AbortController();
              const timeoutId = setTimeout(() => abortCtrl.abort(), 30000);

              const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
                {
                  method: "POST",
                  signal: abortCtrl.signal,
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [
                      {
                        role: "user",
                        parts: [
                          { text: COMPACT_SYSTEM_PROMPT },
                          { text: userPrompt }
                        ]
                      }
                    ],
                    generationConfig: {
                      temperature: 0.2,
                      maxOutputTokens: 2000,
                      responseMimeType: "application/json"
                    }
                  })
                }
              );
              clearTimeout(timeoutId);

              if (!res.ok) {
                const errDetail = await res.text();
                lastErr = `[${model}] ${errDetail.slice(0, 100)}`;
                continue;
              }

              if (!res.body) continue;

              const reader = res.body.getReader();
              const decoder = new TextDecoder();
              let accumulatedRaw = "";
              const extractor = new ReplyExtractor();
              let sseBuffer = "";

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                sseBuffer += decoder.decode(value, { stream: true });
                const lines = sseBuffer.split("\n");
                sseBuffer = lines.pop() || "";

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (trimmed.startsWith("data: ")) {
                    try {
                      const json = JSON.parse(trimmed.slice(6));
                      const textPart = json?.candidates?.[0]?.content?.parts?.[0]?.text;
                      if (textPart) {
                        accumulatedRaw += textPart;
                        const token = extractor.feed(textPart);
                        if (token) {
                          controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ type: "chunk", text: token })}\n\n`)
                          );
                        }
                      }
                    } catch (e) {}
                  }
                }
              }

              let parsed: any;
              try {
                parsed = JSON.parse(accumulatedRaw);
              } catch (parseErr) {
                const cleanJson = accumulatedRaw.replace(/```json/g, "").replace(/```/g, "").trim();
                parsed = JSON.parse(cleanJson);
              }

              if (parsed && (parsed.intent === "WEATHER_INFO" || (parsed.intent === "GENERAL_CHAT" && isWeatherQuestion))) {
                try {
                  const weatherResponse = await fetchRealtimeWeather(parsed, message);
                  parsed.replyMessage = weatherResponse;
                  parsed.intent = "WEATHER_INFO";
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "chunk", text: weatherResponse })}\n\n`)
                  );
                } catch (weatherErr) {
                  console.warn("Weather fetch fallback:", weatherErr);
                }
              }

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "done", result: parsed, modelUsed: model })}\n\n`)
              );
              success = true;
              break;
            } catch (err: any) {
              lastErr = `[${model}] ${err?.message || String(err)}`;
            }
          }

          if (!success) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "error", error: lastErr || "Gemini streaming failed" })}\n\n`)
            );
          }
          controller.close();
        }
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive"
        }
      });
    }

    // ── 📦 [기존 동기식 JSON 모드 (Fallback / 호환성)] ──
    let lastError = "";
    let data: any = null;
    let selectedModel = "";

    for (const model of candidateModels) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            signal: controller.signal,
            headers: { 
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    { text: COMPACT_SYSTEM_PROMPT },
                    { text: userPrompt }
                  ]
                }
              ],
              generationConfig: {
                temperature: 0.2, // 더 빠르고 결정론적인 답변
                maxOutputTokens: 2000, // 충분한 토큰으로 긴 답변도 잘림 방지
                responseMimeType: "application/json"
              }
            })
          }
        );
        clearTimeout(timeoutId);

        if (res.ok) {
          data = await res.json();
          selectedModel = model;
          break;
        } else {
          const errDetail = await res.text();
          console.warn(`Gemini model ${model} status ${res.status}:`, errDetail.slice(0, 100));
          lastError = `[${model}] ${errDetail.slice(0, 100)}`;
        }
      } catch (err: any) {
        lastError = `[${model}] ${err?.message || String(err)}`;
      }
    }

    if (!data) {
      return NextResponse.json({ error: "Gemini API failed: " + lastError }, { status: 500 });
    }

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return NextResponse.json({ error: "No response text from Gemini" }, { status: 500 });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch (parseErr) {
      const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleanJson);
    }

    // 날씨 인텐트 보정
    if (parsed && (parsed.intent === "WEATHER_INFO" || (parsed.intent === "GENERAL_CHAT" && isWeatherQuestion))) {
      try {
        const weatherResponse = await fetchRealtimeWeather(parsed, message);
        parsed.replyMessage = weatherResponse;
        parsed.intent = "WEATHER_INFO";
      } catch (weatherErr) {
        console.warn("Weather fetch fallback:", weatherErr);
      }
    }

    return NextResponse.json({ result: parsed, modelUsed: selectedModel });
  } catch (error: any) {
    console.error("AI Assistant API error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
