import { UserCheck, BookOpen, BarChart2, Heart } from "lucide-react";

const features = [
  {
    icon: UserCheck,
    title: "مشاوره اختصاصی",
    description:
      "برنامه‌ریزی شخصی‌سازی‌شده با مشاوران مجرب برای هر دانش‌آموز",
  },
  {
    icon: BookOpen,
    title: "محتوای آموزشی",
    description: "دسترسی به منابع و محتوای آموزشی اختصاصی برای پیشرفت تحصیلی",
  },
  {
    icon: BarChart2,
    title: "تحلیل آزمون",
    description: "بررسی دقیق نتایج آزمون و ارائه راهکارهای بهبود عملکرد",
  },
  {
    icon: Heart,
    title: "پشتیبانی مستمر",
    description: "همراهی مداوم تیم پایا کوچینگ در تمام مراحل مسیر تحصیلی",
  },
];

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="scroll-mt-nav px-3 py-20 sm:px-4 sm:py-28"
    >
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-[#0A1A14] px-4 py-16 sm:px-8 sm:py-20">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-64"
          style={{
            background:
              "radial-gradient(ellipse at top, rgba(110,231,183,0.15), transparent 60%)",
          }}
          aria-hidden="true"
        />

        <div className="relative text-center">
          <h2 className="font-display text-3xl text-white sm:text-4xl">
            ساخته‌شده برای اعتماد شما
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/60">
            فناوری امن و تخصصی اختصاصی برای آموزش
          </p>
        </div>

        <ul className="relative mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <li
              key={feature.title}
              className="rounded-2xl border border-emerald-900/30 bg-white/5 p-6"
            >
              <feature.icon
                size={22}
                className="text-white"
                aria-hidden="true"
              />
              <h3 className="mt-4 text-lg font-semibold text-white">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-7 text-white/55">
                {feature.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
