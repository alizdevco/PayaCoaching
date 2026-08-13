import { Navigate, Routes, Route } from "react-router-dom";

import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import CompleteProfilePage from "./pages/CompleteProfilePage.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import StudentLayout from "./components/StudentLayout.jsx";
import AdminDashboardPage from "./pages/AdminDashboardPage.jsx";
import StudentsPage from "./pages/StudentsPage.jsx";
import StudentDetailsPage from "./pages/StudentDetailsPage.jsx";
import ExamManagementPage from "./pages/ExamManagementPage.jsx";
import ExamAnalysisPage from "./pages/ExamAnalysisPage.jsx";
import OnlineExamManagementPage from "./pages/OnlineExamManagementPage.jsx";
import OnlineExamResultsPage from "./pages/OnlineExamResultsPage.jsx";
import StudentOnlineExamsPage from "./pages/StudentOnlineExamsPage.jsx";
import StudentTakeExamPage from "./pages/StudentTakeExamPage.jsx";
import StudentExamsPage from "./pages/student/StudentExamsPage.jsx";
import StudentExamDetailPage from "./pages/student/StudentExamDetailPage.jsx";
import StudentSharedContentPage from "./pages/student/StudentSharedContentPage.jsx";
import StudentReportsPage from "./pages/student/StudentReportsPage.jsx";
import StudentProfilePage from "./pages/student/StudentProfilePage.jsx";
import SharedContentPage from "./features/content/SharedContentPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";

function App() {
  return (
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
  );
}

export default App;
