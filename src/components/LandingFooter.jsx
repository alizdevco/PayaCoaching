import { Link } from "react-router-dom";

import logoImage from "../assets/logo.png";

function PayamLogo({ className = "" }) {
  return (
    <span
      className={["inline-flex items-center gap-2 font-bold text-white", className].join(
        " ",
      )}
    >
      <img
        src={logoImage}
        alt=""
        className="h-9 w-9 shrink-0 rounded-xl object-contain"
      />
      پایا کوچینگ
    </span>
  );
}

export default function LandingFooter() {
  return (
    <footer className="rounded-t-3xl bg-[#0A1A14] text-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 py-10 sm:flex-row sm:px-6">
        <div className="text-center sm:text-start">
          <PayamLogo />
          <p className="mt-3 text-sm text-white/60">
            © ۲۰۲۶ پایا کوچینگ — تمامی حقوق محفوظ است
          </p>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/70">
          <a href="#" className="underline-offset-4 hover:text-white hover:underline">
            حریم خصوصی
          </a>
          <a href="#" className="underline-offset-4 hover:text-white hover:underline">
            قوانین
          </a>
          <Link
            to="/#contact"
            className="underline-offset-4 hover:text-white hover:underline"
          >
            تماس با ما
          </Link>
        </nav>
      </div>
    </footer>
  );
}
