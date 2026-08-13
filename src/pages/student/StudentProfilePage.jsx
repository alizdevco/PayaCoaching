import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle2 } from "lucide-react";

import StudentProfileFields, {
  getProfileFieldStyles,
} from "../../components/StudentProfileFields.jsx";
import Card from "../../components/Card.jsx";
import Button from "../../components/Button.jsx";
import LoadingState from "../../components/LoadingState.jsx";
import { useAuth } from "../../features/auth/useAuth.js";
import { useCompleteProfile } from "../../features/auth/useCompleteProfile.js";
import { getAuthMutationErrorMessage } from "../../features/auth/authMutationErrors.js";

const fieldStyles = getProfileFieldStyles("admin");

export default function StudentProfilePage() {
  const { profile, isLoading, refreshProfile } = useAuth();
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, dirtyFields },
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

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => setSuccessMessage(""), 4000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const updateProfile = useCompleteProfile({
    onSuccess: async () => {
      await refreshProfile();
      setSuccessMessage("پروفایل با موفقیت ذخیره شد.");
      setServerError("");
    },
    onError: (error) => {
      setServerError(getAuthMutationErrorMessage(error, "profile"));
    },
  });

  function onSubmit(values) {
    setServerError("");
    setSuccessMessage("");
    updateProfile.mutate(values);
  }

  if (isLoading || !profile) {
    return <LoadingState message="در حال بارگذاری پروفایل..." />;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          پروفایل
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          اطلاعات شخصی خود را مشاهده و ویرایش کنید.
        </p>
      </div>

      <Card>
        <form
          className="space-y-4"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          data-testid="student-profile-form"
        >
          <div>
            <label className={fieldStyles.label} htmlFor="student-phone">
              شماره موبایل
            </label>
            <input
              id="student-phone"
              type="text"
              readOnly
              value={profile.phone ?? ""}
              className={fieldStyles.readOnly}
              dir="ltr"
            />
          </div>

          <StudentProfileFields
            register={register}
            control={control}
            errors={errors}
            watch={watch}
            setValue={setValue}
            variant="admin"
            dirtyFields={dirtyFields}
            showIncompleteCityHint
          />

          {successMessage && (
            <div
              className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
              role="status"
            >
              <CheckCircle2 size={18} className="shrink-0" aria-hidden="true" />
              <span>{successMessage}</span>
            </div>
          )}

          {serverError && (
            <p className="text-sm text-red-600 dark:text-red-400">{serverError}</p>
          )}

          <Button type="submit" isLoading={updateProfile.isPending}>
            ذخیره تغییرات
          </Button>
        </form>
      </Card>
    </div>
  );
}
