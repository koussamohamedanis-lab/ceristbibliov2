import React from 'react' 
import ReactDOM from 'react-dom/client'
import App from './App'
import { SearchProvider } from './context/SearchContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <SearchProvider>
    <App />
  </SearchProvider>
)