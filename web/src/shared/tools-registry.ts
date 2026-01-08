/**
 * 工具注册表
 * 集中管理所有工具的元数据和配置
 */

// 导入背景图片
import askdataBg from '../pages/assets/askdata-bg.webp'
import smartreportBg from '../pages/assets/smartreport-bg.webp'
import smartorderBg from '../pages/assets/smartorder-bg.webp'
import smartplanBg from '../pages/assets/smartplan-bg.webp'

export interface ToolMetadata {
  /** 工具唯一标识（用于路由路径） */
  id: string
  /** 工具显示名称 */
  name: string
  /** 工具描述 */
  description: string
  /** 工具图标（emoji 或图片路径） */
  icon: string
  /** 背景图片 */
  image?: string
  /** 路由路径（默认使用 id） */
  path?: string
  /** 工具组件（懒加载） */
  component: () => Promise<{ default: React.ComponentType }>
  /** 是否在主页显示（默认 true） */
  visible?: boolean
  /** 工具分类（可选，用于分组） */
  category?: string
}

/**
 * 工具注册表
 * 添加新工具时，只需在此处注册即可
 */
export const toolsRegistry: ToolMetadata[] = [
  {
    id: 'askdata',
    name: '智能问数',
    description: 'Excel数据自然语言查询助手',
    icon: '📊',
    image: askdataBg,
    component: () => import('../tools/askdata'),
  },
  {
    id: 'smartreport',
    name: '智能报告',
    description: '推理检索，深度报告生成助手',
    icon: '📝',
    image: smartreportBg,
    component: () => import('../tools/smartreport'),
  },
  {
    id: 'smartorder',
    name: '智能点单',
    description: '一个参与竞标的AI点单原型设计',
    icon: '🍽️',
    image: smartorderBg,
    component: () => import('../tools/smartorder'),
  },
  {
    id: 'smartplan',
    name: '智能规划',
    description: '可联网、代码、文件等的规划助手',
    icon: '📅',
    image: smartplanBg,
    component: () => import('../tools/smartplan'),
    category: '开发中',
  },
]

/**
 * 根据 ID 获取工具配置
 */
export function getToolById(id: string): ToolMetadata | undefined {
  return toolsRegistry.find(tool => tool.id === id)
}

/**
 * 获取所有可见的工具
 */
export function getVisibleTools(): ToolMetadata[] {
  return toolsRegistry.filter(tool => tool.visible !== false)
}

/**
 * 根据分类获取工具
 */
export function getToolsByCategory(category?: string): ToolMetadata[] {
  if (!category) return getVisibleTools()
  return getVisibleTools().filter(tool => tool.category === category)
}

