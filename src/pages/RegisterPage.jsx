// Student registration in 3 steps on one page:
//   1. Phone number  -> request OTP (mocked)
//   2. OTP code      -> verify OTP (mocked)
//   3. Profile form  -> create account + save full profile (only after OTP)

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate, Link } from "react-router-dom";

import StudentProfileFields from "../components/StudentProfileFields.jsx";
import { useAuth } from "../features/auth/useAuth.js";
import {
  useSendOtp,
  useVerifyOtp,
  useRegisterWithProfile,
} from "../features/auth/useRegister.js";
import { dashboardPathForRole } from "../features/auth/authRoutes.js";
import { validateIranianPhone } from "../features/auth/phoneValidation.js";
import { getAuthMutationErrorMessage } from "../features/auth/authMutationErrors.js";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { session, role, profile, isLoading, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [serverError, setServerError] = useState("");

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        در حال بارگذاری...
      </div>
    );
  }

  // Only redirect returning logged-in users who have not started registration.
  if (session && step === 1) {
    return <Navigate to={dashboardPathForRole(role, profile)} replace />;
  }

  return (
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-800">
          ثبت‌نام
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          مرحله {step} از ۳
        </p>

        {step === 1 && (
          <PhoneStep
            onError={setServerError}
            serverError={serverError}
            onDone={(normalizedPhone) => {
              setPhone(normalizedPhone);
              setServerError("");
              setStep(2);
            }}
          />
        )}

        {step === 2 && (
          <OtpStep
            phone={phone}
            onError={setServerError}
            serverError={serverError}
            onBack={() => {
              setServerError("");
              setStep(1);
            }}
            onDone={() => {
              setServerError("");
              setOtpVerified(true);
              setStep(3);
            }}
          />
        )}

        {step === 3 && otpVerified && (
          <ProfileRegistrationStep
            phone={phone}
            onError={setServerError}
            serverError={serverError}
            onDone={async () => {
              await refreshProfile();
              navigate("/student", { replace: true });
            }}
          />
        )}

        <p className="mt-6 text-center text-sm text-gray-600">
          قبلاً ثبت‌نام کرده‌اید؟
          <Link
            to="/login"
            className="font-medium text-blue-600 hover:underline"
          >
            ورود
          </Link>
        </p>
      </div>
    </div>
  );
}

function PhoneStep({ onDone, onError, serverError }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const sendOtp = useSendOtp({
    onSuccess: (result) => onDone(result.phone),
    onError: (error) => {
      console.error("[sendOtp]", error?.message);
      onError(getAuthMutationErrorMessage(error, "otp-send"));
    },
  });
  function onSubmit(values) {
    onError("");
    const result = validateIranianPhone(values.phone);
    if (!result.valid) {
      onError(result.message);
      return;
    }
    sendOtp.mutate(result.phone);
  }
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          شماره موبایل
        </label>
        <input
          type="tel"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
          placeholder="09123456789"
          {...register("phone", {
            required: "شماره موبایل الزامی است.",
            validate: (value) => {
              const result = validateIranianPhone(value);
              return result.valid || result.message;
            },
          })}
        />
        {errors.phone && (
          <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
        )}
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <button
        type="submit"
        disabled={sendOtp.isPending}
        className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
      >
        {sendOtp.isPending ? "در حال ارسال..." : "ارسال کد تأیید"}
      </button>
    </form>
  );
}

function OtpStep({ phone, onDone, onBack, onError, serverError }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const verifyOtp = useVerifyOtp({
    onSuccess: () => onDone(),
    onError: (error) => {
      console.error("[verifyOtp]", error?.message);
      onError(getAuthMutationErrorMessage(error, "otp-verify"));
    },
  });

  function onSubmit(values) {
    onError("");
    verifyOtp.mutate({ phone, code: values.code });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <p className="text-sm text-gray-600">
        کد تأیید به شماره <span className="font-medium">{phone}</span> ارسال شد.
      </p>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          کد تأیید
        </label>
        <input
          type="text"
          inputMode="numeric"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-center tracking-widest outline-none focus:border-blue-500"
          placeholder="- - - -"
          {...register("code", {
            required: "کد تأیید الزامی است.",
            minLength: { value: 4, message: "کد تأیید باید حداقل ۴ رقم باشد." },
          })}
        />
        {errors.code && (
          <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>
        )}
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="w-1/3 rounded-lg border border-gray-300 py-2 font-medium text-gray-700 transition hover:bg-gray-50"
        >
          بازگشت
        </button>
        <button
          type="submit"
          disabled={verifyOtp.isPending}
          className="w-2/3 rounded-lg bg-blue-600 py-2 font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {verifyOtp.isPending ? "در حال بررسی..." : "تأیید کد"}
        </button>
      </div>
    </form>
  );
}

function ProfileRegistrationStep({ phone, onDone, onError, serverError }) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm();

  const registerWithProfile = useRegisterWithProfile({
    onSuccess: () => onDone(),
    onError: (error) => {
      console.error("[registerStudentWithProfile]", error?.message);
      onError(getAuthMutationErrorMessage(error, "register"));
    },
  });

  function onSubmit(values) {
    onError("");
    const profileData = { ...values };
    delete profileData.confirmPassword;
    registerWithProfile.mutate({ phone, ...profileData });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <p className="text-sm text-gray-600">
        لطفاً اطلاعات پروفایل خود را تکمیل کنید.
      </p>

      <StudentProfileFields
        register={register}
        control={control}
        errors={errors}
        watch={watch}
        setValue={setValue}
        includePassword
      />

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <button
        type="submit"
        disabled={registerWithProfile.isPending}
        className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
      >
        {registerWithProfile.isPending ? "در حال ثبت‌نام..." : "تکمیل ثبت‌نام"}
      </button>
    </form>
  );
}
