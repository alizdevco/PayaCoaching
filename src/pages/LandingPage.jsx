import { lazy, Suspense } from "react";

import BackToTopButton from "../components/BackToTopButton.jsx";
import Navbar from "../components/Navbar.jsx";
import HeroSection from "../components/landing/HeroSection.jsx";
import { useBelowFoldGate } from "../hooks/useBelowFoldGate.js";

const AboutSection = lazy(() => import("../components/landing/AboutSection.jsx"));
const FeaturesSection = lazy(
  () => import("../components/landing/FeaturesSection.jsx"),
);
const ExamAnalysisSection = lazy(
  () => import("../components/landing/ExamAnalysisSection.jsx"),
);
const CtaSection = lazy(() => import("../components/landing/CtaSection.jsx"));
const ContactSection = lazy(
  () => import("../components/landing/ContactSection.jsx"),
);
const LandingFooter = lazy(() => import("../components/LandingFooter.jsx"));

export default function LandingPage() {
  const belowFoldReady = useBelowFoldGate();

  return (
    <div dir="rtl" className="min-h-screen bg-[#F7F5F0] text-[#1C1917]">
      <Navbar overlay />

      <main>
        <HeroSection />
        {belowFoldReady ? (
          <Suspense fallback={null}>
            <AboutSection />
            <FeaturesSection />
            <ExamAnalysisSection />
            <CtaSection />
            <ContactSection />
          </Suspense>
        ) : null}
      </main>

      {belowFoldReady ? (
        <Suspense fallback={null}>
          <LandingFooter />
        </Suspense>
      ) : null}
      <BackToTopButton />
    </div>
  );
}
