// Shared profile fields used on registration (step 3) and /complete-profile.

import { Controller } from "react-hook-form";

import { IRAN_PROVINCES, getCitiesForProvince } from "../features/auth/iranLocations.js";
import { GRADES, ACADEMIC_MAJORS } from "../features/auth/profileOptions.js";

const fieldVariants = {
  default: {
    label: "mb-1 block text-sm font-medium text-gray-700",
    input:
      "w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500",
    readOnly:
      "w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-gray-600 outline-none",
    error: "mt-1 text-sm text-red-600",
    hint: "mt-1 text-sm text-amber-700",
  },
  admin: {
    label: "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300",
    input:
      "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none transition-colors focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-500 dark:disabled:bg-slate-800/60 dark:disabled:text-slate-500",
    readOnly:
      "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-600 outline-none dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-300",
    error: "mt-1 text-sm text-red-600 dark:text-red-400",
    hint: "mt-1 text-sm text-amber-700 dark:text-amber-400",
  },
};

export function getProfileFieldStyles(variant = "default") {
  return fieldVariants[variant] ?? fieldVariants.default;
}

function fieldId(prefix, name) {
  return `${prefix}-${name}`;
}

function validateCityValue(value, selectedProvince, cities) {
  if (!selectedProvince) {
    return true;
  }
  if (value && !cities.includes(value)) {
    return "شهر انتخاب‌شده معتبر نیست.";
  }
  return true;
}

export default function StudentProfileFields({
  register,
  control,
  errors,
  watch,
  setValue,
  includePassword = false,
  variant = "default",
  dirtyFields = {},
  showIncompleteCityHint = false,
}) {
  const styles = fieldVariants[variant] ?? fieldVariants.default;
  const fieldClassName = styles.input;
  const labelClassName = styles.label;
  const errorClassName = styles.error;
  const hintClassName = styles.hint;
  const isAdminEdit = variant === "admin";
  const idPrefix = isAdminEdit ? "profile" : "student";
  const selectedProvince = watch ? watch("province") : "";
  const cityValue = watch ? watch("city") : "";
  const cities = getCitiesForProvince(selectedProvince);
  const password = includePassword && watch ? watch("password") : "";
  const cityNeedsAttention =
    showIncompleteCityHint && selectedProvince && !cityValue?.trim();

  const cityRules = isAdminEdit
    ? {
        validate: (value) => {
          const formatError = validateCityValue(value, selectedProvince, cities);
          if (formatError !== true) {
            return formatError;
          }
          if (value?.trim()) {
            return true;
          }
          if (dirtyFields.province || dirtyFields.city) {
            return "انتخاب شهر الزامی است.";
          }
          return true;
        },
      }
    : {
        required: "انتخاب شهر الزامی است.",
        validate: (value) => validateCityValue(value, selectedProvince, cities),
      };

  return (
    <>
      <div>
        <label className={labelClassName} htmlFor={fieldId(idPrefix, "first-name")}>
          نام
        </label>
        <input
          id={fieldId(idPrefix, "first-name")}
          type="text"
          className={fieldClassName}
          data-testid={isAdminEdit ? "profile-first-name" : undefined}
          {...register("firstName", { required: "نام الزامی است." })}
        />
        {errors.firstName && (
          <p className={errorClassName}>{errors.firstName.message}</p>
        )}
      </div>

      <div>
        <label className={labelClassName} htmlFor={fieldId(idPrefix, "last-name")}>
          نام خانوادگی
        </label>
        <input
          id={fieldId(idPrefix, "last-name")}
          type="text"
          className={fieldClassName}
          data-testid={isAdminEdit ? "profile-last-name" : undefined}
          {...register("lastName", { required: "نام خانوادگی الزامی است." })}
        />
        {errors.lastName && (
          <p className={errorClassName}>{errors.lastName.message}</p>
        )}
      </div>

      <div>
        <label className={labelClassName} htmlFor={fieldId(idPrefix, "province")}>
          استان
        </label>
        <Controller
          name="province"
          control={control}
          rules={{ required: "انتخاب استان الزامی است." }}
          render={({ field }) => (
            <select
              id={fieldId(idPrefix, "province")}
              className={fieldClassName}
              {...field}
              onChange={(event) => {
                field.onChange(event);
                if (setValue) {
                  setValue("city", "", { shouldValidate: true });
                }
              }}
            >
              <option value="">استان را انتخاب کنید</option>
              {IRAN_PROVINCES.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
          )}
        />
        {errors.province && (
          <p className={errorClassName}>{errors.province.message}</p>
        )}
      </div>

      <div>
        <label className={labelClassName} htmlFor={fieldId(idPrefix, "city")}>
          شهر
        </label>
        <select
          id={fieldId(idPrefix, "city")}
          className={[
            fieldClassName,
            cityNeedsAttention
              ? "border-amber-500 ring-1 ring-amber-300 dark:border-amber-500 dark:ring-amber-700"
              : "",
          ].join(" ")}
          disabled={!selectedProvince}
          aria-invalid={cityNeedsAttention || Boolean(errors.city) || undefined}
          {...register("city", cityRules)}
        >
          <option value="">
            {selectedProvince ? "شهر را انتخاب کنید" : "ابتدا استان را انتخاب کنید"}
          </option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
        {cityNeedsAttention && !errors.city && (
          <p className={hintClassName} id={`${fieldId(idPrefix, "city")}-hint`}>
            شهر این دانش‌آموز ثبت نشده است. برای تکمیل پروفایل شهر را انتخاب کنید.
          </p>
        )}
        {errors.city && <p className={errorClassName}>{errors.city.message}</p>}
      </div>

      <div>
        <label className={labelClassName} htmlFor={fieldId(idPrefix, "consultant-name")}>
          نام مشاور
        </label>
        <input
          id={fieldId(idPrefix, "consultant-name")}
          type="text"
          className={fieldClassName}
          data-testid={isAdminEdit ? "profile-consultant-name" : undefined}
          {...register("consultantName", { required: "نام مشاور الزامی است." })}
        />
        {errors.consultantName && (
          <p className={errorClassName}>{errors.consultantName.message}</p>
        )}
      </div>

      <div>
        <label className={labelClassName} htmlFor={fieldId(idPrefix, "grade")}>
          پایه تحصیلی
        </label>
        <select
          id={fieldId(idPrefix, "grade")}
          className={fieldClassName}
          {...register("grade", {
            required: "انتخاب پایه تحصیلی الزامی است.",
            validate: (value) =>
              GRADES.includes(value) || "پایه تحصیلی انتخاب‌شده معتبر نیست.",
          })}
        >
          <option value="">پایه تحصیلی را انتخاب کنید</option>
          {GRADES.map((grade) => (
            <option key={grade} value={grade}>
              {grade}
            </option>
          ))}
        </select>
        {errors.grade && <p className={errorClassName}>{errors.grade.message}</p>}
      </div>

      <div>
        <label className={labelClassName} htmlFor={fieldId(idPrefix, "academic-major")}>
          رشته تحصیلی
        </label>
        <select
          id={fieldId(idPrefix, "academic-major")}
          className={fieldClassName}
          {...register("academicMajor", {
            required: "انتخاب رشته تحصیلی الزامی است.",
            validate: (value) =>
              ACADEMIC_MAJORS.includes(value) || "رشته تحصیلی انتخاب‌شده معتبر نیست.",
          })}
        >
          <option value="">رشته تحصیلی را انتخاب کنید</option>
          {ACADEMIC_MAJORS.map((major) => (
            <option key={major} value={major}>
              {major}
            </option>
          ))}
        </select>
        {errors.academicMajor && (
          <p className={errorClassName}>{errors.academicMajor.message}</p>
        )}
      </div>

      {includePassword && (
        <>
          <div>
            <label className={labelClassName} htmlFor={fieldId(idPrefix, "password")}>
              رمز عبور
            </label>
            <input
              id={fieldId(idPrefix, "password")}
              type="password"
              autoComplete="new-password"
              className={fieldClassName}
              {...register("password", {
                required: "رمز عبور الزامی است.",
                minLength: { value: 6, message: "رمز عبور باید حداقل ۶ کاراکتر باشد." },
              })}
            />
            {errors.password && (
              <p className={errorClassName}>{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className={labelClassName} htmlFor={fieldId(idPrefix, "confirm-password")}>
              تکرار رمز عبور
            </label>
            <input
              id={fieldId(idPrefix, "confirm-password")}
              type="password"
              autoComplete="new-password"
              className={fieldClassName}
              {...register("confirmPassword", {
                required: "تکرار رمز عبور الزامی است.",
                validate: (value) =>
                  value === password || "رمز عبور و تکرار آن یکسان نیستند.",
              })}
            />
            {errors.confirmPassword && (
              <p className={errorClassName}>{errors.confirmPassword.message}</p>
            )}
          </div>
        </>
      )}
    </>
  );
}
