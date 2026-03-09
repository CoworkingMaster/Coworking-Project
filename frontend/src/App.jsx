import { useState, useEffect, useCallback } from 'react'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Toast from './components/Toast'
import LoginModal from './components/LoginModal'
import RegisterModal from './components/RegisterModal'
import HeroSection from './sections/HeroSection'
import FeaturesSection from './sections/FeaturesSection'
import SpacesSection from './sections/SpacesSection'
import PricingSection from './sections/PricingSection'
import ContactSection from './sections/ContactSection'

function App() {
  const [loginOpen, setLoginOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [toast, setToast] = useState({ visible: false, title: '', desc: '' })

  const showToast = useCallback((title, desc) => {
    setToast({ visible: true, title, desc })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 4000)
  }, [])

  const switchToRegister = useCallback(() => {
    setLoginOpen(false)
    setTimeout(() => setRegisterOpen(true), 200)
  }, [])

  const switchToLogin = useCallback(() => {
    setRegisterOpen(false)
    setTimeout(() => setLoginOpen(true), 200)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        setLoginOpen(false)
        setRegisterOpen(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="app">
      <Navbar
        onLoginClick={() => setLoginOpen(true)}
        onRegisterClick={() => setRegisterOpen(true)}
      />

      <main>
        <HeroSection />
        <FeaturesSection />
        <SpacesSection />
        <PricingSection onShowToast={showToast} />
        <ContactSection onShowToast={showToast} />
      </main>

      <Footer />

      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSwitchToRegister={switchToRegister}
      />

      <RegisterModal
        isOpen={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onSwitchToLogin={switchToLogin}
      />

      <Toast
        visible={toast.visible}
        title={toast.title}
        desc={toast.desc}
        onClose={() => setToast(t => ({ ...t, visible: false }))}
      />
    </div>
  )
}

export default App
