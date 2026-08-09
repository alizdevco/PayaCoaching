// Student profile completion form for returning users with incomplete profiles.
// Registration uses the same fields inline on RegisterPage step 3 after OTP.

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";

import StudentProfileFields from "../components/StudentProfileFields.jsx";
import { useAuth } from "../features/auth/useAuth.js";
import { useCompleteProfile } from "../features/auth/useCompleteProfile.js";
import { getAuthMutationErrorMessage } from "../features/auth/authMutationErrors.js";

export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const { session, profile, role, isLoading, refreshProfile } = useAuth();
  const [serverError, setServerError] = useState("");

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    if (!profile) {
      return;
    }

    reset(
      {
        firstName: profile.first_name ?? "",
        lastName: profile.last_name ?? "",
        province: profile.province ?? "",
        city: profile.city ?? "",
        consultantName: profile.consultant_name ?? "",
        grade: profile.grade ?? "",
        academicMajor: profile.academic_major ?? "",
      },
      { keepDirtyValues: true },
    );
  }, [profile, reset]);

  const completeProfile = useCompleteProfile({
    onSuccess: async () => {
      await refreshProfile();
      navigate("/student", { replace: true });
    },
    onError: (error) => {
      console.error("[completeProfile]", error?.message);
      setServerError(getAuthMutationErrorMessage(error, "profile"));
    },
  });

  if (isLoading || (session && !profile)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        در حال بارگذاری...
      </div>
    );
  }

  if (role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  if (!session || role !== "student") {
    return <Navigate to="/login" replace />;
  }

  function onSubmit(values) {
    setServerError("");
    completeProfile.mutate(values);
  }

  const isEditing = Boolean(profile?.profile_completed_at);

  return (
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-800">
          {isEditing ? "ویرایش پروفایل" : "تکمیل پروفایل"}
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          {isEditing
            ? "اطلاعات پروفایل شما از پایگاه داده بارگذاری شده است."
            : "لطفاً اطلاعات خود را برای ادامه وارد کنید."}
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <StudentProfileFields
            register={register}
            control={control}
            errors={errors}
            watch={watch}
            setValue={setValue}
          />

          {serverError && <p className="text-sm text-red-600">{serverError}</p>}

          <button
            type="submit"
            disabled={completeProfile.isPending}
            className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {completeProfile.isPending ? "در حال ذخیره..." : "ذخیره پروفایل"}
          </button>
        </form>
      </div>
    </div>
  );
}
