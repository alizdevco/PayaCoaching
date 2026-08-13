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
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        در حال بارگذاری...
      </div>
    );
  }

  if (session && role) {
    return <Navigate to={dashboardPathForRole(role, profile)} replace />;
  }

  if (session) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        در حال بارگذاری...
      </div>
    );
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
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-gray-50 px-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-800">
          ورود
        </h1>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              شماره موبایل یا ایمیل
            </label>
            <input
              type="text"
              autoComplete="username"
              data-testid="login-identifier"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
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
              <p className="mt-1 text-sm text-red-600">
                {errors.identifier.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              رمز عبور
            </label>
            <input
              type="password"
              autoComplete="current-password"
              data-testid="login-password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
              {...register("password", { required: "رمز عبور الزامی است." })}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          {serverError && <p className="text-sm text-red-600">{serverError}</p>}

          <button
            type="submit"
            disabled={login.isPending}
            data-testid="login-submit"
            className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {login.isPending ? "در حال ورود..." : "ورود"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          حساب کاربری ندارید؟{" "}
          <Link
            to="/register"
            className="font-medium text-blue-600 hover:underline"
          >
            ثبت‌نام
          </Link>
        </p>
      </div>
    </div>
  );
}
