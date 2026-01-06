import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy, useState, useEffect } from 'react'
import Profile from './pages/Profile'
import { toolsRegistry } from './shared/tools-registry'
import { isMobileDevice } from './shared/utils/device'
import MobileNotice from './components/MobileNotice'
import './index.css'

function App() {
  const [isMobile, setIsMobile] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // 检测是否为移动设备
    const checkMobile = () => {
      setIsMobile(isMobileDevice())
      setIsChecking(false)
    }

    checkMobile()

    // 监听窗口大小变化（处理设备旋转等情况）
    const handleResize = () => {
      checkMobile()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 如果是移动设备，显示提示页面
  if (isChecking) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        正在加载...
      </div>
    )
  }

  if (isMobile) {
    return <MobileNotice />
  }

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

