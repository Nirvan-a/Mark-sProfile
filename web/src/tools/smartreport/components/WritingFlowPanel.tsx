import './WritingFlowPanel.css'
import type { ProcessSection } from './ProcessTimeline'
import { useRef, useEffect, useState } from 'react'
import previewIcon from '../assets/preview.svg'
import backIcon from '../assets/back.svg'

type GlobalStageKey = 'initialize' | 'planning' | 'loop' | 'complete' | 'terminated'

type SectionItem = {
  id: string
  l1?: string
  l2: string
  words?: number
}

type LogItem = {
  id: string
  time: string
  tag: string
  text: string
}

type ChapterData = {
  // 原有结构（向后兼容）
  prepare?: {
    queries: string[]
    results: any[]
    totalCount: number
  }
  collect?: {
    evaluation: string
    additionalQueries: string[]
    additionalResults: any[]
    additionalCount: number
  }
  // 新增字段（从后端 step_progress 事件的 data 字段）
  search_queries?: string[]  // 检索问句
  retrieval_results?: Array<{  // 检索结果
    source: string
    title: string
    url?: string
    snippet: string
    filename?: string  // 知识库结果可能有文件名
  }>
  filtered_results?: Array<{  // 筛选结果
    source: string
    title: string
    url?: string
    snippet: string
    filename?: string  // 知识库结果可能有文件名
  }>
  history_sections?: string[]  // 历史章节标题
  is_additional_retrieval?: boolean  // 是否为额外检索
  additional_search_queries?: string[]  // 额外检索问句
  additional_retrieval_results?: Array<{  // 额外检索结果
    source: string
    title: string
    url?: string
    snippet: string
    filename?: string  // 知识库结果可能有文件名
  }>
  additional_filtered_results?: Array<{  // 额外筛选结果
    source: string
    title: string
    url?: string
    snippet: string
    filename?: string  // 知识库结果可能有文件名
  }>
}

interface WritingFlowPanelProps {
  sections: SectionItem[]
  timelineSections: ProcessSection[]
  isLoading: boolean
  loadingPhase: 'generating-outline' | 'writing-content' | 'completed' | null
  globalStage: GlobalStageKey
  isTerminated?: boolean
  logs: LogItem[]
  progress: {
    done: number
    total: number
    finishedSections: number
    currentChapterIndex: number  // 当前正在处理的章节索引（0表示未开始或已完成，1表示第1章）
    overallProgress: number  // 总体进度百分比（0-100，包含所有阶段）
    progressDescription: string  // 当前进度描述文字
  }
  currentWords?: number
  chapterDataMap?: Record<number, ChapterData>  // 章节检索数据
  isInteractive?: boolean  // 是否允许交互（报告完成后为 true）
  className?: string
  reportTitle?: string  // 报告总标题
}


export function WritingFlowPanel({
  sections,
  timelineSections,
  isLoading,
  loadingPhase,
  globalStage,
  isTerminated = false,
  logs,
  progress,
  currentWords: _currentWords,  // 未使用，但保留接口完整性
  chapterDataMap = {},
  isInteractive = false,
  className,
  reportTitle = '',
}: WritingFlowPanelProps) {
  // 创建日志容器和章节列表容器的 ref，用于自动滚动
  const logBodyRef = useRef<HTMLDivElement>(null)
  const sectionListRef = useRef<HTMLDivElement>(null)
  
  // 手动选中的章节和阶段（用于交互，仅在报告完成后启用）
  const [selectedChapterIndex, setSelectedChapterIndex] = useState<number | null>(null)
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null)
  
  // 知识库片段弹窗状态
  const [kbModalOpen, setKbModalOpen] = useState(false)
  const [kbModalContent, setKbModalContent] = useState<{title: string, content: string} | null>(null)
  
  // 实时检索信息模块放大状态
  const [isDetailExpanded, setIsDetailExpanded] = useState(false)
  
  // 写作过程事件流模块放大状态
  const [isLogExpanded, setIsLogExpanded] = useState(false)
  
  // 创建流程阶段容器的 ref，用于自动滚动
  const phaseListRef = useRef<HTMLDivElement>(null)
  
  // 创建实时检索信息区域的 ref，用于自动滚动
  const detailContentRef = useRef<HTMLDivElement>(null)

  // 当日志更新时，自动滚动到底部
  useEffect(() => {
    if (logBodyRef.current) {
      logBodyRef.current.scrollTop = logBodyRef.current.scrollHeight
    }
  }, [logs])
  
  // 当报告完成（进入交互模式）时，自动选中最后一个章节
  useEffect(() => {
    if (isInteractive && selectedChapterIndex === null && sections.length > 0) {
      // 查找最后一个完成的章节
      for (let i = sections.length - 1; i >= 0; i--) {
        const chapterNum = i + 1
        if (chapterDataMap[chapterNum]) {
          setSelectedChapterIndex(chapterNum)
          break
        }
      }
    }
  }, [isInteractive, sections.length, chapterDataMap, selectedChapterIndex, progress.finishedSections, progress.currentChapterIndex])
  
  // 当前章节变化时，自动滚动到对应章节（仅在非交互模式下）
  useEffect(() => {
    if (!isInteractive && sectionListRef.current && progress.currentChapterIndex > 0) {
      const activeElement = sectionListRef.current.querySelector('.wf-section-item[data-state="active"]')
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [progress.currentChapterIndex, isInteractive])
  
  // 实时检索信息自动滚动到底部（仅在非交互模式且正在加载时）
  useEffect(() => {
    if (!isInteractive && isLoading && detailContentRef.current) {
      // 使用 requestAnimationFrame 确保 DOM 已更新
      requestAnimationFrame(() => {
        if (detailContentRef.current) {
          detailContentRef.current.scrollTop = detailContentRef.current.scrollHeight
        }
      })
    }
  }, [logs, chapterDataMap, isInteractive, isLoading])
  
  // 基于日志计算当前章节的4个阶段状态
  const getPhaseStates = () => {
    // 定义4个新阶段
    type PhaseKey = 'prepare' | 'initial_search' | 'reasoning_search' | 'writing'
    type PhaseState = 'hidden' | 'loading' | 'completed'
    
    const phases: Record<PhaseKey, { state: PhaseState; title: string }> = {
      prepare: { state: 'hidden', title: '准备阶段' },
      initial_search: { state: 'hidden', title: '初步检索' },
      reasoning_search: { state: 'hidden', title: '推理检索' },
      writing: { state: 'hidden', title: '撰写阶段' },
    }
    
    // 使用 displayChapterIndex（交互模式下为选中章节，否则为当前章节）
    const targetChapterIndex = displayChapterIndex
    
    // 如果没有目标章节，返回空状态
    if (targetChapterIndex === 0) {
      return phases
    }
    
    // 找到目标章节的日志范围
    const chineseNumbers = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
    const chapterName = targetChapterIndex <= 10 ? `第${chineseNumbers[targetChapterIndex]}` : `第${targetChapterIndex}`
    
    let currentChapterStartIndex = -1
    let currentChapterEndIndex = logs.length
    
    // 查找指定章节的日志范围
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i]
      
      // 找到目标章节的开始标记："正在准备第X章节资料"
      if (log.text.includes(`正在准备${chapterName}章节资料`)) {
        currentChapterStartIndex = i
      }
      
      // 找到下一章节的开始标记，作为当前章节的结束
      if (currentChapterStartIndex !== -1 && i > currentChapterStartIndex) {
      if (log.text.includes('正在准备') && log.text.includes('章节资料')) {
          currentChapterEndIndex = i
          break
        }
      }
    }
    
    // 如果没找到章节开始标记，返回空状态
    if (currentChapterStartIndex === -1) {
      return phases
    }
    
    // 提取当前章节的日志
    const currentChapterLogs = logs.slice(currentChapterStartIndex, currentChapterEndIndex)
    
    // 判断各阶段状态
    for (let i = 0; i < currentChapterLogs.length; i++) {
      const log = currentChapterLogs[i]
      
      // 1. 准备阶段：出现"正在准备第X章节资料..."
      if (log.text.includes('正在准备') && log.text.includes('章节资料')) {
        phases.prepare.state = 'loading'
      }
      
      // 2. 初步检索：出现"并行检索（知识库 + 联网）..."，准备阶段完成
      if (log.text.includes('并行检索') && (log.text.includes('知识库') || log.text.includes('联网'))) {
        phases.prepare.state = 'completed'
        phases.initial_search.state = 'loading'
      }
      
      // 3. 推理检索：出现"正在评估信息充足性"，初步检索完成
      if (log.text.includes('正在评估信息充足性')) {
        phases.initial_search.state = 'completed'
        phases.reasoning_search.state = 'loading'
      }
      
      // 4. 撰写阶段：出现"正在撰写章节内容..."，推理检索完成
      if (log.text.includes('正在撰写章节内容')) {
        phases.reasoning_search.state = 'completed'
        phases.writing.state = 'loading'
      }
      
      // 5. 全部完成：出现"章节保存完成"，撰写阶段完成
      if (log.text.includes('章节保存完成')) {
        phases.writing.state = 'completed'
      }
    }
    
    return phases
  }
  
  // 监听阶段变化，自动滚动到最新阶段
  useEffect(() => {
    if (!isInteractive && phaseListRef.current) {
      const loadingPhase = phaseListRef.current.querySelector('.wf-simple-phase[data-state="loading"]')
      if (loadingPhase) {
        loadingPhase.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [logs.length, isInteractive])
  
  // 基于日志提取当前章节的实时检索信息
  const getCurrentChapterRetrievalInfo = () => {
    // 使用 displayChapterIndex（交互模式下为选中章节，否则为当前章节）
    const targetChapterIndex = displayChapterIndex
    
    if (targetChapterIndex === 0) {
      return null // 还没有开始任何章节
    }
    
    // 查找指定章节的日志范围
    const chineseNumbers = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
    const chapterName = targetChapterIndex <= 10 ? `第${chineseNumbers[targetChapterIndex]}` : `第${targetChapterIndex}`
    
    let chapterStartIdx = -1
    let chapterEndIdx = logs.length
    
    // 查找目标章节的日志范围
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i]
      
      // 找到目标章节的开始标记
      if (log.text.includes(`正在准备${chapterName}章节资料`)) {
        chapterStartIdx = i
      }
      
      // 找到下一章节的开始标记，作为当前章节的结束
      if (chapterStartIdx !== -1 && i > chapterStartIdx) {
        if (log.text.includes('正在准备') && log.text.includes('章节资料')) {
          chapterEndIdx = i
        break
        }
      }
    }
    
    if (chapterStartIdx === -1) {
      return null // 没有找到目标章节的日志
    }
    
    // 提取目标章节的日志
    const chapterLogs = logs.slice(chapterStartIdx, chapterEndIdx)
    
    // 初始化信息结构
    const info = {
      queries: [] as string[],
      parallelResults: { web: 0, kb: 0 },
      filteredResults: { web: 0, kb: 0 },
      historyChapters: [] as string[],
      supplementQueries: [] as string[],
      supplementResults: { web: 0, kb: 0 },
      isWriting: false,
      isCompleted: false,
    }
    
    // 尝试从 chapterDataMap 获取真实数据
    if (targetChapterIndex > 0 && chapterDataMap[targetChapterIndex]) {
      const chapterData = chapterDataMap[targetChapterIndex]
      
      // 从数据中获取检索问句
      if (chapterData.search_queries && chapterData.search_queries.length > 0) {
        info.queries = chapterData.search_queries
      }
      
      // 从数据中获取检索结果
      if (chapterData.retrieval_results && chapterData.retrieval_results.length > 0) {
        const results = chapterData.retrieval_results
        info.parallelResults.web = results.filter((r: any) => r.source && (r.source.toLowerCase().includes('web') || r.url)).length
        info.parallelResults.kb = results.filter((r: any) => r.source && (r.source.toLowerCase().includes('knowledge') || r.source.toLowerCase().includes('kb')) && !r.url).length
      }
      
      // 从数据中获取筛选结果
      if (chapterData.filtered_results && chapterData.filtered_results.length > 0) {
        const results = chapterData.filtered_results
        info.filteredResults.web = results.filter((r: any) => r.source && (r.source.toLowerCase().includes('web') || r.url)).length
        info.filteredResults.kb = results.filter((r: any) => r.source && (r.source.toLowerCase().includes('knowledge') || r.source.toLowerCase().includes('kb')) && !r.url).length
      }
      
      // 从数据中获取历史章节 - 注释掉，只从日志解析获取
      // if (chapterData.history_sections && chapterData.history_sections.length > 0) {
      //   info.historyChapters = chapterData.history_sections
      // }
      
      // 从数据中获取补充检索问句
      if (chapterData.additional_search_queries && chapterData.additional_search_queries.length > 0) {
        info.supplementQueries = chapterData.additional_search_queries
      }
      
      // 从数据中获取补充检索结果
      if (chapterData.additional_retrieval_results && chapterData.additional_retrieval_results.length > 0) {
        const suppResults = chapterData.additional_retrieval_results
        info.supplementResults.web = suppResults.filter((r: any) => r.source && (r.source.toLowerCase().includes('web') || r.url)).length
        info.supplementResults.kb = suppResults.filter((r: any) => r.source && (r.source.toLowerCase().includes('knowledge') || r.source.toLowerCase().includes('kb')) && !r.url).length
      }
    }
    
    // 从日志中补充/覆盖信息
    for (const log of chapterLogs) {
      // 1. 检索问句：'已生成 X 个检索查询'（如果没有从 chapterDataMap 获取到）
      if (info.queries.length === 0) {
        const queryMatch = log.text.match(/已生成\s*(\d+)\s*个检索查询/)
        if (queryMatch) {
          const count = parseInt(queryMatch[1])
          info.queries = Array(count).fill(0).map((_, i) => `检索问句 ${i + 1}`)
        }
      }
      
      // 2. 并行检索结果：'并行检索完成，共 11 条结果'（如果没有从 chapterDataMap 获取到）
      if (info.parallelResults.web === 0 && info.parallelResults.kb === 0) {
        const parallelMatch = log.text.match(/并行检索完成，共\s*(\d+)\s*条结果/)
        if (parallelMatch) {
          const total = parseInt(parallelMatch[1])
          info.parallelResults.web = Math.ceil(total / 2)
          info.parallelResults.kb = Math.floor(total / 2)
        }
      }
      
      // 3. 筛选结果：'已筛选出 6 条高质量结果（从 11 条中）'
      if (info.filteredResults.web === 0 && info.filteredResults.kb === 0) {
        const filterMatch = log.text.match(/已筛选出\s*(\d+)\s*条高质量结果/)
        if (filterMatch) {
          const total = parseInt(filterMatch[1])
          info.filteredResults.web = Math.ceil(total / 2)
          info.filteredResults.kb = Math.floor(total / 2)
        }
      }
      
      // 4. 历史章节回顾：'已回顾 「XX」、「YY」 章节'
      const historyMatch = log.text.match(/已回顾\s*(.+?)\s*章节/)
      if (historyMatch) {
        const historyText = historyMatch[1]
        info.historyChapters = historyText.split('、').map(s => s.replace(/「|」/g, '').trim())
      }
      
      // 5. 补充检索：'信息不足，已补充检索 X 条'（如果没有从 chapterDataMap 获取到）
      if (info.supplementResults.web === 0 && info.supplementResults.kb === 0) {
        const supplementMatch = log.text.match(/已补充检索\s*(\d+)\s*条/)
        if (supplementMatch) {
          const total = parseInt(supplementMatch[1])
          info.supplementResults.web = Math.ceil(total / 2)
          info.supplementResults.kb = Math.floor(total / 2)
        }
      }
      
      // 6. 撰写状态：'正在撰写章节内容...'
      if (log.text.includes('正在撰写章节内容')) {
        info.isWriting = true
      }
      
      // 7. 完成状态：'章节保存完成'
      if (log.text.includes('章节保存完成')) {
        info.isCompleted = true
        info.isWriting = false
      }
    }
    
    return info
  }
  
  // 章节点击处理函数
  const handleChapterClick = (index: number) => {
    if (!isInteractive) return  // 只在报告完成后允许交互
    setSelectedChapterIndex(index + 1)  // index 从 0 开始，chapterIndex 从 1 开始
    setSelectedPhase(null)  // 重置选中的阶段
  }
  
  // 阶段点击处理函数
  const handlePhaseClick = (phase: string) => {
    if (!isInteractive) return  // 只在报告完成后允许交互
    setSelectedPhase(phase)
  }
  
  // 知识库结果点击处理函数
  const handleKbResultClick = (title: string, content: string) => {
    setKbModalContent({ title, content })
    setKbModalOpen(true)
  }

  const finishedCount = progress.finishedSections
  const currentChapterIndex = progress.currentChapterIndex
  const totalSections = sections.length

  // 使用新的细粒度进度系统
  const percent = Math.round(progress.overallProgress)
  const progressDescriptionText = progress.progressDescription
  
  // 计算当前展示的章节索引
  const displayChapterIndex = (() => {
    // 交互模式下，如果有手动选中的章节，使用选中的
    if (isInteractive && selectedChapterIndex !== null) {
      return selectedChapterIndex
    }
    // 如果 currentChapterIndex 为 0（报告完成后的状态），且有已完成的章节
    // 则默认显示最后一个完成的章节
    if (currentChapterIndex === 0 && finishedCount > 0) {
      return finishedCount
    }
    // 否则使用当前章节索引
    return currentChapterIndex
  })()

  const activeSection =
    timelineSections.find((s) => s.status === 'running') ||
    timelineSections.find((s) => s.status === 'pending') ||
    timelineSections[timelineSections.length - 1]
  const currentIndex = activeSection?.sectionIndex ?? 0
  
  // 使用 displayChapterIndex 获取展示的章节信息（交互模式下使用手动选中的）
  const displayIndex = displayChapterIndex > 0 ? displayChapterIndex - 1 : currentIndex
  const currentSectionMeta = sections[displayIndex] || sections[sections.length - 1] || { l2: '—', l1: '—' }
  const runningStep =
    activeSection?.steps.find((st) => st.status === 'running') ||
    activeSection?.steps.find((st) => st.status === 'completed') ||
    activeSection?.steps.find((st) => st.status === 'pending')
  // const currentStageText =
  //   isTerminated
  //     ? '已终止'
  //     : (runningStep?.title) ||
  //       (loadingPhase === 'generating-outline' ? '规划大纲中…' : '等待开始')

  const statusState = isTerminated
    ? 'terminated'
    : globalStage === 'complete'
      ? 'complete'
      : 'running'

  // 判断是否有数据更新（timelineSections 或 logs 有数据）
  const hasDataUpdate = timelineSections.length > 0 || logs.length > 0

  // 计算当前章节进度显示（使用 currentChapterIndex）
  const currentSectionDisplay = (() => {
    if (globalStage === 'complete' || (currentChapterIndex === 0 && finishedCount === totalSections)) {
      return totalSections // 全部完成
    }
    if (currentChapterIndex === 0) {
      return 0 // 还未开始
    }
    // 显示当前正在处理的章节号
    return currentChapterIndex
  })()

  // 使用从 SmartReport 传递的进度描述文本（已包含所有阶段的细粒度描述）
  // const progressDescription = progressDescriptionText

  return (
    <div className={`wf-panel ${className ?? ''}`}>
      <div className="wf-header">
        <div className="wf-header-left">
          <div className="wf-title">智能撰写面板</div>
          <div className="wf-tag">
            LangGraph Workflow
            {!hasDataUpdate && (
              <span className="wf-tag-spinner" />
            )}
          </div>
        </div>
        <div className="wf-status-chip" data-state={statusState}>
          <span className="wf-dot" />
          <span id="wf-header-status-text">
            {isTerminated
              ? '已终止'
              : globalStage === 'complete'
                ? '全部章节完成'
                : loadingPhase === 'generating-outline'
                  ? '规划大纲…'
                  : '撰写中…'}
          </span>
        </div>
      </div>

      <div className="wf-progress-wrapper">
        <div className="wf-progress-row">
          <div className="wf-progress-label">
            <strong id="wf-progress-main">全局进度</strong>
            <span id="wf-progress-sub">· 章节 {currentSectionDisplay} / {sections.length}</span>
          </div>
          <div id="wf-progress-percent">{percent}%</div>
        </div>
        <div className="wf-progress-bar">
          <div className="wf-progress-inner" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="wf-layout">
        <div className="wf-col-left">
          <div className="wf-section-list">
            <div className="wf-section-list-title">
              <span>章节写作进度</span>
            </div>
            <div className="wf-section-items" ref={sectionListRef}>
              {sections.map((s, idx) => {
                // 基于 currentChapterIndex 和 completedChapters 判断章节状态（与日志联动）
                // idx 从 0 开始，currentChapterIndex 从 1 开始
                const chapterNum = idx + 1
                
                // 确定章节状态
                const sectionState = (() => {
                  // 如果该章节已完成
                  if (idx < finishedCount) {
                    return 'done'
                  }
                  // 如果是当前正在处理的章节
                  // 注意：currentChapterIndex === 0 表示报告已完成，不应该有 active 状态
                  if (currentChapterIndex > 0 && chapterNum === currentChapterIndex) {
                    return 'active'
                  }
                  // 否则是等待状态
                  return 'pending'
                })()
                
                // 状态文本
                const statusText = (() => {
                  if (sectionState === 'done') {
                    return '已完成'
                  } else if (sectionState === 'active') {
                    return '进行中'
                  } else {
                    return '未开始'
                  }
                })()
                
                // 是否被手动选中
                const isSelected = isInteractive && selectedChapterIndex === chapterNum
                
                return (
                  <div 
                    className={`wf-section-item ${isSelected ? 'selected' : ''} ${isInteractive ? 'interactive' : ''}`}
                    data-state={sectionState} 
                    key={s.id || idx}
                    onClick={() => handleChapterClick(idx)}
                    style={{ cursor: isInteractive ? 'pointer' : 'default' }}
                  >
                    <div className="wf-section-index-badge">{idx + 1}</div>
                    <div className="wf-section-item-labels">
                      <div className="wf-section-l2">{s.l1}</div>
                      <div className="wf-section-l1">{reportTitle || ' '}</div>
                    </div>
                    <div className="wf-section-status">
                      {statusText}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="wf-col-right">
          <div className="wf-top">
            <div className="wf-timeline">
              <div className="wf-timeline-header">
                <div className="wf-timeline-header-left">
                  <div className="wf-timeline-label">当前章节内部流程</div>
                  <div className="wf-timeline-title" id="wf-current-l2">{currentSectionMeta.l1 || '—'}</div>
                  <div className="wf-timeline-sub" id="wf-current-l1">{reportTitle || '—'}</div>
                </div>
              </div>
              <div className="wf-phase-list" ref={phaseListRef}>
                {(() => {
                  const phaseStates = getPhaseStates()
                  const phaseOrder: Array<{ key: keyof ReturnType<typeof getPhaseStates>; icon: string }> = [
                    { key: 'prepare', icon: '◆' },
                    { key: 'initial_search', icon: '●' },
                    { key: 'reasoning_search', icon: '◇' },
                    { key: 'writing', icon: '◉' },
                  ]
                  
                  return phaseOrder.map((phase) => {
                    const phaseData = phaseStates[phase.key]
                    
                    // 只显示已触发的阶段（不是hidden状态）
                    if (phaseData.state === 'hidden') return null
                    
                    return (
                      <div 
                        className="wf-simple-phase"
                        data-state={phaseData.state}
                        key={phase.key}
                      >
                        <div className="wf-simple-phase-icon">{phase.icon}</div>
                        <div className="wf-simple-phase-title">{phaseData.title}</div>
                        <div className="wf-simple-phase-status">
                          {phaseData.state === 'loading' && (
                            <div className="wf-spinner"></div>
                          )}
                          {phaseData.state === 'completed' && (
                            <div className="wf-checkmark">✓</div>
                          )}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
              
              {/* 旧的详细phase-list（保留用于交互模式查看详情） */}
              <div className="wf-phase-list-detailed" style={{ display: 'none' }}>
                {[
                  { key: 'prepare', icon: '📚', label: '准备资料', node: 'prepare_section' },
                  { key: 'collect', icon: '🤔', label: '评估信息', node: 'collect_info' },
                  { key: 'writing', icon: '✍️', label: '撰写内容', node: 'writing' },
                  { key: 'save', icon: '✅', label: '保存完成', node: 'save_section' },
                ].map((phase) => {
                  // 使用 displayChapterIndex（交互模式下使用手动选中的章节）
                  const chapterIndex = displayChapterIndex
                  const isCurrentChapter = chapterIndex === currentIndex + 1
                  
                  // 状态判断
                  let phaseState: 'pending' | 'running' | 'completed' = 'pending'
                  
                  // 提取关键信息
                  let phaseInfo: string[] = []
                  let hasViewButton = false
                  
                  if (isCurrentChapter) {
                    const phaseLogs = logs.filter(log => log.tag === phase.node)
                    const hasCompleted = phaseLogs.some(log => 
                      log.text.includes('完成') || log.text.includes('✅') || log.text.includes('已生成') || log.text.includes('已入库')
                    )
                    const isRunning = phaseLogs.some(log => 
                      (log.text.includes('🔍') || log.text.includes('🤔') || log.text.includes('✍️') || log.text.includes('正在'))
                    ) && !hasCompleted
                    
                    if (hasCompleted) phaseState = 'completed'
                    else if (isRunning) phaseState = 'running'
                    
                    // 提取prepare_section的关键信息
                    if (phase.key === 'prepare') {
                      // 检索结果数量
                      const resultLog = phaseLogs.find(log => log.text.includes('已检索'))
                      if (resultLog) {
                        const match = resultLog.text.match(/已检索\s*(\d+)\s*条/)
                        if (match) {
                          phaseInfo.push(`检索到 ${match[1]} 条资料`)
                          hasViewButton = true
                        }
                      }
                      // 查询数量（从step_progress中提取）
                      const queryLog = phaseLogs.find(log => log.text.includes('个检索查询'))
                      if (queryLog) {
                        const match = queryLog.text.match(/(\d+)\s*个检索查询/)
                        if (match) {
                          phaseInfo.unshift(`生成 ${match[1]} 个问句`)
                        }
                      }
                      // 筛选结果
                      const filterLog = phaseLogs.find(log => log.text.includes('高质量结果'))
                      if (filterLog) {
                        const match = filterLog.text.match(/(\d+)\s*条高质量/)
                        if (match) {
                          phaseInfo.push(`筛选出 ${match[1]} 条`)
                        }
                      }
                    }
                    
                    // 提取collect_info的关键信息
                    if (phase.key === 'collect') {
                      const sufficientLog = phaseLogs.find(log => log.text.includes('信息充足'))
                      const insufficientLog = phaseLogs.find(log => log.text.includes('信息不足'))
                      
                      if (sufficientLog) {
                        phaseInfo.push('初步评估：信息充足')
                      } else if (insufficientLog) {
                        phaseInfo.push('初步评估：信息不足')
                        // 补充检索数量
                        const supplementLog = phaseLogs.find(log => log.text.includes('已补充检索'))
                        if (supplementLog) {
                          const match = supplementLog.text.match(/已补充检索\s*(\d+)\s*条/)
                          if (match) {
                            phaseInfo.push(`补充检索 ${match[1]} 条`)
                            hasViewButton = true
                          }
                        }
                      }
                    }
                    
                    // 提取writing的关键信息
                    if (phase.key === 'writing') {
                      const contentLog = phaseLogs.find(log => log.text.includes('已生成'))
                      if (contentLog) {
                        const match = contentLog.text.match(/已生成\s*(\d+)\s*字符/)
                        if (match) {
                          phaseInfo.push(`已生成 ${match[1]} 字符`)
                        }
                      } else if (phaseState === 'running') {
                        phaseInfo.push('AI 正在生成内容...')
                      }
                    }
                    
                    // 提取save_section的关键信息
                    if (phase.key === 'save') {
                      const saveLog = phaseLogs.find(log => log.text.includes('保存完成') || log.text.includes('已入库'))
                      if (saveLog) {
                        phaseInfo.push('章节与资料已入库')
                      }
                    }
                  } else if (chapterIndex > currentIndex + 1) {
                    // 之前的章节，所有阶段都完成
                    phaseState = 'completed'
                  }
                  
                  // 状态图标
                  const stateIcon = phaseState === 'completed' ? '✅' 
                    : phaseState === 'running' ? '🔄' 
                    : '⏸️'
                  
                  // 是否被选中
                  const isPhaseSelected = isInteractive && selectedPhase === phase.key
                  
                  return (
                    <div 
                      className={`wf-phase-item ${isPhaseSelected ? 'selected' : ''}`}
                      data-state={phaseState} 
                      key={phase.key}
                    >
                      <div className="wf-phase-header">
                        <div className="wf-phase-icon">{phase.icon}</div>
                        <div className="wf-phase-label">{phase.label}</div>
                        <div className="wf-phase-status">{stateIcon}</div>
                      </div>
                      {phaseInfo.length > 0 && (
                        <div className="wf-phase-info">
                          {phaseInfo.map((info, idx) => (
                            <div key={idx} className="wf-phase-info-item">
                              <span className="wf-phase-info-dot">·</span>
                              <span className="wf-phase-info-text">{info}</span>
                            </div>
                          ))}
                          {hasViewButton && phaseState === 'completed' && isInteractive && (
                            <button 
                              className="wf-phase-view-btn"
                              onClick={() => handlePhaseClick(phase.key)}
                            >
                              👁️ 查看详情
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div 
              className={`wf-detail ${isDetailExpanded ? 'wf-detail-expanded' : ''}`}
              onClick={(e) => {
                // 点击背景遮罩关闭
                if (isDetailExpanded && e.target === e.currentTarget) {
                  setIsDetailExpanded(false)
                }
              }}
            >
              <div 
                className="wf-detail-inner"
                onClick={(e) => e.stopPropagation()}
              >
              <div className="wf-detail-header">
                <div className="wf-detail-header-title">
                  {isInteractive && selectedPhase ? '检索详情' : '实时检索信息'}
                </div>
                  <div className="wf-detail-header-actions">
                <div className="wf-detail-header-step">
                      {isInteractive ? '已完成' : (
                        isTerminated ? '已终止' :
                        globalStage === 'complete' ? '已完成' :
                        '进行中'
                      )}
                    </div>
                    <button 
                      className="wf-detail-expand-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsDetailExpanded(!isDetailExpanded)
                      }}
                      title={isDetailExpanded ? '缩小' : '放大'}
                    >
                      <img src={isDetailExpanded ? backIcon : previewIcon} alt={isDetailExpanded ? '缩小' : '放大'} />
                    </button>
                </div>
              </div>

              {(() => {
                // 交互模式：显示选中阶段的详细信息
                if (isInteractive && selectedPhase && displayChapterIndex > 0) {
                  const chapterData = chapterDataMap[displayChapterIndex]
                  
                  // 准备资料阶段详情
                  if (selectedPhase === 'prepare' && chapterData?.prepare) {
                    const { queries, results, totalCount } = chapterData.prepare
                    const webResults = results.filter(r => r.source === 'web')
                    const kbResults = results.filter(r => r.source === 'kb' || r.source === 'knowledge_base')
                    
                    return (
                      <div className="wf-detail-content">
                        {/* 检索问句 */}
                        {queries && queries.length > 0 && (
                          <div className="wf-detail-section">
                            <div className="wf-detail-section-title">📝 检索问句 ({queries.length}个)</div>
                            <div className="wf-detail-queries">
                              {queries.map((q, idx) => (
                                <div key={idx} className="wf-detail-query-item">
                                  <span className="wf-detail-query-num">{idx + 1}.</span>
                                  <span className="wf-detail-query-text">{q}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* 检索结果统计 */}
                        <div className="wf-detail-section">
                          <div className="wf-detail-section-title">🔍 检索结果 (共{totalCount}条)</div>
                          <div className="wf-detail-stats">
                            <div className="wf-detail-stat-item">
                              <div className="wf-detail-stat-value">{webResults.length}</div>
                              <div className="wf-detail-stat-label">联网</div>
                            </div>
                            <div className="wf-detail-stat-item">
                              <div className="wf-detail-stat-value">{kbResults.length}</div>
                              <div className="wf-detail-stat-label">知识库</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* 联网结果 */}
                        {webResults.length > 0 && (
                          <div className="wf-detail-section">
                            <div className="wf-detail-section-subtitle">
                              <span className="wf-detail-source-badge web">联网</span>
                              {webResults.length} 条结果
                            </div>
                            <div className="wf-detail-results-list">
                              {webResults.slice(0, 10).map((r, idx) => (
                                <div key={idx} className="wf-detail-result-item">
                                  <div className="wf-detail-result-header">
                                    <span className="wf-detail-result-index">{idx + 1}</span>
                                    <span className="wf-detail-result-title">{r.title || '无标题'}</span>
                                  </div>
                                  {r.url && (
                                    <div className="wf-detail-result-meta">
                                      <span className="wf-detail-result-url">{r.url}</span>
                                      <a 
                                        href={r.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="wf-detail-result-link"
                                      >
                                        🔗 跳转
                                      </a>
                                    </div>
                                  )}
                                  {r.content && (
                                    <div className="wf-detail-result-snippet">{r.content.slice(0, 150)}...</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* 知识库结果 */}
                        {kbResults.length > 0 && (
                          <div className="wf-detail-section">
                            <div className="wf-detail-section-subtitle">
                              <span className="wf-detail-source-badge kb">知识库</span>
                              {kbResults.length} 条结果
                            </div>
                            <div className="wf-detail-results-list">
                              {kbResults.slice(0, 10).map((r, idx) => (
                                <div key={idx} className="wf-detail-result-item">
                                  <div className="wf-detail-result-header">
                                    <span className="wf-detail-result-index">{idx + 1}</span>
                                    <span className="wf-detail-result-title">{r.title || r.file_name || '无标题'}</span>
                                  </div>
                                  {r.content && (
                                    <div className="wf-detail-result-snippet">{r.content.slice(0, 150)}...</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {totalCount === 0 && (
                          <div className="wf-detail-empty">暂无检索结果</div>
                        )}
                      </div>
                    )
                  }
                  
                  // 评估信息阶段详情
                  if (selectedPhase === 'collect' && chapterData?.collect) {
                    const { evaluation, additionalQueries, additionalResults, additionalCount } = chapterData.collect
                    const webResults = additionalResults.filter(r => r.source === 'web')
                    const kbResults = additionalResults.filter(r => r.source === 'kb' || r.source === 'knowledge_base')
                    
                    return (
                      <div className="wf-detail-content">
                        {/* 评估结果 */}
                        <div className="wf-detail-section">
                          <div className="wf-detail-section-title">📊 评估结果</div>
                          <div className={`wf-detail-eval-badge ${evaluation.includes('充足') ? 'sufficient' : 'insufficient'}`}>
                            {evaluation}
                          </div>
                        </div>
                        
                        {/* 补充检索问句 */}
                        {additionalQueries && additionalQueries.length > 0 && (
                          <div className="wf-detail-section">
                            <div className="wf-detail-section-title">📝 补充检索问句 ({additionalQueries.length}个)</div>
                            <div className="wf-detail-queries">
                              {additionalQueries.map((q, idx) => (
                                <div key={idx} className="wf-detail-query-item">
                                  <span className="wf-detail-query-num">{idx + 1}.</span>
                                  <span className="wf-detail-query-text">{q}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* 补充检索结果 */}
                        {additionalCount > 0 && (
                          <>
                            <div className="wf-detail-section">
                              <div className="wf-detail-section-title">🔍 补充检索结果 (共{additionalCount}条)</div>
                              <div className="wf-detail-stats">
                                <div className="wf-detail-stat-item">
                                  <div className="wf-detail-stat-value">{webResults.length}</div>
                                  <div className="wf-detail-stat-label">联网</div>
                                </div>
                                <div className="wf-detail-stat-item">
                                  <div className="wf-detail-stat-value">{kbResults.length}</div>
                                  <div className="wf-detail-stat-label">知识库</div>
                                </div>
                              </div>
                            </div>
                            
                            {/* 联网补充结果 */}
                            {webResults.length > 0 && (
                              <div className="wf-detail-section">
                                <div className="wf-detail-section-subtitle">
                                  <span className="wf-detail-source-badge web">联网</span>
                                  {webResults.length} 条结果
                                </div>
                                <div className="wf-detail-results-list">
                                  {webResults.slice(0, 10).map((r, idx) => (
                                    <div key={idx} className="wf-detail-result-item">
                                      <div className="wf-detail-result-header">
                                        <span className="wf-detail-result-index">{idx + 1}</span>
                                        <span className="wf-detail-result-title">{r.title || '无标题'}</span>
                                      </div>
                                      {r.url && (
                                        <div className="wf-detail-result-meta">
                                          <span className="wf-detail-result-url">{r.url}</span>
                                          <a 
                                            href={r.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="wf-detail-result-link"
                                          >
                                            🔗 跳转
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* 知识库补充结果 */}
                            {kbResults.length > 0 && (
                              <div className="wf-detail-section">
                                <div className="wf-detail-section-subtitle">
                                  <span className="wf-detail-source-badge kb">知识库</span>
                                  {kbResults.length} 条结果
                                </div>
                                <div className="wf-detail-results-list">
                                  {kbResults.slice(0, 10).map((r, idx) => (
                                    <div key={idx} className="wf-detail-result-item">
                                      <div className="wf-detail-result-header">
                                        <span className="wf-detail-result-index">{idx + 1}</span>
                                        <span className="wf-detail-result-title">{r.title || r.file_name || '无标题'}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        
                        {additionalCount === 0 && !additionalQueries?.length && (
                          <div className="wf-detail-empty">无需补充检索</div>
                        )}
                      </div>
                    )
                  }
                  
                  // 其他阶段或没有数据
                  return (
                    <div className="wf-detail-content">
                      <div className="wf-detail-empty">
                        {selectedPhase === 'writing' ? '撰写内容阶段无检索详情' :
                         selectedPhase === 'save' ? '保存完成阶段无检索详情' :
                         '暂无数据，请等待报告完成后查看'}
                      </div>
                    </div>
                  )
                }
                
                // 实时模式：基于日志展示检索信息
                const retrievalInfo = getCurrentChapterRetrievalInfo()
                
                // 如果没有信息，显示等待状态
                if (!retrievalInfo) {
                  return (
                    <div className="wf-detail-content">
                      <div className="wf-detail-empty">
                        <div className="wf-detail-empty-icon">⏳</div>
                        <div className="wf-detail-empty-text">等待章节开始...</div>
                      </div>
                    </div>
                  )
                }
                
                // 渐进式展示检索信息（使用 displayChapterIndex）
                const currentChapterData = displayChapterIndex > 0 ? chapterDataMap[displayChapterIndex] : null
                
                return (
                  <div className="wf-detail-content" ref={detailContentRef}>
                    {/* 1. 检索问句 */}
                    {retrievalInfo.queries.length > 0 && (
                      <div className="wf-retrieval-section">
                        <div className="wf-retrieval-title">
                          检索问句 ({retrievalInfo.queries.length}个)
                        </div>
                        <div className="wf-tag-flow">
                          {retrievalInfo.queries.map((q, idx) => (
                            <div key={idx} className="wf-tag wf-tag-result wf-tag-query-text">
                              {q}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* 2. 并行检索结果 */}
                    {currentChapterData?.retrieval_results && currentChapterData.retrieval_results.length > 0 && (
                      <div className="wf-retrieval-section">
                        <div className="wf-retrieval-title">
                          并行检索结果 (共{currentChapterData.retrieval_results.length}条)
                        </div>
                        <div className="wf-tag-flow">
                          {[...currentChapterData.retrieval_results]
                            .sort((a, b) => {
                              // 知识库（无url）排前面，网页（有url）排后面
                              const aIsKb = !a.url
                              const bIsKb = !b.url
                              if (aIsKb && !bIsKb) return -1
                              if (!aIsKb && bIsKb) return 1
                              return 0
                            })
                            .map((result, idx) => {
                              // 知识库结果显示文档名，联网结果显示标题
                              const displayText = result.url 
                                ? (result.title || result.snippet?.substring(0, 20) + '...' || '无标题')
                                : (result.filename || result.title || '知识库文档')
                              return (
                              <div 
                                key={idx} 
                                className={`wf-tag wf-tag-result ${result.url ? 'wf-tag-web' : 'wf-tag-kb'}`}
                                title={result.snippet}
                                onClick={result.url 
                                  ? () => window.open(result.url, '_blank') 
                                  : () => handleKbResultClick(displayText, result.snippet || '')}
                                style={{ cursor: 'pointer' }}
                              >
                                {displayText}
                              </div>
                              )
                            })}
                        </div>
                      </div>
                    )}
                    
                    {/* 3. 筛选后的高质量结果 */}
                    {currentChapterData?.filtered_results && currentChapterData.filtered_results.length > 0 && (
                      <div className="wf-retrieval-section highlight">
                        <div className="wf-retrieval-title">
                          筛选结果 (共{currentChapterData.filtered_results.length}条高质量)
                        </div>
                        <div className="wf-tag-flow">
                          {[...currentChapterData.filtered_results]
                            .sort((a, b) => {
                              // 知识库（无url）排前面，网页（有url）排后面
                              const aIsKb = !a.url
                              const bIsKb = !b.url
                              if (aIsKb && !bIsKb) return -1
                              if (!aIsKb && bIsKb) return 1
                              return 0
                            })
                            .map((result, idx) => {
                              // 知识库结果显示文档名，联网结果显示标题
                              const displayText = result.url 
                                ? (result.title || result.snippet?.substring(0, 20) + '...' || '无标题')
                                : (result.filename || result.title || '知识库文档')
                              return (
                              <div 
                                key={idx} 
                                className={`wf-tag wf-tag-result ${result.url ? 'wf-tag-web' : 'wf-tag-kb'}`}
                                title={result.snippet}
                                onClick={result.url 
                                  ? () => window.open(result.url, '_blank') 
                                  : () => handleKbResultClick(displayText, result.snippet || '')}
                                style={{ cursor: 'pointer' }}
                              >
                                {displayText}
                              </div>
                              )
                            })}
                        </div>
                      </div>
                    )}
                    
                    {/* 4. 历史章节回顾 */}
                    {retrievalInfo.historyChapters.length > 0 && (
                      <div className="wf-retrieval-section">
                        <div className="wf-retrieval-title">
                          历史章节回顾
                        </div>
                        <div className="wf-tag-flow">
                          {retrievalInfo.historyChapters.map((chapter, idx) => (
                            <div key={idx} className="wf-tag wf-tag-result wf-tag-history-text">
                              {chapter}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* 5. 补充检索（信息不足） */}
                    {currentChapterData?.is_additional_retrieval && (
                      <>
                        {currentChapterData.additional_search_queries && currentChapterData.additional_search_queries.length > 0 && (
                          <div className="wf-retrieval-section supplement">
                            <div className="wf-retrieval-title">
                              补充检索问句 ({currentChapterData.additional_search_queries.length}个)
                            </div>
                            <div className="wf-tag-flow">
                              {currentChapterData.additional_search_queries.map((q, idx) => (
                                <div key={idx} className="wf-tag wf-tag-result wf-tag-supplement-query">
                                  {q}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {currentChapterData.additional_retrieval_results && currentChapterData.additional_retrieval_results.length > 0 && (
                          <div className="wf-retrieval-section supplement">
                            <div className="wf-retrieval-title">
                              补充检索结果 (共{currentChapterData.additional_retrieval_results.length}条)
                            </div>
                            <div className="wf-tag-flow">
                              {[...currentChapterData.additional_retrieval_results]
                                .sort((a, b) => {
                                  // 知识库（无url）排前面，网页（有url）排后面
                                  const aIsKb = !a.url
                                  const bIsKb = !b.url
                                  if (aIsKb && !bIsKb) return -1
                                  if (!aIsKb && bIsKb) return 1
                                  return 0
                                })
                                .map((result, idx) => {
                                  // 知识库结果显示文档名，联网结果显示标题
                                  const displayText = result.url 
                                    ? (result.title || result.snippet?.substring(0, 20) + '...' || '无标题')
                                    : (result.filename || result.title || '知识库文档')
                                  return (
                                  <div 
                                    key={idx} 
                                    className={`wf-tag wf-tag-result ${result.url ? 'wf-tag-web' : 'wf-tag-kb'}`}
                                    title={result.snippet}
                                    onClick={result.url 
                                      ? () => window.open(result.url, '_blank') 
                                      : () => handleKbResultClick(displayText, result.snippet || '')}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    {displayText}
                                  </div>
                                  )
                                })}
                            </div>
                          </div>
                        )}
                        
                        {currentChapterData.additional_filtered_results && currentChapterData.additional_filtered_results.length > 0 && (
                          <div className="wf-retrieval-section supplement highlight">
                            <div className="wf-retrieval-title">
                              补充筛选结果 (共{currentChapterData.additional_filtered_results.length}条高质量)
                            </div>
                            <div className="wf-tag-flow">
                              {[...currentChapterData.additional_filtered_results]
                                .sort((a, b) => {
                                  // 知识库（无url）排前面，网页（有url）排后面
                                  const aIsKb = !a.url
                                  const bIsKb = !b.url
                                  if (aIsKb && !bIsKb) return -1
                                  if (!aIsKb && bIsKb) return 1
                                  return 0
                                })
                                .map((result, idx) => {
                                  // 知识库结果显示文档名，联网结果显示标题
                                  const displayText = result.url 
                                    ? (result.title || result.snippet?.substring(0, 20) + '...' || '无标题')
                                    : (result.filename || result.title || '知识库文档')
                                  return (
                                  <div 
                                    key={idx} 
                                    className={`wf-tag wf-tag-result ${result.url ? 'wf-tag-web' : 'wf-tag-kb'}`}
                                    title={result.snippet}
                                    onClick={result.url 
                                      ? () => window.open(result.url, '_blank') 
                                      : () => handleKbResultClick(displayText, result.snippet || '')}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    {displayText}
                                  </div>
                                  )
                                })}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* 6. 撰写状态 */}
                    {retrievalInfo.isWriting && (
                      <div className="wf-retrieval-section">
                        <div className="wf-retrieval-title">
                          正在撰写中...
                          <div className="wf-spinner-small"></div>
                        </div>
                      </div>
                    )}
                    
                    {/* 7. 完成状态 */}
                    {retrievalInfo.isCompleted && (
                      <div className="wf-retrieval-section">
                        <div className="wf-retrieval-title wf-retrieval-title-completed">
                          撰写完成
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
              </div>
            </div>
          </div>

          <div 
            className={`wf-log ${isLogExpanded ? 'wf-log-expanded' : ''}`}
            onClick={(e) => {
              // 点击背景遮罩关闭
              if (isLogExpanded && e.target === e.currentTarget) {
                setIsLogExpanded(false)
              }
            }}
          >
            <div 
              className="wf-log-inner"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="wf-log-header">
              <div className="wf-log-title">写作过程事件流</div>
                <div className="wf-log-header-actions">
              <div className="wf-log-status" id="wf-log-status" data-loading={isLoading}>
                {isLoading ? (
                  <>
                    <span className="wf-log-spinner"></span>
                    <span>streaming...</span>
                  </>
                ) : (
                  'idle'
                )}
                  </div>
                  <button 
                    className="wf-log-expand-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsLogExpanded(!isLogExpanded)
                    }}
                    title={isLogExpanded ? '缩小' : '放大'}
                  >
                    <img src={isLogExpanded ? backIcon : previewIcon} alt={isLogExpanded ? '缩小' : '放大'} />
                  </button>
              </div>
            </div>
            <div className="wf-log-body" ref={logBodyRef}>
              {logs.map((log) => (
                <div className="wf-log-line" key={log.id}>
                  <div className="wf-log-time">{log.time}</div>
                  <div className="wf-log-text">
                    <span className="wf-log-tag">[{log.tag}] </span>
                    {log.text}
                  </div>
                </div>
              ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 知识库片段弹窗 */}
      {kbModalOpen && kbModalContent && (
        <div className="wf-kb-modal-overlay" onClick={() => setKbModalOpen(false)}>
          <div className="wf-kb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wf-kb-modal-header">
              <h3 className="wf-kb-modal-title">{kbModalContent.title}</h3>
              <button className="wf-kb-modal-close" onClick={() => setKbModalOpen(false)}>
                ✕
              </button>
            </div>
            <div className="wf-kb-modal-body">
              <pre className="wf-kb-modal-content">{kbModalContent.content}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}






