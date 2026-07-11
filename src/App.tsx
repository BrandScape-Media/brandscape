import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import PricingPage from './pages/PricingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardLayout from './pages/DashboardLayout'
import AuthCallback from './pages/AuthCallback'
import OverviewPage from './pages/dashboard/OverviewPage'
import ProjectsPage from './pages/dashboard/ProjectsPage'
import NewProjectPage from './pages/dashboard/NewProjectPage'
import ProjectDetailPage from './pages/dashboard/ProjectDetailPage'
import ClientsPage from './pages/dashboard/ClientsPage'
import LibraryPage from './pages/dashboard/LibraryPage'
import SettingsPage from './pages/dashboard/SettingsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <img src="/logo-light.png" alt="Brandscape" className="h-12 animate-pulse" />
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    </div>
  )
}

function AppRouter() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-brand-black text-brand-white">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<><Navbar /><HomePage /></>} />
          <Route path="/pricing" element={<><Navbar /><PricingPage /></>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<OverviewPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/new" element={<NewProjectPage />} />
            <Route path="projects/:id" element={<ProjectDetailPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="library" element={<LibraryPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  )
}
