import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('Processing...')

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/dashboard')
    }, 2000)

    setStatus('Authentication successful!')

    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center">
      <div className="text-center">
        <img src="/logo-light.png" alt="Brandscape" className="h-12 mx-auto mb-6" />
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-brand-400 font-body text-sm">{status}</p>
      </div>
    </div>
  )
}
