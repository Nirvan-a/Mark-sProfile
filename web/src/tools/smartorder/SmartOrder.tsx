/**
 * 智能点单主组件 - 完整功能版本
 * 包含所有原版功能
 */

import { useState, useRef, useEffect } from 'react'
import { User, Star, TrendingUp, Flame } from 'lucide-react'
import { PhoneFrame } from './components/PhoneFrame'
import { HomeButton } from '../../shared/components'
import type { PageType, Order, ProductRecommendation, InputMode, ItemAttributes } from './types'
// 导入本地图片资源
import aiAvatarImg from './assets/ui/ai-avatar.webp'
import {
  callDashscope,
  extractAssistantContent,
  safeParseJSON,
  formatCurrency,
  calculateTotal,
  calculateCount,
} from './api'
import {
  SCHEMA_INSTRUCTION,
  MOCK_ORDERS,
  buildCandidatePool,
  getFallbackRecommendation,
} from './data'
import './SmartOrder.css'

export default function SmartOrder() {
  // 页面状态
  const [currentPage, setCurrentPage] = useState<PageType>('ai')
  const [previousPage, setPreviousPage] = useState<PageType>('ai') // 记录进入个人中心前的页面
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: any }>>([])
  const [checkoutOrder, setCheckoutOrder] = useState<Order | null>(null) // 结算页面的独立订单副本
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; data: any }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [inputText, setInputText] = useState('')
  const [inputMode, setInputMode] = useState<InputMode>('keyboard')
  const [suggestedChips, setSuggestedChips] = useState<string[]>([
    '帮我再加一杯茉莉奶茶',
    '我不想吃太辣的',
    '描述一下我的历史订单口味如何，无需推荐',
    '我是清淡口味的',
    '运动套餐有什么推荐',
  ])
  const [showAttrsModal, setShowAttrsModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [editingAttrs, setEditingAttrs] = useState<ItemAttributes>({})

  const chatContainerRef = useRef<HTMLDivElement>(null)
  const previousMessagesLengthRef = useRef<number>(0)

  // 滚动到底部
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }

  // 只在消息数量增加时滚动（添加新消息），而不是在更新现有消息时滚动
  useEffect(() => {
    const currentLength = chatMessages.length
    if (currentLength > previousMessagesLengthRef.current) {
      // 消息数量增加了，说明添加了新消息，应该滚动
      scrollToBottom()
    }
    previousMessagesLengthRef.current = currentLength
  }, [chatMessages])

  // 打开 AI 页面
  const handleOpenAI = () => {
    setCurrentPage('ai')
  }

  // 构建消息（带上下文）
  const buildMessages = (userQuery: string, hints: string, candidate: any) => {
    const history = chatHistory.slice(-10)
    let lastOrder = null

    // 优先从 chatMessages 中查找最新的订单（因为用户修改时直接更新了 chatMessages）
    // 这样可以确保获取到用户修改后的最新版本
    for (let i = chatMessages.length - 1; i >= 0; i--) {
      if (chatMessages[i].role === 'assistant' && chatMessages[i].content?.order) {
        lastOrder = JSON.parse(JSON.stringify(chatMessages[i].content.order))
        console.log('📋 从 chatMessages 中找到上一次订单（应该是修改后的版本），将传给AI:')
        console.log('   订单索引:', i)
        console.log('   订单内容:', JSON.stringify(lastOrder, null, 2))
        console.log('   订单items数量:', lastOrder.items?.length)
        console.log('   订单items详情:', lastOrder.items?.map((it: any) => `${it.name} x${it.qty}`).join(', '))
        break
      }
    }
    
    // 如果 chatMessages 中没有找到，再从 chatHistory 中查找（兜底）
    if (!lastOrder) {
      for (let i = chatHistory.length - 1; i >= 0; i--) {
        if (chatHistory[i].role === 'assistant' && chatHistory[i].data?.order) {
          lastOrder = JSON.parse(JSON.stringify(chatHistory[i].data.order))
          console.log('📋 从 chatHistory 中找到上一次订单（兜底），将传给AI:')
          console.log('   订单索引:', i)
          console.log('   订单内容:', JSON.stringify(lastOrder, null, 2))
          break
        }
      }
    }
    
    if (!lastOrder) {
      console.warn('⚠️ 未找到上一次订单')
    }

    let extHints = hints
    if (lastOrder) {
      extHints += `，上一次经过用户修改后的订单为: ${JSON.stringify(lastOrder)}，你需要在本轮回复给出更新（增删改）后的【完整订单items结构】，而不要只输出补充项。`
    }

    const messages = [
      { role: 'system', content: SCHEMA_INSTRUCTION },
      ...history.map((item, idx) => ({
        role: item.role,
        content: `${item.role === 'user' ? '用户' : '模型'}第${Math.floor(idx / 2) + 1}轮${
          item.role === 'user' ? '问题' : '答复'
        }: ${typeof item.data === 'string' ? item.data : JSON.stringify(item.data)}`,
      })),
      {
        role: 'user',
        content: `用户第${Math.floor(history.length / 2) + 1}轮问题: ${JSON.stringify({
          user_query: userQuery,
          hints: extHints,
          candidate_items: candidate,
        })}`,
      },
    ]

    // 如果包含历史订单关键词，添加历史订单信息
    if (userQuery.includes('我喜欢的') || userQuery.includes('历史订单')) {
      const latestOrder = MOCK_ORDERS[0]
      messages.splice(-1, 0, {
        role: 'user',
        content: `用户的历史订单: ${JSON.stringify(latestOrder)}`,
      })
    }

    return messages
  }

  // 发送消息
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    setInputText('')
    setCurrentPage('chat')

    // 添加用户消息
    setChatMessages((prev) => [...prev, { role: 'user', content: text }])
    setChatHistory((prev) => [...prev, { role: 'user', data: text }])
    setIsLoading(true)

    try {
      const candidate = buildCandidatePool()
      const hints =
        '根据用户输入继续搭配，价格优先在 20~35 元。必须从 candidate_items 中选择，严禁编造。输出严格为 JSON。【重要：每次输出产品推荐JSON时，praise字段必填，必须是对用户的夸奖或让用户心情愉悦的话！】'

      const messages = buildMessages(text, hints, candidate)
      console.log('📤 发送API请求:', { endpoint: '/api/smartorder/recommend', messagesCount: messages.length })
      const response = await callDashscope(messages)
      console.log('✅ API请求成功，收到响应:', response)
      const content = extractAssistantContent(response)
      console.log('📝 提取的内容:', content?.substring(0, 200) + '...')
      const parsed = safeParseJSON<ProductRecommendation>(content)

      if (parsed) {
        console.log('✅ JSON解析成功:', parsed.type)
        setChatMessages((prev) => [...prev, { role: 'assistant', content: parsed }])
        setChatHistory((prev) => [...prev, { role: 'assistant', data: parsed }])

        if (parsed.type === 'product_recommendation') {
          if (parsed.suggested_chips) {
            setSuggestedChips(parsed.suggested_chips)
          }
        }
      } else {
        console.error('❌ JSON解析失败，原始内容:', content)
        throw new Error('模型未按 JSON 返回')
      }
    } catch (error) {
      console.error('❌ 发送消息失败:', error)
      console.error('错误详情:', error instanceof Error ? error.message : String(error))
      const fallback = getFallbackRecommendation()
      setChatMessages((prev) => [...prev, { role: 'assistant', content: fallback }])
      setChatHistory((prev) => [...prev, { role: 'assistant', data: fallback }])
    } finally {
      setIsLoading(false)
    }
  }

  // 切换输入模式
  const toggleInputMode = () => {
    setInputMode((prev) => (prev === 'keyboard' ? 'voice' : 'keyboard'))
  }

  // 调整商品数量
  const handleQuantityChange = (messageIndex: number, itemIndex: number, delta: number) => {
    let updatedOrder: Order | null = null
    
    console.log('🔧 [数量修改] 开始修改订单:')
    console.log('   messageIndex:', messageIndex)
    console.log('   itemIndex:', itemIndex)
    console.log('   delta:', delta)
    
    setChatMessages((prev) => {
      const newMessages = [...prev]
      const msg = newMessages[messageIndex]
      if (!msg || msg.role !== 'assistant' || !msg.content.order) {
        console.warn('⚠️ [数量修改] 未找到对应的消息或订单')
        return prev
      }

      console.log('   📦 修改前的订单:', JSON.stringify(msg.content.order, null, 2))
      
      const order = { ...msg.content.order }
      const items = [...order.items]
      const positiveCount = items.filter((it) => it.qty > 0).length

      if (items[itemIndex].qty === 1 && delta === -1 && positiveCount === 1) {
        alert('必须至少保留一个商品')
        return prev
      }

      const oldQty = items[itemIndex].qty
      items[itemIndex] = { ...items[itemIndex], qty: Math.max(0, items[itemIndex].qty + delta) }
      order.items = items
      updatedOrder = order

      console.log('   📦 修改后的订单:', JSON.stringify(order, null, 2))
      console.log('   📊 商品变化:', items[itemIndex].name, `${oldQty} -> ${items[itemIndex].qty}`)

      newMessages[messageIndex] = {
        ...msg,
        content: {
          ...msg.content,
          order: order,
        },
      }


      return newMessages
    })

    // 更新聊天历史
    // messageIndex 是 chatMessages 中的索引，需要找到对应的 chatHistory 中的位置
    if (updatedOrder) {
      setChatHistory((prev) => {
        const newHistory = [...prev]
        // 找到 chatMessages 中对应索引的消息，然后在 chatHistory 中找到相同位置的消息
        // 因为 chatMessages 和 chatHistory 是同步的，所以可以直接使用 messageIndex
        if (messageIndex < newHistory.length && newHistory[messageIndex].role === 'assistant' && newHistory[messageIndex].data?.order) {
          newHistory[messageIndex].data.order = JSON.parse(JSON.stringify(updatedOrder))
          console.log('✅ [数量修改] 已更新聊天历史中的订单 (messageIndex:', messageIndex, ')')
          console.log('📦 更新后的订单:', JSON.stringify(updatedOrder, null, 2))
          if (updatedOrder) {
            console.log('📊 订单items详情:', updatedOrder.items?.map((it: any) => `${it.name} x${it.qty}`).join(', '))
          }
        } else {
          console.warn('⚠️ [数量修改] 未找到对应的聊天历史记录')
          console.warn('   messageIndex:', messageIndex)
          console.warn('   chatHistory长度:', newHistory.length)
          console.warn('   对应位置的消息:', messageIndex < newHistory.length ? newHistory[messageIndex] : '超出范围')
        }
        return newHistory
      })
    }
  }

  // 打开属性编辑弹窗
  const openAttrsModal = (messageIndex: number, item: any, itemIndex: number) => {
    setEditingItem({ ...item, index: itemIndex, messageIndex })
    setEditingAttrs(item.attrs || {})
    setShowAttrsModal(true)
  }

  // 保存属性编辑
  const saveAttrs = () => {
    if (editingItem === null) return

    // 如果是结算页面的编辑（没有 messageIndex）
    if (editingItem.messageIndex === undefined) {
      if (!checkoutOrder) return
      const newOrder = { ...checkoutOrder }
      const items = [...newOrder.items]
      items[editingItem.index] = {
        ...items[editingItem.index],
        attrs: { ...editingAttrs },
      }
      newOrder.items = items
      setCheckoutOrder(newOrder)
      setShowAttrsModal(false)
      return
    }

    // 如果是对话页面的编辑（有 messageIndex）

    const messageIndex = editingItem.messageIndex
    let updatedOrder: Order | null = null
    
    setChatMessages((prev) => {
      const newMessages = [...prev]
      const msg = newMessages[messageIndex]
      if (!msg || msg.role !== 'assistant' || !msg.content.order) return prev

      const order = { ...msg.content.order }
      const items = [...order.items]
      items[editingItem.index] = {
        ...items[editingItem.index],
        attrs: { ...editingAttrs },
      }
      order.items = items
      updatedOrder = order

      newMessages[messageIndex] = {
        ...msg,
        content: {
          ...msg.content,
          order: order,
        },
      }


      return newMessages
    })

    // 更新聊天历史
    // messageIndex 是 chatMessages 中的索引，chatHistory 和 chatMessages 是同步的，可以直接使用 messageIndex
    if (updatedOrder) {
      setChatHistory((prev) => {
        const newHistory = [...prev]
        if (messageIndex < newHistory.length && newHistory[messageIndex].role === 'assistant' && newHistory[messageIndex].data?.order) {
          newHistory[messageIndex].data.order = JSON.parse(JSON.stringify(updatedOrder))
          console.log('✅ [属性修改] 已更新聊天历史中的订单 (messageIndex:', messageIndex, ')')
          console.log('📦 更新后的订单:', JSON.stringify(updatedOrder, null, 2))
        } else {
          console.warn('⚠️ [属性修改] 未找到对应的聊天历史记录，messageIndex:', messageIndex, 'chatHistory长度:', newHistory.length)
        }
        return newHistory
      })
    }

    setShowAttrsModal(false)
    setEditingItem(null)
    setEditingAttrs({})
  }

  // 渲染主页
  const renderHomePage = () => (
    <div className="home-page">
      <div className="home-background"></div>
      <button className="ai-fab" onClick={handleOpenAI}>
        <div className="ai-fab-img"></div>
        <span className="ai-fab-badge">点单</span>
      </button>
    </div>
  )

  // 渲染 AI 页面
  const renderAIPage = () => (
    <div className="ai-page">
      <div className="topbar">
        <div className="topbar-left-placeholder"></div>
        <h1 className="title">AI 点单小助手</h1>
        <button className="user-center-btn" onClick={() => {
          setPreviousPage(currentPage)
          setCurrentPage('user')
        }} aria-label="个人中心">
          <User size={18} />
        </button>
      </div>

      <div className="ai-hero">
        <div className="ai-hero-figure"></div>
      </div>

      <div className="ai-tips-wrap">
        <h3 className="ai-subttl">你可以这样对我说：</h3>
        <div className="ai-cards">
          <button className="ai-card" onClick={() => handleSendMessage('我喜欢的')}>
            <Star size={16} className="tag-icon" />
            <span>我喜欢的</span>
          </button>
          <button className="ai-card" onClick={() => handleSendMessage('销量排行')}>
            <TrendingUp size={16} className="tag-icon" />
            <span>销量排行</span>
          </button>
          <button className="ai-card" onClick={() => handleSendMessage('热门推荐')}>
            <Flame size={16} className="tag-icon" />
            <span>热门推荐</span>
          </button>
        </div>
      </div>

      {/* 快速提示词chips */}
      <div className="ai-qs">
        <div className="chip-row">
          {[
            '想要一个鸡肉套餐',
            '给我来点健康低脂餐！',
            '根据我历史订单推荐',
            '我吃不了辣的推荐',
            '来份热量≤500的饮料',
            '今天适合喝什么？',
            '天气热，推荐冷饮',
          ].map((chip, i) => (
            <button key={i} className="chip" onClick={() => handleSendMessage(chip)}>
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* 输入栏 */}
      <div className="ai-input">
        <div className="input-bar">
          <button className="mode-toggle" onClick={toggleInputMode}>
            {inputMode === 'keyboard' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 1 0 6 0V6a3 3 0 0 0-3-3z" strokeWidth="2" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" strokeWidth="2" />
                <path d="M12 19v3" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth="2" />
                <path d="M7 9h.01M11 9h.01M15 9h.01M7 13h10" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>
          {inputMode === 'keyboard' ? (
            <div className="text-input-wrap">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
                placeholder="输入想吃的，或@我点单…"
              />
              <button className="send-btn" onClick={() => handleSendMessage(inputText)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M22 2L11 13" strokeWidth="2" strokeLinecap="round" />
                  <path d="M22 2l-7 20-4-9-9-4 20-7z" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ) : (
            <button className="ptt-btn">按住 说话</button>
          )}
        </div>
      </div>
    </div>
  )

  // 渲染订单卡片
  const renderOrderCard = (order: Order, allowEdit: boolean = false, messageIndex?: number) => {
    const items = order.items.filter((item) => item.qty > 0)
    if (items.length === 0) return null

    return (
      <div className="order-card">
        <div className="order-header">
          <span className="tag">自提</span>
          <span className="tag">外卖</span>
          <span className="order-store">{order.store}</span>
        </div>
        {items.map((item, index) => {
          const realIndex = order.items.findIndex((it) => it === item)
          return (
            <div key={index} className="order-item">
              {item.img && <div className="item-thumb" style={{ backgroundImage: `url(${item.img})` }}></div>}
              <div className="item-info">
                <div className="item-name">{item.name}</div>
                <div className="item-price">{formatCurrency(item.unit_price)}</div>
                {item.attrs && (
                  <div className="item-attrs">
                    {[
                      item.attrs.spicy && `辣度:${item.attrs.spicy}`,
                      typeof item.attrs.scallion === 'boolean' && `葱花:${item.attrs.scallion ? '有' : '无'}`,
                      typeof item.attrs.coriander === 'boolean' && `香菜:${item.attrs.coriander ? '有' : '无'}`,
                    ]
                      .filter(Boolean)
                      .join(' | ')}
                  </div>
                )}
                {allowEdit && messageIndex !== undefined && (
                  <button className="edit-attrs" onClick={() => openAttrsModal(messageIndex, item, realIndex)}>
                    编辑属性
                  </button>
                )}
              </div>
              {allowEdit && messageIndex !== undefined && (
                <div className="item-qty-controls">
                  <button className="qty-btn" onClick={() => handleQuantityChange(messageIndex, realIndex, -1)}>
                    -
                  </button>
                  <span className="qty-num">{item.qty}</span>
                  <button className="qty-btn" onClick={() => handleQuantityChange(messageIndex, realIndex, 1)}>
                    +
                  </button>
                </div>
              )}
              {!allowEdit && <div className="item-qty">× {item.qty}</div>}
            </div>
          )
        })}
        <div className="order-footer">
          <div className="order-total">
            共 <strong>{calculateCount(items)}</strong> 件，小计 <strong>{formatCurrency(calculateTotal(items))}</strong>
          </div>
          <button className="order-checkout-btn" onClick={() => {
            // 深拷贝订单到结算页面，结算页面的修改不会影响对话页面的订单
            setCheckoutOrder(JSON.parse(JSON.stringify(order)))
            setCurrentPage('checkout')
          }}>
            去下单
          </button>
        </div>
      </div>
    )
  }

  // 渲染聊天页面
  const renderChatPage = () => (
    <div className="chat-page">
      <div className="topbar">
        <button className="back-button" onClick={() => setCurrentPage('ai')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>返回</span>
        </button>
        <h1 className="title">AI 点单小助手</h1>
        <button className="user-center-btn" onClick={() => {
          setPreviousPage(currentPage)
          setCurrentPage('user')
        }} aria-label="个人中心">
          <User size={18} />
        </button>
      </div>

      <div className="chat-content" ref={chatContainerRef}>
        {chatMessages.map((msg, index) => (
          <div key={index} className={`message-wrapper ${msg.role}`}>
            {msg.role === 'user' ? (
              <div className="bubble user-bubble">{msg.content}</div>
            ) : (
              <div className="avatar-row">
                <div className="avatar"></div>
                <div className="msg-content">
                  {msg.content.type === 'general_chat' ? (
                    <div className="bubble ai-bubble">{msg.content.reply.text}</div>
                  ) : (
                    <>
                      <div className="bubble ai-bubble">
                        {msg.content.reply?.intro_html && <div dangerouslySetInnerHTML={{ __html: msg.content.reply.intro_html }} />}
                        {msg.content.reply?.title && <div className="pill">{msg.content.reply.title}</div>}
                      </div>
                      {msg.content.order && renderOrderCard(msg.content.order, true, index)}
                      {msg.content.reply?.praise && <div className="praise-message">💝 {msg.content.reply.praise}</div>}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="message-wrapper assistant">
            <div className="avatar-row">
              <div className="avatar"></div>
              <div className="msg-content">
                <div className="bubble ai-bubble">
                  <span className="thinking-text">正在思考</span>
                  <span className="thinking-dots">
                    <span className="dot">.</span>
                    <span className="dot">.</span>
                    <span className="dot">.</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 建议问题chips - 固定在底部 */}
      <div className="chat-suggest">
        <div className="suggest-title">你可以继续问：</div>
        <div className="suggest-chips">
          {suggestedChips.map((chip, i) => (
            <button key={i} className="s-chip" onClick={() => handleSendMessage(chip)}>
              {chip}
            </button>
          ))}
        </div>
      </div>

      <div className="chat-input">
        <div className="input-bar">
          <button className="mode-toggle" onClick={toggleInputMode}>
            {inputMode === 'keyboard' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 1 0 6 0V6a3 3 0 0 0-3-3z" strokeWidth="2" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" strokeWidth="2" />
                <path d="M12 19v3" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth="2" />
                <path d="M7 9h.01M11 9h.01M15 9h.01M7 13h10" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>
          {inputMode === 'keyboard' ? (
            <div className="text-input-wrap">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
                placeholder="继续对话，或输入新的需求…"
                disabled={isLoading}
              />
              <button className="send-btn" onClick={() => handleSendMessage(inputText)} disabled={isLoading}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M22 2L11 13" strokeWidth="2" strokeLinecap="round" />
                  <path d="M22 2l-7 20-4-9-9-4 20-7z" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ) : (
            <button className="ptt-btn">按住 说话</button>
          )}
        </div>
      </div>
    </div>
  )

  // 调整结算页面的商品数量
  const handleCheckoutQuantityChange = (itemIndex: number, delta: number) => {
    if (!checkoutOrder) return

    const newOrder = { ...checkoutOrder }
    const items = [...newOrder.items]
    const positiveCount = items.filter((it) => it.qty > 0).length

    if (items[itemIndex].qty === 1 && delta === -1 && positiveCount === 1) {
      alert('必须至少保留一个商品')
      return
    }

    items[itemIndex] = { ...items[itemIndex], qty: Math.max(0, items[itemIndex].qty + delta) }
    newOrder.items = items
    setCheckoutOrder(newOrder)
  }

  // 打开结算页面的属性编辑弹窗
  const openCheckoutAttrsModal = (item: any, itemIndex: number) => {
    setEditingItem({ ...item, index: itemIndex, messageIndex: undefined })
    setEditingAttrs(item.attrs || {})
    setShowAttrsModal(true)
  }

  // 渲染结算页面
  const renderCheckoutPage = () => {
    if (!checkoutOrder) return null

    const items = checkoutOrder.items.filter((item) => item.qty > 0)

    return (
      <div className="checkout-page">
        <div className="topbar">
          <button className="back-button" onClick={() => setCurrentPage('chat')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>返回</span>
          </button>
          <h1 className="title">确认下单</h1>
        </div>

        <div className="checkout-content">
          <div className="checkout-store">
            <div className="store-name">{checkoutOrder.store}</div>
            <div className="store-info">30分钟送达 · 配送费¥3 · 满减立减</div>
          </div>

          <div className="checkout-card">
            {items.map((item, index) => {
              const realIndex = checkoutOrder.items.findIndex((it) => it === item)
              return (
                <div key={index} className="checkout-item">
                  {item.img && <div className="item-thumb" style={{ backgroundImage: `url(${item.img})` }}></div>}
                  <div className="item-info">
                    <div className="item-name">{item.name}</div>
                    <div className="item-price">{formatCurrency(item.unit_price)}</div>
                    {item.attrs && (
                      <div className="item-attrs">
                        {[
                          item.attrs.spicy && `辣度:${item.attrs.spicy}`,
                          typeof item.attrs.scallion === 'boolean' && `葱花:${item.attrs.scallion ? '有' : '无'}`,
                          typeof item.attrs.coriander === 'boolean' && `香菜:${item.attrs.coriander ? '有' : '无'}`,
                        ]
                          .filter(Boolean)
                          .join(' | ')}
                      </div>
                    )}
                    <button className="edit-attrs" onClick={() => openCheckoutAttrsModal(item, realIndex)}>
                      编辑属性
                    </button>
                  </div>
                  <div className="item-qty-controls">
                    <button className="qty-btn" onClick={() => handleCheckoutQuantityChange(realIndex, -1)}>
                      -
                    </button>
                    <span className="qty-num">{item.qty}</span>
                    <button className="qty-btn" onClick={() => handleCheckoutQuantityChange(realIndex, 1)}>
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="checkout-summary">
            <div className="summary-text">
              共 <strong>{calculateCount(items)}</strong> 件，合计{' '}
              <strong>{formatCurrency(calculateTotal(items))}</strong>
            </div>
            <button className="submit-button" onClick={() => alert('下单成功（示例）')}>
              提交订单
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 渲染个人中心页面
  const renderUserPage = () => (
    <div className="user-page">
      <div className="topbar">
        <button className="back-button" onClick={() => setCurrentPage(previousPage)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>返回</span>
        </button>
        <h1 className="title">个人中心</h1>
      </div>

      <div className="user-content">
        <div className="user-profile">
          <img
            src={aiAvatarImg}
            alt="头像"
            className="user-avatar"
          />
          <div className="user-name">AI会员 普通用户</div>
          <div className="user-desc">欢迎您体验智能点单服务</div>
        </div>

        <div className="orders-block">
          <div className="orders-title">历史订单</div>
          {MOCK_ORDERS.map((order, index) => (
            <div key={index} className="order-card-hist">
              <div className="order-head">订单时间：{order.date}</div>
              {order.items.map((item, i) => (
                <div key={i}>
                  <div className="order-info">
                    {item.name} ×{item.qty}（¥{item.price}）
                  </div>
                  {item.attrs && (
                    <div className="order-attrs">
                      {[
                        item.attrs.spicy && `辣度:${item.attrs.spicy}`,
                        typeof item.attrs.scallion === 'boolean' && `葱花:${item.attrs.scallion ? '有' : '无'}`,
                        typeof item.attrs.coriander === 'boolean' && `香菜:${item.attrs.coriander ? '有' : '无'}`,
                      ]
                        .filter(Boolean)
                        .join(' | ')}
                    </div>
                  )}
                </div>
              ))}
              <div className="order-foot">
                <span>共{order.items.length}件</span>
                <span>
                  总计 <b>¥{order.total}</b>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // 渲染属性编辑弹窗
  const renderAttrsModal = () => {
    if (!showAttrsModal) return null

    return (
      <div className="modal-overlay">
        <div className="modal-mask" onClick={() => setShowAttrsModal(false)}></div>
        <div className="modal-box attrs-modal">
          <div className="modal-title">编辑商品属性</div>
          <div className="attrs-form">
            <div className="form-group">
              <label>辣度</label>
              <select
                value={editingAttrs.spicy || ''}
                onChange={(e) => setEditingAttrs({ ...editingAttrs, spicy: e.target.value as any })}
              >
                <option value="">不选择</option>
                <option value="不辣">不辣</option>
                <option value="微辣">微辣</option>
                <option value="中辣">中辣</option>
                <option value="重辣">重辣</option>
              </select>
            </div>
            <div className="form-group">
              <label>葱花</label>
              <select
                value={editingAttrs.scallion === undefined ? '' : editingAttrs.scallion.toString()}
                onChange={(e) =>
                  setEditingAttrs({
                    ...editingAttrs,
                    scallion: e.target.value === '' ? undefined : e.target.value === 'true',
                  })
                }
              >
                <option value="">不选择</option>
                <option value="true">有</option>
                <option value="false">无</option>
              </select>
            </div>
            <div className="form-group">
              <label>香菜</label>
              <select
                value={editingAttrs.coriander === undefined ? '' : editingAttrs.coriander.toString()}
                onChange={(e) =>
                  setEditingAttrs({
                    ...editingAttrs,
                    coriander: e.target.value === '' ? undefined : e.target.value === 'true',
                  })
                }
              >
                <option value="">不选择</option>
                <option value="true">有</option>
                <option value="false">无</option>
              </select>
            </div>
          </div>
          <div className="modal-actions">
            <button className="modal-cancel" onClick={() => setShowAttrsModal(false)}>
              取消
            </button>
            <button className="modal-confirm" onClick={saveAttrs}>
              保存
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 根据当前页面渲染内容
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home':
        return renderHomePage()
      case 'ai':
        return renderAIPage()
      case 'chat':
        return renderChatPage()
      case 'checkout':
        return renderCheckoutPage()
      case 'user':
        return renderUserPage()
      default:
        return renderHomePage()
    }
  }

  return (
    <div className="smartorder-container">
      <div className="smartorder-home-button">
        <HomeButton />
      </div>
      <PhoneFrame>{renderCurrentPage()}</PhoneFrame>
      {renderAttrsModal()}
    </div>
  )
}

