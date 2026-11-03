import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text();
    if (!bodyText) {
      return NextResponse.json({ error: "정리할 레슨 내용을 입력해주세요." }, { status: 400 });
    }

    let payload: any = {};
    try {
      payload = JSON.parse(bodyText);
    } catch {
      return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
    }

    const { content, athleteName, part } = payload;
    if (!content || !content.trim()) {
      return NextResponse.json({ error: "레슨 내용을 몇 자 이상 먼저 작성해주세요." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY가 설정되지 않았습니다." }, { status: 500 });
    }

    const prompt = `당신은 대한민국 명문 골프 아카데미 'S.STROKE'의 수석 헤드 코치입니다.
현장 코치가 간단히 메모한 아래 골프 레슨 내용을 바탕으로, 선수와 학부모가 읽었을 때 이해하기 쉽고 전문적이며 조리 있게 다듬어 주세요.

[선수명]: ${athleteName || "선수"}
[레슨 파트]: ${part || "골프 레슨"}
[코치의 레슨 메모 원문]:
"""
${content.trim()}
"""

[작성 지침]
1. 원문에서 코치가 의도한 핵심 교정 포인트, 문제 진단, 드릴을 왜곡 없이 정확하게 반영하세요.
2. 아래와 같이 읽기 편한 구조로 정리해 주세요:
   • 🎯 핵심 진단 및 교정 포인트
   • 🏌️ 주요 티칭 및 메커니즘 개선
   • 💡 추천 연습 드릴 (체크포인트)
   • 📋 다음 레슨까지 과제 & 코치 당부사항
   (원문이 아주 짧은 메모일 경우, 너무 장황하지 않게 핵심을 중심으로 명확하게 2~3개 항목으로 작성하세요.)
3. 신뢰감 있고 전문적이면서도 격려가 담긴 코칭 어투(~했습니다, ~하도록 지도함, ~에 유의할 것 등)를 사용하세요.
4. "네, 정리해 드리겠습니다" 등의 서론/인사말이나 부연 설명은 일절 배제하고, 오직 완성된 레슨 내용 본문 텍스트만 출력하세요.`;

    const candidateModels = [
      process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
      "gemini-3.5-flash",
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-flash-latest"
    ];

    let lastError = "";
    let refinedText = "";

    for (const model of candidateModels) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            signal: controller.signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 1000
              }
            })
          }
        );

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errBody = await res.text();
          lastError = `${model} failed (${res.status}): ${errBody}`;
          continue;
        }

        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText && rawText.trim()) {
          refinedText = rawText.trim();
          break;
        }
      } catch (err: any) {
        lastError = `${model} exception: ${err.message}`;
      }
    }

    if (!refinedText) {
      return NextResponse.json(
        { error: "AI 레슨 정리 중 오류가 발생했습니다: " + lastError },
        { status: 500 }
      );
    }

    return NextResponse.json({ refinedText });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "서버 에러가 발생했습니다." }, { status: 500 });
  }
}

