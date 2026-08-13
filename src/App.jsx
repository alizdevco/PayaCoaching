import { lazy, Suspense } from "react";
import { Navigate, Routes, Route } from "react-router-dom";

import AdminLayout from "./components/AdminLayout.jsx";
import StudentLayout from "./components/StudentLayout.jsx";
import LoadingState from "./components/LoadingState.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";

const LandingPage = lazy(() => import("./pages/LandingPage.jsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const RegisterPage = lazy(() => import("./pages/RegisterPage.jsx"));
const CompleteProfilePage = lazy(() => import("./pages/CompleteProfilePage.jsx"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage.jsx"));
const StudentsPage = lazy(() => import("./pages/StudentsPage.jsx"));
const StudentDetailsPage = lazy(() => import("./pages/StudentDetailsPage.jsx"));
const ExamManagementPage = lazy(() => import("./pages/ExamManagementPage.jsx"));
const ExamAnalysisPage = lazy(() => import("./pages/ExamAnalysisPage.jsx"));
const OnlineExamManagementPage = lazy(() =>
  import("./pages/OnlineExamManagementPage.jsx"),
);
const OnlineExamResultsPage = lazy(() =>
  import("./pages/OnlineExamResultsPage.jsx"),
);
const StudentOnlineExamsPage = lazy(() =>
  import("./pages/StudentOnlineExamsPage.jsx"),
);
const StudentTakeExamPage = lazy(() => import("./pages/StudentTakeExamPage.jsx"));
const StudentExamsPage = lazy(() => import("./pages/student/StudentExamsPage.jsx"));
const StudentExamDetailPage = lazy(() =>
  import("./pages/student/StudentExamDetailPage.jsx"),
);
const StudentSharedContentPage = lazy(() =>
  import("./pages/student/StudentSharedContentPage.jsx"),
);
const StudentReportsPage = lazy(() =>
  import("./pages/student/StudentReportsPage.jsx"),
);
const StudentProfilePage = lazy(() =>
  import("./pages/student/StudentProfilePage.jsx"),
);
const SharedContentPage = lazy(() =>
  import("./features/content/SharedContentPage.jsx"),
);
const NotFoundPage = lazy(() => import("./pages/NotFoundPage.jsx"));

function App() {
  return (
    <Suspense fallback={<LoadingState fullPage message="در حال بارگذاری..." />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/complete-profile"
          element={
            <ProtectedRoute requiredRole="student" skipProfileCompletionCheck>
              <CompleteProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="exams" replace />} />
          <Route path="exams" element={<StudentExamsPage />} />
          <Route path="exams/:exam_date" element={<StudentExamDetailPage />} />
          <Route path="content" element={<StudentSharedContentPage />} />
          <Route path="reports" element={<StudentReportsPage />} />
          <Route path="profile" element={<StudentProfilePage />} />
          <Route path="online-exams" element={<StudentOnlineExamsPage />} />
          <Route path="online-exams/:examId" element={<StudentTakeExamPage />} />
        </Route>

        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="students/:student_id" element={<StudentDetailsPage />} />
          <Route path="exams" element={<ExamManagementPage />} />
          <Route path="online-exams" element={<OnlineExamManagementPage />} />
          <Route
            path="online-exams/:examId/results"
            element={<OnlineExamResultsPage />}
          />
          <Route path="shared-content" element={<SharedContentPage />} />
        </Route>

        <Route path="/exam-analysis/:exam_date" element={<ExamAnalysisPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;
