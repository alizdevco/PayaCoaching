import Navbar from "../components/Navbar.jsx";
import BackToTopButton from "../components/BackToTopButton.jsx";
import LandingFooter from "../components/LandingFooter.jsx";
import HeroSection from "../components/landing/HeroSection.jsx";
import AboutSection from "../components/landing/AboutSection.jsx";
import FeaturesSection from "../components/landing/FeaturesSection.jsx";
import ExamAnalysisSection from "../components/landing/ExamAnalysisSection.jsx";
import CtaSection from "../components/landing/CtaSection.jsx";
import ContactSection from "../components/landing/ContactSection.jsx";

export default function LandingPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-[#F7F5F0] text-[#1C1917]">
      <Navbar overlay />

      <main>
        <HeroSection />
        <AboutSection />
        <FeaturesSection />
        <ExamAnalysisSection />
        <CtaSection />
        <ContactSection />
      </main>

      <LandingFooter />
      <BackToTopButton />
    </div>
  );
}
