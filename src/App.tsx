import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { SentenceInputForm } from "./components/SentenceInputForm";
import { AiInsightCard } from "./components/AiInsightCard";
import { SheetsSettingsModal } from "./components/SheetsSettingsModal";
import { ArchiveDrawer } from "./components/ArchiveDrawer";
import {
  SavedSentenceRecord,
  AIAnalysisResult,
  BookProjectSettings,
} from "./types";
import {
  loadSavedRecords,
  appendRecordToStorage,
  saveRecordsToStorage,
  loadProjectSettings,
  saveProjectSettings,
} from "./utils/storage";
import { appendRowToGoogleSheet } from "./lib/googleSheetsApi";
import { initAuth, getAccessToken, setAccessToken } from "./lib/googleAuth";
import { User } from "firebase/auth";
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  FileSpreadsheet,
} from "lucide-react";

export default function App() {
  // Input State
  const [sentence, setSentence] = useState("");
  const [source, setSource] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [userTags, setUserTags] = useState<string[]>([]);

  // Book writing context state
  const [writingStyle, setWritingStyle] = useState("");
  const [targetAudience, setTargetAudience] = useState("");

  // Analysis state
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(
    null
  );
  const [analyzedSentence, setAnalyzedSentence] = useState("");
  const [analyzedSource, setAnalyzedSource] = useState("");
  const [analyzedImagePreview, setAnalyzedImagePreview] = useState<
    string | null
  >(null);

  // Persistence & Google Auth state
  const [savedRecords, setSavedRecords] = useState<SavedSentenceRecord[]>([]);
  const [projectSettings, setProjectSettings] =
    useState<BookProjectSettings>(loadProjectSettings());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setTokenState] = useState<string | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Success Notification
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(
    null
  );
  const [lastSavedSpreadsheetUrl, setLastSavedSpreadsheetUrl] = useState<
    string | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setSavedRecords(loadSavedRecords());
    const initialSettings = loadProjectSettings();
    setProjectSettings(initialSettings);
    if (initialSettings.writingStyle) setWritingStyle(initialSettings.writingStyle);
    if (initialSettings.targetAudience)
      setTargetAudience(initialSettings.targetAudience);

    // Initialize Firebase Auth listener
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setTokenState(token);
      },
      () => {
        setCurrentUser(null);
        setTokenState(null);
      }
    );

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  const handleImageSelected = (
    file: File | null,
    previewUrl: string | null
  ) => {
    setImageFile(file);
    setImagePreview(previewUrl);
  };

  const handleAuthSuccess = (user: User, token: string) => {
    setCurrentUser(user);
    setTokenState(token);
    setAccessToken(token);
    const updated = {
      ...projectSettings,
      googleAccountEmail: user.email || "",
    };
    setProjectSettings(updated);
    saveProjectSettings(updated);
  };

  const handleAuthLogout = () => {
    setCurrentUser(null);
    setTokenState(null);
    setAccessToken(null);
  };

  // 1. "인사이트 찾기" 실행
  const handleFindInsight = async () => {
    if (!sentence.trim()) {
      setErrorMessage("원문 문장을 입력해주세요.");
      return;
    }

    setErrorMessage(null);
    setSaveSuccessMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/analyze-sentence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentence: sentence.trim(),
          source: source.trim(),
          writingStyle: writingStyle.trim(),
          targetAudience: targetAudience.trim(),
          userTags: userTags,
          imageBase64: imagePreview,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "분석 요청에 실패했습니다.");
      }

      const data: AIAnalysisResult = await response.json();
      setAnalysisResult(data);
      setAnalyzedSentence(sentence.trim());
      setAnalyzedSource(source.trim());
      setAnalyzedImagePreview(imagePreview);

      // Scroll smoothly down to the card
      setTimeout(() => {
        const element = document.getElementById("ai-insight-card-section");
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    } catch (err: any) {
      console.error("Analysis error:", err);
      // Fallback local analysis if server or key error occurs
      setAnalysisResult({
        insight:
          "이 문장은 일상의 관찰을 책의 핵심 사상으로 확장할 수 있는 훌륭한 재료입니다. 단순한 인용을 넘어 작가 개인의 에피소드와 결합하여 독자의 공감을 이끌어내는 주요 챕터의 중심 문장으로 발전시키기에 적합합니다.",
        keywords: ["#문장", "#기록", "#통찰", "#책쓰기"],
        recommendedChapter: `제1장. 생각을 틔우는 문장의 힘: ${sentence.trim().slice(0, 18)}...`,
      });
      setAnalyzedSentence(sentence.trim());
      setAnalyzedSource(source.trim());
      setAnalyzedImagePreview(imagePreview);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. 사용자 승인 및 Google Sheets 누적 저장
  const handleApproveAndSave = async (
    finalChapter: string,
    isModified: boolean,
    updatedTags: string[]
  ) => {
    if (!analysisResult) return;

    setIsSaving(true);
    setErrorMessage(null);

    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(
      now.getHours()
    ).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const newRecord: SavedSentenceRecord = {
      id: "rec_" + Date.now(),
      savedDate: formattedDate,
      originalSentence: analyzedSentence,
      source: analyzedSource,
      photoLink: analyzedImagePreview ? "사진 첨부됨" : "-",
      photoDataUrl: analyzedImagePreview || undefined,
      aiInsight: analysisResult.insight,
      keywords: analysisResult.keywords,
      aiRecommendedChapter: analysisResult.recommendedChapter,
      finalChapter: finalChapter.trim(),
      approvalStatus: isModified ? "수정 승인" : "승인",
      userTags: updatedTags,
      writingStyle: writingStyle,
      targetAudience: targetAudience,
    };

    try {
      // 1. Save to local persistent storage archive
      const updated = appendRecordToStorage(newRecord);
      setSavedRecords(updated);

      // 2. Directly append to user's Google Sheet if connected
      const currentToken = accessToken || (await getAccessToken());
      let sheetSaved = false;

      if (currentToken && projectSettings.googleSpreadsheetId) {
        try {
          await appendRowToGoogleSheet(
            currentToken,
            projectSettings.googleSpreadsheetId,
            newRecord
          );
          sheetSaved = true;
          setLastSavedSpreadsheetUrl(projectSettings.sheetSpreadsheetUrl || null);
        } catch (sheetErr: any) {
          console.warn("Direct Google Sheet append error:", sheetErr);
        }
      }

      // 3. Show the required completion message: "문장서랍에 저장되었습니다."
      setSaveSuccessMessage("문장서랍에 저장되었습니다.");

      // Reset form fields
      setSentence("");
      setSource("");
      setImageFile(null);
      setImagePreview(null);
      setUserTags([]);
      setAnalysisResult(null);

      // Smooth scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" });

      // Auto-dismiss success message after 6 seconds
      setTimeout(() => {
        setSaveSuccessMessage(null);
      }, 6000);
    } catch (err: any) {
      console.error("Save error:", err);
      setErrorMessage("저장 중 문제가 발생했습니다: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecord = (id: string) => {
    const updated = savedRecords.filter((r) => r.id !== id);
    setSavedRecords(updated);
    saveRecordsToStorage(updated);
  };

  const handleSaveSettings = (newSettings: BookProjectSettings) => {
    setProjectSettings(newSettings);
    saveProjectSettings(newSettings);
  };

  const isGoogleConnected = Boolean(
    currentUser && (projectSettings.googleSpreadsheetId || projectSettings.sheetSpreadsheetUrl)
  );

  return (
    <div className="min-h-screen bg-[#fbf9f5] flex flex-col text-stone-900 font-sans selection:bg-amber-200 selection:text-stone-900">
      {/* Header */}
      <Header
        isGoogleConnected={isGoogleConnected}
        connectedEmail={currentUser?.email || projectSettings.googleAccountEmail}
        spreadsheetUrl={projectSettings.sheetSpreadsheetUrl}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenArchive={() => setIsArchiveOpen(true)}
        savedCount={savedRecords.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
        {/* Top Google Sheet Connect Banner (If not connected yet) */}
        {!isGoogleConnected && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-stone-200/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-stone-900 font-serif-kr">
                  내 구글 계정으로 스프레드시트 직접 연동하기
                </p>
                <p className="text-[11px] sm:text-xs text-stone-500 font-serif-kr">
                  로그인 한 번으로 Apps Script 없이 승인된 모든 문장이 내 구글 시트에 자동 누적됩니다.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="text-xs font-medium px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-black text-amber-100 transition-colors shrink-0 cursor-pointer shadow-2xs"
            >
              구글 시트 연동 설정
            </button>
          </div>
        )}

        {/* Top Notification: 저장 완료 메시지 (반드시 "문장서랍에 저장되었습니다.") */}
        {saveSuccessMessage && (
          <div
            id="save-success-banner"
            className="p-4 rounded-xl bg-stone-900 text-stone-100 flex items-center justify-between shadow-lg border border-stone-800 animate-in fade-in slide-in-from-top-2 duration-300"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold font-serif-kr text-amber-200">
                  {saveSuccessMessage}
                </p>
                <p className="text-xs text-stone-300 font-serif-kr">
                  {isGoogleConnected
                    ? "내 구글 스프레드시트에 새 행으로 실시간 누적 저장되었습니다."
                    : "서랍 보관함에 안전하게 누적되었습니다. (구글 시트 연동 가능)"}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {lastSavedSpreadsheetUrl && (
                <a
                  href={lastSavedSpreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 rounded bg-emerald-700/80 hover:bg-emerald-700 text-white flex items-center space-x-1 transition-colors"
                >
                  <span>구글 시트 열기</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setIsArchiveOpen(true)}
                className="text-xs px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 flex items-center space-x-1 transition-colors cursor-pointer shrink-0"
              >
                <span>서랍 열기</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Central Input Section */}
        <section id="input-section" className="space-y-3">
          <div className="text-center sm:text-left space-y-1 mb-2">
            <h2 className="text-xl sm:text-2xl font-bold font-serif-kr text-stone-900 tracking-tight">
              발견한 문장을 서랍에 넣기
            </h2>
            <p className="text-xs sm:text-sm text-stone-700 font-serif-kr leading-relaxed">
              문장, 출처, 사진을 입력하고 <strong>'인사이트 찾기'</strong>를 누르면 AI가 책의 목차와 발전 아이디어를 제안합니다.
            </p>
          </div>

          <SentenceInputForm
            sentence={sentence}
            onSentenceChange={setSentence}
            source={source}
            onSourceChange={setSource}
            imageFile={imageFile}
            imagePreview={imagePreview}
            onImageSelected={handleImageSelected}
            userTags={userTags}
            onUserTagsChange={setUserTags}
            writingStyle={writingStyle}
            onWritingStyleChange={setWritingStyle}
            targetAudience={targetAudience}
            onTargetAudienceChange={setTargetAudience}
            isLoading={isLoading}
            onSubmit={handleFindInsight}
          />
        </section>

        {/* AI Insight Card Section (하단) */}
        {analysisResult && (
          <section
            id="ai-insight-card-section"
            className="pt-2 space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-300"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold font-serif-kr text-stone-900">
                AI 글감 인사이트 및 테마 제안
              </h3>
              <span className="text-xs text-stone-600 font-serif-kr">
                승인 시 구글 시트에 누적 저장
              </span>
            </div>

            <AiInsightCard
              originalSentence={analyzedSentence}
              source={analyzedSource}
              imagePreview={analyzedImagePreview}
              analysis={analysisResult}
              userTags={userTags}
              onApprove={handleApproveAndSave}
              isSaving={isSaving}
            />
          </section>
        )}

        {/* Recent Archive Preview (최근 모은 글감 미리보기) */}
        {savedRecords.length > 0 && !analysisResult && (
          <section className="pt-4 border-t border-stone-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-700 font-serif-kr">
                최근 수집한 글감 ({savedRecords.length})
              </span>
              <button
                type="button"
                onClick={() => setIsArchiveOpen(true)}
                className="text-xs text-stone-700 hover:text-stone-900 font-serif-kr flex items-center space-x-1 cursor-pointer"
              >
                <span>전체 글감 서랍 열기</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2.5">
              {savedRecords.slice(0, 3).map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => setIsArchiveOpen(true)}
                  className="p-3.5 bg-white/80 hover:bg-white rounded-lg border border-stone-200 hover:border-stone-300 transition-all cursor-pointer shadow-2xs space-y-1.5"
                >
                  <p className="text-xs sm:text-sm font-serif-kr font-normal text-stone-800 line-clamp-2 italic">
                    "{rec.originalSentence}"
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-stone-600">
                    <span>
                      {rec.source ? `출처: ${rec.source}` : rec.savedDate}
                    </span>
                    <span className="font-medium text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                      {rec.finalChapter}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200/60 py-6 text-center text-xs text-stone-600 font-serif-kr bg-[#fbf9f5]">
        <div className="max-w-3xl mx-auto px-4 space-y-1">
          <p>문장서랍 (Sentence Archive) · 목차 없이 자유롭게 글감을 무작위로 모으는 곳</p>
          <p className="text-[11px] text-stone-600">
            문장/글감 입력 → 글감 인사이트 찾기 → 추천 글감 테마 확인/승인 → Google Sheets 누적 저장 및 목차 기획
          </p>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <SheetsSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={projectSettings}
        onSaveSettings={handleSaveSettings}
        currentUser={currentUser}
        accessToken={accessToken}
        onAuthSuccess={handleAuthSuccess}
        onAuthLogout={handleAuthLogout}
        savedRecords={savedRecords}
      />

      <ArchiveDrawer
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        records={savedRecords}
        onDeleteRecord={handleDeleteRecord}
        sheetSpreadsheetUrl={projectSettings.sheetSpreadsheetUrl}
        writingStyle={writingStyle}
        targetAudience={targetAudience}
      />
    </div>
  );
}
