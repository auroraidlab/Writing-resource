import React, { useState, useRef } from "react";
import {
  ImagePlus,
  X,
  Sparkles,
  SlidersHorizontal,
  Tag,
  BookOpen,
  Users,
  Feather,
  Mic,
  Square,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useVoiceRecorder } from "../utils/useVoiceRecorder";

interface SentenceInputFormProps {
  sentence: string;
  onSentenceChange: (val: string) => void;
  source: string;
  onSourceChange: (val: string) => void;
  imageFile: File | null;
  imagePreview: string | null;
  onImageSelected: (file: File | null, previewUrl: string | null) => void;
  userTags: string[];
  onUserTagsChange: (tags: string[]) => void;
  writingStyle: string;
  onWritingStyleChange: (style: string) => void;
  targetAudience: string;
  onTargetAudienceChange: (audience: string) => void;
  isLoading: boolean;
  onSubmit: () => void;
}

const PRESET_STYLES = [
  "사색적이고 지적인 에세이",
  "2030을 위한 따뜻하고 실천적인 자기계발",
  "명쾌하고 직관적인 비즈니스/인문",
  "스토리텔링과 문학적 비유",
];

const PRESET_AUDIENCES = [
  "2030 사회초년생 및 청년",
  "인생의 전환점을 맞이한 직장인",
  "생각과 글쓰기를 사랑하는 독자",
  "더 나은 일상을 가꾸고 싶은 대중",
];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export const SentenceInputForm: React.FC<SentenceInputFormProps> = ({
  sentence,
  onSentenceChange,
  source,
  onSourceChange,
  imagePreview,
  onImageSelected,
  userTags,
  onUserTagsChange,
  writingStyle,
  onWritingStyleChange,
  targetAudience,
  onTargetAudienceChange,
  isLoading,
  onSubmit,
}) => {
  const [showAdvancedStyle, setShowAdvancedStyle] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice recording integration
  const handleTranscriptComplete = (transcript: string) => {
    if (!transcript) return;
    onSentenceChange(sentence.trim() ? `${sentence.trim()} ${transcript}` : transcript);
  };

  const {
    isRecording,
    isTranscribing,
    recordingDuration,
    interimTranscript,
    errorMessage: recorderError,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceRecorder(handleTranscriptComplete);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        onImageSelected(file, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    onImageSelected(null, null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAddTag = (tagToAdd: string) => {
    const clean = tagToAdd.trim().replace(/^#/, "");
    if (clean && !userTags.includes(clean)) {
      onUserTagsChange([...userTags, clean]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (indexToRemove: number) => {
    onUserTagsChange(userTags.filter((_, i) => i !== indexToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-5 sm:p-7 transition-all">
      {/* 1. 원문 문장 (가장 중요한 입력 - 큰 입력창 + 음성 녹음 기능) */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <label
            htmlFor="sentence-input"
            className="block text-sm font-semibold text-stone-900 font-serif-kr flex items-center space-x-1.5"
          >
            <Feather className="w-4 h-4 text-amber-800" />
            <span>1. 원문 문장</span>
            <span className="text-xs font-normal text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
              필수 입력
            </span>
          </label>

          <div className="flex items-center space-x-2">
            {/* Voice Recording Button */}
            <button
              type="button"
              id="voice-record-btn"
              disabled={isLoading || isTranscribing}
              onClick={isRecording ? () => stopRecording() : () => startRecording()}
              className={`text-xs px-2.5 py-1 rounded-md border flex items-center space-x-1.5 transition-all cursor-pointer ${
                isRecording
                  ? "bg-red-50 text-red-700 border-red-300 animate-pulse font-medium shadow-2xs"
                  : "bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100 hover:text-stone-900"
              } disabled:opacity-50`}
              title="음성으로 문장 말해서 입력하기"
            >
              {isRecording ? (
                <>
                  <Square className="w-3.5 h-3.5 text-red-600 fill-red-600" />
                  <span>녹음 중지 ({formatDuration(recordingDuration)})</span>
                </>
              ) : isTranscribing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-stone-600 animate-spin" />
                  <span>텍스트 변환 중...</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-amber-800" />
                  <span className="font-serif-kr">음성 녹음으로 입력</span>
                </>
              )}
            </button>

            <span className="text-xs text-stone-600">
              {sentence.length}자
            </span>
          </div>
        </div>

        {/* Live Recording Status Bar */}
        {isRecording && (
          <div className="mb-2.5 p-3 rounded-lg bg-red-50/90 border border-red-200 flex items-center justify-between text-xs animate-in fade-in duration-200">
            <div className="flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping shrink-0" />
              <div>
                <span className="font-semibold text-red-950 font-serif-kr">
                  음성을 듣고 있습니다... ({formatDuration(recordingDuration)})
                </span>
                {interimTranscript && (
                  <p className="text-stone-700 font-serif-kr mt-0.5 italic">
                    "{interimTranscript}"
                  </p>
                )}
                {!interimTranscript && (
                  <p className="text-stone-500 font-serif-kr mt-0.5">
                    마이크에 대고 책의 문장을 말씀해 주세요.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-1.5 shrink-0 ml-2">
              <button
                type="button"
                onClick={() => stopRecording()}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-medium text-xs cursor-pointer shadow-2xs"
              >
                녹음 완료
              </button>
              <button
                type="button"
                onClick={cancelRecording}
                className="px-2 py-1 text-stone-500 hover:text-stone-800 text-xs cursor-pointer"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* Transcribing State Bar */}
        {isTranscribing && (
          <div className="mb-2.5 p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 flex items-center space-x-2 text-xs text-amber-900 animate-in fade-in duration-200">
            <Loader2 className="w-3.5 h-3.5 text-amber-700 animate-spin shrink-0" />
            <span className="font-serif-kr">
              녹음된 음성을 정돈된 문장으로 텍스트 변환하고 있습니다...
            </span>
          </div>
        )}

        {/* Recorder Error Message */}
        {recorderError && (
          <div className="mb-2.5 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center space-x-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span>{recorderError}</span>
          </div>
        )}

        <textarea
          id="sentence-input"
          rows={4}
          value={sentence}
          onChange={(e) => onSentenceChange(e.target.value)}
          placeholder="목차가 아직 없어도 괜찮습니다. 책의 씨앗이 될 만한 좋은 문장을 적거나, 위의 '음성 녹음' 버튼을 눌러 말해주세요. 책에서 읽은 한 줄, 마음에 와닿은 대화, 스쳐간 단상 등..."
          className="w-full px-4 py-3.5 text-base sm:text-lg font-serif-kr text-stone-900 placeholder:text-stone-400 bg-[#fdfcf9] border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-stone-700 focus:border-stone-700 leading-relaxed transition-all resize-y min-h-[110px]"
        />
      </div>

      {/* 2. 출처 & 3. 사진 첨부 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {/* 출처 입력창 */}
        <div>
          <label
            htmlFor="source-input"
            className="block text-xs font-semibold text-stone-700 mb-1.5 font-serif-kr"
          >
            2. 출처
          </label>
          <input
            id="source-input"
            type="text"
            value={source}
            onChange={(e) => onSourceChange(e.target.value)}
            placeholder="책 이름, 저자, 기사, 강연, 사람, 장소 등 (자유 입력)"
            className="w-full px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 bg-[#fdfcf9] border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-stone-700 focus:border-stone-700 transition-all"
          />
        </div>

        {/* 사진 추가 */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1.5 font-serif-kr">
            3. 사진 첨부 (선택)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="photo-upload-input"
          />

          {!imagePreview ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-3.5 border border-dashed border-stone-300 hover:border-stone-400 rounded-lg text-xs text-stone-600 bg-[#fdfcf9] hover:bg-stone-50 flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <ImagePlus className="w-4 h-4 text-stone-500" />
              <span>책 페이지 · 현장 사진 · 메모 사진 추가</span>
            </button>
          ) : (
            <div className="relative inline-flex items-center space-x-2 bg-stone-100 p-1.5 rounded-lg border border-stone-200">
              <img
                src={imagePreview}
                alt="첨부 사진 미리보기"
                className="w-10 h-10 object-cover rounded"
              />
              <span className="text-xs text-stone-700 truncate max-w-[150px]">
                사진 첨부 완료
              </span>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200 transition-colors cursor-pointer"
                title="사진 삭제"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 사용자 정의 태그 (User Tags) */}
      <div className="mb-4 pt-3 border-t border-stone-100">
        <label className="block text-xs font-semibold text-stone-700 mb-1.5 flex items-center space-x-1.5">
          <Tag className="w-3.5 h-3.5 text-stone-600" />
          <span>사용자 태그 (선택)</span>
          <span className="text-[11px] font-normal text-stone-600">
            직접 카테고리나 테마를 지정 (쉼표 또는 엔터로 등록)
          </span>
        </label>
        <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[#fdfcf9] border border-stone-200 rounded-lg min-h-[40px]">
          {userTags.map((tag, idx) => (
            <span
              key={idx}
              className="inline-flex items-center space-x-1 text-xs px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-300"
            >
              <span>#{tag}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(idx)}
                className="hover:text-red-600 text-stone-400 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={() => {
              if (tagInput.trim()) handleAddTag(tagInput);
            }}
            placeholder={userTags.length === 0 ? "태그 입력 (예: 영감, 1장도입, 공간감)" : "추가 입력..."}
            className="text-xs bg-transparent border-none focus:outline-hidden text-stone-800 flex-1 min-w-[120px]"
          />
        </div>
      </div>

      {/* 맞춤형 집필 설정 (집필 스타일 & 타겟 독자층) */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setShowAdvancedStyle(!showAdvancedStyle)}
          className="text-xs text-stone-600 hover:text-stone-900 flex items-center space-x-1.5 cursor-pointer py-1"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-amber-700" />
          <span className="font-medium">
            {showAdvancedStyle ? "집필 설정 접기" : "책 집필 스타일 및 타겟 독자층 맞춤 설정 (선택)"}
          </span>
          {(writingStyle || targetAudience) && (
            <span className="w-2 h-2 rounded-full bg-amber-600 inline-block ml-1" />
          )}
        </button>

        {showAdvancedStyle && (
          <div className="mt-3 p-4 rounded-lg bg-stone-50/80 border border-stone-200 space-y-4 animate-in fade-in duration-200">
            {/* 집필 스타일 */}
            <div>
              <div className="flex items-center space-x-1.5 mb-1.5">
                <BookOpen className="w-3.5 h-3.5 text-stone-700" />
                <label className="text-xs font-semibold text-stone-800">
                  집필 스타일 (톤앤매너)
                </label>
              </div>
              <input
                type="text"
                value={writingStyle}
                onChange={(e) => onWritingStyleChange(e.target.value)}
                placeholder="예: 사색적이고 문학적인 에세이, 실천 중심의 자기계발서 등"
                className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-stone-700 mb-1.5"
              />
              <div className="flex flex-wrap gap-1">
                {PRESET_STYLES.map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => onWritingStyleChange(style)}
                    className={`text-[11px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      writingStyle === style
                        ? "bg-amber-100 text-amber-900 border-amber-300"
                        : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* 타겟 독자층 */}
            <div>
              <div className="flex items-center space-x-1.5 mb-1.5">
                <Users className="w-3.5 h-3.5 text-stone-700" />
                <label className="text-xs font-semibold text-stone-800">
                  타겟 독자층
                </label>
              </div>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => onTargetAudienceChange(e.target.value)}
                placeholder="예: 2030 사회초년생, 번아웃을 겪는 직장인 등"
                className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-stone-700 mb-1.5"
              />
              <div className="flex flex-wrap gap-1">
                {PRESET_AUDIENCES.map((audience) => (
                  <button
                    key={audience}
                    type="button"
                    onClick={() => onTargetAudienceChange(audience)}
                    className={`text-[11px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      targetAudience === audience
                        ? "bg-amber-100 text-amber-900 border-amber-300"
                        : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
                    }`}
                  >
                    {audience}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 메인 버튼: "인사이트 찾기" (하나만 둠) */}
      <div>
        <button
          id="find-insight-btn"
          type="button"
          disabled={isLoading || !sentence.trim()}
          onClick={onSubmit}
          className="w-full py-3.5 px-6 rounded-lg bg-stone-900 hover:bg-black text-amber-100 font-serif-kr font-semibold text-base flex items-center justify-center space-x-2.5 transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-amber-200/40 border-t-amber-200 rounded-full animate-spin" />
              <span>AI가 글감의 인사이트와 테마를 찾는 중...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>글감 인사이트 찾기</span>
            </>
          )}
        </button>
        <p className="text-center text-[11px] text-stone-600 mt-2 font-serif-kr">
          버튼을 누르면 AI가 글감의 잠재적 테마와 책쓰기 발전 아이디어를 분석하여 제안합니다.
        </p>
      </div>
    </div>
  );
};
