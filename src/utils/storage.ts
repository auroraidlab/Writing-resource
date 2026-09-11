import { SavedSentenceRecord, BookProjectSettings } from "../types";

const STORAGE_KEY_SENTENCES = "sentence_archive_records_v1";
const STORAGE_KEY_SETTINGS = "sentence_archive_settings_v1";

export function loadSavedRecords(): SavedSentenceRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SENTENCES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to load saved sentences from storage:", err);
    return [];
  }
}

export function saveRecordsToStorage(records: SavedSentenceRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_SENTENCES, JSON.stringify(records));
  } catch (err) {
    console.error("Failed to save sentences to storage:", err);
  }
}

export function appendRecordToStorage(record: SavedSentenceRecord): SavedSentenceRecord[] {
  const current = loadSavedRecords();
  const updated = [record, ...current];
  saveRecordsToStorage(updated);
  return updated;
}

export function loadProjectSettings(): BookProjectSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) {
      return {
        writingStyle: "",
        targetAudience: "",
        sheetsWebhookUrl: "",
        sheetSpreadsheetUrl: "",
      };
    }
    return JSON.parse(raw);
  } catch {
    return {
      writingStyle: "",
      targetAudience: "",
      sheetsWebhookUrl: "",
      sheetSpreadsheetUrl: "",
    };
  }
}

export function saveProjectSettings(settings: BookProjectSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error("Failed to save settings:", err);
  }
}
