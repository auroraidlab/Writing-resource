import React from "react";
import { BookMarked, Archive, CheckCircle2, FileSpreadsheet, ExternalLink } from "lucide-react";

interface HeaderProps {
  isGoogleConnected: boolean;
  connectedEmail?: string;
  spreadsheetUrl?: string;
  onOpenSettings: () => void;
  onOpenArchive: () => void;
  savedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  isGoogleConnected,
  connectedEmail,
  spreadsheetUrl,
  onOpenSettings,
  onOpenArchive,
  savedCount,
}) => {
  return (
    <header className="border-b border-stone-200/80 bg-[#fbf9f5]/90 backdrop-blur-sm sticky top-0 z-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        {/* Brand & Identity */}
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-stone-900 text-stone-100 flex items-center justify-center shadow-xs">
            <BookMarked className="w-5 h-5 text-amber-200/90" />
          </div>
          <div>
            <div className="flex items-baseline space-x-2">
              <h1 className="text-xl font-bold font-serif-kr text-stone-900 tracking-tight">
                문장서랍
              </h1>
              <span className="text-xs font-medium tracking-wider uppercase text-stone-700 font-editorial">
                Sentence Archive
              </span>
            </div>
            <p className="text-xs text-stone-700 font-serif-kr mt-0.5">
              목차 없이 자유롭게, 책이 될 글감을 무작위로 모으는 곳
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Direct Google Sheets connection badge / button */}
          <button
            id="open-sheets-settings-btn"
            type="button"
            onClick={onOpenSettings}
            className={`text-xs px-3 py-1.5 rounded-md border flex items-center space-x-1.5 transition-colors cursor-pointer ${
              isGoogleConnected
                ? "bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100"
                : "bg-white text-stone-700 border-stone-300 hover:border-stone-400 hover:text-stone-900"
            }`}
            title="Google Sheets 계정 및 시트 연동"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span className="font-medium">
              {isGoogleConnected ? (
                <span className="flex items-center space-x-1">
                  <span>내 구글 시트 연동됨</span>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 inline ml-0.5" />
                </span>
              ) : (
                "내 구글 시트 연동"
              )}
            </span>
          </button>

          {spreadsheetUrl && (
            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs p-1.5 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 hidden sm:flex items-center space-x-1"
              title="연동된 구글 스프레드시트 바로 열기"
            >
              <ExternalLink className="w-3.5 h-3.5 text-stone-600" />
            </a>
          )}

          {/* Archive Drawer Button */}
          <button
            id="open-archive-drawer-btn"
            type="button"
            onClick={onOpenArchive}
            className="text-xs px-3 py-1.5 rounded-md bg-stone-800 text-stone-100 hover:bg-stone-900 transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
          >
            <Archive className="w-3.5 h-3.5 text-stone-300" />
            <span>서랍 보관함</span>
            {savedCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-stone-700 text-[10px] font-semibold text-amber-200">
                {savedCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
