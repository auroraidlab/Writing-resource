import React, { useState, useEffect } from "react";
import {
  Quote,
  Lightbulb,
  Hash,
  BookMarked,
  Check,
  Edit3,
  Tag,
  CheckCircle,
  FolderPlus,
} from "lucide-react";
import { AIAnalysisResult } from "../types";

interface AiInsightCardProps {
  originalSentence: string;
  source: string;
  imagePreview: string | null;
  analysis: AIAnalysisResult;
  userTags: string[];
  onApprove: (
    finalChapter: string,
    isModified: boolean,
    updatedTags: string[]
  ) => void;
  isSaving: boolean;
}

export const AiInsightCard: React.FC<AiInsightCardProps> = ({
  originalSentence,
  source,
  imagePreview,
  analysis,
  userTags,
  onApprove,
  isSaving,
}) => {
  const [editedChapter, setEditedChapter] = useState(analysis.recommendedChapter);
  const [currentTags, setCurrentTags] = useState<string[]>(userTags);
  const [newTagInput, setNewTagInput] = useState("");

  useEffect(() => {
    setEditedChapter(analysis.recommendedChapter);
  }, [analysis.recommendedChapter]);

  useEffect(() => {
    setCurrentTags(userTags);
  }, [userTags]);

  const isModified = editedChapter.trim() !== analysis.recommendedChapter.trim();

  const handleAddTag = () => {
    const clean = newTagInput.trim().replace(/^#/, "");
    if (clean && !currentTags.includes(clean)) {
      setCurrentTags([...currentTags, clean]);
      setNewTagInput("");
    }
  };

  const handleRemoveTag = (idx: number) => {
    setCurrentTags(currentTags.filter((_, i) => i !== idx));
  };

  return (
    <div className="bg-[#fffefb] border border-amber-900/20 rounded-xl shadow-md p-6 sm:p-8 space-y-6 animate-in fade-in duration-300 relative overflow-hidden">
      {/* Editorial Header */}
      <div className="flex items-center justify-between border-b border-stone-200/80 pb-4">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-amber-600" />
          <h2 className="text-xs font-semibold tracking-wider uppercase text-stone-700 font-editorial">
            Writing Seed Insight
          </h2>
          <span className="text-xs text-stone-600 font-serif-kr">
            · 수집된 글감 분석
          </span>
        </div>
        <div className="text-[11px] text-amber-900/80 bg-amber-50/80 px-2.5 py-1 rounded-full border border-amber-200/60 font-serif-kr">
          서랍에 글감 보관 대기
        </div>
      </div>

      {/* 1. 수집된 원문 문장 */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold text-stone-600 uppercase tracking-wide flex items-center space-x-1">
          <Quote className="w-3.5 h-3.5 text-stone-400" />
          <span>수집된 원문 문장</span>
        </div>
        <div className="p-4 sm:p-5 rounded-lg bg-stone-50/90 border-l-4 border-stone-800 flex flex-col sm:flex-row gap-4 justify-between items-start">
          <div className="space-y-2 flex-1">
            <p className="text-lg sm:text-xl font-serif-kr font-normal text-stone-900 leading-relaxed italic">
              "{originalSentence}"
            </p>
            {source && (
              <p className="text-xs text-stone-700 font-serif-kr">
                출처: <span className="text-stone-800 font-medium">{source}</span>
              </p>
            )}
          </div>
          {imagePreview && (
            <div className="shrink-0">
              <img
                src={imagePreview}
                alt="첨부된 사진"
                className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-md border border-stone-200 shadow-2xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* 2. AI 인사이트 (글감 발전 아이디어) */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide flex items-center space-x-1.5">
          <Lightbulb className="w-4 h-4 text-amber-600" />
          <span>AI INSIGHT (글감 발전 아이디어)</span>
        </div>
        <div className="p-4 rounded-lg bg-amber-50/40 border border-amber-200/60">
          <p className="text-sm sm:text-base font-serif-kr text-stone-800 leading-relaxed">
            {analysis.insight}
          </p>
        </div>
      </div>

      {/* 3. 핵심 키워드 & 4. 사용자 태그 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 핵심 키워드 (연결 고리) */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-stone-600 uppercase tracking-wide flex items-center space-x-1">
            <Hash className="w-3.5 h-3.5 text-stone-500" />
            <span>소재 연결 키워드 (AI 추출)</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {analysis.keywords.map((kw, idx) => (
              <span
                key={idx}
                className="text-xs font-serif-kr px-2.5 py-1 rounded-md bg-stone-100 text-stone-800 font-medium border border-stone-200"
              >
                {kw.startsWith("#") ? kw : `#${kw}`}
              </span>
            ))}
          </div>
        </div>

        {/* 사용자 태그 (User Tags) */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-stone-600 uppercase tracking-wide flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <Tag className="w-3.5 h-3.5 text-stone-500" />
              <span>사용자 태그 (User Tags)</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 min-h-[30px]">
            {currentTags.length > 0 ? (
              currentTags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2 py-0.5 rounded-md bg-amber-100/70 text-amber-900 border border-amber-200 flex items-center space-x-1"
                >
                  <span>#{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(idx)}
                    className="hover:text-red-700 text-amber-700 text-[10px] ml-0.5 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))
            ) : (
              <span className="text-xs text-stone-600 italic">등록된 태그 없음</span>
            )}
          </div>
          {/* Quick tag adder */}
          <div className="flex items-center space-x-1.5 pt-1">
            <input
              type="text"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="태그 추가 (+ 엔터)"
              className="text-xs px-2.5 py-1 bg-white border border-stone-200 rounded focus:outline-hidden focus:ring-1 focus:ring-stone-500 text-stone-800 w-28"
            />
            <button
              type="button"
              onClick={handleAddTag}
              disabled={!newTagInput.trim()}
              className="text-xs px-2 py-1 bg-stone-200 hover:bg-stone-300 disabled:opacity-40 rounded text-stone-700 cursor-pointer"
            >
              추가
            </button>
          </div>
        </div>
      </div>

      {/* 5. 글감 테마 제안 및 서랍 보관 승인 */}
      <div className="border-t border-stone-200/80 pt-5 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="recommended-chapter-input"
              className="text-xs font-semibold text-stone-900 font-serif-kr flex items-center space-x-1.5"
            >
              <BookMarked className="w-4 h-4 text-amber-700" />
              <span>추천 글감 테마 (잠재적 주제 제안)</span>
            </label>
            <span className="text-[11px] text-stone-500 font-serif-kr">
              * 정해진 목차가 없어도 괜찮습니다
            </span>
          </div>

          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 mb-2">
            <div className="text-[11px] text-stone-500 mb-0.5">AI 제안 글감 테마:</div>
            <div className="text-sm font-serif-kr font-semibold text-stone-900">
              "{analysis.recommendedChapter}"
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              나중에 글감들이 쌓였을 때 이 테마나 키워드를 기준으로 책의 챕터를 자연스럽게 엮을 수 있습니다.
            </p>
          </div>

          {/* 글감 테마/메모 직접 수정 */}
          <div>
            <label
              htmlFor="chapter-edit-input"
              className="block text-[11px] text-stone-600 mb-1 flex items-center space-x-1"
            >
              <Edit3 className="w-3 h-3 text-stone-500" />
              <span>글감 테마 또는 분류 메모 직접 수정 (선택)</span>
            </label>
            <input
              id="chapter-edit-input"
              type="text"
              value={editedChapter}
              onChange={(e) => setEditedChapter(e.target.value)}
              placeholder="예: 일상의 관찰, 사유의 조각, 에피소드 등 (자유 입력)"
              className="w-full px-3.5 py-2.5 text-sm font-serif-kr text-stone-900 bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-stone-800"
            />
          </div>
        </div>

        {/* 승인 및 서랍 보관 버튼 (3가지 편의 옵션) */}
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* AI 추천 테마로 보관 */}
          <button
            id="approve-original-btn"
            type="button"
            disabled={isSaving}
            onClick={() => onApprove(analysis.recommendedChapter, false, currentTags)}
            className="py-3 px-4 rounded-lg bg-stone-800 hover:bg-stone-900 text-stone-100 font-medium text-xs sm:text-sm font-serif-kr flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>추천 글감 테마로 보관</span>
          </button>

          {/* 수정한 테마로 보관 (또는 자유 테마) */}
          <button
            id="approve-modified-btn"
            type="button"
            disabled={isSaving}
            onClick={() =>
              onApprove(
                editedChapter.trim() || "무작위 글감",
                isModified,
                currentTags
              )
            }
            className="py-3 px-4 rounded-lg bg-amber-900 hover:bg-amber-950 text-amber-100 font-medium text-xs sm:text-sm font-serif-kr flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-50"
          >
            <Check className="w-4 h-4 text-amber-300" />
            <span>
              {isModified ? "수정한 테마로 보관" : "현재 메모로 보관"}
            </span>
          </button>
        </div>

        <p className="text-[11px] text-center text-stone-500 pt-1 font-serif-kr">
          * 보관 즉시 내 서랍과 구글 시트에 누적 저장되며, 나중에 모인 글감들로 전체 목차를 구성할 수 있습니다.
        </p>
      </div>
    </div>
  );
};
