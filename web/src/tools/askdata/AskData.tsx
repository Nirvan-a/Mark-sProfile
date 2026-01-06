import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import characterImg from './assets/character.png'
import editIcon from './assets/Edit2.svg'
import playMusicIcon from './assets/playmusic.svg'
import springFlowers from './assets/Spring Flowers.mp3'
import concerto from './assets/Concerto.mp3'
import sunsetLandscape from './assets/Sunset Landscape.mp3'
import { PromptEditor } from './PromptEditor'
import { getCurrentPrompts } from './prompts'
import { formatDuration, stringifyResult, truncate } from '../../shared/utils/format'
import { HomeButton } from '../../shared/components'
import {
  analyzeExcel,
  executeCode,
  generateCode,
  summarizeResult,
  type AnalysisResult,
} from './api'
import './AskData.css'

type Message = {
  role: 'user' | 'assistant'
  content: string
  history?: LoadingRecord[]
}

type UploadedExcelMeta = {
  name: string
  size: number
  uploadedAt: number
}

// AnalysisResult 类型已从 api.ts 导入

type ExecutionLog = {
  attempt: number
  code: string
  success: boolean
  result?: unknown
  stdout?: string
  error?: string
}

const MAX_ATTEMPTS = 3

const MUSIC_TRACKS = [
  { name: 'Spring Flowers', src: springFlowers },
  { name: 'Concerto', src: concerto },
  { name: 'Sunset Landscape', src: sunsetLandscape },
]

// 工具函数已从 shared/utils/format 导入

const buildHistoryText = (logs: ExecutionLog[]) => {
  if (!logs.length) return '（暂无历史记录）'
  return logs
    .map(
      (log) =>
        `第${log.attempt}次尝试（${log.success ? '成功' : '失败'}）
${log.success ? `结果：${truncate(stringifyResult(log.result), 800)}` : `错误：${log.error || '未知错误'}`}`
    )
    .join('\n---\n')
}

const buildFailureMessage = (reason: string) =>
  `❌ 查询失败：${reason}

请重新描述问题或重新上传表格后再试。`

type LoadingPhase = 'querying' | 'summarizing' | 'completed' | null
type LoadingRecord = { label: string; duration: number }

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

  const isActive = phase === 'querying' || phase === 'summarizing'
  const isCompleted = phase === 'completed'

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
            {isCompleted ? '总耗时' : '已用时'} {formatDuration(duration)}
          </p>
        </div>
      </div>
    </div>
  )
}

const ResultHistory = ({ records }: { records?: LoadingRecord[] }) => {
  if (!records?.length) return null
  return (
    <div className="loading-history">
      {records.map((record, index) => (
        <div key={`${record.label}-${index}`} className="loading-history-item">
          <span>{record.label}</span>
          <span>{formatDuration(record.duration)}</span>
        </div>
      ))}
    </div>
  )
}

function App() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [excelMeta, setExcelMeta] = useState<UploadedExcelMeta | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  )
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [canAsk, setCanAsk] = useState(false)
  const [storedFilePath, setStoredFilePath] = useState('')
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>(null)
  const [loadingDuration, setLoadingDuration] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [contextEnabled, setContextEnabled] = useState(false)
  const [contextHistory, setContextHistory] = useState<Array<{ question: string; answer: string }>>([])
  const [isMusicPlaying, setIsMusicPlaying] = useState(true)
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [isMusicMenuOpen, setIsMusicMenuOpen] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isMusicPlayingRef = useRef(isMusicPlaying)
  const interactionHandlerRef = useRef<(() => void) | null>(null)

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
    // 只有在有消息时才自动滚动到底部，避免初始状态时滚动导致上传组件被滑上去
    if (chatContainerRef.current && messages.length > 0) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages, loadingPhase])

  useEffect(() => {
    isMusicPlayingRef.current = isMusicPlaying
  }, [isMusicPlaying])

  const attachInteractionListener = useCallback(() => {
    if (interactionHandlerRef.current) return
    const handler = () => {
      if (audioRef.current) {
        audioRef.current.play().then(() => setIsMusicPlaying(true))
      }
      document.removeEventListener('pointerdown', handler)
      interactionHandlerRef.current = null
    }
    interactionHandlerRef.current = handler
    document.addEventListener('pointerdown', handler, { once: true })
  }, [])

  const tryPlayAudio = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio
      .play()
      .then(() => setIsMusicPlaying(true))
      .catch(() => {
        setIsMusicPlaying(false)
        attachInteractionListener()
      })
  }, [attachInteractionListener])

  useEffect(() => {
    const audio = new Audio(MUSIC_TRACKS[currentTrackIndex].src)
    audio.loop = false
    audioRef.current = audio

    const handleEnded = () => {
      setCurrentTrackIndex((prev) => (prev + 1) % MUSIC_TRACKS.length)
    }

    audio.addEventListener('ended', handleEnded)

    if (isMusicPlayingRef.current) {
      tryPlayAudio()
    }

    return () => {
      audio.pause()
      audio.removeEventListener('ended', handleEnded)
    }
  }, [currentTrackIndex, tryPlayAudio])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isMusicPlaying) {
      tryPlayAudio()
    } else {
      audio.pause()
    }
  }, [isMusicPlaying, tryPlayAudio])


  useEffect(() => {
    return () => {
      if (interactionHandlerRef.current) {
        document.removeEventListener('pointerdown', interactionHandlerRef.current)
        interactionHandlerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const preventGlobalPullToRefresh = (event: TouchEvent) => {
      const target = event.target as HTMLElement | null
      const scrollableArea = target?.closest('.qa-chat')
      if (!scrollableArea) {
        event.preventDefault()
      }
    }
    document.addEventListener('touchmove', preventGlobalPullToRefresh, {
      passive: false,
    })
    return () => {
      document.removeEventListener('touchmove', preventGlobalPullToRefresh)
    }
  }, [])

  const handleAsk = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!input.trim() || isLoading) return
    if (!analysisResult?.sheets || !storedFilePath) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '请先上传并成功解析 Excel 文件。',
        },
      ])
      return
    }

    const question = input.trim()
    setMessages((prev) => [...prev, { role: 'user', content: question }])
    setInput('')
    setIsLoading(true)
    setLoadingPhase('querying')
    setLoadingMessage('正在查询数据结果')
    setLoadingDuration(0)
    const localHistory: LoadingRecord[] = []
    const addHistoryRecord = (label: string, duration: number) => {
      localHistory.push({ label, duration })
    }
    let workingLogs: ExecutionLog[] = []
    let successContent = ''
    let executionResult: unknown = null
    let failureReason = ''
    let historyText = buildHistoryText(workingLogs)
    let queryStartTime = Date.now()

    // 获取当前使用的提示词
    const currentPrompts = getCurrentPrompts()
    
    // 如果开启上下文，拼接历史问题-答案到 user_prompt
    let userPrompt = currentPrompts.codeGeneration.user
    if (contextEnabled && contextHistory.length > 0) {
      const contextText = contextHistory
        .map((item) => `历史问题：${item.question} 历史答案：${item.answer}`)
        .join('；')
      userPrompt = `${userPrompt}\n\n${contextText}`
    }

    try {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const codeData = await generateCode({
          question,
          file_path: storedFilePath,
          sheets: analysisResult.sheets,
          history: historyText,
          custom_system_prompt: currentPrompts.codeGeneration.system,
          custom_user_prompt: userPrompt,
        })

        const execData = await executeCode({ code: codeData.code })

        const innerErrorMessage =
          execData?.result &&
          typeof execData.result === 'object' &&
          execData.result !== null &&
          'errorMessage' in execData.result
            ? (execData.result as { errorMessage?: string }).errorMessage
            : undefined
        const outerErrorMessage = execData.errorMessage
        const absoluteAttempt = workingLogs.length + 1
        const successThisRound = !outerErrorMessage && !innerErrorMessage
        const attemptError =
          (outerErrorMessage || innerErrorMessage) ?? undefined

        const logEntry: ExecutionLog = {
          attempt: absoluteAttempt,
          code: successThisRound ? codeData.code : '',
          success: successThisRound,
          result: successThisRound ? execData.result : undefined,
          stdout: successThisRound ? execData.stdout : undefined,
          error: attemptError,
        }
        workingLogs = [...workingLogs, logEntry]

        if (successThisRound) {
          executionResult = execData.result
          const queryDuration = Math.floor((Date.now() - queryStartTime) / 1000)
          addHistoryRecord('查询结果完毕', queryDuration)
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: '', history: [...localHistory] },
          ])
          setLoadingPhase('summarizing')
          setLoadingMessage('正在整理数据结果')
          setLoadingDuration(0)
          break
        } else {
          failureReason = attemptError || '未知错误'
          historyText = buildHistoryText(workingLogs)
          if (attempt === MAX_ATTEMPTS) {
            const queryDuration = Math.floor((Date.now() - queryStartTime) / 1000)
            setLoadingDuration(queryDuration)
            setLoadingMessage('查询失败')
            setLoadingPhase('completed')
            addHistoryRecord('查询失败', queryDuration)
            await new Promise((resolve) => setTimeout(resolve, 800))
          }
        }
      }
    } catch (error) {
      failureReason =
        (error as Error)?.message || '调用模型或执行代码时出现异常'
      const queryDuration = Math.floor((Date.now() - queryStartTime) / 1000)
      setLoadingDuration(queryDuration)
      setLoadingMessage('查询失败')
      setLoadingPhase('completed')
      addHistoryRecord('查询失败', queryDuration)
      await new Promise((resolve) => setTimeout(resolve, 800))
    } finally {
      if (executionResult) {
        const summarizeStartTime = Date.now()
        try {
          const summaryData = await summarizeResult({
            question,
            result: executionResult,
            custom_system_prompt: currentPrompts.summarization.system,
            custom_user_prompt: currentPrompts.summarization.user,
          })
          if (!summaryData.markdown) {
            throw new Error('生成总结失败')
          }
          const summarizeDuration = Math.floor(
            (Date.now() - summarizeStartTime) / 1000
          )
          successContent = summaryData.markdown
          addHistoryRecord('数据整理完毕', summarizeDuration)
          setLoadingDuration(summarizeDuration)
          setLoadingMessage('数据整理完毕')
          setLoadingPhase('completed')
          await new Promise((resolve) => setTimeout(resolve, 800))
          setMessages((prev) => {
            const updated = [...prev]
            const lastIndex = updated.length - 1
            if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
              updated[lastIndex] = {
                ...updated[lastIndex],
                content: successContent,
                history: [...localHistory],
              }
            }
            return updated
          })
          // 如果开启上下文，记录成功的问题-答案对
          if (contextEnabled) {
            setContextHistory((prev) => {
              const newHistory = [...prev, { question, answer: successContent }]
              // 最多保留3条记录，循环更新
              return newHistory.slice(-3)
            })
          }
        } catch (error) {
          const summarizeDuration = Math.floor(
            (Date.now() - summarizeStartTime) / 1000
          )
          addHistoryRecord('整理失败', summarizeDuration)
          setLoadingDuration(summarizeDuration)
          setLoadingMessage('整理失败')
          setLoadingPhase('completed')
          await new Promise((resolve) => setTimeout(resolve, 800))
          setMessages((prev) => {
            const updated = [...prev]
            const lastIndex = updated.length - 1
            if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
              updated[lastIndex] = {
                ...updated[lastIndex],
                content: buildFailureMessage(
                  (error as Error)?.message || '结果总结失败，请稍后再试'
                ),
                history: [...localHistory],
              }
            }
            return updated
          })
          // 如果开启上下文，记录失败的问题-答案对
          if (contextEnabled) {
            setContextHistory((prev) => {
              const newHistory = [
                ...prev,
                { question, answer: '超过三轮回答失败' },
              ]
              // 最多保留3条记录，循环更新
              return newHistory.slice(-3)
            })
          }
        }
      } else {
        const failureMessage = buildFailureMessage(
          failureReason || '请稍后再试或检查上传的文件'
        )
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: failureMessage,
            history: localHistory.length ? [...localHistory] : undefined,
          },
        ])
        // 如果开启上下文，记录失败的问题-答案对
        if (contextEnabled) {
          setContextHistory((prev) => {
            const newHistory = [
              ...prev,
              { question, answer: '超过三轮回答失败' },
            ]
            // 最多保留3条记录，循环更新
            return newHistory.slice(-3)
          })
        }
      }
      setIsLoading(false)
      setLoadingPhase(null)
    }
  }

  const toggleMusic = () => {
    setIsMusicPlaying((prev) => !prev)
  }

  const handleTrackSelect = (index: number) => {
    setCurrentTrackIndex(index)
    setIsMusicPlaying(true)
    setIsMusicMenuOpen(false)
  }

  const handleMusicEnter = () => setIsMusicMenuOpen(true)
  const handleMusicLeave = () => setIsMusicMenuOpen(false)

  const formatBytes = (size: number) => {
    if (!size) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB']
    const index = Math.min(
      Math.floor(Math.log(size) / Math.log(1024)),
      units.length - 1
    )
    return `${(size / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${
      units[index]
    }`
  }

  const saveFileToStorage = async (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result as string
        const fileData = {
          name: file.name,
          size: file.size,
          data: base64,
          uploadedAt: Date.now(),
        }
        localStorage.setItem('excel_file', JSON.stringify(fileData))
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const loadFileFromStorage = (): File | null => {
    const stored = localStorage.getItem('excel_file')
    if (!stored) return null
    try {
      const fileData = JSON.parse(stored)
      const base64 = fileData.data
      const byteString = atob(base64.split(',')[1])
      const mimeString = base64.split(',')[0].split(':')[1].split(';')[0]
      const ab = new ArrayBuffer(byteString.length)
      const ia = new Uint8Array(ab)
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i)
      }
      const blob = new Blob([ab], { type: mimeString })
      return new File([blob], fileData.name, { type: mimeString })
    } catch {
      return null
    }
  }

  const clearFile = () => {
    localStorage.removeItem('excel_file')
    setExcelMeta(null)
    setAnalysisResult(null)
    setStoredFilePath('')
    setCanAsk(false)
    setUploadError(null)
  }

  const processFile = async (file: File) => {
    setIsUploading(true)
    setUploadError(null)
    setCanAsk(false)
    setAnalysisResult(null)
    setStoredFilePath('')
    try {
      await saveFileToStorage(file)
      const data = await analyzeExcel(file)
      const uploadedAt = Date.now()

      if (data.errorMessage) {
        setUploadError('解析失败，请重新上传文件。')
        setAnalysisResult(null)
        setCanAsk(false)
        localStorage.removeItem('excel_file')
      } else {
        setAnalysisResult(data)
        setUploadError(null)
        setStoredFilePath(data.stored_file_path ?? '')
        setCanAsk(Boolean(data.sheets && data.stored_file_path))
      }

      setExcelMeta({
        name: file.name,
        size: file.size,
        uploadedAt,
      })
    } catch (error) {
      setUploadError('解析失败，请重新上传文件。')
      setCanAsk(false)
      setStoredFilePath('')
      localStorage.removeItem('excel_file')
    } finally {
      setIsUploading(false)
    }
  }

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    await processFile(file)
    event.target.value = ''
  }

  useEffect(() => {
    const savedFile = loadFileFromStorage()
    if (savedFile) {
      const stored = localStorage.getItem('excel_file')
      if (stored) {
        const fileData = JSON.parse(stored)
        setExcelMeta({
          name: fileData.name,
          size: fileData.size,
          uploadedAt: fileData.uploadedAt,
        })
      }
      const restoreFile = async () => {
        setIsUploading(true)
        setUploadError(null)
        setCanAsk(false)
        setAnalysisResult(null)
        setStoredFilePath('')
        try {
          const data = await analyzeExcel(savedFile)

          if (data.errorMessage) {
            setUploadError('解析失败，请重新上传文件。')
            setAnalysisResult(null)
            setCanAsk(false)
            localStorage.removeItem('excel_file')
          } else {
            setAnalysisResult(data)
            setUploadError(null)
            setStoredFilePath(data.stored_file_path ?? '')
            setCanAsk(Boolean(data.sheets && data.stored_file_path))
          }
        } catch (error) {
          setUploadError('解析失败，请重新上传文件。')
          setCanAsk(false)
          setStoredFilePath('')
          localStorage.removeItem('excel_file')
        } finally {
          setIsUploading(false)
        }
      }
      restoreFile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const placeholder = useMemo(
    () => '表格解析完毕，请输入查询问题，例如：哪些产品销量最高？',
    []
  )

  return (
    <div className="qa-app">
      <header className="qa-header">
        <div className="qa-header-left">
          <HomeButton />
          <h1>智能问数小工具</h1>
          <button
            className="prompt-editor-trigger"
            onClick={() => {
              setIsPasswordModalOpen(true)
              setPasswordInput('')
              setPasswordError('')
            }}
            title="编辑提示词"
          >
            <img src={editIcon} alt="编辑" />
          </button>
        </div>
      </header>
      <div className="music-floating">
        <div className="music-inline-label">Mark's little tool</div>
        <div
          className={`music-hover-wrapper${isMusicMenuOpen ? ' menu-open' : ''}`}
          onMouseEnter={handleMusicEnter}
          onMouseLeave={handleMusicLeave}
        >
          <div className="music-control">
            <div className="music-icon-wrapper">
              <button
                className={`music-icon${isMusicPlaying ? ' playing' : ''}`}
                onClick={toggleMusic}
                type="button"
                title={isMusicPlaying ? '暂停音乐' : '播放音乐'}
              >
                <img src={playMusicIcon} alt="音乐播放" />
              </button>
              <div className={`music-dropdown${isMusicMenuOpen ? ' visible' : ''}`}>
                {MUSIC_TRACKS.map((track, idx) => (
                  <button
                    key={track.name}
                    type="button"
                    className={`music-track-btn${idx === currentTrackIndex ? ' active' : ''}`}
                    onClick={() => handleTrackSelect(idx)}
                  >
                    {track.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {isPasswordModalOpen && (
        <div className="password-modal-overlay" onClick={() => setIsPasswordModalOpen(false)}>
          <div className="password-modal" onClick={(e) => e.stopPropagation()}>
            <div className="password-modal-header">
              <h3>请输入密码</h3>
              <button className="password-modal-close" onClick={() => setIsPasswordModalOpen(false)}>
                ×
              </button>
            </div>
            <div className="password-modal-content">
              <input
                type="password"
                className="password-input"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value)
                  setPasswordError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (passwordInput === 'Mazhaofeng1234') {
                      setIsPasswordModalOpen(false)
                      setIsPromptEditorOpen(true)
                      setPasswordInput('')
                      setPasswordError('')
                    } else {
                      setPasswordError('密码错误，请重试')
                    }
                  }
                }}
                placeholder="请输入密码"
                autoFocus
              />
              {passwordError && <div className="password-error">{passwordError}</div>}
            </div>
            <div className="password-modal-actions">
              <button
                className="password-btn password-btn-cancel"
                onClick={() => {
                  setIsPasswordModalOpen(false)
                  setPasswordInput('')
                  setPasswordError('')
                }}
              >
                取消
              </button>
              <button
                className="password-btn password-btn-submit"
                onClick={() => {
                  if (passwordInput === 'Mazhaofeng1234') {
                    setIsPasswordModalOpen(false)
                    setIsPromptEditorOpen(true)
                    setPasswordInput('')
                    setPasswordError('')
                  } else {
                    setPasswordError('密码错误，请重试')
                  }
                }}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
      <PromptEditor
        isOpen={isPromptEditorOpen}
        onClose={() => setIsPromptEditorOpen(false)}
      />

      <main ref={chatContainerRef} className="qa-chat">
        {messages.length === 0 && (
          <div className="upload-box">
      <div>
              <p className="upload-title">上传 Excel 文件</p>
              <p className="upload-desc">
                支持上传第一行为表头的 .xlsx / .xls文件，使用自然语言查询。<strong>初次解析时间可能较长(1min左右)</strong>。下方为示例
        </p>
      </div>
            <div className="upload-actions">
              <label
                className={`upload-trigger${isUploading ? ' disabled' : ''}`}
              >
                {isUploading
                  ? '解析中…'
                  : excelMeta
                    ? '更新文件'
                    : '上传文件'}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleUpload}
                  disabled={isUploading}
                />
              </label>
              {excelMeta && (
                <button
                  type="button"
                  className="clear-trigger"
                  onClick={clearFile}
                  disabled={isUploading}
                >
                  清除文件
                </button>
              )}
            </div>
            {excelMeta && (
              <div className="upload-meta">
                <span>{excelMeta.name}</span>
                <span>{formatBytes(excelMeta.size)}</span>
              </div>
            )}
            {uploadError && <p className="upload-error">{uploadError}</p>}
            {analysisResult?.note && !uploadError && (
              <>
                <div className="analysis-summary markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {analysisResult.note}
                  </ReactMarkdown>
                </div>
                <div className="context-toggle">
                  <label className="context-switch">
                    <input
                      type="checkbox"
                      checked={contextEnabled}
                      onChange={(e) => {
                        setContextEnabled(e.target.checked)
                        if (!e.target.checked) {
                          // 关闭时清空历史
                          setContextHistory([])
                        }
                      }}
                    />
                    <span className="context-switch-label">开启上下文</span>
                    <span className="context-switch-slider"></span>
                  </label>
                  {contextEnabled && contextHistory.length > 0 && (
                    <span className="context-count">
                      （已记录 {contextHistory.length} 条历史）
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        )}
        {messages.length === 0 && (
          <>
            <div className="bubble user">
              <div className="markdown-body">
                示例问题：请你帮我整体分析一下表格。
              </div>
            </div>
            <div className="bubble assistant">
              <div className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {`示例回复：

# 表格整体分析摘要

## 基本结构
- **数据规模**：共 2,500 条记录，涵盖 26 个字段。
- **时间范围**：从 \`2024-01-01\` 到 \`2025-12-31\`，覆盖完整两年生产周期。

---

## 关键维度分布

| 维度 | 类别数 | 主要类别（频次） |
|------|-------|----------------|
| 地区（region） | 7 | 华中（371） |
| 工厂（plant） | 9 | A3-焊装厂（315） |
| 生产线（line） | 8 | L03（341） |
| 班次（shift） | 2 | 白班（1,437） |
| 产品线（product_line） | 5 | SUV（975） |
| 动力类型（powertrain） | 4 | ICE（1,159） |
| 供应商国家（supplier_country） | 7 | 中国 CN（1,508） |
| 运输方式（shipping_mode） | 4 | 海运（1,139） |

> ⚠️ 数据以"华中"地区、SUV 车型、ICE 动力系统和国内供应商为主导。

---

## 核心生产与运营指标（数值型统计）

| 指标 | 平均值 | 中位数 | 标准差 | 范围 |
|------|--------|--------|--------|------|
| 计划产量（planned_units） | 638.15 | 609 | 201.51 | 250–1,204 |
| 实际产量（actual_units） | 625.85 | 596 | 199.39 | 244–1,200 |
| 合格品数量（good_units） | 620.70 | 591 | 197.80 | 242–1,187 |
| 缺陷率（defect_rate） | 0.82% | 0.80% | 0.21% | 0.26%–1.46% |
| 设备停机时间（downtime_minutes） | 39.7 min | 33 min | 28.21 min | 1–244 min |
| OEE（设备综合效率） | 88.78% | 90.24% | 6.90% | 44.05%–99.27% |
| 单位能耗（energy_kwh） | 4,044.66 kWh | 3,652.75 kWh | 1,615.76 | 1,155–9,039 kWh |
| CO₂ 排放（co2_kg） | 2,409.86 kg | 2,008.9 kg | 1,317.51 | 574.6–6,796 kg |
| 质保索赔（warranty_claims） | 0.103 次/批次 | 0 | 0.32 | 0–2 次 |

---

## 初步洞察

1. **高生产稳定性**
   - 实际产量接近计划产量（平均仅差约 12 台），标准差较低，表明排产执行较稳定。
   - 缺陷率控制良好，中位值为 0.8%，波动小（标准差 0.21%）。

2. **OEE 表现优异但存在异常点**
   - 平均 OEE 达 **88.78%**，中位数更高（90.24%），多数时段效率良好。
   - 最低值仅为 **44.05%**，提示个别班次或产线存在严重性能损失，需进一步排查。

3. **库存管理风险**
   - \`inventory_units\` 存在负值（最小 -50），可能反映库存核算错误或缺货调拨问题，建议核查逻辑。

4. **供应链集中度较高**
   - 80 家供应商中，前几大供应频繁（如 S-063 出现 48 次），且 **60.3% 来自中国（CN）**，存在地域集中风险。

5. **能源与排放强度显著**
   - 单批平均耗电超 **4,000 kWh**，CO₂ 排放近 **2.4 吨**，绿色制造优化空间较大。

6. **质保反馈稀疏但存在**
   - 多数批次无索赔（75% 分位为 0），但最大达 2 次，结合缺陷率可做关联分析识别高风险型号。

---

## 建议后续分析方向
- 按 \`region\`, \`plant\`, \`product_line\` 分组对比 OEE 与 defect rate 差异。
- 分析 \`downtime_minutes\` 与 \`oee\` 的相关性。
- 探索高 \`warranty_claims\` 批次是否集中在特定 \`model\` 或 \`supplier\`。
- 对负 \`inventory_units\` 进行根因分析。`}
                </ReactMarkdown>
              </div>
            </div>
          </>
        )}
        {messages.map((msg, index) => (
          <Fragment key={`${msg.role}-${index}-${msg.content?.length || 0}-${msg.history?.length || 0}`}>
            {msg.role === 'assistant' && msg.history?.length ? (
              <ResultHistory records={msg.history} />
            ) : null}
            {msg.content ? (
              <div className={`bubble ${msg.role}`}>
                <div className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            ) : null}
          </Fragment>
        ))}
        <LoadingIndicator
          phase={loadingPhase}
          duration={loadingDuration}
          message={loadingMessage}
        />
      </main>

      {canAsk && (
        <form className="qa-input" onSubmit={handleAsk}>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={placeholder}
            autoFocus
          />
          <button type="submit" disabled={!input.trim() || isLoading}>
            {isLoading ? '生成中…' : '发送'}
          </button>
        </form>
      )}
    </div>
  )
}

export default App
