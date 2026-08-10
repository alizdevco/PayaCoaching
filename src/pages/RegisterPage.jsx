// Student registration in 3 steps on one page:
//   1. Phone number  -> request OTP (mocked)
//   2. OTP code      -> verify OTP (mocked)
//   3. Profile form  -> create account + save full profile (only after OTP)

import { useState, useEffect, useRef, useCallback } from "react";
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

const OTP_COOLDOWN_SECONDS = 120;
const OTP_COOLDOWN_MS = OTP_COOLDOWN_SECONDS * 1000;
const OTP_COOLDOWN_STORAGE_KEY = "otp_cooldown";
const OTP_COOLDOWN_ERROR =
  "کد تأیید قبلاً ارسال شده است. لطفاً ۲ دقیقه صبر کنید.";

function readOtpCooldown() {
  try {
    const raw = localStorage.getItem(OTP_COOLDOWN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.phone || typeof parsed.sentAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeOtpCooldown(phone, sentAt = Date.now()) {
  localStorage.setItem(
    OTP_COOLDOWN_STORAGE_KEY,
    JSON.stringify({ phone, sentAt }),
  );
}

function clearOtpCooldown() {
  localStorage.removeItem(OTP_COOLDOWN_STORAGE_KEY);
}

function getStoredCooldownSeconds(phoneNumber) {
  const stored = readOtpCooldown();
  if (!stored || stored.phone !== phoneNumber) return 0;
  const remainingMs = OTP_COOLDOWN_MS - (Date.now() - stored.sentAt);
  if (remainingMs <= 0) {
    clearOtpCooldown();
    return 0;
  }
  return Math.ceil(remainingMs / 1000);
}

function getRemainingCooldownSeconds(sentAtMap, phoneNumber) {
  const storedRemaining = getStoredCooldownSeconds(phoneNumber);
  if (storedRemaining > 0) return storedRemaining;

  const sentAt = sentAtMap.get(phoneNumber);
  if (!sentAt) return 0;
  const remainingMs = OTP_COOLDOWN_MS - (Date.now() - sentAt);
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
}

function getOtpStepInitialCooldown(phoneNumber, fallbackSeconds) {
  const storedRemaining = getStoredCooldownSeconds(phoneNumber);
  if (storedRemaining > 0) return storedRemaining;
  return fallbackSeconds > 0 ? fallbackSeconds : OTP_COOLDOWN_SECONDS;
}

function pushRegisterHistory() {
  const current = window.history.state ?? {};
  const nextIdx = (typeof current.idx === "number" ? current.idx : -1) + 1;
  const path =
    window.location.pathname === "/register"
      ? `${window.location.pathname}${window.location.search}${window.location.hash}`
      : "/register";
  window.history.pushState(
    {
      usr: current.usr ?? null,
      key: Math.random().toString(36).slice(2, 10),
      idx: nextIdx,
    },
    "",
    path,
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { session, role, profile, isLoading, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [serverError, setServerError] = useState("");
  const otpSentAtRef = useRef(new Map());

  const recordOtpSent = useCallback((phoneNumber) => {
    const sentAt = Date.now();
    otpSentAtRef.current.set(phoneNumber, sentAt);
    writeOtpCooldown(phoneNumber, sentAt);
  }, []);

  const getPhoneCooldownSeconds = useCallback(
    (phoneNumber) => getRemainingCooldownSeconds(otpSentAtRef.current, phoneNumber),
    [],
  );

  const isResumingIncompleteRegistration = Boolean(
    !isLoading &&
      session &&
      step === 1 &&
      role === "student" &&
      profile &&
      !profile.profile_completed_at,
  );
  const effectiveStep = isResumingIncompleteRegistration ? 3 : step;

  useEffect(() => {
    if (step !== 3) return;

    const onPopState = () => {
      setStep(2);
      pushRegisterHistory();
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [step]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        در حال بارگذاری...
      </div>
    );
  }

  // If the page is refreshed after OTP verification but before the profile
  // form was submitted, a session already exists but the password was never
  // set (setOwnPassword only runs on step 3 submit). Sending this user to
  // /complete-profile would let them "finish" without ever setting a
  // password, permanently locking them out of password login. Resume the
  // wizard at step 3 instead, derived here rather than stored, so no session
  // is ever lost to a dead-end incomplete state.
  const effectiveOtpVerified = otpVerified || isResumingIncompleteRegistration;
  const effectivePhone =
    phone || (isResumingIncompleteRegistration ? (session?.user?.phone ?? "") : "");

  // Only redirect returning logged-in users who have not started registration
  // and already have a complete profile (or are an admin). Users with an
  // incomplete student profile are resumed at step 3 above instead.
  // Post-OTP users have a session but no profile row yet — keep them on /register.
  if (session && step === 1 && !isResumingIncompleteRegistration && profile) {
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
          مرحله {effectiveStep} از ۳
        </p>

        {effectiveStep === 1 && (
          <PhoneStep
            onError={setServerError}
            serverError={serverError}
            getRemainingCooldownSeconds={getPhoneCooldownSeconds}
            onOtpSent={recordOtpSent}
            onDone={(normalizedPhone) => {
              setPhone(normalizedPhone);
              setServerError("");
              setStep(2);
            }}
          />
        )}

        {effectiveStep === 2 && (
          <OtpStep
            phone={effectivePhone}
            initialCooldownSeconds={getOtpStepInitialCooldown(
              effectivePhone,
              getPhoneCooldownSeconds(effectivePhone),
            )}
            onOtpSent={recordOtpSent}
            onError={setServerError}
            serverError={serverError}
            onBack={() => {
              setServerError("");
              setStep(1);
            }}
            onDone={() => {
              setServerError("");
              setOtpVerified(true);
              pushRegisterHistory();
              setStep(3);
            }}
          />
        )}

        {effectiveStep === 3 && effectiveOtpVerified && (
          <ProfileRegistrationStep
            phone={effectivePhone}
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

function PhoneStep({
  onDone,
  onError,
  serverError,
  getRemainingCooldownSeconds,
  onOtpSent,
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const phoneField = register("phone", {
    required: "شماره موبایل الزامی است.",
    validate: (value) => {
      const result = validateIranianPhone(value);
      return result.valid || result.message;
    },
  });
  const sendOtp = useSendOtp({
    onSuccess: (result) => {
      onOtpSent(result.phone);
      onDone(result.phone);
    },
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
    const stored = readOtpCooldown();
    const storedRemaining =
      stored?.phone === result.phone
        ? Math.max(0, OTP_COOLDOWN_MS - (Date.now() - stored.sentAt))
        : 0;
    if (stored?.phone === result.phone && storedRemaining > 0) {
      onError(OTP_COOLDOWN_ERROR);
      return;
    }
    if (stored?.phone === result.phone && storedRemaining <= 0) {
      clearOtpCooldown();
    }
    if (getRemainingCooldownSeconds(result.phone) > 0) {
      onError(OTP_COOLDOWN_ERROR);
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
          {...phoneField}
          onChange={(event) => {
            phoneField.onChange(event);
            onError("");
          }}
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

function OtpStep({
  phone,
  onDone,
  onBack,
  onError,
  serverError,
  initialCooldownSeconds,
  onOtpSent,
}) {
  const COOLDOWN_SECONDS = OTP_COOLDOWN_SECONDS;

  const toPersianDigits = (value) =>
    String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);

  const formatCountdown = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return toPersianDigits(`${minutes}:${String(secs).padStart(2, "0")}`);
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const [resendMessage, setResendMessage] = useState("");
  const [timeLeft, setTimeLeft] = useState(initialCooldownSeconds);
  const intervalRef = useRef(null);

  const startCountdown = useCallback((seconds = COOLDOWN_SECONDS) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimeLeft(seconds);
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          clearOtpCooldown();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    const storedRemaining = getStoredCooldownSeconds(phone);
    const seconds = storedRemaining > 0 ? storedRemaining : initialCooldownSeconds;
    startCountdown(seconds);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [startCountdown, initialCooldownSeconds, phone]);

  const verifyOtp = useVerifyOtp({
    onSuccess: () => onDone(),
    onError: (error) => {
      console.error("[verifyOtp]", error?.message);
      onError(getAuthMutationErrorMessage(error, "otp-verify"));
    },
  });

  const resendOtp = useSendOtp({
    onSuccess: () => {
      setResendMessage("کد تأیید جدید ارسال شد.");
      onOtpSent(phone);
      startCountdown(COOLDOWN_SECONDS);
    },
    onError: (error) => {
      console.error("[resendOtp]", error?.message);
      setResendMessage("");
      onError(getAuthMutationErrorMessage(error, "otp-send"));
    },
  });

  function onSubmit(values) {
    onError("");
    verifyOtp.mutate({ phone, code: values.code });
  }

  function handleResend() {
    onError("");
    setResendMessage("");
    resendOtp.mutate(phone);
  }

  const resendDisabled = resendOtp.isPending || timeLeft > 0;

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

      {resendMessage && (
        <p className="text-sm text-green-600">{resendMessage}</p>
      )}
      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      {timeLeft > 0 && (
        <p className="text-sm text-gray-500">
          ارسال مجدد کد تا {formatCountdown(timeLeft)} دیگر
        </p>
      )}

      <button
        type="button"
        onClick={handleResend}
        disabled={resendDisabled}
        className="text-sm font-medium text-blue-600 hover:underline disabled:opacity-60"
      >
        {resendOtp.isPending ? "در حال ارسال دوباره..." : "ارسال دوباره کد"}
      </button>

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
