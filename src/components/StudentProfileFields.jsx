// Shared profile fields used on registration (step 3) and /complete-profile.

import { Controller } from "react-hook-form";

import { IRAN_PROVINCES, getCitiesForProvince } from "../features/auth/iranLocations.js";
import { GRADES, ACADEMIC_MAJORS } from "../features/auth/profileOptions.js";

const fieldClassName =
  "w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500";

export default function StudentProfileFields({
  register,
  control,
  errors,
  watch,
  setValue,
  includePassword = false,
}) {
  const selectedProvince = watch ? watch("province") : "";
  const cities = getCitiesForProvince(selectedProvince);
  const password = includePassword && watch ? watch("password") : "";

  return (
    <>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">نام</label>
        <input
          type="text"
          className={fieldClassName}
          {...register("firstName", { required: "نام الزامی است." })}
        />
        {errors.firstName && (
          <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">نام خانوادگی</label>
        <input
          type="text"
          className={fieldClassName}
          {...register("lastName", { required: "نام خانوادگی الزامی است." })}
        />
        {errors.lastName && (
          <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">استان</label>
        <Controller
          name="province"
          control={control}
          rules={{ required: "انتخاب استان الزامی است." }}
          render={({ field }) => (
            <select
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
          <p className="mt-1 text-sm text-red-600">{errors.province.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">شهر</label>
        <select
          className={fieldClassName}
          disabled={!selectedProvince}
          {...register("city", {
            required: "انتخاب شهر الزامی است.",
            validate: (value) => {
              if (!selectedProvince) {
                return "ابتدا استان را انتخاب کنید.";
              }
              if (!cities.includes(value)) {
                return "شهر انتخاب‌شده معتبر نیست.";
              }
              return true;
            },
          })}
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
        {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">نام مشاور</label>
        <input
          type="text"
          className={fieldClassName}
          {...register("consultantName", { required: "نام مشاور الزامی است." })}
        />
        {errors.consultantName && (
          <p className="mt-1 text-sm text-red-600">{errors.consultantName.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">پایه تحصیلی</label>
        <select
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
        {errors.grade && <p className="mt-1 text-sm text-red-600">{errors.grade.message}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">رشته تحصیلی</label>
        <select
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
          <p className="mt-1 text-sm text-red-600">{errors.academicMajor.message}</p>
        )}
      </div>

      {includePassword && (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">رمز عبور</label>
            <input
              type="password"
              autoComplete="new-password"
              className={fieldClassName}
              {...register("password", {
                required: "رمز عبور الزامی است.",
                minLength: { value: 6, message: "رمز عبور باید حداقل ۶ کاراکتر باشد." },
              })}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              تکرار رمز عبور
            </label>
            <input
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
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>
        </>
      )}
    </>
  );
}
