import './index.css'
import { BrowserRouter, BrowserRouter as Router } from 'react-router-dom'
import { QueryParamProvider } from 'use-query-params'
import App from './App'
import React from 'react'
import ReactDOM from 'react-dom'

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter basename="/sippy-ng">
      <QueryParamProvider options={{ enableBatching: true }}>
        <App />
      </QueryParamProvider>
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById('root')
)
