// Returning-user login: phone (student) or email (admin) + password.
// Inline forgot-password wizard (phone OTP → verify → new password).

import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth.js";
import { useLogin } from "../features/auth/useLogin.js";
import { dashboardPathForRole } from "../features/auth/authRoutes.js";
import { validateIranianPhone } from "../features/auth/phoneValidation.js";
import { isPasswordChangedSignOutFailed } from "../features/auth/authApi.js";
import { getAuthMutationErrorMessage } from "../features/auth/authMutationErrors.js";
import {
  useSendPasswordResetOtp,
  useResetPassword,
} from "../features/auth/useForgotPassword.js";
import { useVerifyOtp } from "../features/auth/useRegister.js";
import {
  OTP_COOLDOWN_SECONDS,
  OTP_COOLDOWN_MS,
  OTP_COOLDOWN_RESET_STORAGE_KEY,
  OTP_COOLDOWN_ERROR,
  clearOtpCooldown,
  getOtpStepInitialCooldown,
  getRemainingCooldownSeconds,
  getStoredCooldownSeconds,
  readOtpCooldown,
  writeOtpCooldown,
} from "../features/auth/otpCooldown.js";
import Button from "../components/Button.jsx";
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

const FORGOT_PASSWORD_WIZARD_KEY = "forgot_password_wizard";
const FORGOT_STEP_LABELS = ["شماره موبایل", "تأیید کد", "رمز جدید"];

function readForgotPasswordWizard() {
  try {
    const raw = sessionStorage.getItem(FORGOT_PASSWORD_WIZARD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.mode !== "forgot") return null;
    if (typeof parsed.step !== "number" || !parsed.phone) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeForgotPasswordWizard(state) {
  sessionStorage.setItem(FORGOT_PASSWORD_WIZARD_KEY, JSON.stringify(state));
}

function clearForgotPasswordWizard() {
  sessionStorage.removeItem(FORGOT_PASSWORD_WIZARD_KEY);
}

function getInitialForgotState() {
  return {
    mode: "login",
    forgotStep: 1,
    phone: "",
    otpVerified: false,
  };
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { session, role, profile, isLoading, refreshProfile } = useAuth();
  const initialForgot = getInitialForgotState();
  const [mode, setMode] = useState(initialForgot.mode);
  const [forgotStep, setForgotStep] = useState(initialForgot.forgotStep);
  const [phone, setPhone] = useState(initialForgot.phone);
  const phoneRef = useRef(phone);
  useEffect(() => {
    phoneRef.current = phone;
  }, [phone]);
  const [otpVerified, setOtpVerified] = useState(initialForgot.otpVerified);
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [wizardRestored, setWizardRestored] = useState(false);
  const otpSentAtRef = useRef(new Map());

  const clearForgotPasswordState = useCallback(() => {
    clearForgotPasswordWizard();
    setPhone("");
    setOtpVerified(false);
    setForgotStep(1);
    otpSentAtRef.current.clear();
    clearOtpCooldown(OTP_COOLDOWN_RESET_STORAGE_KEY);
  }, []);

  const persistForgotWizard = useCallback(
    (nextStep, nextPhone) => {
      writeForgotPasswordWizard({
        mode: "forgot",
        step: nextStep,
        phone: nextPhone ?? phoneRef.current,
      });
    },
    [],
  );

  const recordOtpSent = useCallback((phoneNumber) => {
    const sentAt = Date.now();
    otpSentAtRef.current.set(phoneNumber, sentAt);
    writeOtpCooldown(phoneNumber, sentAt, OTP_COOLDOWN_RESET_STORAGE_KEY);
  }, []);

  const getPhoneCooldownSeconds = useCallback(
    (phoneNumber) =>
      getRemainingCooldownSeconds(
        otpSentAtRef.current,
        phoneNumber,
        OTP_COOLDOWN_RESET_STORAGE_KEY,
      ),
    [],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const login = useLogin({
    onSuccess: async (result) => {
      await refreshProfile();
      navigate(dashboardPathForRole(result.role, result.profile), {
        replace: true,
      });
    },
    onError: (error) => {
      console.error("[login]", error?.message);
      setServerError(getAuthMutationErrorMessage(error, "login"));
    },
  });

  useEffect(() => {
    if (isLoading || wizardRestored) return;

    const stored = readForgotPasswordWizard();
    if (stored?.mode === "forgot" && stored.step === 3 && session) {
      setMode("forgot");
      setForgotStep(3);
      setPhone(stored.phone);
      setOtpVerified(true);
    }
    setWizardRestored(true);
  }, [isLoading, session, wizardRestored]);

  useEffect(() => {
    if (mode !== "forgot") return;
    persistForgotWizard(forgotStep);
  }, [mode, forgotStep, persistForgotWizard]);

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  const storedWizard = readForgotPasswordWizard();
  const pendingForgotResume =
    !wizardRestored &&
    storedWizard?.mode === "forgot" &&
    storedWizard.step === 3 &&
    session;

  if (pendingForgotResume) {
    return <AuthLoadingScreen />;
  }

  if (session && role && mode !== "forgot") {
    return <Navigate to={dashboardPathForRole(role, profile)} replace />;
  }

  if (session && !role && mode !== "forgot") {
    return <AuthLoadingScreen />;
  }

  function onSubmit(values) {
    setServerError("");
    setSuccessMessage("");
    const isEmail = String(values.identifier || "").includes("@");
    let identifier;
    if (isEmail) {
      identifier = values.identifier.trim();
    } else {
      const result = validateIranianPhone(values.identifier);
      if (!result.valid) {
        setServerError(result.message);
        return;
      }
      identifier = result.phone;
    }
    login.mutate({ identifier, password: values.password });
  }

  function startForgotPassword() {
    setMode("forgot");
    setForgotStep(1);
    setServerError("");
    setSuccessMessage("");
    setOtpVerified(false);
    setPhone("");
    writeForgotPasswordWizard({ mode: "forgot", step: 1, phone: "" });
  }

  function returnToLogin() {
    clearForgotPasswordState();
    setMode("login");
    setServerError("");
  }

  if (mode === "forgot") {
    return (
      <AuthPageLayout
        title="بازیابی رمز عبور"
        subtitle={formatRegisterStepLabel(forgotStep)}
        footer={
          forgotStep === 1 ? (
            <p className={`mt-6 text-center ${authMutedTextClassName}`}>
              <button
                type="button"
                onClick={returnToLogin}
                className={authLinkClassName}
              >
                بازگشت به ورود
              </button>
            </p>
          ) : null
        }
      >
        <RegisterStepIndicator
          currentStep={forgotStep}
          stepLabels={FORGOT_STEP_LABELS}
        />

        {forgotStep === 1 && (
          <ForgotPhoneStep
            onError={setServerError}
            serverError={serverError}
            getRemainingCooldownSeconds={getPhoneCooldownSeconds}
            onOtpSent={recordOtpSent}
            onDone={(normalizedPhone) => {
              setPhone(normalizedPhone);
              setServerError("");
              setForgotStep(2);
              persistForgotWizard(2, normalizedPhone);
            }}
          />
        )}

        {forgotStep === 2 && (
          <ForgotOtpStep
            phone={phone}
            initialCooldownSeconds={getOtpStepInitialCooldown(
              phone,
              getPhoneCooldownSeconds(phone),
              OTP_COOLDOWN_RESET_STORAGE_KEY,
            )}
            onOtpSent={recordOtpSent}
            onError={setServerError}
            serverError={serverError}
            onBack={() => {
              setServerError("");
              setForgotStep(1);
              persistForgotWizard(1);
            }}
            onDone={() => {
              setServerError("");
              setOtpVerified(true);
              setForgotStep(3);
              persistForgotWizard(3);
            }}
          />
        )}

        {forgotStep === 3 && otpVerified && (
          <ForgotNewPasswordStep
            onError={setServerError}
            serverError={serverError}
            onDone={(message) => {
              clearForgotPasswordState();
              setMode("login");
              setForgotStep(1);
              setOtpVerified(false);
              setPhone("");
              setServerError("");
              setSuccessMessage(
                message ?? "رمز عبور با موفقیت تغییر کرد. اکنون وارد شوید.",
              );
            }}
          />
        )}
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout
      title="ورود"
      footer={
        <p className={`mt-6 text-center ${authMutedTextClassName}`}>
          حساب کاربری ندارید؟{" "}
          <Link to="/register" className={authLinkClassName}>
            ثبت‌نام
          </Link>
        </p>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        <div>
          <label className={authLabelClassName}>شماره موبایل یا ایمیل</label>
          <input
            type="text"
            autoComplete="username"
            data-testid="login-identifier"
            className={authInputClassName}
            placeholder="09123456789"
            {...register("identifier", {
              required: "این فیلد الزامی است.",
              validate: (value) => {
                if (String(value || "").includes("@")) {
                  return true;
                }
                const result = validateIranianPhone(value);
                return result.valid || result.message;
              },
            })}
          />
          {errors.identifier && (
            <p className={`mt-1 ${authErrorClassName}`}>
              {errors.identifier.message}
            </p>
          )}
        </div>

        <div>
          <label className={authLabelClassName}>رمز عبور</label>
          <input
            type="password"
            autoComplete="current-password"
            data-testid="login-password"
            className={authInputClassName}
            {...register("password", { required: "رمز عبور الزامی است." })}
          />
          {errors.password && (
            <p className={`mt-1 ${authErrorClassName}`}>
              {errors.password.message}
            </p>
          )}
          <button
            type="button"
            onClick={startForgotPassword}
            className={`mt-2 block text-sm ${authLinkClassName}`}
          >
            رمز عبور خود را فراموش کرده‌اید؟
          </button>
        </div>

        {successMessage && (
          <p className={authSuccessClassName}>{successMessage}</p>
        )}
        {serverError && <p className={authErrorClassName}>{serverError}</p>}

        <Button
          type="submit"
          disabled={login.isPending}
          data-testid="login-submit"
          className="w-full rounded-full"
        >
          {login.isPending ? "در حال ورود..." : "ورود"}
        </Button>
      </form>
    </AuthPageLayout>
  );
}

function ForgotPhoneStep({
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
  const sendResetOtp = useSendPasswordResetOtp({
    onSuccess: (result) => {
      onOtpSent(result.phone);
      onDone(result.phone);
    },
    onError: (error) => {
      console.error("[sendPasswordResetOtp]", error?.message);
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
    const stored = readOtpCooldown(OTP_COOLDOWN_RESET_STORAGE_KEY);
    const storedRemaining =
      stored?.phone === result.phone
        ? Math.max(0, OTP_COOLDOWN_MS - (Date.now() - stored.sentAt))
        : 0;
    if (stored?.phone === result.phone && storedRemaining > 0) {
      onError(OTP_COOLDOWN_ERROR);
      return;
    }
    if (stored?.phone === result.phone && storedRemaining <= 0) {
      clearOtpCooldown(OTP_COOLDOWN_RESET_STORAGE_KEY);
    }
    if (getRemainingCooldownSeconds(result.phone) > 0) {
      onError(OTP_COOLDOWN_ERROR);
      return;
    }
    sendResetOtp.mutate(result.phone);
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

      <Button
        type="submit"
        disabled={sendResetOtp.isPending}
        className="w-full rounded-full"
      >
        {sendResetOtp.isPending ? "در حال ارسال..." : "ارسال کد تأیید"}
      </Button>
    </form>
  );
}

function ForgotOtpStep({
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
          clearOtpCooldown(OTP_COOLDOWN_RESET_STORAGE_KEY);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    const storedRemaining = getStoredCooldownSeconds(
      phone,
      OTP_COOLDOWN_RESET_STORAGE_KEY,
    );
    const seconds =
      storedRemaining > 0 ? storedRemaining : initialCooldownSeconds;
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

  const resendOtp = useSendPasswordResetOtp({
    onSuccess: () => {
      setResendMessage("کد تأیید جدید ارسال شد.");
      onOtpSent(phone);
      startCountdown(COOLDOWN_SECONDS);
    },
    onError: (error) => {
      console.error("[resendPasswordResetOtp]", error?.message);
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

function ForgotNewPasswordStep({ onDone, onError, serverError }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();
  const password = watch("password");

  const resetPassword = useResetPassword({
    onSuccess: () => onDone(),
    onError: (error) => {
      if (isPasswordChangedSignOutFailed(error)) {
        console.error(
          "[resetPasswordAfterOtp] signOut failed:",
          error?.cause?.message ?? error?.message,
        );
        onDone(
          "رمز عبور با موفقیت تغییر کرد، اما خروج از این دستگاه انجام نشد. لطفاً صفحه را ببندید یا مرورگر را رفرش کنید.",
        );
        return;
      }
      console.error("[resetPasswordAfterOtp]", error?.message);
      onError(getAuthMutationErrorMessage(error, "password-reset"));
    },
  });

  function onSubmit(values) {
    onError("");
    resetPassword.mutate(values.password);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <p className={authMutedTextClassName}>رمز عبور جدید خود را وارد کنید.</p>

      <div>
        <label className={authLabelClassName}>رمز عبور جدید</label>
        <input
          type="password"
          autoComplete="new-password"
          className={authInputClassName}
          {...register("password", {
            required: "رمز عبور الزامی است.",
            minLength: {
              value: 6,
              message: "رمز عبور باید حداقل ۶ کاراکتر باشد.",
            },
          })}
        />
        {errors.password && (
          <p className={`mt-1 ${authErrorClassName}`}>{errors.password.message}</p>
        )}
      </div>

      <div>
        <label className={authLabelClassName}>تکرار رمز عبور</label>
        <input
          type="password"
          autoComplete="new-password"
          className={authInputClassName}
          {...register("confirmPassword", {
            required: "تکرار رمز عبور الزامی است.",
            validate: (value) =>
              value === password || "رمز عبور و تکرار آن یکسان نیستند.",
          })}
        />
        {errors.confirmPassword && (
          <p className={`mt-1 ${authErrorClassName}`}>
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {serverError && <p className={authErrorClassName}>{serverError}</p>}

      <Button
        type="submit"
        disabled={resetPassword.isPending}
        className="w-full rounded-full"
      >
        {resetPassword.isPending ? "در حال ذخیره..." : "تغییر رمز عبور"}
      </Button>
    </form>
  );
}
