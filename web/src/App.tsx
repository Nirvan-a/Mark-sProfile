import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import Profile from './pages/Profile'
import { toolsRegistry } from './shared/tools-registry'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Profile />} />
        {/* 自动生成工具路由 */}
        {toolsRegistry.map((tool) => {
          const ToolComponent = lazy(tool.component)
          return (
            <Route
              key={tool.id}
              path={tool.path || `/${tool.id}`}
              element={
                <Suspense fallback={
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    fontSize: '18px',
                    color: '#666'
                  }}>
                    🚀 正在启动 {tool.name}...
                  </div>
                }>
                  <ToolComponent />
                </Suspense>
              }
            />
          )
        })}
        {/* 默认重定向到主页 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

