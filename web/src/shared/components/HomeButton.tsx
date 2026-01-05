import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'
import './HomeButton.css'

/**
 * 统一的返回主页按钮组件
 * 用于所有工具页面的左上角，保持与主页样式一致
 */
export function HomeButton() {
  return (
    <Link to="/" className="home-button" aria-label="返回主页">
      <Home size={20} />
    </Link>
  )
}

