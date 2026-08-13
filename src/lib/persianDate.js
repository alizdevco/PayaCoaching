// --- Jalali <-> Gregorian conversion -----------------------------------
// Native <input type="date"> is unreliable for this app: on machines whose
// OS/browser calendar is set to Persian, Chromium emits the picker's value
// already in Jalali digits instead of the Gregorian ISO string the spec
// requires. That mislabeled Jalali string then gets saved as if it were
// Gregorian, and later gets "converted" to Jalali again for display,
// producing nonsense years like ۷۸۴. To avoid depending on that browser
// behavior entirely, admin-facing date inputs use `JalaliDateInput`
// (src/components/JalaliDateInput.jsx), which always reads/writes Jalali
// digits and uses these helpers to convert to/from the Gregorian ISO
// string that is actually stored in Supabase.
//
// Algorithm: the well-known jalaali-js conversion (public domain), based on
// the Birashk/Borkowski Jalali calendar calculation.

function div(a, b) {
  return ~~(a / b);
}

function mod(a, b) {
  return a - ~~(a / b) * b;
}

const JALALI_BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
  2192, 2262, 2324, 2394, 2456, 3178,
];

function jalCal(jy) {
  const breaksLength = JALALI_BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = JALALI_BREAKS[0];

  if (jy < jp || jy >= JALALI_BREAKS[breaksLength - 1]) {
    throw new Error(`Invalid Jalaali year ${jy}`);
  }

  let jump = 0;
  for (let i = 1; i < breaksLength; i += 1) {
    const jm = JALALI_BREAKS[i];
    jump = jm - jp;
    if (jy < jm) {
      break;
    }
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }

  let n = jy - jp;
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) {
    leapJ += 1;
  }

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) {
    n = n - jump + div(jump + 4, 33) * 33;
  }
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) {
    leap = 4;
  }

  return { leap, gy, march };
}

function g2d(gy, gm, gd) {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy, jm, jd) {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn) {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;

  if (k >= 0) {
    if (k <= 185) {
      return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) {
      k += 1;
    }
  }

  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

/** Gregorian calendar date → Jalali {jy, jm, jd}. */
export function gregorianToJalali(gy, gm, gd) {
  return d2j(g2d(gy, gm, gd));
}

/** Jalali calendar date → Gregorian {gy, gm, gd}. */
export function jalaliToGregorian(jy, jm, jd) {
  return d2g(j2d(jy, jm, jd));
}

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** Convert Persian/Arabic-indic digits in a string to plain ASCII digits. */
export function toLatinDigits(value) {
  return String(value ?? "").replace(/[۰-۹]/g, (char) =>
    String(PERSIAN_DIGITS.indexOf(char)),
  );
}

/** Convert ASCII digits in a string to Persian digits. */
export function toPersianDigits(value) {
  return String(value ?? "").replace(/[0-9]/g, (digit) =>
    PERSIAN_DIGITS[Number(digit)],
  );
}

function pad(value, length) {
  return String(value).padStart(length, "0");
}

/** Gregorian ISO date (YYYY-MM-DD) → Jalali "YYYY/MM/DD" string, or "". */
export function gregorianIsoToJalaliInput(isoValue) {
  const dateOnly = String(isoValue ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    return "";
  }

  const [gy, gm, gd] = dateOnly.split("-").map(Number);
  try {
    const { jy, jm, jd } = gregorianToJalali(gy, gm, gd);
    return `${pad(jy, 4)}/${pad(jm, 2)}/${pad(jd, 2)}`;
  } catch {
    return "";
  }
}

/** Jalali "YYYY/MM/DD" string (Persian or Latin digits) → Gregorian ISO date, or null. */
export function jalaliInputToGregorianIso(jalaliValue) {
  const normalized = toLatinDigits(jalaliValue).trim();
  const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(normalized);
  if (!match) {
    return null;
  }

  const jy = Number(match[1]);
  const jm = Number(match[2]);
  const jd = Number(match[3]);
  if (jm < 1 || jm > 12 || jd < 1 || jd > 31) {
    return null;
  }

  try {
    const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
    return `${pad(gy, 4)}-${pad(gm, 2)}-${pad(gd, 2)}`;
  } catch {
    return null;
  }
}

const PERSIAN_LOCALE = "fa-IR-u-ca-persian";

const PERSIAN_DATE_OPTIONS = {
  calendar: "persian",
  year: "numeric",
  month: "long",
  day: "numeric",
};

const PERSIAN_TIME_OPTIONS = {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

/** Parse YYYY-MM-DD as local calendar date (avoids UTC day-shift bugs). */
export function parseDateInput(value) {
  const dateOnly = String(value ?? "").slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    const [year, month, day] = dateOnly.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function formatPersianDate(value) {
  if (!value) {
    return "—";
  }

  const parsed = parseDateInput(value);
  if (!parsed) {
    return "—";
  }

  return new Intl.DateTimeFormat(PERSIAN_LOCALE, PERSIAN_DATE_OPTIONS).format(
    parsed,
  );
}

/** Gregorian exam_date (YYYY-MM-DD) → Jalali display. */
export function formatExamDate(value) {
  if (!value) {
    return "—";
  }

  const parsed = parseDateInput(value);
  if (!parsed) {
    return "—";
  }

  return new Intl.DateTimeFormat(PERSIAN_LOCALE, PERSIAN_DATE_OPTIONS).format(
    parsed,
  );
}

export function formatPersianTime(value) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("fa-IR", PERSIAN_TIME_OPTIONS).format(parsed);
}

export function buildLocalDateTimeIso(date, time) {
  if (!date || !time) {
    throw new Error("تاریخ و ساعت مشاوره الزامی است.");
  }

  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    throw new Error("تاریخ یا ساعت مشاوره نامعتبر است.");
  }

  const scheduledAt = new Date(year, month - 1, day, hour, minute, 0);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error("تاریخ یا ساعت مشاوره نامعتبر است.");
  }

  return scheduledAt.toISOString();
}
