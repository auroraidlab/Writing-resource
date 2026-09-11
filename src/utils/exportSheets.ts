import { SavedSentenceRecord } from "../types";

export const GOOGLE_SHEETS_COLUMNS = [
  "저장 날짜",
  "원문 문장",
  "출처",
  "사진 링크",
  "AI 인사이트",
  "핵심 키워드",
  "AI 추천 글감 테마",
  "최종 글감 테마",
  "승인 상태",
  "사용자 태그",
];

export function formatRecordToRow(record: SavedSentenceRecord): (string | number)[] {
  return [
    record.savedDate,
    record.originalSentence,
    record.source || "-",
    record.photoLink || (record.photoDataUrl ? "사진 첨부됨 (이미지 데이터)" : "-"),
    record.aiInsight,
    record.keywords.join(", "),
    record.aiRecommendedChapter,
    record.finalChapter,
    record.approvalStatus,
    record.userTags && record.userTags.length > 0 ? record.userTags.join(", ") : "-",
  ];
}

export async function appendToGoogleSheetsWebhook(
  webhookUrl: string,
  record: SavedSentenceRecord
): Promise<{ success: boolean; message?: string }> {
  const row = formatRecordToRow(record);

  try {
    // Try via backend proxy first to avoid CORS issues
    const response = await fetch("/api/sheets/append", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhookUrl,
        rowData: {
          columns: GOOGLE_SHEETS_COLUMNS,
          row,
          record,
        },
      }),
    });

    if (response.ok) {
      return { success: true };
    }

    // Fallback direct request (with mode: 'no-cors' standard for Google Apps Script Web Apps)
    await fetch(webhookUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        columns: GOOGLE_SHEETS_COLUMNS,
        row,
        record,
      }),
    });

    return { success: true };
  } catch (err: any) {
    console.error("Failed to append to Google Sheets:", err);
    return { success: false, message: err.message || "전송 실패" };
  }
}

export function copyAsSheetsTsv(records: SavedSentenceRecord[]): boolean {
  try {
    const headerLine = GOOGLE_SHEETS_COLUMNS.join("\t");
    const dataLines = records.map((rec) => {
      const row = formatRecordToRow(rec);
      return row.map((cell) => String(cell).replace(/[\r\n\t]+/g, " ")).join("\t");
    });

    const fullTsv = [headerLine, ...dataLines].join("\n");
    navigator.clipboard.writeText(fullTsv);
    return true;
  } catch (err) {
    console.error("Clipboard copy failed:", err);
    return false;
  }
}

export function downloadCsv(records: SavedSentenceRecord[]): void {
  const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;
  const headerLine = GOOGLE_SHEETS_COLUMNS.map(escapeCsv).join(",");
  const dataLines = records.map((rec) => {
    const row = formatRecordToRow(rec);
    return row.map((c) => escapeCsv(String(c))).join(",");
  });

  const bom = "\uFEFF"; // UTF-8 BOM for Korean Excel/Google Sheets compatibility
  const csvContent = bom + [headerLine, ...dataLines].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `문장서랍_기록_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export const APPS_SCRIPT_TEMPLATE = `
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // 첫 행에 헤더가 없는 경우 자동 생성
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "저장 날짜",
        "원문 문장",
        "출처",
        "사진 링크",
        "AI 인사이트",
        "핵심 키워드",
        "AI 추천 목차",
        "최종 목차",
        "승인 상태",
        "사용자 태그"
      ]);
    }
    
    // 새 행 추가 (누적 저장)
    sheet.appendRow(data.row);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`.trim();
