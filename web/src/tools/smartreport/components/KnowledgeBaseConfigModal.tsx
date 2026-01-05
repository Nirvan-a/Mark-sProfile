import { useState, useEffect, useRef } from 'react'
import {
  uploadDocument,
  listDocuments,
  clearKnowledgeBase,
  deleteDocument,
  listChunks,
  searchKnowledgeBase,
  initializeKnowledgeBase,
  webSearch,
  type ListDocumentsResponse,
  type SearchResponse,
  type WebSearchResponse,
  type ChunkInfo,
} from '../api'
import './KnowledgeBaseConfigModal.css'

interface KnowledgeBaseConfigModalProps {
  isOpen: boolean
  onClose: () => void
}

export function KnowledgeBaseConfigModal({ isOpen, onClose }: KnowledgeBaseConfigModalProps) {
  const [activeTab, setActiveTab] = useState<'knowledge' | 'web'>('knowledge')
  
  // 知识库管理相关状态
  const [knowledgeBaseDocs, setKnowledgeBaseDocs] = useState<ListDocumentsResponse['documents']>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [kbSearchQuery, setKbSearchQuery] = useState('')
  const [isKbSearching, setIsKbSearching] = useState(false)
  const [kbSearchResults, setKbSearchResults] = useState<SearchResponse | null>(null)
  
  // 联网管理相关状态
  const [webSearchQuery, setWebSearchQuery] = useState('')
  const [isWebSearching, setIsWebSearching] = useState(false)
  const [webSearchResults, setWebSearchResults] = useState<WebSearchResponse | null>(null)
  
  // 片段列表相关状态
  const [chunks, setChunks] = useState<ChunkInfo[]>([])
  const [isLoadingChunks, setIsLoadingChunks] = useState(false)
  const [selectedChunk, setSelectedChunk] = useState<ChunkInfo | null>(null)

  // 加载知识库文档列表
  const loadKnowledgeBaseDocs = async () => {
    try {
      const response = await listDocuments()
      setKnowledgeBaseDocs(response.documents || [])
    } catch (error) {
      console.error('加载知识库文档失败:', error)
    }
  }

  // 加载片段列表
  const loadChunks = async () => {
    setIsLoadingChunks(true)
    try {
      const response = await listChunks()
      setChunks(response.chunks || [])
    } catch (error) {
      console.error('加载片段列表失败:', error)
    } finally {
      setIsLoadingChunks(false)
    }
  }

  // 初始化时加载文档列表和片段列表
  useEffect(() => {
    if (isOpen) {
      loadKnowledgeBaseDocs()
      loadChunks()
    }
  }, [isOpen])

  // 批量上传文档
  const handleUploadDocuments = async (files: FileList) => {
    setIsUploading(true)
    const filesArray = Array.from(files)
    let successCount = 0
    let failCount = 0
    const errors: string[] = []

    try {
      for (const file of filesArray) {
        try {
          await uploadDocument(file)
          successCount++
        } catch (error) {
          failCount++
          errors.push(`${file.name}: ${(error as Error).message}`)
          console.error(`上传文档失败 ${file.name}:`, error)
        }
      }

      await loadKnowledgeBaseDocs()

      // 显示上传结果
      if (failCount === 0) {
        alert(`成功上传 ${successCount} 个文档\n\n提示：上传完成后，请点击"覆盖构建"按钮来构建向量库`)
      } else {
        alert(`上传完成：\n成功：${successCount} 个\n失败：${failCount} 个\n\n失败详情：\n${errors.join('\n')}\n\n提示：请点击"覆盖构建"按钮来构建向量库`)
      }
    } catch (error) {
      console.error('批量上传失败:', error)
      alert(`批量上传失败: ${(error as Error).message}`)
    } finally {
      setIsUploading(false)
    }
  }

  // 清空知识库
  const handleClearKnowledgeBase = async () => {
    if (!confirm('确定要清空知识库吗？此操作不可恢复。')) {
      return
    }
    try {
      await clearKnowledgeBase()
      setKnowledgeBaseDocs([])
    } catch (error) {
      alert(`清空知识库失败: ${(error as Error).message}`)
    }
  }

  // 删除单个文档
  const handleDeleteDocument = async (docId: string, filename: string) => {
    if (!confirm(`确定要删除文档 "${filename}" 吗？此操作不可恢复。\n\n提示：删除文件后需要点击"覆盖构建"来更新向量库。`)) {
      return
    }
    try {
      await deleteDocument({ doc_id: docId })
      await loadKnowledgeBaseDocs()
      alert(`文档 "${filename}" 已删除\n\n提示：请点击"覆盖构建"按钮更新向量库`)
    } catch (error) {
      alert(`删除文档失败: ${(error as Error).message}`)
    }
  }

  // 覆盖构建
  const handleRebuildKnowledgeBase = async () => {
    if (!confirm('确定要覆盖重建知识库吗？\n\n此操作将：\n1. 清空现有向量库\n2. 重新构建所有已上传文档的向量索引\n\n构建时间取决于文档数量和大小')) {
      return
    }
    setIsInitializing(true)
    try {
      const result = await initializeKnowledgeBase({ force_rebuild: true })
      await loadKnowledgeBaseDocs()
      await loadChunks() // 重新加载片段列表
      alert(`知识库构建完成！\n\n原始文件: ${result.documents_loaded} 个\n文档片段: ${result.chunks_loaded} 个\n\n现在可以使用知识库检索功能了`)
    } catch (error) {
      alert(`重建知识库失败: ${(error as Error).message}`)
    } finally {
      setIsInitializing(false)
    }
  }

  // 知识库检索测试
  const handleTestKnowledgeBaseSearch = async () => {
    if (!kbSearchQuery.trim()) {
      alert('请输入检索查询')
      return
    }
    setIsKbSearching(true)
    try {
      const result = await searchKnowledgeBase({ query: kbSearchQuery, k: 5 })
      setKbSearchResults(result)
    } catch (error) {
      alert(`检索失败: ${(error as Error).message}`)
    } finally {
      setIsKbSearching(false)
    }
  }

  // 联网检索测试
  const handleTestWebSearch = async () => {
    if (!webSearchQuery.trim()) {
      alert('请输入检索查询')
      return
    }
    setIsWebSearching(true)
    try {
      const result = await webSearch({ query: webSearchQuery, k: 5 })
      setWebSearchResults(result)
    } catch (error) {
      alert(`联网检索失败: ${(error as Error).message}`)
    } finally {
      setIsWebSearching(false)
    }
  }

  if (!isOpen) return null

  // 主配置弹窗
  return (
    <div className="kb-config-overlay" onClick={onClose}>
      <div className="kb-config-modal" onClick={(e) => e.stopPropagation()}>
        <div className="kb-config-header">
          <h2>知识库配置</h2>
          <button className="kb-config-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="kb-config-tabs">
          <button
            className={`kb-config-tab ${activeTab === 'knowledge' ? 'active' : ''}`}
            onClick={() => setActiveTab('knowledge')}
          >
            知识库管理
          </button>
          <button
            className={`kb-config-tab ${activeTab === 'web' ? 'active' : ''}`}
            onClick={() => setActiveTab('web')}
          >
            联网管理
          </button>
        </div>

        <div className="kb-config-content">
          {activeTab === 'knowledge' ? (
            <>
              {/* 模块1: 上传文档 */}
              <div className="kb-config-section">
                <h3>上传文档</h3>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.pdf,.docx,.csv"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const files = e.target.files
                    if (files && files.length > 0) {
                      handleUploadDocuments(files)
                    }
                    // 清空输入框，允许重复选择相同文件
                    e.target.value = ''
                  }}
                />
                <button
                  className="kb-config-upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? '上传中...' : '上传文档（可多选）'}
                </button>
                <p className="kb-config-hint">支持 .txt, .md, .pdf, .docx, .csv 格式，可同时选择多个文件</p>
              </div>

              {/* 模块2: 知识库维护 */}
              <div className="kb-config-section">
                <h3>知识库维护</h3>
                <p className="kb-config-hint" style={{ marginBottom: '10px' }}>
                  提示：上传文档后，需要点击"覆盖构建"来构建向量库，才能使用检索功能
                </p>
                <div className="kb-config-maintenance-buttons">
                  <button
                    className="kb-config-btn kb-config-btn-warning"
                    onClick={handleRebuildKnowledgeBase}
                    disabled={isInitializing}
                  >
                    {isInitializing ? '构建中...' : '覆盖构建'}
                  </button>
                  <button
                    className="kb-config-btn kb-config-btn-danger"
                    onClick={handleClearKnowledgeBase}
                  >
                    清除构建
                  </button>
                </div>
              </div>

              {/* 模块3: 知识库检索测试 */}
              <div className="kb-config-section">
                <h3>知识库检索测试</h3>
                <div className="kb-config-search-box">
                  <input
                    type="text"
                    className="kb-config-search-input"
                    value={kbSearchQuery}
                    onChange={(e) => setKbSearchQuery(e.target.value)}
                    placeholder="输入检索查询..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !isKbSearching) {
                        handleTestKnowledgeBaseSearch()
                      }
                    }}
                  />
                  <button
                    className="kb-config-btn kb-config-btn-primary"
                    onClick={handleTestKnowledgeBaseSearch}
                    disabled={isKbSearching || !kbSearchQuery.trim()}
                  >
                    {isKbSearching ? '检索中...' : '检索'}
                  </button>
                </div>
                {kbSearchResults && (
                  <div className="kb-config-search-results">
                    <div className="kb-config-results-header">
                      <span>找到 {kbSearchResults.total} 个结果</span>
                      <span>查询: "{kbSearchResults.query}"</span>
                    </div>
                    <div className="kb-config-results-list">
                      {kbSearchResults.results.map((result, index) => (
                        <div key={index} className="kb-config-result-item">
                          <div className="kb-config-result-header">
                            <span className="kb-config-result-filename">{result.filename || result.source || '未知文件'}</span>
                            {result.relevance !== undefined && (
                              <span className="kb-config-result-relevance">相关性: {(result.relevance * 100).toFixed(1)}%</span>
                            )}
                          </div>
                          <div className="kb-config-result-content">{result.content ? result.content.substring(0, 200) + '...' : ''}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 模块4: 已上传文档 */}
              <div className="kb-config-section">
                <h3>已上传文档 ({knowledgeBaseDocs.length})</h3>
                {knowledgeBaseDocs.length === 0 ? (
                  <div className="kb-config-empty">暂无文档</div>
                ) : (
                  <ul className="kb-config-docs-list">
                    {knowledgeBaseDocs.map((doc) => (
                      <li key={doc.doc_id} className="kb-config-doc-item">
                        <div className="kb-config-doc-info">
                          <span className="kb-config-doc-name">{doc.filename}</span>
                          <span className="kb-config-doc-meta">
                            {chunks.length > 0 && chunks.some(c => c.filename === doc.filename) 
                              ? `${chunks.filter(c => c.filename === doc.filename).length} 个片段` 
                              : '未构建'}
                          </span>
                        </div>
                        <button
                          className="kb-config-delete-btn"
                          onClick={() => handleDeleteDocument(doc.doc_id, doc.filename)}
                          title="删除文档"
                        >
                          删除
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* 模块5: 已拆分片段 */}
              <div className="kb-config-section">
                <h3>已拆分片段 ({chunks.length})</h3>
                {isLoadingChunks ? (
                  <div className="kb-config-loading">加载中...</div>
                ) : chunks.length === 0 ? (
                  <div className="kb-config-empty">暂无片段</div>
                ) : (
                  <div className="kb-config-chunks-list">
                    {chunks.map((chunk, index) => (
                      <div
                        key={chunk.chunk_id}
                        className="kb-config-chunk-item"
                        onClick={() => setSelectedChunk(chunk)}
                      >
                        <div className="kb-config-chunk-header">
                          <span className="kb-config-chunk-index">片段 {index + 1}</span>
                          <span className="kb-config-chunk-filename">{chunk.filename}</span>
                        </div>
                        <div className="kb-config-chunk-preview">
                          {chunk.content.substring(0, 100)}
                          {chunk.content.length > 100 ? '...' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 片段详情弹窗 */}
              {selectedChunk && (
                <div className="kb-config-overlay" onClick={() => setSelectedChunk(null)}>
                  <div className="kb-config-chunk-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="kb-config-chunk-modal-header">
                      <h3>片段详情</h3>
                      <button className="kb-config-close" onClick={() => setSelectedChunk(null)}>
                        ×
                      </button>
                    </div>
                    <div className="kb-config-chunk-modal-content">
                      <div className="kb-config-chunk-detail-info">
                        <p><strong>文件名:</strong> {selectedChunk.filename}</p>
                        <p><strong>来源:</strong> {selectedChunk.source}</p>
                        <p><strong>片段ID:</strong> {selectedChunk.chunk_id}</p>
                      </div>
                      <div className="kb-config-chunk-detail-content">
                        <strong>内容:</strong>
                        <div className="kb-config-chunk-full-content">{selectedChunk.content}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Tab 2: 联网管理 */}
              <div className="kb-config-section">
                <h3>联网检索测试</h3>
                <div className="kb-config-search-box">
                  <input
                    type="text"
                    className="kb-config-search-input"
                    value={webSearchQuery}
                    onChange={(e) => setWebSearchQuery(e.target.value)}
                    placeholder="输入联网检索查询..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !isWebSearching) {
                        handleTestWebSearch()
                      }
                    }}
                  />
                  <button
                    className="kb-config-btn kb-config-btn-primary"
                    onClick={handleTestWebSearch}
                    disabled={isWebSearching || !webSearchQuery.trim()}
                  >
                    {isWebSearching ? '检索中...' : '检索'}
                  </button>
                </div>
                {webSearchResults && (
                  <div className="kb-config-search-results">
                    <div className="kb-config-results-header">
                      <span>找到 {webSearchResults.total} 个结果</span>
                      <span>查询: "{webSearchResults.query}"</span>
                    </div>
                    <div className="kb-config-results-list">
                      {webSearchResults.results.map((result, index) => (
                        <div key={index} className="kb-config-result-item">
                          <div className="kb-config-result-header">
                            <a
                              href={result.url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="kb-config-result-link"
                            >
                              {result.title || '无标题'}
                            </a>
                            {result.url && (
                              <span className="kb-config-result-url">{result.url}</span>
                            )}
                          </div>
                          <div className="kb-config-result-content">{result.content ? result.content.substring(0, 200) + '...' : ''}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

