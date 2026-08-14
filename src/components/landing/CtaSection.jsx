import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import Button from "../Button.jsx";

export default function CtaSection() {
  return (
    <section className="relative px-3 py-20 sm:px-4 sm:py-28">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-[#F7F5F0] px-6 py-20 text-center sm:px-12">
        <div
          className="landing-blob start-[5%] top-[20%] h-24 w-64"
          aria-hidden="true"
        />
        <div
          className="landing-blob end-[10%] top-[35%] h-16 w-48 opacity-10"
          aria-hidden="true"
        />
        <div
          className="landing-blob start-[30%] bottom-[15%] h-20 w-72 opacity-20"
          aria-hidden="true"
        />
        <div
          className="landing-blob end-[25%] top-[10%] h-12 w-40 opacity-10"
          aria-hidden="true"
        />

        <div className="relative space-y-8">
          <h2 className="font-display mx-auto max-w-2xl text-3xl text-[#1C1917] sm:text-4xl">
            مشاوره، محتوا و تحلیل آزمون — همه در یکجا
          </h2>

          <Link to="/register">
            <Button variant="dark" size="lg" className="rounded-full px-10">
              شروع کنید
              <ArrowLeft size={18} aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
