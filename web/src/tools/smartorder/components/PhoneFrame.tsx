/**
 * 手机框组件
 * 模拟 iPhone X 样式的手机框架
 */

import React from 'react'
import './PhoneFrame.css'

interface PhoneFrameProps {
  children: React.ReactNode
}

export function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div className="phone-frame">
      <div className="phone-frame-inner">
        {/* 屏幕内容 */}
        <div className="phone-screen">{children}</div>

        {/* Home 指示器 */}
        <div className="phone-home-indicator"></div>
      </div>
    </div>
  )
}

