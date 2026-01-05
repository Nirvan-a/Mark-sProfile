import { Fragment, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MusicPlayer, PromptEditorTrigger, HomeButton } from '../../shared/components'
import './SmartPlan.css'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export default function SmartPlan() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!input.trim() || isLoading) return

    const question = input.trim()
    setMessages((prev) => [...prev, { role: 'user', content: question }])
    setInput('')
    setIsLoading(true)

    // 模拟处理
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '功能开发中，敬请期待...',
        },
      ])
      setIsLoading(false)
    }, 1000)
  }

  return (
    <div className="qa-app">
      <header className="qa-header">
        <div className="qa-header-left">
          <HomeButton />
          <h1>智能规划</h1>
          <PromptEditorTrigger
            onOpenEditor={() => {
              alert('智能规划暂不支持编辑提示词功能')
            }}
          />
        </div>
      </header>
      <MusicPlayer />

      <main ref={chatContainerRef} className="qa-chat">
        {messages.length === 0 && (
          <div className="upload-box">
            <div>
              <p className="upload-title">智能规划助手</p>
              <p className="upload-desc">
                功能开发中，敬请期待...
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, index) => (
          <Fragment key={`${msg.role}-${index}`}>
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
      </main>

      <form className="qa-input" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="请输入您的需求..."
          autoFocus
          disabled={isLoading}
        />
        <button type="submit" disabled={!input.trim() || isLoading}>
          {isLoading ? '处理中…' : '发送'}
        </button>
      </form>
    </div>
  )
}

