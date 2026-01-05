import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { getVisibleTools } from '../shared/tools-registry'
import { Mail, Phone, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import './Profile.css'

// ========== 资源文件导入 ==========
import avatarImg from './assets/avatar.png'
import wechatIconImg from './assets/wechat-icon.png'

export default function Profile() {
  const tools = getVisibleTools()
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  // Banner 相关状态
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [cardWidth, setCardWidth] = useState(280)
  const gap = 24 // 1.5rem = 24px
  const [isTransitioning, setIsTransitioning] = useState(false)

  // 自动播放相关状态
  const autoPlayRef = useRef<number | null>(null)
  const [, setIsAutoPlaying] = useState(true) // isAutoPlaying 未使用，但 setIsAutoPlaying 需要使用
  const [isHovered, setIsHovered] = useState(false)

  // 微信图标组件 - 使用导入的图片资源
  const WeChatIconComponent = () => (
    <img src={wechatIconImg} alt="微信" className="w-5 h-5" />
  )

  const contactInfo = [
    { type: 'email', icon: Mail, value: 'manirvana4@gmail.com', label: '邮箱' },
    { type: 'wechat', icon: WeChatIconComponent, value: 'M15378955467', label: '微信' },
    { type: 'phone', icon: Phone, value: '15378955467', label: '电话' },
  ]

  // Banner 相关函数
  const calculateCardWidth = () => {
    if (!viewportRef.current) return 280

    const viewportWidth = viewportRef.current.offsetWidth
    const gapPx = 24 // 1.5rem = 24px

    // 布局：同时显示4张卡片，但只有中间2张完整显示，左右各半露一张
    // viewport 宽度 = 4个卡片宽度 + 3个间距
    // 即：viewportWidth = 4S + 3*gap
    // 解得：S = (viewportWidth - 3*gap) / 4
    const cardWidth = (viewportWidth - 3 * gapPx) / 4
    return Math.max(cardWidth, 200) // 最小宽度保护
  }

  const updateCardWidth = () => {
    const newWidth = calculateCardWidth()
    setCardWidth(newWidth)
  }

  const handleCopy = async (value: string, index: number) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedIndex(index)
      setTimeout(() => {
        setCopiedIndex(null)
      }, 1500)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  // 将工具转换为作品格式
  const toolProjects = tools.map(tool => ({
    title: tool.name,
    description: tool.description,
    link: tool.path || `/${tool.id}`, // 使用相对路径，所有工具都在同一个应用中
    icon: tool.icon,
    category: tool.category, // 添加分类信息
    image: tool.image, // 添加背景图片
  }))

  // 创建克隆的项目列表以实现无缝循环
  const createClonedProjects = () => {
    const totalProjects = toolProjects.length
    if (totalProjects === 0) return []

    // 创建更长的克隆数组以实现真正的无缝循环
    // 重复整个数组多次，确保滑动时始终有足够的卡片
    const repeatedProjects = [...toolProjects, ...toolProjects, ...toolProjects]

    return repeatedProjects
  }

  const clonedProjects = createClonedProjects()

  // Banner 切换函数
  const slideToIndex = (targetIndex: number) => {
    if (!trackRef.current || isTransitioning) return

    setIsTransitioning(true)
    setCurrentIndex(targetIndex)

    const translateX = -targetIndex * (cardWidth + gap)
    trackRef.current.style.transform = `translateX(${translateX}px)`
  }

  const slideNext = () => {
    const nextIndex = currentIndex + 1
    slideToIndex(nextIndex)
    // 用户手动操作时暂停自动播放
    pauseAutoPlay()
  }

  const slidePrev = () => {
    const prevIndex = currentIndex - 1
    slideToIndex(prevIndex)
    // 用户手动操作时暂停自动播放
    pauseAutoPlay()
  }

  // 自动播放相关函数
  const startAutoPlay = useCallback(() => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current)
    }
    // 只有在没有悬浮且没有过渡时才开始自动播放
    if (!isHovered) {
      autoPlayRef.current = setInterval(() => {
        if (!isTransitioning && !isHovered) {
          const nextIndex = currentIndex + 1
          slideToIndex(nextIndex)
        }
      }, 3000) // 每3秒自动滑动一次
      setIsAutoPlaying(true)
    }
  }, [isTransitioning, currentIndex, isHovered])

  const stopAutoPlay = useCallback(() => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current)
      autoPlayRef.current = null
    }
    setIsAutoPlaying(false)
  }, [])

  const pauseAutoPlay = useCallback(() => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current)
      autoPlayRef.current = null
      setIsAutoPlaying(false)

      // 5秒后重新开始自动播放
      setTimeout(() => {
        startAutoPlay()
      }, 5000)
    }
  }, [startAutoPlay])

  // 鼠标悬浮事件处理
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
    // 停止自动播放
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current)
      autoPlayRef.current = null
      setIsAutoPlaying(false)
    }
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    // 恢复自动播放
    startAutoPlay()
  }, [startAutoPlay])

  // 处理 transitionend 事件，实现无缝循环
  const handleTransitionEnd = () => {
    if (!trackRef.current) return

    const totalRealProjects = toolProjects.length
    let newIndex = currentIndex

    // 使用 modulo 运算实现真正的无缝循环
    // 当到达重复数组的边界时，跳回对应的位置
    if (currentIndex >= totalRealProjects * 2) {
      // 滑过了2个完整循环，跳回第1个循环的对应位置
      newIndex = currentIndex - totalRealProjects
    } else if (currentIndex < totalRealProjects) {
      // 滑到第1个循环之前，跳到第2个循环的对应位置
      newIndex = currentIndex + totalRealProjects
    }

    if (newIndex !== currentIndex) {
      // 关闭动画，瞬间跳到正确位置
      trackRef.current.style.transition = 'none'
      setCurrentIndex(newIndex)

      const translateX = -newIndex * (cardWidth + gap)
      trackRef.current.style.transform = `translateX(${translateX}px)`

      // 强制重绘
      trackRef.current.offsetHeight

      // 重新开启动画
      trackRef.current.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
    }

    setIsTransitioning(false)
  }

  // 初始化和响应式处理
  useEffect(() => {
    updateCardWidth()
    window.addEventListener('resize', updateCardWidth)
    return () => window.removeEventListener('resize', updateCardWidth)
  }, [])

  // 自动播放管理
  useEffect(() => {
    // 组件挂载后开始自动播放
    startAutoPlay()

    // 组件卸载时停止自动播放
    return () => {
      stopAutoPlay()
    }
  }, [startAutoPlay, stopAutoPlay]) // 使用稳定的回调函数作为依赖

  // 设置初始位置：显示重复数组的第2组[4,5,6,7]
  // 对应原始数组的完整循环：[智能问数, 智能报告, 智能点单, 智能规划]
  useEffect(() => {
    if (trackRef.current && toolProjects.length > 0) {
      const initialIndex = 4 // 从第2个重复数组开始
      setCurrentIndex(initialIndex)
      const translateX = -initialIndex * (cardWidth + gap)
      trackRef.current.style.transform = `translateX(${translateX}px)`

      // 强制触发重新渲染
      setTimeout(() => {
        if (trackRef.current) {
          trackRef.current.style.transform = `translateX(${translateX}px)`
        }
      }, 100)
    }
  }, [cardWidth, gap, toolProjects.length])

  return (
    <div className="profile-page-wrapper min-h-screen bg-gray-50 w-full flex flex-col">
      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center min-h-0 py-6 sm:py-8">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 w-full h-full flex flex-col">
          <div className="flex flex-col items-center gap-6 sm:gap-8 flex-1 justify-center min-h-0">
            {/* Top: Avatar & Info */}
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="w-full flex flex-col items-center flex-shrink-0"
            >
              {/* Avatar */}
              <div className="relative">
                {/* 背景光晕效果 */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-500/20 blur-xl -z-10 scale-110"></div>
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full mb-4 overflow-hidden border-4 border-white/90 shadow-xl ring-2 ring-blue-100/50">
                  <img 
                    src={avatarImg} 
                    alt="Mark Ma" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Basic Info */}
              <div className="text-center max-w-2xl">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">
                  Mark Ma
                </h1>
                <p className="text-base sm:text-lg text-gray-600 mb-4 sm:mb-5 px-4">
                  专注于AI产品设计与开发，致力于用AI提升用户的工作效率和生活品质
                </p>

                {/* Contact Links */}
                <div className="flex justify-center gap-3 sm:gap-4 relative">
                  {contactInfo.map((contact, index) => {
                    const Icon = contact.icon
                    const isCopied = copiedIndex === index
                    return (
                      <div key={contact.type} className="relative group">
                        <button
                          onClick={() => handleCopy(contact.value, index)}
                          className="w-12 h-12 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 hover:scale-110 active:scale-95 shadow-sm"
                          aria-label={contact.label}
                        >
                          <Icon size={20} />
                        </button>
                        
                        {/* Tooltip on hover - 只在未复制时显示 */}
                        {!isCopied && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-30 transform group-hover:-translate-y-0.5">
                            {contact.value}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                              <div className="border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        )}

                        {/* Success indicator - 使用更自然的位置和动画 */}
                        <AnimatePresence>
                          {isCopied && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.85, y: -45 }}
                              animate={{ opacity: 1, scale: 1, y: -55 }}
                              exit={{ opacity: 0, scale: 0.85, y: -65 }}
                              transition={{ 
                                type: "spring", 
                                stiffness: 300, 
                                damping: 25,
                                opacity: { duration: 0.15 }
                              }}
                              className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full flex items-center gap-1.5 bg-green-500 text-white px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap z-40 shadow-lg shadow-green-500/30"
                            >
                              <Check size={14} className="flex-shrink-0" />
                              <span>已复制</span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>

            {/* Bottom: Projects Banner */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 1.2,
                delay: 0.4,
                ease: [0.25, 0.1, 0.25, 1], // 更平滑的缓动曲线
                scale: { duration: 1.0, delay: 0.4 }
              }}
              className="w-full flex-shrink-0"
            >
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-5 text-center">
                我的作品
              </h2>
              
              {/* Banner Container with Navigation */}
              <div
                className="projects-banner-wrapper"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                {/* Viewport with fade masks */}
                <div className="projects-banner-viewport" ref={viewportRef}>
                  {/* Track containing all cards (including clones) */}
                  <div
                    className="projects-banner-track"
                    ref={trackRef}
                    onTransitionEnd={handleTransitionEnd}
                  >
                    {clonedProjects.map((project, index) => (
                      <Link key={`project-${index}`} to={project.link || '#'}>
                        <motion.div
                          initial={{ opacity: 0, y: 20, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{
                            duration: 0.8,
                            delay: 0.8 + (index % 4) * 0.1, // 基于位置的延迟
                            ease: [0.25, 0.1, 0.25, 1],
                            scale: { duration: 0.6, delay: 0.8 + (index % 4) * 0.1 }
                          }}
                          className="project-banner-card group"
                          style={{ width: `${cardWidth}px` }}
                        >
                          {/* Background Image */}
                          <div
                            className="project-banner-image"
                            style={{
                              backgroundImage: project.image ? `url(${project.image})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            }}
                          />

                          {/* Content */}
                          <div className="project-banner-content">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="project-banner-title">{project.title}</h3>
                              {project.category && (
                                <span className="project-banner-badge">{project.category}</span>
                              )}
                            </div>
                            <p className="project-banner-description">{project.description}</p>
                          </div>
                        </motion.div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Navigation Buttons */}
                <button
                  className="projects-banner-nav-btn projects-banner-nav-left"
                  onClick={slidePrev}
                  disabled={isTransitioning}
                  aria-label="上一张"
                >
                  <ChevronLeft size={24} />
                </button>

                <button
                  className="projects-banner-nav-btn projects-banner-nav-right"
                  onClick={slideNext}
                  disabled={isTransitioning}
                  aria-label="下一张"
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-gray-200 bg-white py-3 sm:py-4 flex-shrink-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-end">
            <p className="text-gray-500 text-xs sm:text-sm">
              © 2025 Mark Ma
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
