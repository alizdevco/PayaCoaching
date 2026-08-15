import { GraduationCap } from "lucide-react";

import SectionLabel from "./SectionLabel.jsx";

const badges = ["دسترسی 24 ساعته به محتوا", "گزارش پیشرفت شخصی سازی شده", "آزمون آنلاین با تحلیل خودکار"];

export default function AboutSection() {
  return (
    <section
      id="about"
      className="scroll-mt-nav relative bg-[#F7F5F0] py-20 sm:py-28"
    >
      <SectionLabel label="معرفی ما" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="landing-section-enter space-y-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#064E3B] text-[#6EE7B7] shadow-lg shadow-emerald-900/10">
              <GraduationCap size={24} aria-hidden="true" />
            </div>
            <h2 className="font-display text-3xl text-[#1C1917] sm:text-4xl">
              چرا پایا کوچینگ؟
            </h2>
            <div className="space-y-4 text-base leading-8 text-[#57534E]">
              <p>
                در <strong className="font-semibold text-[#1C1917]">پایا کوچینگ</strong>
                ، مسیر هر دانش‌آموز را متناسب با هدف، توانمندی و شرایط خودش طراحی
                می‌کنیم؛ با تمرکز بر{" "}
                <strong className="font-semibold text-[#1C1917]">
                  مشاوره تخصصی، برنامه‌ریزی هدفمند و نتیجه‌محوری
                </strong>
                .
              </p>
              <p>
                پایا کوچینگ با همراهی{" "}
                <strong className="font-semibold text-[#1C1917]">
                  حسام قربانی، دانشجوی سال سوم دندانپزشکی دانشگاه تهران
                </strong>{" "}
                و با بیش از{" "}
                <strong className="font-semibold text-[#1C1917]">
                  ۳ سال تجربه در حوزه مشاوره تحصیلی
                </strong>{" "}
                شکل گرفته است.
              </p>
              <p className="font-medium text-[#1C1917]">
                پایا کوچینگ؛ مسیر درست، برای رسیدن به هدف درست.
              </p>
            </div>
          </div>

          <div className="landing-section-enter relative">
            <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-[#064E3B] to-[#0A1A14] shadow-xl">
              <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center text-white/80">
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#6EE7B7]" />
                  <span className="h-2 w-2 rounded-full bg-[#6EE7B7]/70" />
                  <span className="h-2 w-2 rounded-full bg-[#6EE7B7]/40" />
                </div>
                <p className="text-lg font-medium text-white">تیم مشاوران پایا کوچینگ</p>
                <p className="text-sm text-white/60">
                  همراه شما در مسیر موفقیت تحصیلی
                </p>
              </div>
            </div>

            <div className="absolute inset-x-4 -bottom-5 flex flex-wrap justify-center gap-2 sm:inset-x-6">
              {badges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-white/20 bg-[#0A1A14]/80 px-4 py-2 text-xs font-medium text-white backdrop-blur-md sm:text-sm"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
