import { lazy, Suspense } from "react";

import Navbar from "../components/Navbar.jsx";
import HeroSection from "../components/landing/HeroSection.jsx";

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
const BackToTopButton = lazy(() => import("../components/BackToTopButton.jsx"));

export default function LandingPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-[#F7F5F0] text-[#1C1917]">
      <Navbar overlay />

      <main>
        <HeroSection />
        <Suspense fallback={null}>
          <AboutSection />
          <FeaturesSection />
          <ExamAnalysisSection />
          <CtaSection />
          <ContactSection />
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <LandingFooter />
        <BackToTopButton />
      </Suspense>
    </div>
  );
}
