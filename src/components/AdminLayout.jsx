import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BarChart2,
  ClipboardList,
  FolderUp,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
} from "lucide-react";

import { signOut } from "../features/auth/authApi.js";

const DARK_MODE_KEY = "admin-dark-mode";

const navItems = [
  { to: "/admin", label: "داشبورد", icon: LayoutDashboard, end: true },
  { to: "/admin/students", label: "دانش‌آموزان", icon: Users },
  { to: "/admin/exams", label: "تحلیل آزمون", icon: BarChart2 },
  { to: "/admin/online-exams", label: "آزمون آنلاین", icon: ClipboardList },
  { to: "/admin/shared-content", label: "محتوای مشترک", icon: FolderUp },
];

function AdminNavLink({ to, end, label, icon: Icon, onNavigate }) {
  const navigate = useNavigate();
  const [isPressed, setIsPressed] = useState(false);

  function handleClick(event) {
    event.preventDefault();
    setIsPressed(true);
    navigate(to);
    onNavigate?.();
    // Keep the brief press animation without delaying navigation.
    window.setTimeout(() => setIsPressed(false), 100);
  }

  return (
    <NavLink
      to={to}
      end={end}
      onClick={handleClick}
      data-testid={`nav-${to === "/admin" ? "dashboard" : to.replace("/admin/", "").replace(/\//g, "-")}`}
      className={({ isActive }) =>
        [
          "admin-nav-link group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ease-in-out",
          "md:justify-center lg:justify-start",
          isActive
            ? "bg-[#ecfdf5] text-emerald-500 dark:bg-[#064e3b] dark:text-emerald-400"
            : "text-slate-600 hover:-translate-x-0.5 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60",
          isPressed ? "scale-[0.96]" : "scale-100",
        ].join(" ")
      }
    >
      <Icon size={18} className="shrink-0" />
      <span className="md:max-lg:hidden">{label}</span>
      <span className="admin-nav-tooltip hidden md:max-lg:group-hover:block">
        {label}
      </span>
    </NavLink>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const navRef = useRef(null);
  const itemRefs = useRef([]);

  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem(DARK_MODE_KEY) === "true";
  });
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0 });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem(DARK_MODE_KEY, String(isDark));

    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, [isDark]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  useEffect(() => {
    function updateIndicator() {
      const activeIndex = navItems.findIndex((item) => {
        if (item.end) {
          return location.pathname === item.to;
        }
        return location.pathname.startsWith(item.to);
      });

      const activeEl = itemRefs.current[activeIndex];
      const navEl = navRef.current;
      if (!activeEl || !navEl) {
        return;
      }

      const navRect = navEl.getBoundingClientRect();
      const itemRect = activeEl.getBoundingClientRect();
      setIndicatorStyle({
        top: itemRect.top - navRect.top,
        height: itemRect.height,
      });
    }

    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [location.pathname, sidebarOpen]);

  function closeSidebar() {
    setSidebarOpen(false);
  }

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("[logout]", error?.message);
      setIsLoggingOut(false);
    }
  }

  const sidebarContent = (
    <>
      <Link
        to="/login"
        onClick={closeSidebar}
        className="flex items-center gap-3 px-5 py-6 transition-opacity hover:opacity-80 md:justify-center md:px-3 lg:justify-start lg:px-5"
        aria-label="رفتن به صفحه ورود"
      >
        <div className="admin-logo-pulse flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500">
          <LayoutDashboard size={20} className="text-white" />
        </div>
        <span className="text-lg font-bold text-slate-800 md:max-lg:hidden dark:text-white">
          پایا کوچینگ
        </span>
      </Link>

      <nav ref={navRef} className="relative flex flex-1 flex-col gap-1 px-3">
        <div
          className="admin-nav-indicator pointer-events-none absolute right-0 w-[3px] rounded-full bg-emerald-500"
          style={{
            top: indicatorStyle.top,
            height: indicatorStyle.height,
          }}
        />
        {navItems.map((item, index) => (
          <div
            key={item.to}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
          >
            <AdminNavLink {...item} onNavigate={closeSidebar} />
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3 dark:border-slate-700">
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          data-testid="admin-logout"
          className="group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-all duration-150 ease-in-out hover:-translate-x-0.5 hover:bg-red-50 hover:text-red-600 disabled:opacity-60 md:justify-center lg:justify-start dark:text-slate-300 dark:hover:bg-red-950/40 dark:hover:text-red-400"
        >
          <LogOut size={18} className="shrink-0" />
          <span className="md:max-lg:hidden">
            {isLoggingOut ? "در حال خروج..." : "خروج"}
          </span>
          <span className="admin-nav-tooltip hidden md:max-lg:group-hover:block">
            خروج
          </span>
        </button>
      </div>
    </>
  );

  return (
    <div
      dir="rtl"
      className="flex min-h-screen bg-[#f8fafc] text-slate-800 transition-colors duration-200 dark:bg-[#0a0f1e] dark:text-slate-100"
    >
      {/* Mobile backdrop */}
      <button
        type="button"
        aria-label="بستن منو"
        onClick={closeSidebar}
        className={[
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 md:hidden",
          sidebarOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 right-0 z-50 flex w-[280px] flex-col border-l border-slate-200 bg-white transition-transform duration-[250ms] ease-in-out md:static md:z-auto md:w-[200px] md:translate-x-0 md:transition-none lg:w-[240px]",
          "dark:border-slate-700 dark:bg-[#0f172a]",
          sidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={closeSidebar}
          aria-label="بستن منو"
          className="absolute left-4 top-5 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 md:hidden dark:hover:bg-slate-800"
        >
          <X size={20} />
        </button>
        {sidebarContent}
      </aside>

      <main className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 transition-colors duration-200 sm:px-6 dark:border-slate-700 dark:bg-[#0f172a]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="باز کردن منو"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-emerald-500 md:hidden dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
            >
              <Menu size={20} />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
              م
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              مدیر سیستم
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsDark((prev) => !prev)}
            data-testid="admin-dark-mode-toggle"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-emerald-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
            aria-label={isDark ? "حالت روشن" : "حالت تاریک"}
            aria-pressed={isDark}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </header>

        <div className="admin-page-enter flex-1 p-4 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
