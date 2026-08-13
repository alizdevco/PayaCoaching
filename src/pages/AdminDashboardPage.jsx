import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Users, FileText, BookOpen, ArrowLeft } from "lucide-react";

import { fetchDashboardStats } from "../features/dashboard/dashboardApi.js";
import Card from "../components/Card.jsx";
import ErrorState from "../components/ErrorState.jsx";

function useCountUp(target, duration = 600, enabled = true) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let frameId = null;
    const startTime = performance.now();

    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(eased * target));

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    }

    frameId = requestAnimationFrame(animate);
    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [target, duration, enabled]);

  return value;
}

function StatCardSkeleton({ delayClass }) {
  return (
    <Card className={`admin-stagger-in ${delayClass}`}>
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-8 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
    </Card>
  );
}

function StatCard({ icon: Icon, iconBg, label, value, delayClass, animate, "data-testid": testId }) {
  const displayValue = useCountUp(value, 600, animate);

  return (
    <Card className={`admin-stat-card admin-stagger-in ${delayClass}`} data-testid={testId}>
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg}`}
        >
          <Icon size={22} className="text-white" />
        </div>
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <p className="admin-stat-number mt-1 text-3xl text-slate-800 dark:text-white">
            {displayValue.toLocaleString("fa-IR")}
          </p>
        </div>
      </div>
    </Card>
  );
}

function ActionCard({ title, description, onClick, delayClass, "data-testid": testId }) {
  return (
    <Card
      as="button"
      type="button"
      onClick={onClick}
      dir="rtl"
      data-testid={testId}
      className={`admin-action-card admin-stagger-in ${delayClass} group w-full text-right`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1 text-right">
          <h3 className="font-semibold text-slate-800 dark:text-white">
            {title}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
        <ArrowLeft
          size={18}
          className="admin-action-arrow shrink-0 text-slate-400 transition-all duration-150 group-hover:text-emerald-500"
        />
      </div>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white" data-testid="dashboard-title">
          داشبورد
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          خلاصه وضعیت سیستم
        </p>
      </div>

      {isError && (
        <ErrorState
          message="خطا در بارگذاری آمار. لطفاً دوباره تلاش کنید."
          onRetry={() => refetch()}
        />
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-700 dark:text-slate-200">
          آمار کلی
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <>
              <StatCardSkeleton delayClass="admin-stagger-0" />
              <StatCardSkeleton delayClass="admin-stagger-1" />
              <StatCardSkeleton delayClass="admin-stagger-2" />
            </>
          ) : (
            <>
              <StatCard
                icon={Users}
                iconBg="bg-emerald-500"
                label="تعداد دانش‌آموزان"
                value={data?.studentCount ?? 0}
                delayClass="admin-stagger-0"
                animate
                data-testid="stat-students"
              />
              <StatCard
                icon={FileText}
                iconBg="bg-blue-500"
                label="گزارش‌های آپلود شده"
                value={data?.reportCount ?? 0}
                delayClass="admin-stagger-1"
                animate
                data-testid="stat-reports"
              />
              <StatCard
                icon={BookOpen}
                iconBg="bg-purple-500"
                label="آزمون‌های منتشر شده"
                value={data?.publishedExamCount ?? 0}
                delayClass="admin-stagger-2"
                animate
                data-testid="stat-exams"
              />
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-700 dark:text-slate-200">
          دسترسی سریع
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ActionCard
            title="مدیریت دانش‌آموزان"
            description="مشاهده و مدیریت لیست دانش‌آموزان"
            onClick={() => navigate("/admin/students")}
            delayClass="admin-stagger-3"
            data-testid="quick-students"
          />
          <ActionCard
            title="مدیریت آزمون‌ها"
            description="ایجاد و ویرایش تحلیل آزمون‌ها"
            onClick={() => navigate("/admin/exams")}
            delayClass="admin-stagger-4"
            data-testid="quick-exams"
          />
        </div>
      </section>
    </div>
  );
}
