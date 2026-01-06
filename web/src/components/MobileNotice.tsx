import { useEffect, useState } from 'react'
import './MobileNotice.css'

export default function MobileNotice() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // 延迟显示，添加淡入动画效果
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className={`mobile-notice ${isVisible ? 'visible' : ''}`}>
      <div className="mobile-notice-content">
        <div className="mobile-notice-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
        </div>
        <h1 className="mobile-notice-title">移动端正在适配中</h1>
        <p className="mobile-notice-message">
          请在PC端查看完整功能
        </p>
        <div className="mobile-notice-decoration">
          <div className="decoration-circle circle-1"></div>
          <div className="decoration-circle circle-2"></div>
          <div className="decoration-circle circle-3"></div>
        </div>
      </div>
    </div>
  )
}

