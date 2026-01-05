import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ReportPreview,
  EditableMarkdown,
  WritingFlowPanel,
  KnowledgeBaseConfigModal,
  type WorkflowNodeType,
  type WorkflowNodeData,
} from './components'
import {
  runDeepResearchStream,
  generateDeepResearchOutline,
  type DeepResearchStreamEvent,
} from './api'
import { formatDuration } from '../../shared/utils/format'
import { MusicPlayer, PromptEditorTrigger, HomeButton } from '../../shared/components'
import characterImg from '../askdata/assets/character.png'
import repoIcon from './assets/repo-icon.svg'
import './SmartReport.css'
import type { ProcessSection } from './components/ProcessTimeline'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type LoadingPhase =
  | 'generating-outline'
  | 'writing-content'
  | 'completed'
  | null

const LoadingIndicator = ({
  phase,
  duration,
  message,
}: {
  phase: LoadingPhase
  duration: number
  message: string
}) => {
  if (phase === null) return null

  const isActive = phase === 'generating-outline' || phase === 'writing-content'
  const isCompleted = phase === 'completed'

  if (isCompleted) return null // 完成阶段不显示加载动画

  return (
    <div className="loading-indicator">
      <div className="loading-content">
        <div className="loading-icon-wrapper">
          <img
            src={characterImg}
            alt=""
            className={`loading-character${isActive ? ' active' : ''}`}
            draggable={false}
          />
          {isActive && <div className="loading-pulse" />}
        </div>
        <div className="loading-text">
          <p className="loading-message">{message}</p>
          <p className="loading-duration">
            已用时 {formatDuration(duration)}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SmartReport() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [outline, setOutline] = useState('')
  const [finalReport, setFinalReport] = useState('')
  const [reportTitle, setReportTitle] = useState<string>('')  // 报告标题
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>(null)
  const [loadingDuration, setLoadingDuration] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState('')
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [showKnowledgeBaseConfig, setShowKnowledgeBaseConfig] = useState(false)
  
  // 获取后端 API 地址
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001'
  
  // 自定义图片组件，处理后端静态文件路径
  const markdownComponents = useMemo(() => ({
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
    }
  }), [apiBaseUrl])
  // Deep Research 工作流状态（已移除未使用的状态）
  // 大纲确认相关状态
  const [isOutlineConfirmed, setIsOutlineConfirmed] = useState(false)
  const [pendingOutline, setPendingOutline] = useState<string | null>(null)
  const [pendingOutlineData, setPendingOutlineData] = useState<any>(null)
  const [pendingRequirement, setPendingRequirement] = useState<string>('')
  // 工作流节点列表（用于展示详细过程）
  const [workflowNodes, setWorkflowNodes] = useState<WorkflowNodeData[]>([])
  const [latestSections, setLatestSections] = useState<any[]>([])
  const [latestEstimatedWords, setLatestEstimatedWords] = useState<number | undefined>(undefined)
  
  // 存储每个章节的检索数据（用于交互查看）
  const [chapterDataMap, setChapterDataMap] = useState<Record<number, any>>({})
  
  // 细粒度进度状态（新的进度系统）
  const [overallProgress, setOverallProgress] = useState<number>(0)  // 总体进度百分比（0-100）
  const [progressDescription, setProgressDescription] = useState<string>('准备开始')  // 进度描述文字
  
  // 当前章节进度状态（用于进度条联动）
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(0)  // 当前正在处理的章节索引（0表示未开始）
  const [completedChapters, setCompletedChapters] = useState<number>(0)  // 已完成的章节数
  
  // 进度计算函数：基于明确的6个步骤
  // 步骤：1-生成检索查询, 2-并行检索完成, 3-已筛选结果, 4-已保存临时库, 5-信息评估完成, 6-已生成字符
  const calculateProgressFromStep = (
    totalChapters: number,      // 总章节数
    completedChapters: number,  // 已完成的章节数
    currentStep: number         // 当前章节的步骤（1-6），0表示还未开始
  ) => {
    if (totalChapters === 0) totalChapters = 1
    
    // 初始进度：10%
    const baseProgress = 10
    // 剩余进度：90%，分配给所有章节
    const remainingProgress = 90
    const perChapterProgress = remainingProgress / totalChapters
    // 每章6个步骤，平均分配
    const perStepProgress = perChapterProgress / 6
    
    // 已完成章节的进度
    let progress = baseProgress + (completedChapters * perChapterProgress)
    
    // 当前章节内的步骤进度
    if (currentStep > 0 && completedChapters < totalChapters) {
      progress += currentStep * perStepProgress
    }
    
    return Math.min(100, Math.max(baseProgress, Math.round(progress)))
  }
  
  // 使用 useRef 保存当前进度，避免闭包问题
  const completedChaptersRef = useRef<number>(0)
  const currentStepRef = useRef<number>(0)  // 当前章节的步骤（1-6）
  const totalChaptersRef = useRef<number>(0)  // 总章节数
  const currentChapterIndexRef = useRef<number>(0)  // 当前章节索引
  
  useEffect(() => {
    completedChaptersRef.current = completedChapters
  }, [completedChapters])
  
  useEffect(() => {
    currentChapterIndexRef.current = currentChapterIndex
  }, [currentChapterIndex])
  
  // 同步 latestSections 的长度到 ref
  useEffect(() => {
    if (latestSections.length > 0) {
      totalChaptersRef.current = latestSections.length
    }
  }, [latestSections])
  
  // 工作流取消函数
  const cancelWorkflowRef = useRef<(() => void) | null>(null)
  // 当前任务ID（用于终止时清理后端资源）
  const currentTaskIdRef = useRef<string | null>(null)
  // 是否已手动终止
  const [isTerminated, setIsTerminated] = useState(false)
  // 用于计算节点执行耗时（记录上一个节点结束时间）
  const lastNodeEndTimeRef = useRef<number | null>(null)
  // 工作流详细日志（用于事件流显示）
  const [workflowLogs, setWorkflowLogs] = useState<Array<{
    id: string
    time: string
    tag: string
    text: string
    timestamp: number
  }>>([])


  useEffect(() => {
    if (loadingPhase === null || loadingPhase === 'completed') {
      return
    }
    const start = Date.now()
    const timer = window.setInterval(() => {
      setLoadingDuration(Math.floor((Date.now() - start) / 1000))
    }, 100)
    return () => window.clearInterval(timer)
  }, [loadingPhase])

  useEffect(() => {
    // 自动滚动到底部：
    // - 避免写作阶段频繁滚动
    // - 避免用户刚发消息时轻微位移，只在辅助/系统更新时滚动
    if (loadingPhase === 'writing-content') {
      return
    }
    const lastMessage = messages[messages.length - 1]
    if (!isOutlineConfirmed && lastMessage?.role === 'user') {
      return
    }

    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages, loadingPhase, outline, workflowNodes, isOutlineConfirmed])

  // 确认大纲后，滚动到底部以展示过程组件
  useEffect(() => {
    if (isOutlineConfirmed && chatContainerRef.current) {
      const scrollOnce = () => {
        chatContainerRef.current?.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth',
        })
      }
      // 初次滚动
      setTimeout(scrollOnce, 100)
      // 再次滚动，确保动画渲染后也能到达底部
      setTimeout(scrollOnce, 700)
    }
  }, [isOutlineConfirmed])

  // 当报告预览按钮出现时，自动滚动到底部
  useEffect(() => {
    if (finalReport && chatContainerRef.current) {
      const scrollOnce = () => {
        chatContainerRef.current?.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth',
        })
      }
      // 初次滚动，等待 DOM 更新
      setTimeout(scrollOnce, 100)
      // 再次滚动，确保按钮渲染后也能到达底部
      setTimeout(scrollOnce, 500)
    }
  }, [finalReport])

  // 将后端节点名称映射到前端节点类型
  const mapNodeNameToType = (nodeName: string): WorkflowNodeType | null => {
    const mapping: Record<string, WorkflowNodeType> = {
      'planning': 'planning',
      'prepare_section': 'selecting_history',
      'collect_info': 'collecting_info',
      'writing': 'writing',
      'save_section': 'saving',
    }
    return mapping[nodeName] || null
  }

  // 根据节点类型生成节点标题
  const getNodeTitle = (nodeName: string, state?: DeepResearchStreamEvent['state']): string => {
    if (nodeName === 'planning') {
      return '生成写作大纲'
    } else if (nodeName === 'prepare_section') {
      // 根据当前章节信息生成标题
      const section = state?.current_section
      if (section) {
        return `准备章节：${section.level1_title}`
      }
      return '准备章节'
    } else if (nodeName === 'collect_info') {
      const section = state?.current_section
      if (section) {
        return `收集信息：${section.level1_title}`
      }
      return '正在进行信息收集'
    } else if (nodeName === 'writing') {
      const section = state?.current_section
      if (section) {
        return `撰写章节：${section.level1_title}`
      }
      return '正在撰写当前章节'
    } else if (nodeName === 'save_section') {
      const section = state?.current_section
      if (section) {
        return `保存章节：${section.level1_title}`
      }
      return '保存章节'
    }
    return nodeName
  }

  // 终止工作流
  // 生成参考文献
  const generateReferences = (allWrittenSections: any[]) => {
    // 使用数组存储所有引用，包含类型信息
    interface Reference {
      type: 'kb' | 'web'
      title: string
      url?: string
      filename?: string
    }
    
    const allReferences: Reference[] = []
    const seenUrls = new Set<string>()
    const seenFilenames = new Set<string>()

    // 遍历所有章节的引用
    allWrittenSections.forEach(section => {
      const citations = section.citations || []
      
      citations.forEach((citation: any) => {
        if (citation.filename && !seenFilenames.has(citation.filename)) {
          // 知识库文档（去重）
          seenFilenames.add(citation.filename)
          allReferences.push({
            type: 'kb',
            title: citation.title || citation.filename,
            filename: citation.filename
          })
        } else if (citation.url && !seenUrls.has(citation.url)) {
          // 网络资源（去重）
          seenUrls.add(citation.url)
          allReferences.push({
            type: 'web',
            title: citation.title || '网络资源',
            url: citation.url
          })
        }
      })
    })

    // 如果没有任何引用，返回空字符串
    if (allReferences.length === 0) {
      return ''
    }

    // 排序：知识库在前，网络资源在后；同类型内部按标题排序
    allReferences.sort((a, b) => {
      // 先按类型排序：kb < web
      if (a.type !== b.type) {
        return a.type === 'kb' ? -1 : 1
      }
      // 同类型内部按标题排序（中文友好）
      return a.title.localeCompare(b.title, 'zh-CN')
    })

    // 生成 Markdown（统一格式，不分类）
    let referencesText = '\n\n---\n\n## 参考文献\n\n'
    
    allReferences.forEach((ref, index) => {
      const num = `[${index + 1}]`
      if (ref.type === 'kb') {
        // 知识库：添加下载链接
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001'
        const downloadUrl = `${apiBaseUrl}/documents/${encodeURIComponent(ref.filename || '')}`
        referencesText += `${num} [${ref.filename}](${downloadUrl})\n\n`
      } else {
        // 网络资源：显示为链接
        referencesText += `${num} [${ref.title}](${ref.url})\n\n`
      }
    })

    return referencesText
  }

  const handleCancelWorkflow = async () => {
    // 调用取消函数
    if (cancelWorkflowRef.current) {
      cancelWorkflowRef.current()
      cancelWorkflowRef.current = null
    }
    
    // 清理状态
    setIsLoading(false)
    setLoadingPhase(null)
    setLoadingMessage('')
    setIsTerminated(true)
    
    // 将正在运行的节点标记为已取消
    setWorkflowNodes(prev => prev.map(node => 
      node.status === 'running' 
        ? { ...node, status: 'error' as const, error: '用户已终止任务', timestamp: Date.now() }
        : node
    ))
    
    // 清理后端资源（发送终止请求）
    if (currentTaskIdRef.current) {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001'
        await fetch(`${baseUrl}/api/smartreport/deep-research/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ task_id: currentTaskIdRef.current }),
        })
      } catch (error) {
        console.error('清理后端资源失败:', error)
      }
      currentTaskIdRef.current = null
    }
    
  }

  // 确认大纲并继续执行工作流
  const handleConfirmOutline = async () => {
    if (!pendingRequirement || !pendingOutline) return

    setIsOutlineConfirmed(true)
    setIsLoading(true)
    setLoadingPhase('writing-content')
    setLoadingMessage('')
    setLoadingDuration(0)
    setWorkflowNodes([]) // 清空之前的节点列表，准备开始新的工作流
    lastNodeEndTimeRef.current = null // 重置节点时间戳
    // 初始化进度状态
    setOverallProgress(0)
    setProgressDescription('初始化工作流...')
    setCurrentChapterIndex(0)
    setCompletedChapters(0)
    currentStepRef.current = 0
    
    // 设置总章节数（从 pendingOutlineData 中获取）
    if (pendingOutlineData?.sections) {
      totalChaptersRef.current = pendingOutlineData.sections.length
      console.log('📚 工作流开始，总章节数:', totalChaptersRef.current)
    }
    setWorkflowLogs([]) // 清空之前的日志
    cancelWorkflowRef.current = null // 清空之前的取消函数
    currentTaskIdRef.current = null // 清空之前的任务ID
    setIsTerminated(false)
    // 重置章节进度状态
    setCurrentChapterIndex(0)
    setCompletedChapters(0)

    const processStartTime = Date.now()
    const nodeIdMap = new Map<string, string>()
    let latestState: any = null
    let previousState: any = null // 用于检测状态变化
    let currentSectionIndex = -1 // 跟踪当前章节索引，用于判断新章节开始

    try {
      console.log('🚀 开始执行完整工作流...', { requirement: pendingRequirement })

      // 使用流式 API 执行完整工作流
      // 如果用户修改了大纲，传递修改后的大纲数据
      const outlineToSend = pendingOutlineData ? {
        ...pendingOutlineData,
        outline_markdown: pendingOutline, // 使用用户修改后的大纲
      } : undefined
      
      console.log('📤 发送给后端的大纲数据:', {
        title: outlineToSend?.title,
        sectionsCount: outlineToSend?.sections?.length,
        outlineMarkdownLength: outlineToSend?.outline_markdown?.length,
        outlineMarkdownPreview: outlineToSend?.outline_markdown?.substring(0, 200),
      })
      
      // 保存任务ID（从请求中获取或生成）
      const taskId = outlineToSend?.task_id || `task_${Date.now()}`
      currentTaskIdRef.current = taskId
      
      // 调用流式API并保存取消函数
      const cancelFn = runDeepResearchStream(
        { 
          requirement: pendingRequirement,
          outline: outlineToSend,
          task_id: taskId,
        },
        (event: DeepResearchStreamEvent) => {
          console.log('📡 收到流式事件:', event)
          
          // 更新任务ID（如果事件中包含）
          if (event.task_id) {
            currentTaskIdRef.current = event.task_id
          }
          
          // 生成日志的辅助函数（使用后端时间戳）
          const addLog = (text: string, tag: string = 'system', eventTimestamp?: number) => {
            // 优先使用后端时间戳，如果没有则使用当前时间（作为fallback）
            const timestamp = eventTimestamp ?? Date.now()
            const logId = `log_${timestamp}_${Math.random().toString(36).substr(2, 9)}`
            // 显示时间，格式：HH:mm:ss（去掉毫秒）
            const timeStr = new Date(timestamp).toLocaleTimeString('zh-CN', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
            setWorkflowLogs(prev => [...prev, {
              id: logId,
              time: timeStr,
              tag,
              text,
              timestamp,
            }])
            
            // 根据关键日志文本更新进度（使用 ref 获取最新值，避免闭包问题）
            const totalChapters = totalChaptersRef.current || 1
            const completed = completedChaptersRef.current
            
            console.log('📊 进度计算参数:', { totalChapters, completed, text: text.substring(0, 50) })
            
            // 步骤1: 已生成检索查询
            if (text.includes('已生成') && text.includes('个检索查询')) {
              currentStepRef.current = 1
              const progress = calculateProgressFromStep(totalChapters, completed, 1)
              console.log('📊 步骤1进度:', progress)
              setOverallProgress(progress)
            }
            // 步骤2: 并行检索完成
            else if (text.includes('✅ 并行检索完成')) {
              currentStepRef.current = 2
              const progress = calculateProgressFromStep(totalChapters, completed, 2)
              console.log('📊 步骤2进度:', progress)
              setOverallProgress(progress)
            }
            // 步骤3: 已筛选出结果
            else if (text.includes('✅ 已筛选出') && text.includes('条高质量结果')) {
              currentStepRef.current = 3
              const progress = calculateProgressFromStep(totalChapters, completed, 3)
              console.log('📊 步骤3进度:', progress)
              setOverallProgress(progress)
            }
            // 步骤4: 已保存到临时知识库
            else if (text.includes('✅ 已保存') && text.includes('条结果到临时库')) {
              currentStepRef.current = 4
              const progress = calculateProgressFromStep(totalChapters, completed, 4)
              console.log('📊 步骤4进度:', progress)
              setOverallProgress(progress)
            }
            // 步骤5: 信息评估完成（有耗时）
            else if ((text.includes('✅ 信息充足') || text.includes('⚠️ 信息不足')) && text.includes('总耗时')) {
              currentStepRef.current = 5
              const progress = calculateProgressFromStep(totalChapters, completed, 5)
              console.log('📊 步骤5进度:', progress)
              setOverallProgress(progress)
            }
            // 步骤6: 已生成字符（有耗时）
            else if (text.includes('✅ 已生成') && text.includes('字符') && text.includes('耗时')) {
              currentStepRef.current = 6
              const progress = calculateProgressFromStep(totalChapters, completed, 6)
              console.log('📊 步骤6进度:', progress)
              setOverallProgress(progress)
              // 注意：不在这里重置步骤，等 save_section 完成后再重置
            }
          }
          
          // 处理步骤进度事件（只记录日志，进度由日志文本触发）
          if (event.type === 'step_progress' && event.node) {
            const { node, step, total, message, timestamp: eventTimestamp, data } = event
            if (step && total && message) {
              // 添加步骤进度日志（进度更新由 addLog 内部根据文本内容自动触发）
              addLog(message, node, eventTimestamp)
              
              // 处理事件数据，更新 chapterDataMap
              if (data) {
                const currentIndex = currentChapterIndexRef.current
                setChapterDataMap(prev => {
                  const existing = prev[currentIndex] || {}
                  const updated = { ...existing }
                  
                  // 检索问句
                  if (data.search_queries) {
                    updated.search_queries = data.search_queries
                  }
                  
                  // 检索结果
                  if (data.retrieval_results) {
                    updated.retrieval_results = data.retrieval_results
                  }
                  
                  // 筛选结果
                  if (data.filtered_results) {
                    updated.filtered_results = data.filtered_results
                  }
                  
                  // 历史章节
                  if (data.history_sections) {
                    updated.history_sections = data.history_sections
                  }
                  
                  // 额外检索标志
                  if (data.is_additional_retrieval) {
                    updated.is_additional_retrieval = true
                  }
                  
                  // 额外检索问句
                  if (data.additional_search_queries) {
                    updated.additional_search_queries = data.additional_search_queries
                  }
                  
                  // 额外检索结果
                  if (data.additional_retrieval_results) {
                    updated.additional_retrieval_results = data.additional_retrieval_results
                  }
                  
                  // 额外筛选结果
                  if (data.additional_filtered_results) {
                    updated.additional_filtered_results = data.additional_filtered_results
                  }
                  
                  return { ...prev, [currentIndex]: updated }
                })
              }
            }
            return
          }
          
          if (event.type === 'node_start' && event.node) {
            const nodeName = event.node
            const state = event.state || {}
            
            // 更新最新的 sections（从任何节点的 state 中获取）
            if (state.sections && state.sections.length > 0) {
              setLatestSections(state.sections)
            }
            
            // 获取事件时间戳（后端提供）
            const eventTimestamp = event.timestamp
            
            // 处理 initialize 节点（不显示开始日志，只在完成时显示）
            if (nodeName === 'initialize') {
              if (state.sections) {
                setLatestSections(state.sections)
              }
              previousState = { ...state }
              return
            }
            
            // 处理 planning 节点（不显示开始日志，只在完成时显示）
            if (nodeName === 'planning') {
              if (state.sections) {
                setLatestSections(state.sections)
              }
              if (state.outline?.estimated_words) {
                setLatestEstimatedWords(state.outline.estimated_words)
              }
              previousState = { ...state }
              return
            }
            
            // 处理 prepare_section 节点（不显示开始日志，只在完成时显示）
            if (nodeName === 'prepare_section') {
              const sectionIndex = state.current_section_index ?? 0
              if (sectionIndex !== currentSectionIndex) {
                currentSectionIndex = sectionIndex
              }
              previousState = { ...state }
            }
            
            // 处理 collect_info 节点（不显示开始日志，已在 prepare_section 完成时显示）
            if (nodeName === 'collect_info') {
              previousState = { ...state }
            }
            
            // 处理 writing 节点（不显示开始日志，只在 collect_info 完成后显示）
            if (nodeName === 'writing') {
              previousState = { ...state }
            }
            
            // 处理 save_section 节点（不显示开始日志，只在完成时显示）
            if (nodeName === 'save_section') {
              previousState = { ...state }
            }
            
            // 跳过 planning 和 initialize 节点的可视化（但已记录日志）
            if (nodeName === 'planning' || nodeName === 'initialize') {
              if (state.sections) {
                setLatestSections(state.sections)
              }
              if (state.outline?.estimated_words) {
                setLatestEstimatedWords(state.outline.estimated_words)
              }
              return
            }
            
            const nodeType = mapNodeNameToType(nodeName)
            if (nodeType) {
              // 使用节点名称和当前章节索引生成唯一ID，避免同一章节的重复节点
              const sectionIndex = event.state?.current_section_index || 0
              const nodeId = `${nodeName}_${sectionIndex}_${Date.now()}`
              // 使用 nodeName + sectionIndex 作为 key，支持多章节的相同节点类型
              const nodeKey = `${nodeName}_${sectionIndex}`
              nodeIdMap.set(nodeKey, nodeId)
              
              // 根据节点类型准备 details
              let nodeDetails: any = {}
                const stateAny = event.state as any
              
              if (event.state?.current_section) {
                nodeDetails.level1Title = event.state.current_section.level1_title
                nodeDetails.level2Title = event.state.current_section.level2_titles?.join('、') || ''
              }
              if (event.state?.current_section_index !== undefined) {
                nodeDetails.sectionIndex = event.state.current_section_index
              }
              if (event.state?.sections) {
                nodeDetails.totalSections = event.state.sections.length
              }
              
              // 正在选择历史章节：添加历史章节列表
              if (nodeName === 'prepare_section' && event.state?.history_sections) {
                nodeDetails.historySections = event.state.history_sections
              }
              if (nodeName === 'prepare_section' && stateAny?.initial_search_queries) {
                nodeDetails.initialSearchQueries = stateAny.initial_search_queries
              }
              if (nodeName === 'prepare_section' && stateAny?.initial_temp_kb_results) {
                nodeDetails.initialResults = stateAny.initial_temp_kb_results
                nodeDetails.initialResultsCount = stateAny.initial_temp_kb_results.length
              }
              
              // 正在进行信息收集：添加检索结果
              if (nodeName === 'collect_info' && event.state?.search_results) {
                nodeDetails.searchResults = event.state.search_results
                nodeDetails.searchResultsCount = event.state.search_results.length
              }
              
              // 正在进行信息收集：添加评估结果
              if (nodeName === 'collect_info' && event.state?.info_sufficiency_evaluation) {
                nodeDetails.evaluationResult = event.state.info_sufficiency_evaluation
              }
              
              // 正在保存章节：添加章节索引信息
              if (nodeName === 'save_section' && event.state?.current_section_index !== undefined && event.state?.sections) {
                nodeDetails.sectionIndex = event.state.current_section_index
                nodeDetails.totalSections = event.state.sections.length
              }
              
              setWorkflowNodes(prev => [...prev, {
                id: nodeId,
                type: nodeType,
                title: getNodeTitle(nodeName, event.state),
                model: 'qwen-max',
                details: Object.keys(nodeDetails).length > 0 ? nodeDetails : undefined,
                status: 'running',
                timestamp: eventTimestamp || Date.now(), // 使用后端时间戳
              }])
            }
          } else if (event.type === 'state_update' && event.node && event.state) {
            const nodeName = event.node
            const state = event.state
            
            // 新格式中不显示中间步骤，所有结果在 node_end 时统一显示
            
            // 跳过 planning 和 initialize 节点的状态更新（但已记录日志）
            if (nodeName === 'planning' || nodeName === 'initialize') {
              if (state.sections) {
                setLatestSections(state.sections)
              }
              if (state.outline?.estimated_words) {
                setLatestEstimatedWords(state.outline.estimated_words)
              }
              previousState = { ...previousState, ...state }
              return
            }
            
            latestState = { ...latestState, ...state }
            if (state.sections) {
              setLatestSections(state.sections)
            }
            if (state.outline?.estimated_words) {
              setLatestEstimatedWords(state.outline.estimated_words)
            }
            
            // 更新 previousState 用于下次比较
            previousState = { ...previousState, ...state }
            
            // 更新对应节点的 details
            const sectionIndex = event.state?.current_section_index ?? 0
            const nodeKey = `${event.node}_${sectionIndex}`
            const nodeId = nodeIdMap.get(nodeKey)
            if (nodeId) {
              setWorkflowNodes(prev => prev.map(node => {
                if (node.id !== nodeId) return node
                
                const updatedDetails = { ...(node.details || {}) }
                const stateAny = event.state as any
                const mergedState = { ...latestState, ...event.state } as any
                
                // 更新当前章节信息
                if (event.state?.current_section) {
                  updatedDetails.level1Title = event.state.current_section.level1_title
                  updatedDetails.level2Title = event.state.current_section.level2_titles?.join('、') || ''
                }
                if (event.state?.current_section_index !== undefined) {
                  updatedDetails.sectionIndex = event.state.current_section_index
                }
                if (event.state?.sections) {
                  updatedDetails.totalSections = event.state.sections.length
                }
                
                // 更新历史章节列表（prepare_section）
                if (event.node === 'prepare_section') {
                  if (event.state?.history_sections) {
                    updatedDetails.historySections = event.state.history_sections
                  }
                  if (stateAny?.initial_search_queries || mergedState?.initial_search_queries) {
                    updatedDetails.initialSearchQueries = stateAny?.initial_search_queries || mergedState?.initial_search_queries
                  }
                  if (stateAny?.initial_temp_kb_results || mergedState?.initial_temp_kb_results) {
                    updatedDetails.initialResults = stateAny?.initial_temp_kb_results || mergedState?.initial_temp_kb_results
                    updatedDetails.initialResultsCount = (stateAny?.initial_temp_kb_results || mergedState?.initial_temp_kb_results)?.length || 0
                  }
                }
                
                // 更新检索结果（collect_info）
                if (event.node === 'collect_info') {
                  if (event.state?.search_results || mergedState?.search_results) {
                    updatedDetails.searchResults = event.state?.search_results || mergedState?.search_results
                    updatedDetails.searchResultsCount = (event.state?.search_results || mergedState?.search_results)?.length || 0
                  }
                  if (stateAny?.additional_search_queries || mergedState?.additional_search_queries) {
                    updatedDetails.additionalSearchQueries = stateAny?.additional_search_queries || mergedState?.additional_search_queries
                  }
                  if (stateAny?.additional_search_results || mergedState?.additional_search_results) {
                    updatedDetails.additionalSearchResults = stateAny?.additional_search_results || mergedState?.additional_search_results
                    updatedDetails.additionalResultsCount = (stateAny?.additional_search_results || mergedState?.additional_search_results)?.length || 0
                  }
                  if (event.state?.info_sufficiency_evaluation || mergedState?.info_sufficiency_evaluation) {
                    updatedDetails.evaluationResult = event.state?.info_sufficiency_evaluation || mergedState?.info_sufficiency_evaluation
                  }
                  // 也尝试从 mergedState 中获取 initial_search_queries 和 initial_temp_kb_results（如果存在）
                  if (mergedState?.initial_search_queries) {
                    updatedDetails.initialSearchQueries = mergedState.initial_search_queries
                  }
                  if (mergedState?.initial_temp_kb_results) {
                    updatedDetails.initialResults = mergedState.initial_temp_kb_results
                    updatedDetails.initialResultsCount = mergedState.initial_temp_kb_results?.length || 0
                  }
                }
                
                // 更新写作内容（writing）
                if (event.node === 'writing') {
                  if (event.state?.written_content || mergedState?.written_content) {
                    updatedDetails.writtenContent = event.state?.written_content || mergedState?.written_content
                    updatedDetails.contentLength = (event.state?.written_content || mergedState?.written_content)?.length || 0
                  }
                }
                
                // 更新章节索引信息（save_section）
                if (event.node === 'save_section') {
                  if (event.state?.current_section_index !== undefined) {
                    updatedDetails.sectionIndex = event.state.current_section_index
                  }
                  if (event.state?.sections) {
                    updatedDetails.totalSections = event.state.sections.length
                  }
                }
                
                return {
                  ...node,
                  details: updatedDetails,
                }
              }))
            }
          } else if (event.type === 'node_end' && event.node) {
            const nodeName = event.node
            const state = event.state || latestState || {}
            const eventTimestamp = event.timestamp  // 使用后端时间戳（模型请求完成时间）
            
            // 计算执行耗时（与上一个节点结束时间的差值）
            const calculateDuration = () => {
              const currentTime = eventTimestamp || Date.now()
              if (!lastNodeEndTimeRef.current) {
                lastNodeEndTimeRef.current = currentTime
                return null
              }
              const duration = (currentTime - lastNodeEndTimeRef.current) / 1000
              lastNodeEndTimeRef.current = currentTime
              return duration
            }
            
            const duration = calculateDuration()
            
            // 处理 initialize 节点结束
            if (nodeName === 'initialize') {
              addLog(`⚙️ 工作流初始化完成`, 'initialize', eventTimestamp)
              // 设置初始进度10%
              setOverallProgress(10)
              setProgressDescription('准备开始撰写...')
              return
            }
            
            // 处理 planning 节点结束
            if (nodeName === 'planning') {
              addLog(`✅ 大纲校验通过`, 'planning', eventTimestamp)
              addLog(`📚 正在准备第一章节资料...`, 'system', eventTimestamp)
              addLog(`💡 预计耗时 10-30 秒，请稍候...`, 'system', eventTimestamp)
              // 更新状态：开始第1章
              setCurrentChapterIndex(1)
              currentStepRef.current = 0  // 重置步骤
              setProgressDescription('准备第一章节资料...')
              return
            }
            
            // 处理 prepare_section 节点结束
            if (nodeName === 'prepare_section') {
              const initialResults = (state as any).initial_temp_kb_results?.length || 0
              const historyTitles = (state as any).history_sections || []
              const sectionIndex = state.current_section_index ?? currentChapterIndex
              
              // 存储检索数据（用于后续交互查看）
              setChapterDataMap(prev => ({
                ...prev,
                [sectionIndex]: {
                  ...prev[sectionIndex],
                  prepare: {
                    queries: (state as any).initial_search_queries || [],
                    results: (state as any).initial_temp_kb_results || [],
                    totalCount: (state as any).initial_temp_kb_results?.length || 0,
                  }
                }
              }))
              
              // 构建耗时文本
              const durationText = duration !== null 
                ? ` (总耗时 ${duration.toFixed(1)}秒${duration > 10 ? ' ⏱️' : ''})` 
                : ''
              
              // 显示检索结果
              addLog(`✅ 已检索 ${initialResults} 条资料`, 'prepare_section', eventTimestamp)
              
              // 显示历史章节回顾（带耗时）
              if (historyTitles && historyTitles.length > 0) {
                const titlesStr = historyTitles.map((t: string) => `「${t}」`).join('、')
                addLog(`✅ 已回顾 ${titlesStr} 章节${durationText}`, 'prepare_section', eventTimestamp)
              } else {
                addLog(`✅ 无需回顾历史章节${durationText}`, 'prepare_section', eventTimestamp)
              }
              
              // 立即显示下一步提示
              addLog(`🤔 正在评估信息充足性...`, 'collect_info', eventTimestamp)
              setProgressDescription('评估信息充足性...')
              return
            }
            
            // 处理 collect_info 节点结束
            if (nodeName === 'collect_info') {
              const additionalResults = (state as any).additional_search_results?.length || 0
              const evaluation = state.info_sufficiency_evaluation
              const sufficient = evaluation?.sufficient
              const sectionIndex = state.current_section_index ?? currentChapterIndex
              
              // 存储评估和补充检索数据
              setChapterDataMap(prev => ({
                ...prev,
                [sectionIndex]: {
                  ...prev[sectionIndex],
                  collect: {
                    evaluation: sufficient ? '信息充足' : '信息不足',
                    additionalQueries: (state as any).additional_search_queries || [],
                    additionalResults: (state as any).additional_search_results || [],
                    additionalCount: additionalResults,
                  }
                }
              }))
              
              // 构建耗时文本
              const durationText = duration !== null ? ` (总耗时 ${duration.toFixed(1)}秒)` : ''
              
              // 显示信息评估结果（带耗时）
              if (sufficient) {
                addLog(`✅ 信息充足${durationText}`, 'collect_info', eventTimestamp)
              } else {
                if (additionalResults > 0) {
                  addLog(`⚠️ 信息不足，已补充检索 ${additionalResults} 条${durationText}`, 'collect_info', eventTimestamp)
                } else {
                  addLog(`⚠️ 信息不足，继续撰写${durationText}`, 'collect_info', eventTimestamp)
                }
              }
              
              // 添加"正在撰写章节内容"提示
              addLog(`✍️ 正在撰写章节内容...`, 'collect_info', eventTimestamp)
              setProgressDescription('撰写章节内容...')
              return
            }
            
            // 处理 writing 节点结束
            if (nodeName === 'writing') {
              const contentLength = state.written_content?.length || 0
              if (duration !== null) {
                addLog(`✅ 已生成 ${contentLength} 字符 (耗时 ${duration.toFixed(1)}秒)`, 'writing', eventTimestamp)
              } else {
                addLog(`✅ 已生成 ${contentLength} 字符`, 'writing', eventTimestamp)
              }
              setProgressDescription('保存章节...')
              return
            }
            
            // 处理 save_section 节点结束
            if (nodeName === 'save_section') {
              // 注意：save_section 节点执行后，current_section_index 已经被 +1
              // 所以需要检查更新后的索引是否小于总章节数
              const sectionIndex = state.current_section_index ?? 0
              const totalSections = state.sections?.length || latestSections.length || 0
              const hasMore = sectionIndex < totalSections
              
              addLog(`✅ 章节保存完成`, 'save_section', eventTimestamp)
              
              // 更新已完成章节数
              setCompletedChapters(sectionIndex)
              
              if (hasMore) {
                // 添加下一章的准备提示
                const nextChapterNumber = sectionIndex + 1
                const chineseNumbers = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
                const chapterName = nextChapterNumber <= 10 ? `第${chineseNumbers[nextChapterNumber - 1]}` : `第${nextChapterNumber}`
                addLog(`📚 正在准备${chapterName}章节资料...`, 'system', eventTimestamp)
                addLog(`💡 预计耗时 10-30 秒，请稍候...`, 'system', eventTimestamp)
                // 更新状态：开始下一章
                setCurrentChapterIndex(nextChapterNumber)
                currentStepRef.current = 0  // 重置步骤计数
                const chapterTitle = latestSections[nextChapterNumber - 1]?.title || `第${nextChapterNumber}章`
                setProgressDescription(`准备资料：${chapterTitle}`)
              } else {
                // 所有章节已完成
                addLog(`🎉 所有章节撰写完成！`, 'system', eventTimestamp)
                addLog(`正在进行最终汇总...`, 'system', eventTimestamp)
                // 更新进度：全部完成
                setCurrentChapterIndex(0)  // 0 表示已完成
                setOverallProgress(100)
                setProgressDescription('已完成')
                setIsLoading(false)  // 停止加载状态
                setLoadingPhase(null)  // 重置 loadingPhase
              }
              return
            }
            
            // 跳过 planning 和 initialize 节点的可视化更新（但已记录日志）
            if (nodeName === 'planning' || nodeName === 'initialize') {
              return
            }
            
            // 尝试从 nodeIdMap 中找到对应的节点ID
            // 由于 node_end 可能没有 state，我们需要尝试所有可能的 sectionIndex
            // 或者从 latestState 中获取
            const sectionIndex = event.state?.current_section_index ?? latestState?.current_section_index ?? 0
            const nodeKey = `${event.node}_${sectionIndex}`
            let nodeId = nodeIdMap.get(nodeKey)
            
            // 如果找不到，尝试查找最近创建的对应节点类型的节点
            if (!nodeId) {
              setWorkflowNodes(prev => {
                const matchingNode = prev.find(n => {
                  const nodeType = mapNodeNameToType(event.node!)
                  return n.type === nodeType && n.status === 'running'
                })
                if (matchingNode) {
                  return prev.map(node => 
                    node.id === matchingNode.id 
                      ? { ...node, status: 'completed' as const, timestamp: Date.now() }
                      : node
                  )
                }
                return prev
              })
            } else {
              const endTimestamp = event.timestamp || Date.now() // 使用后端时间戳
              setWorkflowNodes(prev => prev.map(node => 
                node.id === nodeId 
                  ? { ...node, status: 'completed' as const, timestamp: endTimestamp }
                  : node
              ))
            }
          } else if (event.type === 'complete') {
            // 工作流完成 - 更新进度为100%
            // 使用 totalChaptersRef 而不是 latestSections.length，因为状态可能还没更新
            const totalSections = totalChaptersRef.current || latestSections.length
            setCompletedChapters(totalSections)
            setCurrentChapterIndex(0)  // 重置为0表示已完成
            setOverallProgress(100)
            setProgressDescription('已完成')
            setIsLoading(false)  // 停止加载状态
            setLoadingPhase('completed')  // 设置为 'completed' 而不是 null，确保 globalStage 为 'complete'
            // 如果之前没有添加完成日志，在这里补充
            const lastLog = workflowLogs[workflowLogs.length - 1]
            if (lastLog && !lastLog.text.includes('所有章节撰写完成')) {
              const completeTimestamp = event.timestamp || Date.now()
              addLog(`🎉 所有章节撰写完成！`, 'system', completeTimestamp)
            }
          } else if (event.type === 'error') {
            throw new Error(event.error || 'Unknown error')
          }
        },
        (error: Error) => {
          console.error('❌ 流式 API 错误:', error)
          setWorkflowNodes(prev => prev.map(node => 
            node.status === 'running' 
              ? { ...node, status: 'error' as const, error: error.message, timestamp: Date.now() }
              : node
          ))
          setIsLoading(false)
          setLoadingPhase(null)
          cancelWorkflowRef.current = null
          currentTaskIdRef.current = null
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `❌ 工作流执行失败: ${error.message}`,
            },
          ])
        },
        () => {
          console.log('✅ 工作流完成', latestState)
          
          setIsTerminated(false)

          if (latestState) {
            const resultOutline = latestState.outline || pendingOutlineData
            const allWrittenSections = latestState.all_written_sections || []
            
            if (resultOutline && allWrittenSections.length > 0) {
              // 调试：检查章节数据结构
              console.log('🔍 [调试] all_written_sections 结构:', allWrittenSections.map((s: any) => ({
                title: s.level1_title,
                level2_titles: s.level2_titles,
                hasCitations: !!s.citations,
                citationsCount: s.citations?.length || 0,
                citationsPreview: s.citations?.slice(0, 2)
              })))
              
              // 生成报告内容
              const reportContent = allWrittenSections
                .map((s: any) => s.content)
                .join('\n\n')
              
              // 检测图表
              const chartPattern = /!\[.*?\]\(\/static\/charts\/[^)]+\)/g
              const chartMatches = reportContent.match(chartPattern)
              const chartCount = chartMatches ? chartMatches.length : 0
              
              if (chartCount > 0) {
                console.log(`📊 [生成报告] 检测到 ${chartCount} 个图表`)
                chartMatches?.forEach((match: string, index: number) => {
                  const urlMatch = match.match(/\((\/static\/charts\/[^)]+)\)/)
                  if (urlMatch) {
                    const chartUrl = urlMatch[1]
                    console.log(`  📈 图表 ${index + 1}: ${chartUrl}`)
                  }
                })
              } else {
                console.log(`📊 [生成报告] 未检测到图表`)
              }
              
              // 生成参考文献
              const references = generateReferences(allWrittenSections)
              
              // 组装完整报告
              const fullReport = `# ${resultOutline.title}\n\n${reportContent}${references}`
              
              const sectionsWithCitations = allWrittenSections.filter((s: any) => s.citations && s.citations.length > 0).length
              console.log(`📚 [生成报告] 包含 ${sectionsWithCitations} 个章节有引用，参考文献长度: ${references.length} 字符`)
              
              setFinalReport(fullReport)
              setReportTitle(resultOutline.title || '报告')  // 保存报告标题
              
              const totalTime = Math.floor((Date.now() - processStartTime) / 1000)
              
              // 在工作流日志中添加完成消息
              const completionTimestamp = Date.now()
              const completionTimeStr = new Date(completionTimestamp).toLocaleTimeString('zh-CN', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })
              const completionLogId = `log_${completionTimestamp}_${Math.random().toString(36).substr(2, 9)}`
              setWorkflowLogs(prev => [...prev, {
                id: completionLogId,
                time: completionTimeStr,
                tag: 'system',
                text: `✅ Deep Research 工作流完成！（过程总耗时：${formatDuration(totalTime)}）`,
                timestamp: completionTimestamp,
              }])
            }
          }
          
          setIsLoading(false)
          setLoadingPhase(null)
          cancelWorkflowRef.current = null
          currentTaskIdRef.current = null
        }
      )
      
      // 保存取消函数
      cancelWorkflowRef.current = cancelFn
      
    } catch (error) {
      console.error('❌ 工作流执行失败:', error)
      setWorkflowNodes(prev => prev.map(node => 
        node.status === 'running' 
          ? { ...node, status: 'error' as const, error: (error as Error).message, timestamp: Date.now() }
          : node
      ))
      setIsLoading(false)
      setLoadingPhase(null)
      cancelWorkflowRef.current = null
      currentTaskIdRef.current = null
      setIsTerminated(false)
      const errorMessage = error instanceof Error ? error.message : String(error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `❌ 工作流执行失败: ${errorMessage}`,
        },
      ])
    }
  }
  
  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (cancelWorkflowRef.current) {
        cancelWorkflowRef.current()
      }
    }
  }, [])


  const buildResultPreview = (results?: any[]) => {
    if (!results || results.length === 0) return []
    return results.slice(0, 2).map((r) => {
      const title =
        r.title ||
        r.filename ||
        r.source ||
        (r.url ? (() => {
          try {
            const u = new URL(r.url)
            return u.hostname.replace('www.', '')
          } catch (e) {
            return r.url
          }
        })() : '') ||
        '结果预览'
      const content = r.content ? (r.content.length > 140 ? `${r.content.slice(0, 140)}...` : r.content) : ''
      const source = r.url ? 'web' : r.filename ? 'kb' : r.source
      return { title, content, source }
    })
  }

  const buildPendingTimeline = (sectionsSrc: any[]): ProcessSection[] => {
    if (!sectionsSrc || sectionsSrc.length === 0) return []
    const keys: Array<ProcessSection['steps'][number]['key']> = [
      'selecting_history',
      'collecting_info',
      'writing',
      'saving',
    ]
    return sectionsSrc.map((s, idx) => ({
      sectionIndex: idx,
      title: s.level1_title || s.level1Title || s.title || s.l1 || `章节 ${idx + 1}`,
      status: 'pending',
      steps: keys.map((k) => ({
        key: k,
        title:
          k === 'selecting_history'
            ? '准备与初始检索'
            : k === 'collecting_info'
              ? '补充检索与评估'
              : k === 'writing'
                ? '章节写作'
                : '保存章节',
        status: 'pending',
        meta: [],
        list: [],
        preview: [],
      })),
    }))
  }

  const timelineSections = useMemo<ProcessSection[]>(() => {
    const order: Array<'selecting_history' | 'collecting_info' | 'writing' | 'saving'> = [
      'selecting_history',
      'collecting_info',
      'writing',
      'saving',
    ]
    const grouped = new Map<number, ProcessSection>()

    workflowNodes.forEach((node) => {
      // 仅关注可视化的节点类型
      if (!order.includes(node.type as any)) return
      const sectionIndex = node.details?.sectionIndex ?? 0
      const sectionTitle = node.details?.level2Title || node.title

      if (!grouped.has(sectionIndex)) {
        grouped.set(sectionIndex, {
          sectionIndex,
          title: sectionTitle,
          status: 'pending',
          steps: order.map((k) => ({
            key: k,
            title:
              k === 'selecting_history'
                ? '准备与初始检索'
                : k === 'collecting_info'
                  ? '补充检索与评估'
                  : k === 'writing'
                    ? '章节写作'
                    : '保存章节',
            status: 'pending',
            meta: [],
            list: [],
            preview: [],
          })),
        })
      }

      const section = grouped.get(sectionIndex)!
      const step = section.steps.find((s) => s.key === node.type)
      if (step) {
        step.status = node.status
        const details = node.details || {}

        if (node.type === 'selecting_history') {
          const queries = details.initialSearchQueries as string[] | undefined
          const initialCount = details.initialResultsCount ?? (details.initialResults?.length ?? 0)
          step.meta = [
            { label: '检索语句', value: queries && queries.length > 0 ? queries.join(' / ') : '生成中' },
            { label: '初始召回', value: `${initialCount} 条` },
          ]
          if (details.initialResults) {
            step.preview = buildResultPreview(details.initialResults)
          }
        }

        if (node.type === 'collecting_info') {
          const additionalQueries = details.additionalSearchQueries as string[] | undefined
          const searchCount = details.searchResultsCount ?? (details.searchResults?.length ?? 0)
          const additionalCount = details.additionalResultsCount ?? (details.additionalSearchResults?.length ?? 0)
          const evaluation = details.evaluationResult
          step.meta = [
            { label: '最终检索结果', value: `${searchCount} 条` },
            { label: '额外召回', value: `${additionalCount} 条` },
          ]
          if (additionalQueries && additionalQueries.length > 0) {
            step.list = additionalQueries.map((q, idx) => ({ label: `补充检索${idx + 1}`, value: q }))
          }
          if (details.searchResults) {
            step.preview = buildResultPreview(details.searchResults)
          } else if (details.additionalSearchResults) {
            step.preview = buildResultPreview(details.additionalSearchResults)
          }
          if (evaluation) {
            const missing = evaluation.missing_points || evaluation.missingPoints || []
            step.note = evaluation.sufficient
              ? '✅ 信息充足'
              : missing.length
                ? `⚠️ 信息不足：${missing.slice(0, 3).join('、')}${missing.length > 3 ? '...' : ''}`
                : '⚠️ 信息不足'
          }
        }

        if (node.type === 'writing') {
          const contentLength = details.contentLength ?? (details.writtenContent ? details.writtenContent.length : 0)
          step.meta = [{ label: '章节字数', value: `${contentLength} 字符` }]
          if (details.writtenContent) {
            const previewText =
              details.writtenContent.length > 160
                ? `${details.writtenContent.slice(0, 160)}...`
                : details.writtenContent
            step.preview = [{ title: '章节预览', content: previewText }]
          }
        }

        if (node.type === 'saving') {
          const idx = details.sectionIndex ?? 0
          const total = details.totalSections ?? 0
          step.meta = [{ label: '章节进度', value: `${idx + 1}/${total || '？'}` }]
        }
      }

      // 更新章节状态：错误 > 进行中 > 完成 > 等待
      const hasError = section.steps.some((s) => s.status === 'error')
      const hasRunning = section.steps.some((s) => s.status === 'running')
      const allDone = section.steps.every((s) => s.status === 'completed')
      section.status = hasError ? 'error' : hasRunning ? 'running' : allDone ? 'completed' : 'pending'
    })

    return Array.from(grouped.values()).sort((a, b) => a.sectionIndex - b.sectionIndex)
  }, [workflowNodes])

  // 只使用 workflowLogs，因为已经包含了所有详细日志
  // workflowNodes 仅用于可视化展示，不生成日志（避免重复）
  const logs = useMemo(() => {
    return workflowLogs.sort((a, b) => a.timestamp - b.timestamp)
  }, [workflowLogs])

  const globalStage: 'initialize' | 'planning' | 'loop' | 'complete' | 'terminated' =
    isTerminated
      ? 'terminated'
      : loadingPhase === 'generating-outline'
        ? 'planning'
        : loadingPhase === 'writing-content'
          ? 'loop'
          : loadingPhase === 'completed'
            ? 'complete'
            : (loadingPhase === null && completedChapters > 0 && completedChapters === latestSections.length)
              ? 'complete'  // 如果 loadingPhase 为 null 但所有章节已完成，显示为 complete
              : 'initialize'

  const totalSteps = 2 + (latestSections?.length || 0) * 4 + 1
  const doneSteps =
    workflowNodes.filter((n) => n.status === 'completed').length +
    (globalStage === 'planning' ? 1 : 0) +
    (globalStage === 'complete' ? 1 : 0)
  // 使用我们维护的 completedChapters 状态，更准确地反映实际完成数
  const finishedSections = completedChapters
  const displayTimelineSections =
    timelineSections.length > 0
      ? timelineSections
      : buildPendingTimeline(latestSections.length > 0 ? latestSections : pendingOutlineData?.sections || [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!input.trim() || isLoading) return

    const requirement = input.trim()
    setMessages((prev) => [...prev, { role: 'user', content: requirement }])
    setInput('')
    setIsLoading(true)
    setLoadingPhase('generating-outline')
    setLoadingMessage('正在生成报告大纲...')
    setLoadingDuration(0)
    setIsTerminated(false)

    setFinalReport('')
    setReportTitle('')  // 重置报告标题
    setOutline('')
    setIsOutlineConfirmed(false)
    setPendingOutline(null)
    setPendingOutlineData(null)
    setPendingRequirement(requirement)
    
    // 重置工作流状态
    setWorkflowNodes([])

    try {
      console.log('📋 开始生成大纲...', { requirement })
      
      // 第一步：仅生成大纲
      const outlineResult = await generateDeepResearchOutline({ requirement })
      console.log('✅ 大纲生成完成', outlineResult)
      
      setPendingOutline(outlineResult.outline_markdown)
      setPendingOutlineData(outlineResult)
      setOutline(outlineResult.outline_markdown)
      setIsLoading(false)
      setLoadingPhase(null)
      
      // 立即设置总章节数（避免后续进度计算时使用错误的值）
      if (outlineResult.sections && outlineResult.sections.length > 0) {
        totalChaptersRef.current = outlineResult.sections.length
        console.log('📚 设置总章节数:', outlineResult.sections.length)
      }
      
    } catch (error) {
      console.error('❌ 生成大纲失败:', error)
      setIsLoading(false)
      setLoadingPhase(null)
      const errorMessage = error instanceof Error ? error.message : String(error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `❌ 生成大纲失败: ${errorMessage}\n\n请检查：\n1. 后端服务是否正常运行（http://localhost:8001）\n2. 浏览器控制台是否有详细错误信息\n3. 网络连接是否正常`,
        },
      ])
    }
  }

  return (
    <div className="qa-app">
      <header className="qa-header">
        <div className="qa-header-left">
          <HomeButton />
          <h1>智能报告</h1>
          <PromptEditorTrigger
            onOpenEditor={() => {
              setShowKnowledgeBaseConfig(true)
            }}
          />
        </div>
      </header>
      
      {/* 知识库配置弹窗 */}
      <KnowledgeBaseConfigModal
        isOpen={showKnowledgeBaseConfig}
        onClose={() => setShowKnowledgeBaseConfig(false)}
              />
      <MusicPlayer />

      <main ref={chatContainerRef} className="qa-chat">
        {/* 消息区始终在外层，不参与翻转 */}
        {messages.length === 0 && (
          <div className="upload-box">
            <div>
              <p className="upload-title">请输入想要撰写的报告内容</p>
              <p className="upload-desc">
                输入您的报告要求，系统将自动生成报告大纲并完成撰写。
              </p>
            </div>
          </div>
        )}

        {messages
          .filter(msg =>
            !(
              msg.role === 'assistant' &&
              msg.content.includes('任务已终止')
            )
          )
          .map((msg, index) => (
          <Fragment key={`${msg.role}-${index}`}>
            {msg.content ? (
              <div className={`bubble ${msg.role}`}>
                <div className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            ) : null}
          </Fragment>
        ))}

        <div
          className={`qa-panel-stack ${
            isOutlineConfirmed || loadingPhase === 'generating-outline' || pendingOutline ? '' : 'collapsed'
          }`}
        >
          <div className="qa-panel-inner">
            <div className="qa-panel-face">
              {pendingOutline && (
                <div className="smart-report-outline-editor">
                  <div className="smart-report-outline-header">
                    <h3>报告大纲</h3>
                    {!isOutlineConfirmed && (
                      <button
                        className="smart-report-confirm-btn"
                        onClick={handleConfirmOutline}
                        disabled={isLoading}
                      >
                        确认并开始撰写
                      </button>
                    )}
                    {isOutlineConfirmed && (
                      <span className="smart-report-outline-confirmed">✓ 已确认</span>
                    )}
                  </div>
                  <EditableMarkdown
                    value={pendingOutline}
                    onChange={(value) => {
                      if (!isOutlineConfirmed) {
                        setPendingOutline(value)
                        setOutline(value)
                      }
                    }}
                    placeholder="大纲内容..."
                    disabled={isOutlineConfirmed}
                  />
                  {pendingOutlineData && (
                    <div style={{ marginTop: '16px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                      <p>参考字数: {pendingOutlineData.estimated_words || 0} 字</p>
                    </div>
                  )}
                </div>
              )}

              {loadingPhase === 'generating-outline' && (
                <LoadingIndicator
                  phase={loadingPhase}
                  duration={loadingDuration}
                  message={loadingMessage || '正在生成大纲...'}
                />
              )}
            </div>

            <div className="qa-panel-face">
              {isOutlineConfirmed && displayTimelineSections.length > 0 && (
                <WritingFlowPanel
                  className="wf-appear"
                  sections={
                    latestSections.length > 0
                      ? latestSections.map((s: any, idx: number) => ({
                          id: s.section_id || `sec-${idx}`,
                          l1: s.level1_title,
                          l2: s.level2_titles?.join('、') || '',
                        }))
                      : displayTimelineSections.map((s) => ({
                          id: `sec-${s.sectionIndex}`,
                          l1: '',
                          l2: s.title,
                        }))
                  }
                  timelineSections={displayTimelineSections}
                  isLoading={isLoading}
                  loadingPhase={loadingPhase}
                  globalStage={globalStage}
                  isTerminated={isTerminated}
                  logs={logs}
                  progress={{ 
                    done: doneSteps, 
                    total: totalSteps, 
                    finishedSections, 
                    currentChapterIndex, 
                    overallProgress,
                    progressDescription
                  }}
                  currentWords={latestEstimatedWords}
                  chapterDataMap={chapterDataMap}
                  isInteractive={globalStage === 'complete'}
                  reportTitle={pendingOutlineData?.title || ''}
                />
              )}


              {finalReport && (
                <div className="smart-report-preview-btn-container">
                  <button
                    className="smart-report-preview-btn"
                    onClick={() => setIsPreviewOpen(true)}
                  >
                    <img
                      src={repoIcon}
                      alt="报告"
                      className="smart-report-preview-btn-icon"
                    />
                    {(() => {
                      // 优先使用报告标题
                      if (reportTitle) {
                        return reportTitle.length > 20
                          ? reportTitle.substring(0, 20) + '...'
                          : reportTitle
                      }
                      // 备选：使用用户输入
                      const userMessage = messages.find(msg => msg.role === 'user')
                      if (userMessage?.content) {
                        return userMessage.content.length > 20
                          ? userMessage.content.substring(0, 20) + '...'
                          : userMessage.content
                      }
                      return '查看完整报告'
                    })()}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 终止消息放在流程区末尾，保持在问答主区内部 */}
        {(isOutlineConfirmed || workflowNodes.length > 0 || loadingPhase === 'writing-content') && (
          <div className="termination-messages">
            {messages
              .filter(msg => msg.role === 'assistant' && msg.content.includes('任务已终止'))
              .map((msg, index) => (
                <div key={`terminated-${index}`} className="bubble assistant">
                  <div className="markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
          </div>
        )}
      </main>

      <form className="qa-input" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={
            messages.length === 0
              ? '请输入想要撰写的报告内容'
              : '继续输入新的报告要求...'
          }
          autoFocus
          disabled={isLoading}
        />
        {isLoading && loadingPhase === 'writing-content' ? (
          <button type="button" onClick={handleCancelWorkflow}>
            终止
          </button>
        ) : (
          <button type="submit" disabled={!input.trim() || isLoading}>
            {isLoading ? '生成中…' : '发送'}
          </button>
        )}
      </form>

      <ReportPreview
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        content={finalReport}
        title={reportTitle || '报告预览'}
        reportTitle={reportTitle}
      />
    </div>
  )
}
