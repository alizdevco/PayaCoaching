import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { ChevronDown, Menu, X } from "lucide-react";

import Button from "./Button.jsx";
import LoadingState from "./LoadingState.jsx";
import { useExamList } from "../features/exams/useExamList.js";
import { formatExamDate } from "../lib/persianDate.js";

const navLinks = [
  { to: "/", label: "خانه", end: true },
  { to: "/#product", label: "معرفی محصول" },
  { to: "/#contact", label: "تماس با ما" },
];

function examAnalysisLabel(examDate) {
  return `تحلیل آزمون ${formatExamDate(examDate)}`;
}

function NavbarLink({ to, end, label, onNavigate }) {
  const isHashLink = to.includes("#");

  if (isHashLink) {
    return (
      <a
        href={to}
        onClick={onNavigate}
        className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-emerald-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
      >
        {label}
      </a>
    );
  }

  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
            : "text-slate-600 hover:bg-slate-100 hover:text-emerald-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-emerald-400",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}

function ExamAnalysisDropdown({ exams, isLoading, onNavigate }) {
  return (
    <div className="group relative">
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-emerald-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
        aria-haspopup="true"
      >
        تحلیل آزمون
        <ChevronDown
          size={16}
          className="transition-transform group-hover:rotate-180"
          aria-hidden="true"
        />
      </button>

      <div className="invisible absolute start-0 top-full z-50 min-w-[14rem] pt-1 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
        <ul
          role="menu"
          className="overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-[#1e293b]"
        >
          {isLoading && (
            <li className="px-3 py-2">
              <LoadingState message="در حال بارگذاری..." />
            </li>
          )}

          {!isLoading && exams.length === 0 && (
            <li
              role="menuitem"
              className="cursor-default px-4 py-2.5 text-sm text-slate-400 dark:text-slate-500"
            >
              هنوز تحلیلی منتشر نشده
            </li>
          )}

          {!isLoading &&
            exams.map((exam) => (
              <li key={exam.id} role="none">
                <Link
                  to={`/exam-analysis/${exam.exam_date}`}
                  role="menuitem"
                  onClick={onNavigate}
                  className="block px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-200 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400"
                >
                  {examAnalysisLabel(exam.exam_date)}
                </Link>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}

function ExamAnalysisMobileAccordion({ exams, isLoading, onNavigate }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-emerald-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
      >
        تحلیل آزمون
        <ChevronDown
          size={16}
          className={["transition-transform", open ? "rotate-180" : ""].join(" ")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul className="mt-1 space-y-0.5 border-s border-slate-200 ps-3 dark:border-slate-700">
          {isLoading && (
            <li className="px-3 py-2">
              <LoadingState message="در حال بارگذاری..." />
            </li>
          )}

          {!isLoading && exams.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">
              هنوز تحلیلی منتشر نشده
            </li>
          )}

          {!isLoading &&
            exams.map((exam) => (
              <li key={exam.id}>
                <Link
                  to={`/exam-analysis/${exam.exam_date}`}
                  onClick={onNavigate}
                  className="block rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-emerald-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
                >
                  {examAnalysisLabel(exam.exam_date)}
                </Link>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: exams = [], isLoading } = useExamList({ publishedOnly: true });

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header
      dir="rtl"
      className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-700 dark:bg-[#0f172a]/95"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          className="text-lg font-bold text-slate-800 dark:text-white"
          onClick={closeMenu}
        >
          پایا کوچینگ
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <NavbarLink key={link.to} {...link} />
          ))}
          <ExamAnalysisDropdown exams={exams} isLoading={isLoading} />
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link to="/login">
            <Button variant="secondary" size="sm">
              ورود
            </Button>
          </Link>
          <Link to="/register">
            <Button size="sm">ثبت‌نام</Button>
          </Link>
        </div>

        <button
          type="button"
          aria-label={menuOpen ? "بستن منو" : "باز کردن منو"}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-slate-200 px-4 py-3 md:hidden dark:border-slate-700">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <NavbarLink key={link.to} {...link} onNavigate={closeMenu} />
            ))}
            <ExamAnalysisMobileAccordion
              exams={exams}
              isLoading={isLoading}
              onNavigate={closeMenu}
            />
          </nav>
          <div className="mt-3 flex flex-col gap-2">
            <Link to="/login" onClick={closeMenu}>
              <Button variant="secondary" className="w-full">
                ورود
              </Button>
            </Link>
            <Link to="/register" onClick={closeMenu}>
              <Button className="w-full">ثبت‌نام</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
