import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import DailyReportFormPage from './pages/DailyReportFormPage'
import DashboardPage from './pages/DashboardPage'
import MaintenanceHomePage from './pages/MaintenanceHomePage'
import EquipmentListPage from './pages/EquipmentListPage'
import InspectionFormPage from './pages/InspectionFormPage'
import InspectionGuidePage from './pages/InspectionGuidePage'
import BreakdownReportPage from './pages/BreakdownReportPage'
import MaintenanceDashboardPage from './pages/MaintenanceDashboardPage'
import './styles/global.css'

function ProtectedRoute({ children, requireAdmin }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (requireAdmin && user.role !== 'admin') return <Navigate to="/daily-report" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/daily-report"
        element={
          <ProtectedRoute>
            <DailyReportFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/daily-report/edit/:reportId"
        element={
          <ProtectedRoute>
            <DailyReportFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requireAdmin>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/maintenance"
        element={
          <ProtectedRoute>
            <MaintenanceHomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/maintenance/inspection/:frequency"
        element={
          <ProtectedRoute>
            <EquipmentListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/maintenance/inspection/:frequency/:equipmentId"
        element={
          <ProtectedRoute>
            <InspectionFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/maintenance/guide/:itemId"
        element={
          <ProtectedRoute>
            <InspectionGuidePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/maintenance/breakdown"
        element={
          <ProtectedRoute>
            <BreakdownReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/maintenance/dashboard"
        element={
          <ProtectedRoute requireAdmin>
            <MaintenanceDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
