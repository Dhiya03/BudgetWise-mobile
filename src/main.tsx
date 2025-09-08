import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import '../index.css'

// FOR TESTING: Force premium tier before the app loads.
localStorage.setItem('budgetwise_tier', 'premium');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
