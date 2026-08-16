// Student registration in 3 steps on one page:
//   1. Phone number  -> request OTP
//   2. OTP code      -> verify OTP
//   3. Profile form  -> create account + save full profile (only after OTP)

import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate, Link } from "react-router-dom";

import Button from "../components/Button.jsx";
import StudentProfileFields from "../components/StudentProfileFields.jsx";
import AuthPageLayout, {
  AuthLoadingScreen,
} from "../components/auth/AuthPageLayout.jsx";
import RegisterStepIndicator, {
  formatRegisterStepLabel,
} from "../components/auth/RegisterStepIndicator.jsx";
import {
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
  authLinkClassName,
  authMutedTextClassName,
  authSuccessClassName,
} from "../components/auth/authFormStyles.js";
import { useAuth } from "../features/auth/useAuth.js";
import {
  useSendOtp,
  useVerifyOtp,
  useRegisterWithProfile,
} from "../features/auth/useRegister.js";
import { dashboardPathForRole } from "../features/auth/authRoutes.js";
import { validateIranianPhone } from "../features/auth/phoneValidation.js";
import { getAuthMutationErrorMessage } from "../features/auth/authMutationErrors.js";
import {
  OTP_COOLDOWN_SECONDS,
  OTP_COOLDOWN_MS,
  OTP_COOLDOWN_ERROR,
  clearOtpCooldown,
  getOtpStepInitialCooldown,
  getRemainingCooldownSeconds,
  getStoredCooldownSeconds,
  readOtpCooldown,
  writeOtpCooldown,
} from "../features/auth/otpCooldown.js";

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
  const step2HistorySeededRef = useRef(false);

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
    if (step < 2) {
      step2HistorySeededRef.current = false;
      return;
    }

    // Step 1→2 does not push history (forward nav). Seed once so browser back
    // on step 2 can be intercepted; skip when returning 3→2 (already pushed).
    if (step === 2 && !step2HistorySeededRef.current) {
      pushRegisterHistory();
      step2HistorySeededRef.current = true;
    }

    const onPopState = () => {
      setStep((prevStep) => {
        const nextStep = Math.max(1, prevStep - 1);
        if (prevStep === 2 && nextStep === 1) {
          setServerError("");
          step2HistorySeededRef.current = false;
        }
        // Match forward-nav history pattern: push when landing on step 2+ (2→3
        // pushes on forward; 3→2 pushes here). Step 2→1 UI back does not push.
        if (nextStep >= 2) {
          pushRegisterHistory();
        }
        return nextStep;
      });
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [step]);

  if (isLoading) {
    return <AuthLoadingScreen />;
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
    <AuthPageLayout
      title="ثبت‌نام"
      subtitle={formatRegisterStepLabel(effectiveStep)}
      maxWidth="lg"
      footer={
        <p className={`mt-6 text-center ${authMutedTextClassName}`}>
          قبلاً ثبت‌نام کرده‌اید؟{" "}
          <Link to="/login" className={authLinkClassName}>
            ورود
          </Link>
        </p>
      }
    >
      <RegisterStepIndicator currentStep={effectiveStep} />

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
            navigate("/student/exams", { replace: true });
          }}
        />
      )}
    </AuthPageLayout>
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
        <label className={authLabelClassName}>شماره موبایل</label>
        <input
          type="tel"
          className={authInputClassName}
          placeholder="09123456789"
          {...phoneField}
          onChange={(event) => {
            phoneField.onChange(event);
            onError("");
          }}
        />
        {errors.phone && (
          <p className={`mt-1 ${authErrorClassName}`}>{errors.phone.message}</p>
        )}
      </div>

      {serverError && <p className={authErrorClassName}>{serverError}</p>}

      <Button type="submit" disabled={sendOtp.isPending} className="w-full rounded-full">
        {sendOtp.isPending ? "در حال ارسال..." : "ارسال کد تأیید"}
      </Button>
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
      <p className={authMutedTextClassName}>
        کد تأیید به شماره <span className="font-medium text-[#1C1917]">{phone}</span>{" "}
        ارسال شد.
      </p>

      <div>
        <label className={authLabelClassName}>کد تأیید</label>
        <input
          type="text"
          inputMode="numeric"
          className={`${authInputClassName} text-center tracking-widest`}
          placeholder="- - - -"
          {...register("code", {
            required: "کد تأیید الزامی است.",
            minLength: { value: 4, message: "کد تأیید باید حداقل ۴ رقم باشد." },
          })}
        />
        {errors.code && (
          <p className={`mt-1 ${authErrorClassName}`}>{errors.code.message}</p>
        )}
      </div>

      {resendMessage && <p className={authSuccessClassName}>{resendMessage}</p>}
      {serverError && <p className={authErrorClassName}>{serverError}</p>}

      {timeLeft > 0 && (
        <p className="text-sm text-[#78716C]">
          ارسال مجدد کد تا {formatCountdown(timeLeft)} دیگر
        </p>
      )}

      <button
        type="button"
        onClick={handleResend}
        disabled={resendDisabled}
        className={`${authLinkClassName} text-sm disabled:opacity-60`}
      >
        {resendOtp.isPending ? "در حال ارسال دوباره..." : "ارسال دوباره کد"}
      </button>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onBack}
          className="w-1/3 rounded-full border-stone-300"
        >
          بازگشت
        </Button>
        <Button
          type="submit"
          disabled={verifyOtp.isPending}
          className="w-2/3 rounded-full"
        >
          {verifyOtp.isPending ? "در حال بررسی..." : "تأیید کد"}
        </Button>
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
      <p className={authMutedTextClassName}>
        لطفاً اطلاعات پروفایل خود را تکمیل کنید.
      </p>

      <StudentProfileFields
        register={register}
        control={control}
        errors={errors}
        watch={watch}
        setValue={setValue}
        includePassword
        variant="landing"
      />

      {serverError && <p className={authErrorClassName}>{serverError}</p>}

      <Button
        type="submit"
        disabled={registerWithProfile.isPending}
        className="w-full rounded-full"
      >
        {registerWithProfile.isPending ? "در حال ثبت‌نام..." : "تکمیل ثبت‌نام"}
      </Button>
    </form>
  );
}
