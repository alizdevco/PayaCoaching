import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import Button from "../Button.jsx";
import HeroWaveBackground from "./HeroWaveBackground.jsx";

export default function HeroSection() {
  return (
    <section
      id="home"
      className="scroll-mt-nav relative h-[100svh] min-h-[100svh] w-full"
    >
      <HeroWaveBackground />
      <div className="absolute inset-0 bg-gradient-to-l from-black/70 via-black/50 to-black/30" />

      <div className="relative z-10 flex h-full min-h-[100svh] items-center">
        <div className="landing-shell w-full py-24 pt-28 sm:py-28 lg:py-32">
          <div className="max-w-xl space-y-6">
            <h1 className="font-display text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
              <span className="block">مشاوره تحصیلی</span>
              <span className="mt-1 block text-[#6EE7B7]">با پایا کوچینگ</span>
            </h1>
            <p className="text-base leading-8 text-white/85 sm:text-lg">
              همراه شما در مسیر موفقیت تحصیلی — مشاوره، محتوای اختصاصی و تحلیل
              آزمون
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/register">
                <Button
                  size="lg"
                  className="rounded-full px-8 shadow-lg shadow-emerald-900/30"
                >
                  ثبت‌نام
                  <ArrowLeft size={18} aria-hidden="true" />
                </Button>
              </Link>
              <a href="#about">
                <Button
                  variant="secondary"
                  size="lg"
                  className="rounded-full border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
                >
                  بیشتر بدانید
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
