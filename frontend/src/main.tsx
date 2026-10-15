import React from 'react'
import ReactDOM from 'react-dom/client'
import AuthGate from './auth/AuthGate.tsx'
import { ToastProvider } from './components/Toast.tsx'
import './styles/index.css'

// A tela depende de quem entrou: motorista vê a viatura, operador vê a central
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <AuthGate />
    </ToastProvider>
  </React.StrictMode>,
)

