import { useState, useEffect } from 'react'
import {
  DEFAULT_PROMPTS,
  getCurrentPrompts,
  saveCustomPrompts,
  type PromptTemplates,
} from './prompts'
import './PromptEditor.css'

interface PromptEditorProps {
  isOpen: boolean
  onClose: () => void
}

export function PromptEditor({ isOpen, onClose }: PromptEditorProps) {
  const [prompts, setPrompts] = useState<PromptTemplates>(DEFAULT_PROMPTS)
  const [activeTab, setActiveTab] = useState<'code' | 'summary'>('code')

  useEffect(() => {
    if (isOpen) {
      setPrompts(getCurrentPrompts())
    }
  }, [isOpen])

  const handleSave = () => {
    saveCustomPrompts(prompts)
    alert('提示词已保存！')
    onClose()
  }

  const handleReset = () => {
    if (confirm('确定要重置为默认提示词吗？')) {
      setPrompts(DEFAULT_PROMPTS)
      saveCustomPrompts(DEFAULT_PROMPTS)
      alert('已重置为默认提示词')
    }
  }

  if (!isOpen) return null

  return (
    <div className="prompt-editor-overlay" onClick={onClose}>
      <div className="prompt-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="prompt-editor-header">
          <h2>编辑提示词</h2>
          <button className="prompt-editor-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="prompt-editor-tabs">
          <button
            className={`prompt-editor-tab ${activeTab === 'code' ? 'active' : ''}`}
            onClick={() => setActiveTab('code')}
          >
            代码生成提示词
          </button>
          <button
            className={`prompt-editor-tab ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            结果总结提示词
          </button>
        </div>

        <div className="prompt-editor-content">
          {activeTab === 'code' ? (
            <>
              <div className="prompt-editor-section">
                <label>System 提示词（角色设定和规则）</label>
                <textarea
                  className="prompt-editor-textarea"
                  value={prompts.codeGeneration.system}
                  onChange={(e) =>
                    setPrompts({
                      ...prompts,
                      codeGeneration: {
                        ...prompts.codeGeneration,
                        system: e.target.value,
                      },
                    })
                  }
                  placeholder="输入 System 提示词..."
                  rows={20}
                />
                <div className="prompt-editor-hint">
                  可用变量：{' '}
                  <code>{'{{user_question}}'}</code>、{' '}
                  <code>{'{{sheets}}'}</code>、{' '}
                  <code>{'{{file_path}}'}</code>
                </div>
              </div>

              <div className="prompt-editor-section">
                <label>User 提示词（用户问题和历史）</label>
                <textarea
                  className="prompt-editor-textarea"
                  value={prompts.codeGeneration.user}
                  onChange={(e) =>
                    setPrompts({
                      ...prompts,
                      codeGeneration: {
                        ...prompts.codeGeneration,
                        user: e.target.value,
                      },
                    })
                  }
                  placeholder="输入 User 提示词..."
                  rows={8}
                />
                <div className="prompt-editor-hint">
                  可用变量：{' '}
                  <code>{'{{user_question}}'}</code>、{' '}
                  <code>{'{{history}}'}</code>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="prompt-editor-section">
                <label>System 提示词（角色设定）</label>
                <textarea
                  className="prompt-editor-textarea"
                  value={prompts.summarization.system}
                  onChange={(e) =>
                    setPrompts({
                      ...prompts,
                      summarization: {
                        ...prompts.summarization,
                        system: e.target.value,
                      },
                    })
                  }
                  placeholder="输入 System 提示词..."
                  rows={5}
                />
              </div>

              <div className="prompt-editor-section">
                <label>User 提示词（总结指令）</label>
                <textarea
                  className="prompt-editor-textarea"
                  value={prompts.summarization.user}
                  onChange={(e) =>
                    setPrompts({
                      ...prompts,
                      summarization: {
                        ...prompts.summarization,
                        user: e.target.value,
                      },
                    })
                  }
                  placeholder="输入 User 提示词..."
                  rows={10}
                />
                <div className="prompt-editor-hint">
                  可用变量：{' '}
                  <code>{'{{user_question}}'}</code>、{' '}
                  <code>{'{{execution_result}}'}</code>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="prompt-editor-actions">
          <button className="prompt-editor-btn prompt-editor-btn-reset" onClick={handleReset}>
            重置为默认
          </button>
          <div>
            <button className="prompt-editor-btn prompt-editor-btn-cancel" onClick={onClose}>
              取消
            </button>
            <button className="prompt-editor-btn prompt-editor-btn-save" onClick={handleSave}>
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

