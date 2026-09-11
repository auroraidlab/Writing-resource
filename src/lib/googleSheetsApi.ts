import { SavedSentenceRecord } from "../types";
import { formatRecordToRow, GOOGLE_SHEETS_COLUMNS } from "../utils/exportSheets";

export function extractSpreadsheetId(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  // Match https://docs.google.com/spreadsheets/d/{ID}/edit...
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

/**
 * Creates a brand-new "문장서랍" spreadsheet in the user's Google Drive
 */
export async function createSentenceArchiveSpreadsheet(accessToken: string): Promise<{
  spreadsheetId: string;
  spreadsheetUrl: string;
}> {
  const payload = {
    properties: {
      title: "문장서랍 (Sentence Archive) - 집필용 문장 아카이브",
    },
    sheets: [
      {
        properties: {
          title: "문장서랍",
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: GOOGLE_SHEETS_COLUMNS.map((col) => ({
                  userEnteredValue: { stringValue: col },
                  userEnteredFormat: {
                    textFormat: { bold: true },
                    backgroundColor: { red: 0.94, green: 0.92, blue: 0.88 },
                  },
                })),
              },
            ],
          },
        ],
      },
    ],
  };

  const response = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Sheets 생성 실패 (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Appends an approved sentence row directly to the user's Google Sheet
 */
export async function appendRowToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  record: SavedSentenceRecord
): Promise<{ success: boolean; updatedRange?: string }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const row = formatRecordToRow(record);

  // We append to sheet
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values: [row],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`구글 시트 행 추가 실패 (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  return {
    success: true,
    updatedRange: result.updates?.updatedRange,
  };
}

/**
 * Verifies spreadsheet access and retrieves sheet title
 */
export async function verifySpreadsheet(
  accessToken: string,
  spreadsheetId: string
): Promise<{ title: string; sheets: string[] }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=properties.title,sheets.properties.title`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`스프레드시트를 찾을 수 없거나 권한이 없습니다: ${errorText}`);
  }

  const data = await response.json();
  return {
    title: data.properties?.title || "제목 없는 스프레드시트",
    sheets: (data.sheets || []).map((s: any) => s.properties?.title),
  };
}
