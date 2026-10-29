import React from 'react'
import ReactDOM from 'react-dom/client'
import AuthGate from './auth/AuthGate.tsx'
import { ToastProvider } from './components/Toast.tsx'
import './styles/index.css'
import { startDocumentTheme } from './theme/theme'
import { unlockAlertSound } from './utils/alertSound'

startDocumentTheme()

// O navegador só toca som depois de um toque ou tecla na página: o primeiro (já no login) libera os
// alertas da central e o alarme do despacho; os seguintes retomam o som se o celular o suspendeu
window.addEventListener('pointerdown', unlockAlertSound)
window.addEventListener('keydown', unlockAlertSound)

// A tela depende de quem entrou: motorista vê a viatura, atendente vê a central
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <AuthGate />
    </ToastProvider>
  </React.StrictMode>,
)

