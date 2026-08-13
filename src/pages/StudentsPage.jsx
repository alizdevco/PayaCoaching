import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Trash2 } from "lucide-react";

import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import ErrorState from "../components/ErrorState.jsx";
import Modal from "../components/Modal.jsx";
import { getAuthMutationErrorMessage } from "../features/auth/authMutationErrors.js";
import { useStudents } from "../features/students/useStudents.js";
import { useDeleteStudent } from "../features/students/useStudentProfile.js";

const SKELETON_ROWS = 5;
const TABLE_COLUMN_COUNT = 10;

const TABLE_COLUMNS = [
  { key: "phone", label: "شماره موبایل" },
  { key: "first_name", label: "نام" },
  { key: "last_name", label: "نام خانوادگی" },
  { key: "province", label: "استان" },
  { key: "city", label: "شهر" },
  { key: "consultant_name", label: "نام مشاور" },
  { key: "grade", label: "پایه" },
  { key: "academic_major", label: "رشته" },
  { key: "created_at", label: "تاریخ ثبت‌نام" },
];

function formatRegistrationDate(value) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatCellValue(student, key) {
  if (key === "created_at") {
    return formatRegistrationDate(student.created_at);
  }

  const value = student[key];
  return value || "—";
}

function getStudentLabel(student) {
  const name = [student?.first_name, student?.last_name].filter(Boolean).join(" ");
  return name || student?.phone || "این دانش‌آموز";
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <tr key={index} className="border-b border-slate-100 dark:border-slate-700/60">
          {Array.from({ length: TABLE_COLUMN_COUNT }, (__, cellIndex) => (
            <td key={cellIndex} className="px-4 py-3">
              <div className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function StudentsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  const { data, isLoading, isError, refetch, isFetching } = useStudents({
    search,
    page,
  });

  const deleteStudent = useDeleteStudent();

  const students = data?.students ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalCount = data?.totalCount ?? 0;

  function handleSearchChange(event) {
    setSearch(event.target.value);
    setPage(1);
  }

  function openDeleteModal(event, student) {
    event.stopPropagation();
    setDeleteError("");
    setStudentToDelete(student);
  }

  function closeDeleteModal() {
    if (deleteStudent.isPending) {
      return;
    }
    setStudentToDelete(null);
    setDeleteError("");
  }

  function handleConfirmDelete() {
    if (!studentToDelete) {
      return;
    }

    setDeleteError("");
    deleteStudent.mutate(studentToDelete.id, {
      onSuccess: () => {
        if (students.length === 1 && page > 1) {
          setPage((current) => current - 1);
        }
        setStudentToDelete(null);
      },
      onError: (error) => {
        console.error("[deleteStudent]", error?.message);
        setDeleteError(
          getAuthMutationErrorMessage(error, "profile") ||
            "حذف دانش‌آموز ناموفق بود. لطفاً دوباره تلاش کنید.",
        );
      },
    });
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          دانش‌آموزان
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          مدیریت و جستجوی دانش‌آموزان ثبت‌نام‌شده
        </p>
      </div>

      <Card>
        <div className="relative mb-5">
          <Search
            size={18}
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={handleSearchChange}
            data-testid="students-search"
            placeholder="جستجو بر اساس نام، موبایل یا مشاور..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-10 pl-3 text-sm text-slate-800 outline-none transition-colors focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        {isError && (
          <div className="mb-5">
            <ErrorState
              message="خطا در بارگذاری لیست دانش‌آموزان. لطفاً دوباره تلاش کنید."
              onRetry={() => refetch()}
            />
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700" data-testid="students-table">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
              <tr>
                {TABLE_COLUMNS.map((column) => (
                  <th key={column.key} className="whitespace-nowrap px-4 py-3 font-medium">
                    {column.label}
                  </th>
                ))}
                <th className="whitespace-nowrap px-4 py-3 font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {isLoading ? (
                <TableSkeleton />
              ) : students.length === 0 ? (
                <tr>
                  <td
                    colSpan={TABLE_COLUMN_COUNT}
                    className="px-4 py-10 text-center text-slate-500 dark:text-slate-400"
                  >
                    {search.trim()
                      ? "دانش‌آموزی با این مشخصات یافت نشد."
                      : "هنوز دانش‌آموزی ثبت‌نام نکرده است."}
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr
                    key={student.id}
                    onClick={() => navigate(`/admin/students/${student.id}`)}
                    className="cursor-pointer transition-colors hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20"
                  >
                    {TABLE_COLUMNS.map((column) => (
                      <td
                        key={column.key}
                        className={[
                          "whitespace-nowrap px-4 py-3",
                          column.key === "first_name" || column.key === "last_name"
                            ? "text-slate-800 dark:text-slate-100"
                            : "text-slate-600 dark:text-slate-300",
                        ].join(" ")}
                      >
                        {formatCellValue(student, column.key)}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        type="button"
                        onClick={(event) => openDeleteModal(event, student)}
                        aria-label={`حذف ${getStudentLabel(student)}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && !isError && students.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {totalCount.toLocaleString("fa-IR")} دانش‌آموز
              {isFetching && !isLoading ? " — در حال به‌روزرسانی..." : ""}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1 || isFetching}
                data-testid="pagination-prev"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                قبلی
              </Button>
              <span className="min-w-20 text-center text-sm text-slate-600 dark:text-slate-300">
                صفحه {page.toLocaleString("fa-IR")} از{" "}
                {totalPages.toLocaleString("fa-IR")}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages || isFetching}
                data-testid="pagination-next"
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
              >
                بعدی
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Modal
        isOpen={Boolean(studentToDelete)}
        onClose={closeDeleteModal}
        title="حذف دانش‌آموز"
        data-testid="delete-student-modal"
        closeOnBackdrop={!deleteStudent.isPending}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeDeleteModal}
              disabled={deleteStudent.isPending}
            >
              انصراف
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              isLoading={deleteStudent.isPending}
            >
              حذف
            </Button>
          </>
        }
      >
        <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
          آیا از حذف این دانش‌آموز اطمینان دارید؟
        </p>
        {studentToDelete && (
          <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-100">
            {getStudentLabel(studentToDelete)}
          </p>
        )}
        {deleteError && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{deleteError}</p>
        )}
      </Modal>
    </div>
  );
}
