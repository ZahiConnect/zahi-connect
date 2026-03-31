import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './redux/store'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'

// Hardcoded for development, should ideally be in .env
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "454684305146-fo80ih4nfk13tplpq56kt2v10f8arqd8.apps.googleusercontent.com";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <Provider store={store}>
        <App />
        <Toaster position="top-right" />
      </Provider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
