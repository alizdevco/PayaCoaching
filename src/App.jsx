import { Routes, Route } from "react-router-dom";

import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import CompleteProfilePage from "./pages/CompleteProfilePage.jsx";
import StudentDashboardPage from "./pages/StudentDashboardPage.jsx";
import StudentContentPage from "./pages/StudentContentPage.jsx";
import AdminDashboardPage from "./pages/AdminDashboardPage.jsx";
import StudentsPage from "./pages/StudentsPage.jsx";
import StudentDetailsPage from "./pages/StudentDetailsPage.jsx";
import ExamManagementPage from "./pages/ExamManagementPage.jsx";
import ExamAnalysisPage from "./pages/ExamAnalysisPage.jsx";
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
            <StudentDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/content"
        element={
          <ProtectedRoute requiredRole="student">
            <StudentContentPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/students"
        element={
          <ProtectedRoute requiredRole="admin">
            <StudentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/students/:student_id"
        element={
          <ProtectedRoute requiredRole="admin">
            <StudentDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/exams"
        element={
          <ProtectedRoute requiredRole="admin">
            <ExamManagementPage />
          </ProtectedRoute>
        }
      />

      <Route path="/exam-analysis/:exam_date" element={<ExamAnalysisPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
