import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './EditableMarkdown.css'

interface EditableMarkdownProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function EditableMarkdown({
  value,
  onChange,
  placeholder = '请输入Markdown内容...',
  disabled = false,
}: EditableMarkdownProps) {
  const [isEditing, setIsEditing] = useState(true)

  return (
    <div className={`editable-markdown ${disabled ? 'disabled' : ''}`}>
      {!disabled && (
        <div className="editable-markdown-toolbar">
          <button
            type="button"
            className={`editable-markdown-btn ${isEditing ? 'active' : ''}`}
            onClick={() => setIsEditing(true)}
          >
            编辑
          </button>
          <button
            type="button"
            className={`editable-markdown-btn ${!isEditing ? 'active' : ''}`}
            onClick={() => setIsEditing(false)}
          >
            预览
          </button>
        </div>
      )}
      <div className="editable-markdown-content">
        {disabled || !isEditing ? (
          <div className="editable-markdown-preview markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {value || placeholder}
            </ReactMarkdown>
          </div>
        ) : (
          <textarea
            className="editable-markdown-textarea"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
          />
        )}
      </div>
    </div>
  )
}

