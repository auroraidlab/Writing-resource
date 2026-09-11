import { useState, useRef, useEffect, useCallback } from "react";

export interface VoiceRecorderState {
  isRecording: boolean;
  isTranscribing: boolean;
  recordingDuration: number;
  interimTranscript: string;
  errorMessage: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => void;
}

export function useVoiceRecorder(
  onTranscriptComplete?: (text: string) => void
): VoiceRecorderState {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const liveTranscriptRef = useRef<string>("");
  const streamRef = useRef<MediaStream | null>(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const cancelRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setIsTranscribing(false);
    setRecordingDuration(0);
    setInterimTranscript("");
    liveTranscriptRef.current = "";
  }, []);

  const startRecording = useCallback(async () => {
    setErrorMessage(null);
    setInterimTranscript("");
    liveTranscriptRef.current = "";
    audioChunksRef.current = [];
    setRecordingDuration(0);

    try {
      // 1. Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 2. Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(250); // Slice every 250ms

      // 3. Set up SpeechRecognition if available (for real-time feedback)
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.lang = "ko-KR";
          recognition.continuous = true;
          recognition.interimResults = true;

          recognition.onresult = (event: any) => {
            let current = "";
            for (let i = 0; i < event.results.length; i++) {
              current += event.results[i][0].transcript + " ";
            }
            const trimmed = current.trim();
            liveTranscriptRef.current = trimmed;
            setInterimTranscript(trimmed);
          };

          recognition.onerror = (event: any) => {
            console.warn("Speech recognition error:", event.error);
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (e) {
          console.warn("SpeechRecognition init error:", e);
        }
      }

      setIsRecording(true);

      // Start duration counter
      const startTimestamp = Date.now();
      timerRef.current = window.setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTimestamp) / 1000));
      }, 1000);
    } catch (err: any) {
      console.error("Microphone access error:", err);
      let msg = "마이크 사용 권한을 허용해주세요.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        msg = "마이크 권한이 거부되었습니다. 브라우저 주소창 좌측에서 마이크 권한을 허용해주세요.";
      }
      setErrorMessage(msg);
      cancelRecording();
    }
  }, [cancelRecording]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!mediaRecorderRef.current || !isRecording) {
      return null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }

    return new Promise<string | null>((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder) {
        cancelRecording();
        resolve(null);
        return;
      }

      mediaRecorder.onstop = async () => {
        // Stop audio tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });

        setIsRecording(false);

        // Check if we already got a solid live transcript from SpeechRecognition
        const liveText = liveTranscriptRef.current.trim();

        // If we have live text and recording was short, we can use it, or enhance it
        if (liveText && liveText.length > 5) {
          setIsTranscribing(false);
          setInterimTranscript("");
          if (onTranscriptComplete) onTranscriptComplete(liveText);
          resolve(liveText);
          return;
        }

        // Otherwise or if empty, use Gemini audio model for high-precision Korean transcription
        setIsTranscribing(true);
        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Data = reader.result as string;
            try {
              const res = await fetch("/api/transcribe-audio", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  audioBase64: base64Data,
                  mimeType: audioBlob.type || "audio/webm",
                }),
              });

              if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.error || "음성 변환 실패");
              }

              const data = await res.json();
              const finalText = (data.text || liveText || "").trim();

              if (!finalText) {
                setErrorMessage("음성이 명확하게 인식되지 않았습니다. 다시 녹음해 주세요.");
                resolve(null);
              } else {
                if (onTranscriptComplete) onTranscriptComplete(finalText);
                resolve(finalText);
              }
            } catch (apiErr: any) {
              console.error("Transcribe API error:", apiErr);
              if (liveText) {
                if (onTranscriptComplete) onTranscriptComplete(liveText);
                resolve(liveText);
              } else {
                setErrorMessage("음성 변환에 실패했습니다: " + apiErr.message);
                resolve(null);
              }
            } finally {
              setIsTranscribing(false);
              setInterimTranscript("");
            }
          };
        } catch (readErr: any) {
          console.error("Blob read error:", readErr);
          setIsTranscribing(false);
          setInterimTranscript("");
          resolve(liveText || null);
        }
      };

      try {
        mediaRecorder.stop();
      } catch (e) {
        console.error("Error stopping media recorder:", e);
        cancelRecording();
        resolve(null);
      }
    });
  }, [isRecording, cancelRecording, onTranscriptComplete]);

  return {
    isRecording,
    isTranscribing,
    recordingDuration,
    interimTranscript,
    errorMessage,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
