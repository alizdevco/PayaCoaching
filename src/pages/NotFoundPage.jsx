import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import AuthPageLayout from "../components/auth/AuthPageLayout.jsx";
import Button from "../components/Button.jsx";

export default function NotFoundPage() {
  return (
    <AuthPageLayout
      title="صفحه پیدا نشد"
      subtitle="آدرسی که وارد کرده‌اید وجود ندارد یا حذف شده است."
    >
      <p
        className="font-display mb-6 text-center text-6xl font-bold text-[#064E3B]/20 sm:text-7xl"
        aria-hidden="true"
      >
        ۴۰۴
      </p>

      <div className="flex justify-center">
        <Link to="/">
          <Button variant="primary" size="lg">
            بازگشت به صفحه اصلی
            <ArrowLeft size={18} aria-hidden="true" />
          </Button>
        </Link>
      </div>
    </AuthPageLayout>
  );
}
