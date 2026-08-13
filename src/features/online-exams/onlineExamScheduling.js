/**
 * Frontend scheduling states for student online exams.
 * Uses exam.start_at + duration_minutes as the window to begin;
 * after download, the personal timer runs from attempt.started_at.
 */

export const ONLINE_EXAM_STATES = {
  NOT_YET_OPEN: "not_yet_open",
  OPEN_NOW: "open_now",
  IN_PROGRESS: "in_progress",
  CLOSED_FINALIZED: "closed_finalized",
  CLOSED_EXPIRED: "closed_expired",
};

export function getExamWindowEndMs(exam) {
  const startMs = new Date(exam.start_at).getTime();
  return startMs + exam.duration_minutes * 60 * 1000;
}

export function getAttemptDeadlineMs(attempt, exam) {
  if (!attempt?.started_at) {
    return null;
  }
  return (
    new Date(attempt.started_at).getTime() + exam.duration_minutes * 60 * 1000
  );
}

export function getOnlineExamSchedulingState(exam, attempt, nowMs = Date.now()) {
  const startMs = new Date(exam.start_at).getTime();
  const globalEndMs = getExamWindowEndMs(exam);

  if (startMs > nowMs) {
    return ONLINE_EXAM_STATES.NOT_YET_OPEN;
  }

  if (attempt?.status === "finalized") {
    return ONLINE_EXAM_STATES.CLOSED_FINALIZED;
  }

  if (attempt?.started_at) {
    if (attempt.status === "in_progress") {
      return ONLINE_EXAM_STATES.IN_PROGRESS;
    }
    return ONLINE_EXAM_STATES.CLOSED_EXPIRED;
  }

  if (nowMs >= globalEndMs) {
    return ONLINE_EXAM_STATES.CLOSED_EXPIRED;
  }

  return ONLINE_EXAM_STATES.OPEN_NOW;
}

/** Whether the student may open the take-exam page for this exam. */
export function canEnterOnlineExam(state) {
  return (
    state === ONLINE_EXAM_STATES.OPEN_NOW ||
    state === ONLINE_EXAM_STATES.IN_PROGRESS ||
    state === ONLINE_EXAM_STATES.CLOSED_FINALIZED
  );
}

export const ONLINE_EXAM_STATE_LABELS = {
  [ONLINE_EXAM_STATES.NOT_YET_OPEN]: "هنوز شروع نشده",
  [ONLINE_EXAM_STATES.OPEN_NOW]: "آماده شرکت",
  [ONLINE_EXAM_STATES.IN_PROGRESS]: "در حال انجام",
  [ONLINE_EXAM_STATES.CLOSED_FINALIZED]: "پایان یافته",
  [ONLINE_EXAM_STATES.CLOSED_EXPIRED]: "مهلت تمام شده",
};

export const ONLINE_EXAM_STATE_BADGE_CLASS = {
  [ONLINE_EXAM_STATES.NOT_YET_OPEN]:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  [ONLINE_EXAM_STATES.OPEN_NOW]:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  [ONLINE_EXAM_STATES.IN_PROGRESS]:
    "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  [ONLINE_EXAM_STATES.CLOSED_FINALIZED]:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  [ONLINE_EXAM_STATES.CLOSED_EXPIRED]:
    "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

export function getOnlineExamActionLabel(state) {
  switch (state) {
    case ONLINE_EXAM_STATES.IN_PROGRESS:
      return "ادامه آزمون";
    case ONLINE_EXAM_STATES.CLOSED_FINALIZED:
      return "مشاهده نتیجه";
    case ONLINE_EXAM_STATES.OPEN_NOW:
      return "ورود به آزمون";
    default:
      return null;
  }
}
