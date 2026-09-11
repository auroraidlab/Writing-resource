import React, { useState } from "react";
import {
  X,
  FileSpreadsheet,
  Check,
  ExternalLink,
  PlusCircle,
  LogOut,
  AlertCircle,
  Copy,
  FolderOpen,
} from "lucide-react";
import { BookProjectSettings, SavedSentenceRecord } from "../types";
import { GOOGLE_SHEETS_COLUMNS, copyAsSheetsTsv, downloadCsv } from "../utils/exportSheets";
import { googleSignIn, logoutGoogle } from "../lib/googleAuth";
import {
  createSentenceArchiveSpreadsheet,
  verifySpreadsheet,
  extractSpreadsheetId,
} from "../lib/googleSheetsApi";
import { User } from "firebase/auth";

interface SheetsSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BookProjectSettings;
  onSaveSettings: (settings: BookProjectSettings) => void;
  currentUser: User | null;
  accessToken: string | null;
  onAuthSuccess: (user: User, token: string) => void;
  onAuthLogout: () => void;
  savedRecords: SavedSentenceRecord[];
}

export const SheetsSettingsModal: React.FC<SheetsSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  currentUser,
  accessToken,
  onAuthSuccess,
  onAuthLogout,
  savedRecords,
}) => {
  const [existingSheetInput, setExistingSheetInput] = useState(
    settings.sheetSpreadsheetUrl || settings.googleSpreadsheetId || ""
  );
  const [isCreating, setIsCreating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [copiedColumns, setCopiedColumns] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  if (!isOpen) return null;

  const isConnected = Boolean(currentUser && (settings.googleSpreadsheetId || settings.sheetSpreadsheetUrl));

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setStatusMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        onAuthSuccess(result.user, result.accessToken);
        setStatusMessage({
          type: "success",
          text: `${result.user.email} 계정으로 구글 연결이 완료되었습니다.`,
        });
      }
    } catch (err: any) {
      console.error("Google login error:", err);
      setStatusMessage({
        type: "error",
        text: err.message || "구글 로그인에 실패했습니다. 팝업 차단 여부를 확인해주세요.",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutGoogle();
      onAuthLogout();
      onSaveSettings({
        ...settings,
        googleSpreadsheetId: "",
        sheetSpreadsheetUrl: "",
        googleAccountEmail: "",
      });
      setStatusMessage(null);
    } catch (err: any) {
      console.error("Logout error:", err);
    }
  };

  // 1-Click: Create brand new Google Sheet in user's Drive
  const handleCreateNewSheet = async () => {
    if (!accessToken) {
      setStatusMessage({
        type: "error",
        text: "먼저 구글 계정으로 로그인해주세요.",
      });
      return;
    }

    setIsCreating(true);
    setStatusMessage(null);
    try {
      const { spreadsheetId, spreadsheetUrl } =
        await createSentenceArchiveSpreadsheet(accessToken);

      const updatedSettings: BookProjectSettings = {
        ...settings,
        googleSpreadsheetId: spreadsheetId,
        sheetSpreadsheetUrl: spreadsheetUrl,
        googleAccountEmail: currentUser?.email || "",
      };

      onSaveSettings(updatedSettings);
      setExistingSheetInput(spreadsheetUrl);
      setStatusMessage({
        type: "success",
        text: "구글 드라이브에 '문장서랍' 스프레드시트가 성공적으로 생성되었습니다!",
      });
    } catch (err: any) {
      console.error("Failed to create spreadsheet:", err);
      setStatusMessage({
        type: "error",
        text: "스프레드시트 생성 실패: " + (err.message || String(err)),
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Connect existing Google Sheet by URL or ID
  const handleConnectExistingSheet = async () => {
    if (!accessToken) {
      setStatusMessage({
        type: "error",
        text: "먼저 구글 계정으로 로그인해주세요.",
      });
      return;
    }

    const cleanId = extractSpreadsheetId(existingSheetInput);
    if (!cleanId) {
      setStatusMessage({
        type: "error",
        text: "구글 스프레드시트 URL 또는 ID를 입력해주세요.",
      });
      return;
    }

    setIsVerifying(true);
    setStatusMessage(null);
    try {
      const { title } = await verifySpreadsheet(accessToken, cleanId);
      const sheetUrl = existingSheetInput.startsWith("http")
        ? existingSheetInput
        : `https://docs.google.com/spreadsheets/d/${cleanId}/edit`;

      const updatedSettings: BookProjectSettings = {
        ...settings,
        googleSpreadsheetId: cleanId,
        sheetSpreadsheetUrl: sheetUrl,
        googleAccountEmail: currentUser?.email || "",
      };

      onSaveSettings(updatedSettings);
      setStatusMessage({
        type: "success",
        text: `'${title}' 스프레드시트가 성공적으로 연결되었습니다!`,
      });
    } catch (err: any) {
      console.error("Failed to verify spreadsheet:", err);
      setStatusMessage({
        type: "error",
        text: "시트 연동 실패: 접근 권한이 없거나 유효하지 않은 주소입니다.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopyColumns = () => {
    navigator.clipboard.writeText(GOOGLE_SHEETS_COLUMNS.join("\t"));
    setCopiedColumns(true);
    setTimeout(() => setCopiedColumns(false), 2000);
  };

  const handleCopyAllRows = () => {
    copyAsSheetsTsv(savedRecords);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl max-w-xl w-full max-h-[92vh] overflow-y-auto border border-stone-200 flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-serif-kr text-stone-900">
                내 구글 스프레드시트 직접 연동
              </h2>
              <p className="text-xs text-stone-500 font-serif-kr">
                Apps Script 없이 구글 계정으로 직접 시트에 누적 저장합니다
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

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 text-xs sm:text-sm text-stone-700 flex-1">
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-lg border text-xs flex items-center space-x-2 ${
                statusMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                  : "bg-red-50 text-red-900 border-red-200"
              }`}
            >
              {statusMessage.type === "success" ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* STEP 1: Google Account Sign-In */}
          <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-800 font-serif-kr">
                1단계: 내 구글 계정 연결
              </span>
              {currentUser && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium flex items-center space-x-1">
                  <Check className="w-3 h-3" />
                  <span>로그인 완료</span>
                </span>
              )}
            </div>

            {!currentUser ? (
              <div className="space-y-2">
                <p className="text-xs text-stone-600 font-serif-kr">
                  구글 계정으로 로그인하면 내 구글 드라이브에 전용 시트를 자동 생성하거나 기존 시트에 즉시 연결할 수 있습니다.
                </p>

                {/* Official Material Google Sign-In button */}
                <button
                  type="button"
                  disabled={isLoggingIn}
                  onClick={handleGoogleLogin}
                  className="w-full py-2.5 px-4 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-lg font-medium text-xs flex items-center justify-center space-x-2.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>
                    {isLoggingIn ? "구글 로그인 진행 중..." : "Google 계정으로 로그인"}
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-stone-200">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                    {currentUser.email ? currentUser.email[0].toUpperCase() : "G"}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-stone-900">
                      {currentUser.displayName || "Google 사용자"}
                    </div>
                    <div className="text-[11px] text-stone-500">
                      {currentUser.email}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs text-stone-500 hover:text-red-700 px-2.5 py-1 rounded hover:bg-stone-100 flex items-center space-x-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>로그아웃</span>
                </button>
              </div>
            )}
          </div>

          {/* STEP 2: Spreadsheet Selection */}
          <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 space-y-4">
            <span className="text-xs font-semibold text-stone-800 font-serif-kr block">
              2단계: 스프레드시트 지정
            </span>

            {/* Current Connected Sheet Status */}
            {settings.googleSpreadsheetId && (
              <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 flex items-center space-x-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                    <span>현재 연동된 스프레드시트</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-600 text-white font-medium">
                    자동 누적 저장 활성화됨
                  </span>
                </div>
                {settings.sheetSpreadsheetUrl && (
                  <a
                    href={settings.sheetSpreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-800 hover:text-emerald-950 underline flex items-center space-x-1 font-mono break-all"
                  >
                    <span>{settings.sheetSpreadsheetUrl}</span>
                    <ExternalLink className="w-3 h-3 shrink-0 inline ml-1" />
                  </a>
                )}
              </div>
            )}

            {/* Option A: Create New Sheet */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-stone-700 block">
                방법 A. 1초 만에 새 전용 시트 만들기 (추천)
              </span>
              <button
                type="button"
                disabled={!currentUser || isCreating}
                onClick={handleCreateNewSheet}
                className="w-full py-2.5 px-4 rounded-lg bg-stone-900 hover:bg-black text-amber-100 font-medium text-xs font-serif-kr flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-2xs disabled:opacity-40"
              >
                <PlusCircle className="w-4 h-4 text-amber-300" />
                <span>
                  {isCreating
                    ? "내 드라이브에 시트 생성 중..."
                    : "새 '문장서랍' 구글 시트 자동 생성하기"}
                </span>
              </button>
              <p className="text-[11px] text-stone-500">
                * 내 구글 드라이브에 10개 컬럼과 서식이 완벽하게 세팅된 새 스프레드시트를 자동으로 만듭니다.
              </p>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-stone-300"></div>
              <span className="flex-shrink mx-3 text-stone-400 text-[11px]">또는</span>
              <div className="flex-grow border-t border-stone-300"></div>
            </div>

            {/* Option B: Connect Existing Sheet */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-stone-700 block">
                방법 B. 이미 사용 중인 내 구글 시트 연결
              </span>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={existingSheetInput}
                  onChange={(e) => setExistingSheetInput(e.target.value)}
                  placeholder="구글 스프레드시트 URL 링크 또는 시트 ID 붙여넣기"
                  className="flex-1 px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-stone-700"
                />
                <button
                  type="button"
                  disabled={!currentUser || isVerifying || !existingSheetInput.trim()}
                  onClick={handleConnectExistingSheet}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-stone-100 rounded-lg text-xs font-medium cursor-pointer disabled:opacity-40 whitespace-nowrap"
                >
                  {isVerifying ? "확인 중..." : "시트 연결"}
                </button>
              </div>
            </div>
          </div>

          {/* 10 Columns Info */}
          <div className="p-3.5 bg-stone-50 rounded-lg border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-800 font-serif-kr">
                구글 시트에 자동 저장되는 10개 항목
              </span>
              <button
                type="button"
                onClick={handleCopyColumns}
                className="text-[11px] text-stone-600 hover:text-stone-900 flex items-center space-x-1 cursor-pointer"
              >
                {copiedColumns ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedColumns ? "헤더 복사됨!" : "헤더 텍스트 복사"}</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {GOOGLE_SHEETS_COLUMNS.map((col, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded bg-white border border-stone-200 text-[11px] text-stone-700 font-serif-kr"
                >
                  {idx + 1}. {col}
                </span>
              ))}
            </div>
          </div>

          {/* Backup Export Options */}
          {savedRecords.length > 0 && (
            <div className="p-3.5 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-stone-800">
                  서랍에 보관된 기록 ({savedRecords.length}개)
                </div>
                <div className="text-[11px] text-stone-500">
                  클립보드로 복사하여 어떤 스프레드시트에도 바로 붙여넣기(Ctrl+V) 가능합니다.
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCopyAllRows}
                  className="text-xs px-2.5 py-1.5 rounded bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 flex items-center space-x-1 cursor-pointer"
                >
                  {copiedAll ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedAll ? "복사됨!" : "시트 복사"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadCsv(savedRecords)}
                  className="text-xs px-2.5 py-1.5 rounded bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 cursor-pointer"
                >
                  CSV 다운
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-stone-100 flex items-center justify-between bg-stone-50 rounded-b-xl">
          {settings.sheetSpreadsheetUrl ? (
            <a
              href={settings.sheetSpreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-800 hover:text-emerald-950 flex items-center space-x-1 font-medium"
            >
              <span>내 구글 시트 열기</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium bg-stone-900 hover:bg-black text-amber-100 rounded-lg cursor-pointer shadow-xs"
          >
            완료
          </button>
        </div>
      </div>
    </div>
  );
};
