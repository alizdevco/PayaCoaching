import { Link } from "react-router-dom";

import logoImage from "../../assets/logo.png";

function AuthLogo() {
  return (
    <span className="inline-flex items-center gap-2">
      <img
        src={logoImage}
        alt=""
        className="h-8 w-8 shrink-0 rounded-xl object-contain"
      />
      <span className="text-lg font-bold text-[#1C1917]">پایا کوچینگ</span>
    </span>
  );
}

export function AuthLoadingScreen() {
  return (
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-[#F7F5F0] text-[#78716C]"
    >
      در حال بارگذاری...
    </div>
  );
}

export default function AuthPageLayout({
  title,
  subtitle,
  maxWidth = "md",
  children,
  footer,
}) {
  const maxWidthClass = maxWidth === "lg" ? "max-w-lg" : "max-w-md";

  return (
    <div dir="rtl" className="relative min-h-screen bg-[#F7F5F0] text-[#1C1917]">
      <header className="relative z-10 px-4 pt-6 sm:px-6">
        <Link to="/" className="inline-flex transition-opacity hover:opacity-80">
          <AuthLogo />
        </Link>
      </header>

      <main className="relative z-10 flex items-center justify-center px-4 py-8 sm:py-12">
        <div
          className={[
            "w-full rounded-2xl border border-stone-200/80 bg-white p-8",
            maxWidthClass,
          ].join(" ")}
        >
          <h1 className="font-display text-center text-2xl text-[#1C1917] sm:text-3xl">
            {title}
          </h1>

          {subtitle ? (
            <p className="mb-6 mt-2 text-center text-sm text-[#78716C]">{subtitle}</p>
          ) : (
            <div className="mb-6" aria-hidden="true" />
          )}

          {children}

          {footer}
        </div>
      </main>
    </div>
  );
}
