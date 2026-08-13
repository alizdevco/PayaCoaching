import { useEffect, useState } from "react";

import {
  gregorianIsoToJalaliInput,
  jalaliInputToGregorianIso,
  toLatinDigits,
} from "../lib/persianDate.js";

/**
 * Date input that always reads/writes Jalali (Persian) digits, regardless of
 * the OS/browser calendar. `value`/`onChange` still use the Gregorian ISO
 * string (YYYY-MM-DD) actually stored in Supabase — this component only
 * changes how the admin sees and types the date.
 */
export default function JalaliDateInput({
  id,
  value,
  onChange,
  className,
  required,
  placeholder = "۱۴۰۳/۰۷/۱۸",
}) {
  const [text, setText] = useState(() => gregorianIsoToJalaliInput(value));

  useEffect(() => {
    setText(gregorianIsoToJalaliInput(value));
  }, [value]);

  function handleChange(event) {
    const raw = event.target.value;
    setText(raw);

    if (toLatinDigits(raw).trim() === "") {
      onChange?.("");
      return;
    }

    const iso = jalaliInputToGregorianIso(raw);
    if (iso) {
      onChange?.(iso);
    }
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      dir="ltr"
      autoComplete="off"
      placeholder={placeholder}
      value={text}
      onChange={handleChange}
      className={className}
      required={required}
    />
  );
}
