import React, { useState } from "react";
import {
  X,
  Archive,
  Download,
  Copy,
  Check,
  Search,
  BookOpen,
  Calendar,
  ExternalLink,
  Trash2,
  Tag,
  Sparkles,
  Loader2,
  Layers,
  ChevronRight,
} from "lucide-react";
import { SavedSentenceRecord, SynthesizedOutline } from "../types";
import { copyAsSheetsTsv, downloadCsv } from "../utils/exportSheets";

interface ArchiveDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  records: SavedSentenceRecord[];
  onDeleteRecord: (id: string) => void;
  sheetSpreadsheetUrl?: string;
  writingStyle?: string;
  targetAudience?: string;
}

export const ArchiveDrawer: React.FC<ArchiveDrawerProps> = ({
  isOpen,
  onClose,
  records,
  onDeleteRecord,
  sheetSpreadsheetUrl,
  writingStyle,
  targetAudience,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // AI Outline Synthesis State
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesizedOutline, setSynthesizedOutline] = useState<SynthesizedOutline | null>(null);
  const [outlineError, setOutlineError] = useState<string | null>(null);
  const [outlineCopied, setOutlineCopied] = useState(false);

  if (!isOpen) return null;

  // Extract all unique tags
  const allTags: string[] = Array.from(
    new Set(records.flatMap((r) => [...(r.userTags || []), ...(r.keywords || [])]))
  ).map((t) => String(t).replace(/^#/, ""));

  const filteredRecords = records.filter((rec) => {
    const matchesSearch =
      !searchQuery ||
      rec.originalSentence.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.aiInsight.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.finalChapter.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTag =
      !selectedTag ||
      (rec.userTags && rec.userTags.includes(selectedTag)) ||
      (rec.keywords && rec.keywords.some((k) => k.replace(/^#/, "") === selectedTag));

    return matchesSearch && matchesTag;
  });

  const handleCopyAll = () => {
    const ok = copyAsSheetsTsv(records);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    downloadCsv(records);
  };

  const handleSynthesizeOutline = async () => {
    if (records.length === 0) return;
    setIsSynthesizing(true);
    setOutlineError(null);

    try {
      const res = await fetch("/api/synthesize-outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records,
          writingStyle,
          targetAudience,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "목차 구성에 실패했습니다.");
      }

      const data: SynthesizedOutline = await res.json();
      setSynthesizedOutline(data);
    } catch (err: any) {
      console.error("Synthesize outline error:", err);
      setOutlineError(err.message || "목차를 구성하는 중 문제가 발생했습니다.");
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleCopyOutline = () => {
    if (!synthesizedOutline) return;
    const text = `[도서 가제] ${synthesizedOutline.proposedBookTitle}

[기획 총평]
${synthesizedOutline.bookOverview}

[챕터 목차 구성안]
${synthesizedOutline.chapters
  .map(
    (ch) => `${ch.chapterNumber}. ${ch.chapterTitle}
- 개요: ${ch.description}
- 배치된 글감:
${ch.matchedSentences.map((s) => `  * "${s}"`).join("\n")}`
  )
  .join("\n\n")}`;

    navigator.clipboard.writeText(text);
    setOutlineCopied(true);
    setTimeout(() => setOutlineCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#fcfbf9] w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-stone-200">
        {/* Header */}
        <div className="p-5 border-b border-stone-200/80 bg-white flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-stone-900 text-stone-100 flex items-center justify-center">
              <Archive className="w-4 h-4 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold font-serif-kr text-stone-900">
                  수집된 글감 보관함
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-medium">
                  총 {records.length}개 글감 누적
                </span>
              </div>
              <p className="text-xs text-stone-500 font-serif-kr">
                목차가 없어도 괜찮습니다. 자유롭게 모아둔 글감과 인사이트 목록
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-2 rounded-lg hover:bg-stone-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI 목차 구성 기획 제안 배너 */}
        {records.length > 0 && (
          <div className="px-5 py-3 bg-gradient-to-r from-amber-50/80 via-amber-100/50 to-stone-50 border-b border-amber-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-amber-800 shrink-0" />
              <div>
                <span className="text-xs font-semibold text-stone-900 font-serif-kr">
                  모아둔 글감으로 책 목차 구성하기
                </span>
                <p className="text-[11px] text-stone-600 font-serif-kr">
                  무작위로 수집된 {records.length}개의 글감들을 연결하여 한 권의 책 목차를 기획합니다.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isSynthesizing}
              onClick={handleSynthesizeOutline}
              className="px-3 py-1.5 rounded-md bg-stone-900 hover:bg-stone-800 text-amber-100 text-xs font-serif-kr font-medium flex items-center space-x-1.5 transition-all cursor-pointer shadow-2xs shrink-0 disabled:opacity-50"
            >
              {isSynthesizing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>글감 분석 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>AI 목차 기획안 생성</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Synthesized Outline Modal/Card */}
        {synthesizedOutline && (
          <div className="m-4 p-4 rounded-xl bg-[#fffefb] border border-amber-300 shadow-md space-y-3.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-amber-200/70 pb-2.5">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span className="text-xs font-bold text-stone-900 font-serif-kr">
                  수집 글감 기반 [도서 기획 목차안]
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCopyOutline}
                  className="text-xs px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center space-x-1 cursor-pointer"
                >
                  {outlineCopied ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3 text-stone-500" />
                  )}
                  <span>{outlineCopied ? "복사됨!" : "기획안 복사"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSynthesizedOutline(null)}
                  className="text-stone-400 hover:text-stone-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-amber-900">가상 도서 가제</div>
              <h3 className="text-base sm:text-lg font-serif-kr font-bold text-stone-900">
                "{synthesizedOutline.proposedBookTitle}"
              </h3>
              <p className="text-xs font-serif-kr text-stone-700 leading-relaxed pt-1">
                {synthesizedOutline.bookOverview}
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-stone-200/80">
              <div className="text-xs font-semibold text-stone-800 font-serif-kr">
                추천 챕터 구성:
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {synthesizedOutline.chapters.map((ch, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-stone-50/90 rounded-lg border border-stone-200 space-y-1 text-xs font-serif-kr"
                  >
                    <div className="font-bold text-stone-900 flex items-center space-x-1.5">
                      <span className="text-amber-800">{ch.chapterNumber}</span>
                      <span>{ch.chapterTitle}</span>
                    </div>
                    <p className="text-stone-600 text-[11px]">{ch.description}</p>
                    {ch.matchedSentences && ch.matchedSentences.length > 0 && (
                      <div className="pt-1.5 border-t border-stone-200/60 mt-1.5">
                        <span className="text-[10px] text-stone-400">배치된 글감 문장:</span>
                        <ul className="list-disc list-inside text-[11px] text-stone-700 space-y-0.5 mt-0.5">
                          {ch.matchedSentences.map((s, sIdx) => (
                            <li key={sIdx} className="italic truncate">
                              "{s}"
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {outlineError && (
          <div className="mx-4 mt-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
            {outlineError}
          </div>
        )}

        {/* Toolbar */}
        <div className="p-4 bg-white/70 border-b border-stone-200/60 space-y-3">
          {/* Search & Actions */}
          <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="문장, 출처, 글감 테마 검색..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-stone-600"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleCopyAll}
                disabled={records.length === 0}
                className="text-xs px-2.5 py-1.5 rounded-md border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 flex items-center space-x-1 cursor-pointer disabled:opacity-40"
                title="Google Sheets에 붙여넣을 수 있도록 클립보드에 복사합니다"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "시트 복사완료!" : "시트 복사"}</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                disabled={records.length === 0}
                className="text-xs px-2.5 py-1.5 rounded-md border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 flex items-center space-x-1 cursor-pointer disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>

              {sheetSpreadsheetUrl && (
                <a
                  href={sheetSpreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-2.5 py-1.5 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 flex items-center space-x-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>구글 시트</span>
                </a>
              )}
            </div>
          </div>

          {/* Tag Filter Pills */}
          {allTags.length > 0 && (
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
              <span className="text-[11px] text-stone-400 shrink-0">태그 필터:</span>
              <button
                type="button"
                onClick={() => setSelectedTag(null)}
                className={`text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap cursor-pointer ${
                  selectedTag === null
                    ? "bg-stone-800 text-white font-medium"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                전체
              </button>
              {allTags.slice(0, 15).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTag(selectedTag === t ? null : t)}
                  className={`text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap cursor-pointer ${
                    selectedTag === t
                      ? "bg-amber-800 text-amber-50 font-medium"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  #{t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Record List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {filteredRecords.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-stone-200 rounded-xl">
              <BookOpen className="w-8 h-8 text-stone-300 mb-2" />
              <p className="text-sm font-serif-kr text-stone-600 font-medium">
                {records.length === 0
                  ? "아직 서랍에 보관된 글감이 없습니다."
                  : "검색 결과와 일치하는 글감이 없습니다."}
              </p>
              <p className="text-xs text-stone-400 font-serif-kr mt-1">
                {records.length === 0
                  ? "목차가 없어도 괜찮습니다. 좋은 문장을 입력하고 '글감 인사이트 찾기' 후 서랍에 담아보세요."
                  : "다른 검색어나 태그를 선택해주세요."}
              </p>
            </div>
          ) : (
            filteredRecords.map((rec) => (
              <div
                key={rec.id}
                className="bg-white rounded-xl p-4 sm:p-5 border border-stone-200 shadow-2xs space-y-3.5 hover:border-stone-300 transition-all"
              >
                {/* Meta header */}
                <div className="flex items-center justify-between text-[11px] text-stone-400 border-b border-stone-100 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-stone-400" />
                      <span>{rec.savedDate}</span>
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-medium text-[10px] ${
                        rec.approvalStatus === "수정 승인"
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : "bg-stone-100 text-stone-700"
                      }`}
                    >
                      {rec.approvalStatus}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteRecord(rec.id)}
                    className="text-stone-300 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                    title="글감 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Original sentence */}
                <div className="flex gap-3 justify-between items-start">
                  <div className="space-y-1 flex-1">
                    <p className="text-sm sm:text-base font-serif-kr font-medium text-stone-900 leading-relaxed italic">
                      "{rec.originalSentence}"
                    </p>
                    {rec.source && (
                      <p className="text-xs text-stone-500 font-serif-kr">
                        출처: <span className="text-stone-700 font-medium">{rec.source}</span>
                      </p>
                    )}
                  </div>
                  {rec.photoDataUrl && (
                    <img
                      src={rec.photoDataUrl}
                      alt="첨부 사진"
                      className="w-14 h-14 object-cover rounded border border-stone-200 shrink-0"
                    />
                  )}
                </div>

                {/* AI Insight */}
                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100 text-xs font-serif-kr text-stone-800 leading-relaxed">
                  <div className="text-[10px] font-semibold text-amber-900/80 mb-1">
                    💡 글감 발전 아이디어
                  </div>
                  {rec.aiInsight}
                </div>

                {/* Final Chapter / Theme */}
                <div className="flex items-baseline space-x-2 text-xs font-serif-kr">
                  <span className="text-stone-400 font-medium shrink-0">
                    글감 테마:
                  </span>
                  <span className="font-semibold text-stone-900 bg-stone-100 px-2 py-0.5 rounded">
                    {rec.finalChapter}
                  </span>
                </div>

                {/* Keywords & User Tags */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {rec.keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="text-[11px] px-2 py-0.5 bg-stone-100 text-stone-600 rounded"
                    >
                      {kw.startsWith("#") ? kw : `#${kw}`}
                    </span>
                  ))}
                  {rec.userTags &&
                    rec.userTags.map((ut, i) => (
                      <span
                        key={`ut-${i}`}
                        className="text-[11px] px-2 py-0.5 bg-amber-100/80 text-amber-900 rounded font-medium"
                      >
                        #{ut}
                      </span>
                    ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
