import { useCallback, useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './ReportPreview.css'

interface ReportPreviewProps {
  isOpen: boolean
  onClose: () => void
  content: string
  title?: string
  reportTitle?: string  // 报告的真实标题（用于文件名）
}

export function ReportPreview({
  isOpen,
  onClose,
  content,
  title = '报告预览',
  reportTitle,
}: ReportPreviewProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showDropdown])

  // 阻止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // 下载为 Markdown
  const handleDownloadMarkdown = useCallback(() => {
    setShowDropdown(false)
    const fileName = reportTitle 
      ? `${reportTitle.replace(/[<>:"/\\|?*]/g, '_')}.md`
      : '报告.md'
    
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [content, reportTitle])

  // 下载为 PDF（使用后端 API 生成）
  const handleDownloadPDF = useCallback(async () => {
    setShowDropdown(false)
    
    try {
      // 获取后端 API 地址
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001'
      
      // 显示加载提示
      const loadingMsg = document.createElement('div')
      loadingMsg.textContent = '正在生成 PDF，请稍候...'
      loadingMsg.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px 40px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 16px;
      `
      document.body.appendChild(loadingMsg)
      
      // 调用后端 API 生成 PDF（设置超时：70秒）
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 70000) // 70秒超时
      
      let response: Response
      try {
        response = await fetch(`${apiBaseUrl}/api/smartreport/generate-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: content,
            title: reportTitle || '报告',
            base_url: apiBaseUrl,
          }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
      } catch (error: any) {
        clearTimeout(timeoutId)
        // 移除加载提示
        if (document.body.contains(loadingMsg)) {
          document.body.removeChild(loadingMsg)
        }
        if (error.name === 'AbortError') {
          throw new Error('PDF 生成超时，请稍后重试')
        }
        throw error
      }
      
      // 移除加载提示
      if (document.body.contains(loadingMsg)) {
        document.body.removeChild(loadingMsg)
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: '生成 PDF 失败' }))
        throw new Error(errorData.detail || '生成 PDF 失败')
      }
      
      // 获取 PDF blob
      const blob = await response.blob()
      
      // 创建下载链接
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${(reportTitle || '报告').replace(/[<>:"/\\|?*]/g, '_')}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
    } catch (error) {
      // 确保加载提示被移除
      const existingMsg = document.querySelector('body > div[style*="position: fixed"][style*="z-index: 10000"]')
      if (existingMsg && existingMsg.parentNode) {
        existingMsg.parentNode.removeChild(existingMsg)
      }
      console.error('PDF 生成失败:', error)
      alert(`生成 PDF 失败: ${error instanceof Error ? error.message : '未知错误'}\n\n如果 Playwright 未安装，请运行: pip install playwright && playwright install chromium`)
      
      // 回退到浏览器打印功能
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert('请允许弹出窗口以生成PDF')
        return
      }
      
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${reportTitle || '报告'}</title>
  <style>
    @page { margin: 2cm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      line-height: 1.8;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 { font-size: 2em; margin-top: 0.5em; margin-bottom: 0.5em; border-bottom: 2px solid #333; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; margin-top: 1em; margin-bottom: 0.5em; border-bottom: 1px solid #ddd; padding-bottom: 0.3em; }
    h3 { font-size: 1.25em; margin-top: 0.8em; margin-bottom: 0.4em; }
    p { margin-bottom: 1em; text-align: justify; }
    ul, ol { margin-bottom: 1em; padding-left: 2em; }
    li { margin-bottom: 0.3em; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f5f5f5; font-weight: bold; }
    img { max-width: 100%; height: auto; display: block; margin: 1em auto; }
    code { background-color: #f5f5f5; padding: 2px 5px; border-radius: 3px; font-family: 'Courier New', monospace; }
    pre { background-color: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
    blockquote { border-left: 4px solid #ddd; padding-left: 1em; margin-left: 0; color: #666; }
    @media print {
      body { max-width: none; }
      a { text-decoration: none; color: #333; }
    }
  </style>
</head>
<body>
  ${convertMarkdownToHTML(content)}
</body>
</html>
      `
      
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
        }, 250)
      }
    }
  }, [content, reportTitle])

  // 简单的 Markdown 到 HTML 转换（仅用于打印）
  const convertMarkdownToHTML = (markdown: string): string => {
    let html = markdown
    
    // 处理标题
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>')
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>')
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>')
    
    // 处理加粗和斜体
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
    
    // 处理链接
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    
    // 处理图片（修正图片路径为绝对路径）
    const baseURL = window.location.origin
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, src) => {
      // 如果是相对路径，转换为绝对路径
      const fullSrc = src.startsWith('http') ? src : `${baseURL}${src}`
      return `<img src="${fullSrc}" alt="${alt}" />`
    })
    
    // 处理列表
    html = html.replace(/^\* (.+)$/gim, '<li>$1</li>')
    html = html.replace(/^- (.+)$/gim, '<li>$1</li>')
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    
    // 处理段落
    html = html.split('\n\n').map(para => {
      para = para.trim()
      if (!para) return ''
      if (para.startsWith('<')) return para
      return `<p>${para.replace(/\n/g, '<br>')}</p>`
    }).join('\n')
    
    return html
  }

  if (!isOpen) return null

  // 获取后端 API 地址
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001'

  // 自定义图片组件，处理后端静态文件路径
  const components = {
    img: ({ src, alt }: { src?: string; alt?: string }) => {
      if (!src) return null
      
      // 如果是相对路径（以 /static/ 开头），转换为完整的后端 URL
      const imgSrc = src.startsWith('/static/') 
        ? `${apiBaseUrl}${src}` 
        : src
      
      return (
        <img 
          src={imgSrc} 
          alt={alt || ''} 
          style={{ maxWidth: '100%', height: 'auto', display: 'block', margin: '1em auto' }}
          onError={(e) => {
            console.error('图片加载失败:', imgSrc)
            e.currentTarget.style.display = 'none'
          }}
        />
      )
    },
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
      return (
        <a 
          href={href} 
          target="_blank" 
          rel="noopener noreferrer"
        >
          {children}
        </a>
      )
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-xl report-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-preview-header">
          <h2 className="report-preview-title">{title}</h2>
          <div className="report-preview-header-actions">
            <div className="report-preview-dropdown" ref={dropdownRef}>
              <button 
                className="report-preview-download-btn"
                onClick={() => setShowDropdown(!showDropdown)}
                title="下载报告"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M14 11V14H2V11H0V14C0 15.1 0.9 16 2 16H14C15.1 16 16 15.1 16 14V11H14Z" fill="currentColor"/>
                  <path d="M13 7L11.59 5.59L9 8.17V0H7V8.17L4.41 5.59L3 7L8 12L13 7Z" fill="currentColor"/>
                </svg>
              </button>
              {showDropdown && (
                <div className="report-preview-dropdown-menu">
                  <button 
                    className="report-preview-dropdown-item"
                    onClick={handleDownloadMarkdown}
                  >
                    Markdown
                  </button>
                  <button 
                    className="report-preview-dropdown-item"
                    onClick={handleDownloadPDF}
                  >
                    PDF
                  </button>
                </div>
              )}
            </div>
            <button className="report-preview-close" onClick={onClose}>
              ×
            </button>
          </div>
        </div>
        <div className="report-preview-content markdown-body">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={components}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}

