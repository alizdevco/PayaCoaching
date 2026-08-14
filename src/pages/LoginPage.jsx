// Returning-user login: phone (student) or email (admin) + password.
// A valid session skips this page and goes straight to the dashboard.

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth.js";
import { useLogin } from "../features/auth/useLogin.js";
import { dashboardPathForRole } from "../features/auth/authRoutes.js";
import { validateIranianPhone } from "../features/auth/phoneValidation.js";
import { getAuthMutationErrorMessage } from "../features/auth/authMutationErrors.js";
import Button from "../components/Button.jsx";
import AuthPageLayout, {
  AuthLoadingScreen,
} from "../components/auth/AuthPageLayout.jsx";
import {
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
  authLinkClassName,
  authMutedTextClassName,
} from "../components/auth/authFormStyles.js";

export default function LoginPage() {
  const navigate = useNavigate();
  const { session, role, profile, isLoading, refreshProfile } = useAuth();
  const [serverError, setServerError] = useState("");

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

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (session && role) {
    return <Navigate to={dashboardPathForRole(role, profile)} replace />;
  }

  if (session) {
    return <AuthLoadingScreen />;
  }

  function onSubmit(values) {
    setServerError("");
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
        </div>

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
