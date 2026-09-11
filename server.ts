import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Lazy GoogleGenAI initialization
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// AI Sentence Analysis Endpoint
app.post("/api/analyze-sentence", async (req, res) => {
  try {
    const {
      sentence,
      source,
      writingStyle,
      targetAudience,
      userTags,
      imageBase64,
    } = req.body;

    if (!sentence || typeof sentence !== "string" || !sentence.trim()) {
      return res.status(400).json({ error: "원문 문장을 입력해주세요." });
    }

    const ai = getAIClient();

    if (!ai) {
      // Graceful fallback when API key is not present in local test
      const defaultKeywords = ["#문장", "#기록", "#통찰", "#책쓰기"];
      return res.json({
        insight:
          "이 문장은 독자에게 깊은 질문을 던지며 책의 핵심 메시지를 지탱할 수 있는 훌륭한 재료입니다. 단순한 인용을 넘어 작가의 고유한 경험과 결합하여 한 챕터의 도입부나 클라이맥스 논점으로 발전시키기에 적합합니다.",
        keywords: defaultKeywords,
        recommendedChapter: `제1장. 생각을 틔우는 문장의 힘: ${sentence.slice(0, 15)}...`,
      });
    }

    // Build context prompt with writing style & target audience
    const styleContext = writingStyle && writingStyle.trim()
      ? `- 집필 스타일: "${writingStyle.trim()}" (이 문체와 톤앤매너에 맞추어 인사이트를 풀어내고 목차를 구성해주세요)`
      : "- 집필 스타일: 기본 (책을 쓰는 작가에게 영감을 주는 사색적이고 깊이 있는 톤)";

    const audienceContext = targetAudience && targetAudience.trim()
      ? `- 타겟 독자층: "${targetAudience.trim()}" (해당 독자층이 공감하고 매력을 느낄 수 있는 어조와 주제로 구성해주세요)`
      : "- 타겟 독자층: 기본 (인사이트와 지적 자극을 찾는 일반 독자)";

    const tagsContext = userTags && Array.isArray(userTags) && userTags.length > 0
      ? `- 작성자 사전 태그: ${userTags.join(", ")}`
      : "";

    const sourceContext = source && source.trim()
      ? `- 출처: "${source.trim()}"`
      : "- 출처: 미상/자유 메모";

    const promptText = `
당신은 책을 쓰는 작가와 도서 기획/편집자를 돕는 전문 출판 에디터이자 문장 분석가입니다.
사용자는 "아직 책의 목차가 없는 상태"에서 좋은 문장과 글감을 무작위로 자유롭게 모으고 있습니다.
수집된 '원문 문장'을 분석하여, 나중에 책의 목차와 챕터로 엮을 수 있는 핵심 글감 테마와 깊이 있는 집필 아이디어를 도출해주세요.

[입력 정보]
- 원문 문장: "${sentence.trim()}"
${sourceContext}
${styleContext}
${audienceContext}
${tagsContext}

[수행 지침]
1. AI 인사이트 (insight):
   - 문장의 단순 요약이나 표면적 해석이 절대 아닙니다.
   - "이 문장이 책을 쓸 때 어떤 새로운 글감, 생각, 질문, 논점, 혹은 삶의 통찰로 발전할 수 있는가"를 구체적으로 서술하세요.
   - 사용자가 지정한 '집필 스타일'과 '타겟 독자층'이 있다면 그 톤앤매너를 반영하여 2~4문장으로 작성하세요.
2. 핵심 키워드 (keywords):
   - 문장과 글감에서 핵심이 되는 개념 키워드 3~5개를 추출하세요.
   - 나중에 다른 글감들과 연결할 수 있는 주제 태그여야 합니다.
   - 각 키워드는 반드시 앞에 '#'을 붙인 형태여야 합니다 (예: ["#공간", "#경험", "#기억", "#관찰"]).
3. AI 추천 글감 테마 (recommendedChapter):
   - 책의 목차가 아직 없는 상태이므로, 억지 장 번호(제1장 등)를 붙이지 마세요.
   - 이 글감이 나중에 한 편의 글이나 챕터의 중심 소재가 될 수 있도록, 매력적이고 정제된 '글감 테마 제목' 1개를 제안하세요. (예: "공간을 넘어 경험을 디자인하다", "사소한 관찰이 만드는 결정적 문장", "멈춤을 통해 비로소 보이는 것들").
`;

    const contents: any[] = [{ role: "user", parts: [{ text: promptText }] }];

    if (imageBase64 && typeof imageBase64 === "string" && imageBase64.startsWith("data:image/")) {
      const match = imageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        contents[0].parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insight: {
              type: Type.STRING,
              description: "AI 인사이트: 문장의 의미를 책쓰기용 생각으로 발전시킨 2~4문장 내용",
            },
            keywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "핵심 키워드 3~5개 (#공간 형태)",
            },
            recommendedChapter: {
              type: Type.STRING,
              description: "AI 추천 목차 제목 1개",
            },
          },
          required: ["insight", "keywords", "recommendedChapter"],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No response generated from Gemini API");
    }

    const parsed = JSON.parse(responseText);
    res.json(parsed);
  } catch (err: any) {
    console.error("AI Analysis Error:", err);
    res.status(500).json({
      error: "인사이트 분석 중 오류가 발생했습니다.",
      details: err.message || String(err),
    });
  }
});

// Audio Recording Transcription with Gemini
app.post("/api/transcribe-audio", async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: "음성 데이터가 누락되었습니다." });
    }

    const ai = getAIClient();
    if (!ai) {
      return res.status(500).json({ error: "Gemini API 키가 설정되지 않았습니다." });
    }

    const match = audioBase64.match(/^data:([^;]+);base64,(.+)$/);
    const actualMime = match ? match[1] : (mimeType || "audio/webm");
    const rawData = match ? match[2] : audioBase64;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: actualMime,
                data: rawData,
              },
            },
            {
              text: "당신은 출판/글쓰기 전문 오디오 녹취 전문가입니다. 위 오디오에 담긴 음성을 자연스럽고 정확한 문장으로 받아써주세요. 배경 잡음이나 불필요한 추임새는 정돈하고, 책의 인용구나 문장으로 쓰일 수 있도록 마침표와 쉼표를 바르게 붙여 텍스트만 출력하세요. 다른 인사말이나 설명은 일체 포함하지 마세요.",
            },
          ],
        },
      ],
    });

    const text = response.text ? response.text.trim() : "";
    res.json({ text });
  } catch (err: any) {
    console.error("Transcribe audio error:", err);
    res.status(500).json({ error: "음성 변환 중 오류가 발생했습니다: " + (err.message || String(err)) });
  }
});

// Synthesize Book Outline from Randomly Collected Writing Materials (글감 모음 -> 목차 기획)
app.post("/api/synthesize-outline", async (req, res) => {
  try {
    const { records, writingStyle, targetAudience } = req.body;
    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: "분석할 글감이 없습니다." });
    }

    const ai = getAIClient();
    if (!ai) {
      return res.json({
        proposedBookTitle: "생각의 무늬: 무작위 글감에서 피어난 책",
        bookOverview: "작가가 자유롭게 수집한 글감들을 유기적으로 엮어 하나의 통일된 서사로 구성한 가상 목차입니다.",
        chapters: [
          {
            chapterNumber: "제1장",
            chapterTitle: "발견의 순간: 스쳐가는 일상을 포착하다",
            description: "사소한 관찰과 첫 인상을 담은 글감들을 엮은 도입부",
            matchedSentences: records.slice(0, 2).map((r: any) => r.originalSentence),
          },
          {
            chapterNumber: "제2장",
            chapterTitle: "사유의 깊이: 질문이 문장이 될 때",
            description: "핵심 통찰과 내면의 고백을 다룬 본문 전개부",
            matchedSentences: records.slice(2, 4).map((r: any) => r.originalSentence),
          },
        ],
      });
    }

    const formattedMaterials = records
      .map((r: any, i: number) => `[글감 ${i + 1}]
- 문장: "${r.originalSentence}"
- 출처: ${r.source || "미상"}
- AI 인사이트: ${r.aiInsight || "-"}
- 키워드/태그: ${(r.keywords || []).concat(r.userTags || []).join(", ")}
- 글감 테마: ${r.finalChapter || r.aiRecommendedChapter || "-"}`)
      .join("\n\n");

    const prompt = `
당신은 베스트셀러 출판 기획자이자 수석 편집자입니다.
작가가 책의 정해진 목차 없이 평소에 자유롭게/무작위로 수집해 둔 아래의 '글감(Sentence Archive)' 목록을 정밀 분석해주세요.
이 파편화된 글감들의 숨은 연결고리와 공통 정서를 꿰어내어, 하나의 완성도 높은 책으로 엮을 수 있는 [출판 기획 목차 구성안]을 제안해주세요.

[작가 수집 글감 목록]
${formattedMaterials}

[부가 정보]
- 집필 스타일: ${writingStyle || "자유로운 에세이/인문 교양"}
- 타겟 독자: ${targetAudience || "생각과 문장을 사랑하는 독자"}

[출력 요구사항 (JSON)]
1. proposedBookTitle: 이 글감들을 관통하는 매력적인 가상 도서 가제 (예: "태도의 말들", "사소한 관찰의 기쁨")
2. bookOverview: 이 책이 어떤 기획 의도를 가지며, 글감들이 어떤 맥락으로 이어지는지에 대한 2~3문장 기획 총평
3. chapters: 3~5개의 장(Chapter) 목록. 각 장은 다음을 포함:
   - chapterNumber (예: "제1장", "제2장")
   - chapterTitle (매력적인 챕터 제목)
   - description (이 챕터에서 다룰 핵심 이야기와 집필 방향)
   - matchedSentences (이 챕터에 배치하면 좋을 수집된 문장들의 요약 또는 원문 발췌 목록)
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            proposedBookTitle: { type: Type.STRING },
            bookOverview: { type: Type.STRING },
            chapters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  chapterNumber: { type: Type.STRING },
                  chapterTitle: { type: Type.STRING },
                  description: { type: Type.STRING },
                  matchedSentences: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ["chapterNumber", "chapterTitle", "description", "matchedSentences"],
              },
            },
          },
          required: ["proposedBookTitle", "bookOverview", "chapters"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    res.json(result);
  } catch (err: any) {
    console.error("Synthesize Outline Error:", err);
    res.status(500).json({ error: "목차 구성 생성 중 오류가 발생했습니다: " + (err.message || String(err)) });
  }
});

// Optional proxy endpoint to append row directly to Google Sheets via Webhook URL if provided
app.post("/api/sheets/append", async (req, res) => {
  try {
    const { webhookUrl, rowData } = req.body;
    if (!webhookUrl) {
      return res.status(400).json({ error: "Google Sheets Webhook URL이 누락되었습니다." });
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rowData),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }

    const result = await response.json().catch(() => ({ status: "success" }));
    res.json(result);
  } catch (err: any) {
    console.error("Sheets Append Error:", err);
    res.status(500).json({ error: err.message || "Failed to append to Google Sheets" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Sentence Archive (문장서랍) server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
