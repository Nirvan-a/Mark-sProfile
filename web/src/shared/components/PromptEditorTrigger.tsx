import { useState } from 'react'
import editIcon from '../../tools/askdata/assets/Edit2.svg'
import './PromptEditorTrigger.css'

interface PromptEditorTriggerProps {
  onOpenEditor: () => void
  password?: string
}

export function PromptEditorTrigger({
  onOpenEditor,
  password = 'Mazhaofeng1234',
}: PromptEditorTriggerProps) {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const handleOpen = () => {
    setIsPasswordModalOpen(true)
    setPasswordInput('')
    setPasswordError('')
  }

  const handleClose = () => {
    setIsPasswordModalOpen(false)
    setPasswordInput('')
    setPasswordError('')
  }

  const handleConfirm = () => {
    if (passwordInput === password) {
      handleClose()
      onOpenEditor()
    } else {
      setPasswordError('密码错误，请重试')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleConfirm()
    }
  }

  return (
    <>
      <button
        className="prompt-editor-trigger"
        onClick={handleOpen}
        title="编辑提示词"
      >
        <img src={editIcon} alt="编辑" />
      </button>

      {isPasswordModalOpen && (
        <div className="password-modal-overlay" onClick={handleClose}>
          <div className="password-modal" onClick={(e) => e.stopPropagation()}>
            <div className="password-modal-header">
              <h3>请输入密码</h3>
              <button className="password-modal-close" onClick={handleClose}>
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
                onKeyDown={handleKeyDown}
                placeholder="请输入密码"
                autoFocus
              />
              {passwordError && <div className="password-error">{passwordError}</div>}
            </div>
            <div className="password-modal-actions">
              <button
                className="password-btn password-btn-cancel"
                onClick={handleClose}
              >
                取消
              </button>
              <button
                className="password-btn password-btn-submit"
                onClick={handleConfirm}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

