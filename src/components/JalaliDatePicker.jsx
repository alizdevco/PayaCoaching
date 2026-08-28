import { useMemo } from "react";
import DatePicker from "react-multi-date-picker";
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

import {
  gregorianToJalali,
  jalaliToGregorian,
} from "../lib/persianDate.js";

import "react-multi-date-picker/styles/colors/green.css";

function pad(value) {
  return String(value).padStart(2, "0");
}

function gregorianIsoToDateObject(isoValue) {
  const dateOnly = String(isoValue ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    return undefined;
  }

  const [gy, gm, gd] = dateOnly.split("-").map(Number);
  try {
    const { jy, jm, jd } = gregorianToJalali(gy, gm, gd);
    return new DateObject({
      calendar: persian,
      locale: persian_fa,
      year: jy,
      month: jm,
      day: jd,
    });
  } catch {
    return undefined;
  }
}

function jalaliDateObjectToGregorianIso(picked) {
  const jalali = new DateObject(picked);
  const { gy, gm, gd } = jalaliToGregorian(
    jalali.year,
    jalali.month.number,
    jalali.day,
  );
  return `${String(gy).padStart(4, "0")}-${pad(gm)}-${pad(gd)}`;
}

/**
 * Jalali calendar picker. Displays Persian dates but reads/writes the
 * Gregorian ISO string (YYYY-MM-DD) stored in Supabase.
 */
export default function JalaliDatePicker({
  id,
  value,
  onChange,
  className,
  required,
  placeholder = "انتخاب تاریخ",
}) {
  const pickerValue = useMemo(
    () => gregorianIsoToDateObject(value),
    [value],
  );

  function handleChange(date) {
    if (!date) {
      onChange?.("");
      return;
    }

    const picked = Array.isArray(date) ? date[0] : date;
    if (!picked) {
      onChange?.("");
      return;
    }

    try {
      onChange?.(jalaliDateObjectToGregorianIso(picked));
    } catch {
      onChange?.("");
    }
  }

  return (
    <DatePicker
      value={pickerValue}
      onChange={handleChange}
      calendar={persian}
      locale={persian_fa}
      format="YYYY/MM/DD"
      calendarPosition="bottom-right"
      placeholder={placeholder}
      inputClass={className}
      containerClassName="w-full"
      className="rmdp-rtl w-full"
      arrow={false}
      editable={false}
      inputProps={{
        id,
        required,
        autoComplete: "off",
      }}
    />
  );
}
