import React, { useState } from "react";
import { X, Share2, Copy, Check, ExternalLink, Sparkles, Eye, Image as ImageIcon } from "lucide-react";

interface OgPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OgPreviewModal: React.FC<OgPreviewModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<"photo" | "card">("photo");

  if (!isOpen) return null;

  const appUrl = window.location.origin;
  const ogTitle = "문장서랍 - Sentence Archive";
  const ogDescription =
    "책의 목차가 없는 상태에서 자유롭게 글감을 무작위로 모으고 AI 인사이트와 테마를 찾아 Google Sheets에 누적 저장하는 문장 아카이브 웹앱";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#fcfbf9] w-full max-w-xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200/80 bg-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-900 text-amber-100 flex items-center justify-center">
              <Share2 className="w-4 h-4 text-amber-200" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold font-serif-kr text-stone-900">
                오픈그래프 (Open Graph) 미리보기
              </h2>
              <p className="text-xs text-stone-500 font-serif-kr">
                카카오톡, 슬랙, SNS에 공유될 때 표시되는 카드입니다
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Card Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-700 font-serif-kr flex items-center space-x-1">
              <Eye className="w-3.5 h-3.5 text-stone-500" />
              <span>공유 카드 시각화</span>
            </span>
            <div className="flex items-center space-x-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-xs">
              <button
                type="button"
                onClick={() => setSelectedPreview("photo")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  selectedPreview === "photo"
                    ? "bg-white text-stone-900 font-medium shadow-2xs"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                감성 사진형 (JPG)
              </button>
              <button
                type="button"
                onClick={() => setSelectedPreview("card")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  selectedPreview === "card"
                    ? "bg-white text-stone-900 font-medium shadow-2xs"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                에디토리얼형 (SVG)
              </button>
            </div>
          </div>

          {/* Social Preview Container (Kakao/Facebook/Twitter style) */}
          <div className="border border-stone-300 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
            {/* Banner Image */}
            <div className="relative aspect-16/9 w-full bg-stone-100 overflow-hidden">
              <img
                src={selectedPreview === "photo" ? "/og-image.jpg" : "/og-card.svg"}
                alt="OpenGraph Preview"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <span className="absolute bottom-2 right-2 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded backdrop-blur-xs font-mono">
                1200 × 630
              </span>
            </div>

            {/* Meta text snippet */}
            <div className="p-4 space-y-1.5 bg-stone-50/60 border-t border-stone-200/80">
              <div className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">
                {appUrl.replace(/^https?:\/\//, "")}
              </div>
              <h3 className="text-sm sm:text-base font-bold font-serif-kr text-stone-900 leading-snug">
                {ogTitle}
              </h3>
              <p className="text-xs text-stone-600 font-serif-kr line-clamp-2 leading-relaxed">
                {ogDescription}
              </p>
            </div>
          </div>

          {/* Applied Meta Tags Specs */}
          <div className="p-3.5 bg-stone-100/70 rounded-xl border border-stone-200 space-y-2 text-xs">
            <div className="font-semibold text-stone-800 font-serif-kr flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>적용된 메타 태그 사양</span>
            </div>
            <div className="font-mono text-[11px] text-stone-600 space-y-1 bg-white p-2.5 rounded-lg border border-stone-200 overflow-x-auto">
              <div>&lt;meta property="og:title" content="문장서랍 - Sentence Archive" /&gt;</div>
              <div>&lt;meta property="og:image" content="/og-image.jpg" (1200x630) /&gt;</div>
              <div>&lt;meta property="og:type" content="website" /&gt;</div>
              <div>&lt;meta name="twitter:card" content="summary_large_image" /&gt;</div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-white border-t border-stone-200 flex items-center justify-between">
          <div className="text-xs text-stone-500 font-serif-kr">
            어디서든 링크를 붙여넣으면 위 카드가 노출됩니다.
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-100 text-xs font-serif-kr font-medium flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs active:scale-[0.99]"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "링크 복사완료!" : "공유 링크 복사"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
