import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { apiFetch } from './utils/api'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Toast from './components/Toast'
import LoginModal from './components/LoginModal'
import RegisterModal from './components/RegisterModal'
import ForgotPasswordModal from './components/ForgotPasswordModal'
import HeroSection from './sections/HeroSection'
import FeaturesSection from './sections/FeaturesSection'
import SpacesSection from './sections/SpacesSection'
import PricingSection from './sections/PricingSection'
import ContactSection from './sections/ContactSection'
import Dashboard from './pages/Dashboard'
import DashboardProfile from './pages/DashboardProfile'
import DashboardSubscription from './pages/DashboardSubscription'
import Reservations from './pages/Reservations'
import ResetPassword from './pages/ResetPassword'
import Spaces from './pages/Space'
import Viewer3DSection from './sections/Viewer3DSection'

// ── Página principal (landing) ──────────────────────────
function LandingPage({ user, onLoginClick, onRegisterClick, onShowToast, loginOpen, setLoginOpen, registerOpen, setRegisterOpen, forgotOpen, setForgotOpen, onLoginSuccess }) {
  const navigate = useNavigate()

  const switchToRegister = useCallback(() => {
    setLoginOpen(false)
    setTimeout(() => setRegisterOpen(true), 200)
  }, [setLoginOpen, setRegisterOpen])

  const switchToLogin = useCallback(() => {
    setRegisterOpen(false)
    setTimeout(() => setLoginOpen(true), 200)
  }, [setRegisterOpen, setLoginOpen])

  const openForgot = useCallback(() => {
    setLoginOpen(false)
    setTimeout(() => setForgotOpen(true), 200)
  }, [setLoginOpen, setForgotOpen])

  const handleLoginSuccess = useCallback((userData) => {
    onLoginSuccess(userData)
    navigate('/dashboard')
  }, [onLoginSuccess, navigate])

  const handleRegisterSuccess = useCallback((userData) => {
    onLoginSuccess(userData)
    navigate('/dashboard')
  }, [onLoginSuccess, navigate])

  return (
    <div className="app">
      <Navbar
        onLoginClick={onLoginClick}
        onRegisterClick={onRegisterClick}
        user={user}
      />
      <main>
        <HeroSection />
        <FeaturesSection />
        <SpacesSection />
        <Viewer3DSection onShowToast={onShowToast} />
        <PricingSection onShowToast={onShowToast} />
        <ContactSection onShowToast={onShowToast} />
      </main>
      <Footer />

      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSwitchToRegister={switchToRegister}
        onLoginSuccess={handleLoginSuccess}
        onForgotPassword={openForgot}
      />

      <RegisterModal
        isOpen={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onSwitchToLogin={switchToLogin}
        onRegisterSuccess={handleRegisterSuccess}
      />

      <ForgotPasswordModal
        isOpen={forgotOpen}
        onClose={() => setForgotOpen(false)}
        onSwitchToLogin={() => {
          setForgotOpen(false)
          setTimeout(() => setLoginOpen(true), 200)
        }}
      />
    </div>
  )
}

// ── App raíz con router ──────────────────────────────────
function App() {
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [toast, setToast] = useState({ visible: false, title: '', desc: '', type: 'success' })

  const showToast = useCallback((title, desc, type = 'success') => {
    setToast({ visible: true, title, desc, type })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 4000)
  }, [])

  // Al montar, intenta recuperar la sesión activa desde la cookie
  useEffect(() => {
    apiFetch('/api/me/')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setUser(data) })
      .catch(() => {})
      .finally(() => setAuthChecked(true))
  }, [])

  // Cierra modales con Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        setLoginOpen(false)
        setRegisterOpen(false)
        setForgotOpen(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleLoginSuccess = useCallback((userData) => {
    setUser(userData)
    showToast('¡Bienvenido!', `Sesión iniciada como ${userData.email}`)
  }, [showToast])

  const handleLogout = useCallback(() => {
    setUser(null)
    showToast('Hasta pronto', 'Has cerrado sesión correctamente')
  }, [showToast])

  const handleUserSync = useCallback((payload) => {
    if (!payload || typeof payload !== 'object') return
    setUser((prev) => ({ ...(prev || {}), ...payload }))
  }, [])

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <LandingPage
              user={user}
              onLoginClick={() => setLoginOpen(true)}
              onRegisterClick={() => setRegisterOpen(true)}
              onShowToast={showToast}
              loginOpen={loginOpen}
              setLoginOpen={setLoginOpen}
              registerOpen={registerOpen}
              setRegisterOpen={setRegisterOpen}
              forgotOpen={forgotOpen}
              setForgotOpen={setForgotOpen}
              onLoginSuccess={handleLoginSuccess}
            />
          }
        />
        <Route
          path="/dashboard"
          element={<Dashboard user={user} onLogout={handleLogout} authChecked={authChecked} />}
        />
        <Route
          path="/dashboard/profile"
          element={(
            <DashboardProfile
              user={user}
              onLogout={handleLogout}
              onUserUpdate={handleUserSync}
              showToast={showToast}
              authChecked={authChecked}
            />
          )}
        />
        <Route
          path="/dashboard/subscription"
          element={(
            <DashboardSubscription
              user={user}
              onLogout={handleLogout}
              onUserUpdate={handleUserSync}
              showToast={showToast}
              authChecked={authChecked}
            />
          )}
        />
        <Route
          path="/spaces"
          element={<Spaces user={user} onShowToast={showToast} />}
        />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/reservations"
          element={<Reservations user={user} onLogout={handleLogout} authChecked={authChecked} />}
        />
      </Routes>

      <Toast
        visible={toast.visible}
        title={toast.title}
        desc={toast.desc}
        type={toast.type}
        onClose={() => setToast(t => ({ ...t, visible: false }))}
      />
    </>
  )
}

export default App

