import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";

import Button from "./Button.jsx";
import logoImage from "../assets/logo.png";
import { signOut } from "../features/auth/authApi.js";
import { useAuth } from "../features/auth/useAuth.js";

const navLinks = [
  { hash: "home", label: "خانه" },
  { hash: "exam-analysis", label: "تحلیل آزمون" },
  { hash: "about", label: "معرفی ما" },
  { hash: "contact", label: "ارتباط با ما" },
];

function hashHref(hash, pathname) {
  if (hash === "home") {
    return pathname === "/" ? "#home" : "/#home";
  }
  return pathname === "/" ? `#${hash}` : `/#${hash}`;
}

function getProfileFirstName(profile) {
  const fullName = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (!fullName) {
    return "کاربر";
  }
  return fullName.split(/\s+/)[0];
}

function PayamLogo() {
  return (
    <span className="inline-flex items-center gap-2">
      <img
        src={logoImage}
        alt=""
        className="h-8 w-8 shrink-0 rounded-xl object-contain"
      />
      <span className="navbar-glass-text text-lg font-bold">پایا کوچینگ</span>
    </span>
  );
}

function NavAnchor({ hash, label, pathname, onNavigate }) {
  return (
    <a
      href={hashHref(hash, pathname)}
      onClick={onNavigate}
      className="navbar-glass-muted rounded-full px-3 py-2 text-sm font-medium transition-colors hover:bg-white/20"
    >
      {label}
    </a>
  );
}

function DrawerNavLink({ hash, label, pathname, onNavigate }) {
  return (
    <a
      href={hashHref(hash, pathname)}
      onClick={onNavigate}
      className="navbar-drawer-link"
    >
      {label}
    </a>
  );
}

function AuthRegisterButton({ className = "", onNavigate }) {
  return (
    <Link to="/register" onClick={onNavigate}>
      <Button size="sm" className={className}>
        ورود / ثبت‌نام
      </Button>
    </Link>
  );
}

function NavbarUserMenu({ displayName, onNavigate, compact = false }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleMouseDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
  }

  function handleDashboard() {
    closeMenu();
    onNavigate?.();
    navigate("/student");
  }

  async function handleLogout() {
    closeMenu();
    onNavigate?.();
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("[logout]", error);
    }
  }

  return (
    <div ref={containerRef} className="relative" dir="rtl">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className={[
          "navbar-glass-text inline-flex items-center gap-1 rounded-full font-medium transition-colors hover:bg-white/20",
          compact
            ? "navbar-mobile-cta px-3"
            : "px-4 py-1.5 text-sm",
        ].join(" ")}
      >
        <span className="max-w-[7rem] truncate">{displayName}</span>
        <ChevronDown
          size={compact ? 14 : 16}
          aria-hidden="true"
          className={[
            "shrink-0 transition-transform duration-200",
            open && "rotate-180",
          ]
            .filter(Boolean)
            .join(" ")}
        />
      </button>

      {open && (
        <div
          role="menu"
          dir="rtl"
          className="absolute top-full z-[60] mt-2 min-w-[160px] overflow-hidden rounded-xl border border-stone-200 bg-white py-1 text-start shadow-lg start-0"
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleDashboard}
            className="block w-full px-4 py-2.5 text-sm text-[#1C1917] transition-colors hover:bg-stone-50"
          >
            ورود به حساب کاربری
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="block w-full px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
          >
            خروج
          </button>
        </div>
      )}
    </div>
  );
}

function DrawerAuthLinks({ onNavigate }) {
  const navigate = useNavigate();

  function handleDashboard() {
    onNavigate?.();
    navigate("/student");
  }

  async function handleLogout() {
    onNavigate?.();
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("[logout]", error);
    }
  }

  return (
    <div dir="rtl" className="border-t border-white/10">
      <button
        type="button"
        onClick={handleDashboard}
        className="navbar-drawer-link w-full text-start"
      >
        ورود به حساب کاربری
      </button>
      <button
        type="button"
        onClick={handleLogout}
        className="navbar-drawer-link w-full text-start text-red-400 hover:text-red-300"
      >
        خروج
      </button>
    </div>
  );
}

export default function Navbar({ overlay = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const { pathname } = useLocation();
  const { session, profile, isLoading } = useAuth();
  const isLanding = pathname === "/";
  const overHero = isLanding && !scrolledPastHero;
  const isLoggedIn = !isLoading && Boolean(session);
  const displayName = getProfileFirstName(profile);

  useEffect(() => {
    if (!isLanding) {
      return undefined;
    }

    function updatePastHero() {
      const hero = document.getElementById("home");
      const heroBottom = hero?.offsetHeight ?? window.innerHeight;
      setScrolledPastHero(window.scrollY >= heroBottom - 96);
    }

    updatePastHero();
    window.addEventListener("scroll", updatePastHero, { passive: true });
    window.addEventListener("resize", updatePastHero, { passive: true });

    return () => {
      window.removeEventListener("scroll", updatePastHero);
      window.removeEventListener("resize", updatePastHero);
    };
  }, [isLanding]);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  function openMenu() {
    setMenuOpen(true);
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3 sm:px-6 sm:pt-4">
        <header
          dir="rtl"
          className={[
            "navbar-glass pointer-events-auto w-full max-w-5xl rounded-full transition-colors duration-300",
            overHero && "navbar-glass--over-hero",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="flex h-14 items-center gap-3 px-4 sm:gap-4 sm:px-6">
            <Link to="/" onClick={closeMenu} className="shrink-0">
              <PayamLogo />
            </Link>

            <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
              {navLinks.map((link) => (
                <NavAnchor
                  key={link.hash}
                  {...link}
                  pathname={pathname}
                />
              ))}
            </nav>

            <div className="hidden md:block">
              {isLoggedIn ? (
                <NavbarUserMenu displayName={displayName} />
              ) : (
                <AuthRegisterButton className="rounded-full px-5" />
              )}
            </div>

            <div className="ms-auto flex items-center gap-2 md:hidden">
              {isLoggedIn ? (
                <NavbarUserMenu
                  displayName={displayName}
                  onNavigate={closeMenu}
                  compact
                />
              ) : (
                <AuthRegisterButton
                  className="navbar-mobile-cta rounded-full"
                  onNavigate={closeMenu}
                />
              )}

              <button
                type="button"
                aria-label="باز کردن منو"
                aria-expanded={menuOpen}
                onClick={openMenu}
                className="navbar-glass-text flex h-9 w-9 items-center justify-center rounded-full text-xl leading-none hover:bg-white/20"
              >
                ☰
              </button>
            </div>
          </div>
        </header>
      </div>

      <button
        type="button"
        aria-label="بستن منوی پس‌زمینه"
        className={[
          "navbar-drawer-backdrop fixed inset-0 z-[55] md:hidden",
          menuOpen && "navbar-drawer-backdrop--open",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={closeMenu}
      />

      <aside
        dir="rtl"
        aria-hidden={!menuOpen}
        className={[
          "navbar-drawer md:hidden",
          menuOpen && "navbar-drawer--open",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="flex items-center justify-end px-4 pt-4">
          <button
            type="button"
            aria-label="بستن منو"
            onClick={closeMenu}
            className="navbar-drawer-close flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        <nav className="mt-2">
          {navLinks.map((link) => (
            <DrawerNavLink
              key={link.hash}
              {...link}
              pathname={pathname}
              onNavigate={closeMenu}
            />
          ))}
          {isLoggedIn && <DrawerAuthLinks onNavigate={closeMenu} />}
        </nav>
      </aside>

      {!overlay && (
        <div className="h-[4.75rem] shrink-0 sm:h-20" aria-hidden="true" />
      )}
    </>
  );
}
