export interface SavedSentenceRecord {
  id: string;
  savedDate: string; // 1. 저장 날짜
  originalSentence: string; // 2. 원문 문장
  source: string; // 3. 출처
  photoLink: string; // 4. 사진 링크 또는 상태
  photoDataUrl?: string; // 사진 미리보기용 (로컬 저장용)
  aiInsight: string; // 5. AI 인사이트
  keywords: string[]; // 6. 핵심 키워드 (#키워드 형태)
  aiRecommendedChapter: string; // 7. AI 추천 목차
  finalChapter: string; // 8. 최종 목차
  approvalStatus: "승인" | "수정 승인"; // 9. 승인 상태
  userTags: string[]; // 10. 사용자 태그 (User Tags)
  writingStyle?: string;
  targetAudience?: string;
}

export interface AIAnalysisResult {
  insight: string;
  keywords: string[];
  recommendedChapter: string;
}

export interface BookProjectSettings {
  writingStyle: string;
  targetAudience: string;
  sheetsWebhookUrl: string;
  sheetSpreadsheetUrl: string;
  googleSpreadsheetId?: string;
  googleAccountEmail?: string;
}

export interface SynthesizedChapter {
  chapterNumber: string;
  chapterTitle: string;
  description: string;
  matchedSentences: string[];
}

export interface SynthesizedOutline {
  proposedBookTitle: string;
  bookOverview: string;
  chapters: SynthesizedChapter[];
}
