import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { updateAttemptAnswers } from "./onlineExamsApi.js";

const DEFAULT_INTERVAL_MS = 30_000;
const DEFAULT_DEBOUNCE_MS = 2_000;

function answersEqual(left, right) {
  return JSON.stringify(left ?? {}) === JSON.stringify(right ?? {});
}

export function useOnlineExamAutoSave(
  attemptId,
  answers,
  {
    enabled = true,
    examId,
    status = "in_progress",
    intervalMs = DEFAULT_INTERVAL_MS,
    debounceMs = DEFAULT_DEBOUNCE_MS,
  } = {},
) {
  const queryClient = useQueryClient();
  const answersRef = useRef(answers);
  const lastSavedRef = useRef(answers);
  const debounceTimerRef = useRef(null);
  const saveInFlightRef = useRef(false);
  const pendingSaveRef = useRef(false);

  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [saveError, setSaveError] = useState(null);

  answersRef.current = answers;

  const isActive = Boolean(
    enabled && attemptId && status === "in_progress",
  );

  const persistAnswers = useCallback(
    async (nextAnswers) => {
      if (!attemptId || status !== "in_progress") {
        return null;
      }

      if (answersEqual(nextAnswers, lastSavedRef.current)) {
        return null;
      }

      if (saveInFlightRef.current) {
        pendingSaveRef.current = true;
        return null;
      }

      saveInFlightRef.current = true;
      setIsSaving(true);
      setSaveError(null);

      try {
        const saved = await updateAttemptAnswers(attemptId, nextAnswers);
        lastSavedRef.current = nextAnswers;
        setLastSavedAt(new Date());

        if (examId) {
          queryClient.setQueryData(["online-exam-attempt", examId], saved);
        }

        return saved;
      } catch (error) {
        setSaveError(
          error instanceof Error ? error.message : "خطا در ذخیره پاسخ‌ها",
        );
        throw error;
      } finally {
        saveInFlightRef.current = false;
        setIsSaving(false);

        if (pendingSaveRef.current) {
          pendingSaveRef.current = false;
          if (!answersEqual(answersRef.current, lastSavedRef.current)) {
            await persistAnswers(answersRef.current);
          }
        }
      }
    },
    [attemptId, examId, queryClient, status],
  );

  const saveNow = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    return persistAnswers(answersRef.current);
  }, [persistAnswers]);

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    if (answersEqual(answers, lastSavedRef.current)) {
      return undefined;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      persistAnswers(answersRef.current).catch(() => {});
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [answers, debounceMs, isActive, persistAnswers]);

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      persistAnswers(answersRef.current).catch(() => {});
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [intervalMs, isActive, persistAnswers]);

  useEffect(() => {
    if (status === "finalized" && debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, [status]);

  return {
    isSaving,
    lastSavedAt,
    saveError,
    saveNow,
  };
}
