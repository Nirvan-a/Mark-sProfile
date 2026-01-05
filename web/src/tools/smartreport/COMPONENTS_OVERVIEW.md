# 智能报告前端组件梳理

## 📁 文件结构

```
web/src/tools/smartreport/
├── index.ts                    # 导出入口
├── api.ts                      # API调用封装
├── SmartReport.tsx             # 主组件（核心）
├── SmartReport.css             # 主组件样式
│
├── WorkflowProgress.tsx        # 工作流进度展示组件 ✅ 使用中
├── WorkflowProgress.css        # 进度组件样式
│
├── WorkflowNode.tsx            # 工作流节点详情组件 ✅ 使用中
├── WorkflowNode.css            # 节点组件样式
│
├── EditableMarkdown.tsx        # 可编辑Markdown组件 ✅ 使用中
├── EditableMarkdown.css        # Markdown编辑器样式
│
├── ReportPreview.tsx           # 报告预览模态框 ✅ 使用中
├── ReportPreview.css           # 预览组件样式
│
├── SearchResultsView.tsx       # 检索结果展示组件 ⚠️ 部分使用
├── SearchResultsView.css       # 检索结果样式
│
├── SearchProcess.tsx            # 检索过程动画组件 ❌ 未使用
├── SearchProcess.css            # 检索过程样式
│
├── SearchResultsHistory.tsx    # 检索结果历史组件 ❌ 未使用
├── SearchResultsHistory.css    # 检索历史样式
│
└── assets/
    └── repo-icon.svg           # 图标资源
```

---

## 🎯 核心组件功能说明

### 1. **SmartReport.tsx** - 主组件
**功能：**
- 智能报告工具的主入口组件
- 管理整个工作流的状态和交互
- 集成所有子组件的展示逻辑

**主要功能模块：**
- ✅ **知识库管理**：上传文档、初始化知识库、查看文档列表
- ✅ **知识库检索**：向量检索知识库内容
- ✅ **联网检索**：使用Tavily API进行网络搜索
- ✅ **Deep Research工作流**：
  - 生成报告大纲（规划阶段）
  - 用户确认/编辑大纲
  - 执行完整撰写工作流
  - 实时展示工作流进度和节点详情

**状态管理：**
- 消息列表（对话历史）
- 大纲内容（可编辑）
- 工作流状态（阶段、进度、节点）
- 知识库文档列表
- 加载状态和阶段

**使用的子组件：**
- `WorkflowProgress` - 显示工作流整体进度
- `WorkflowNode` - 显示每个模型请求节点的详情
- `EditableMarkdown` - 大纲编辑
- `ReportPreview` - 最终报告预览
- `SearchResultsView` - 检索结果展示（旧版，可能不再使用）

---

### 2. **WorkflowProgress.tsx** - 工作流进度展示
**功能：**
- 展示Deep Research工作流的整体进度
- 显示当前阶段、章节进度、信息收集轮次等

**显示内容：**
- 当前工作流阶段（初始化、规划、准备章节、信息收集、撰写、保存、完成）
- 章节进度（当前章节/总章节数）
- 章节标题（一级标题、二级标题）
- 信息收集轮次（当前轮次/最大轮次）

**状态：**
- `phase`: 工作流阶段
- `currentSectionIndex`: 当前章节索引
- `totalSections`: 总章节数
- `sectionTitle`: 当前章节标题
- `level1Title`: 一级标题
- `infoCollectionRound`: 信息收集轮次

---

### 3. **WorkflowNode.tsx** - 工作流节点详情
**功能：**
- 展示每个模型请求节点的详细信息
- 实时显示节点的执行状态

**节点类型：**
- `planning` - 规划阶段（生成大纲）
- `writing` - 撰写章节
- `evaluating` - 评估信息充分性
- `selecting_history` - 选择历史章节回顾
- `collecting_info` - 信息收集（知识库+网络搜索）
- `saving` - 保存章节

**显示内容：**
- 节点类型图标和标签
- 使用的模型名称
- 节点状态（pending/running/completed/error）
- 详细信息（章节标题、检索结果数量、轮次等）
- 时间戳
- 错误信息（如有）

**状态：**
- `status`: pending | running | completed | error
- `timestamp`: 节点创建时间
- `details`: 节点详细信息对象

---

### 4. **EditableMarkdown.tsx** - 可编辑Markdown组件
**功能：**
- 提供Markdown内容的编辑和预览功能
- 用于大纲的编辑和确认

**功能特性：**
- 编辑模式：文本输入框
- 预览模式：Markdown渲染
- 工具栏：切换编辑/预览
- 禁用状态：只读预览

**使用场景：**
- 大纲编辑和确认
- 报告内容预览

---

### 5. **ReportPreview.tsx** - 报告预览模态框
**功能：**
- 以模态框形式展示完整的报告内容
- 使用ReactMarkdown渲染Markdown格式

**功能特性：**
- 模态框展示（基于共享组件Modal）
- Markdown渲染（支持GFM扩展）
- 可自定义标题
- 关闭按钮

**使用场景：**
- 查看最终生成的完整报告
- 报告内容预览

---

### 6. **SearchResultsView.tsx** - 检索结果展示（旧版）
**功能：**
- 展示知识库检索和网络检索的结果
- 显示检索过程动画和结果汇总

**状态：** ⚠️ 部分使用中（可能用于旧版工作流）

**显示内容：**
- 检索过程动画
- 网络检索结果列表
- 知识库检索结果列表
- 检索分析摘要

---

### 7. **SearchProcess.tsx** - 检索过程动画（未使用）
**功能：**
- 展示检索过程的动画效果
- 模拟检索步骤（连接、搜索、分析、撰写）

**状态：** ❌ 未使用（已被WorkflowProgress和WorkflowNode替代）

---

### 8. **SearchResultsHistory.tsx** - 检索结果历史（未使用）
**功能：**
- 展示历史检索结果的折叠列表
- 按任务分组显示检索结果

**状态：** ❌ 未使用（已被WorkflowNode替代）

---

## 🔌 API模块

### **api.ts** - API调用封装
**功能：**
- 封装所有智能报告相关的后端API调用
- 提供TypeScript类型定义

**API分类：**

1. **旧版API（可能不再使用）：**
   - `generateOutline` - 生成大纲
   - `splitTasks` - 拆分任务
   - `writeContent` - 撰写内容

2. **知识库管理API：**
   - `uploadDocument` - 上传文档
   - `listDocuments` - 列出文档
   - `clearKnowledgeBase` - 清空知识库
   - `initializeKnowledgeBase` - 初始化知识库（从目录加载）
   - `searchKnowledgeBase` - 检索知识库

3. **联网检索API：**
   - `webSearch` - 网络搜索（Tavily API）

4. **Deep Research工作流API：**
   - `generateDeepResearchOutline` - 仅生成大纲
   - `runDeepResearch` - 执行完整工作流

---

## 📊 组件关系图

```
SmartReport (主组件)
│
├── WorkflowProgress (工作流进度)
│   └── 显示整体进度和阶段
│
├── WorkflowNode[] (工作流节点列表)
│   └── 显示每个模型请求的详情
│
├── EditableMarkdown (大纲编辑器)
│   └── 编辑和预览大纲
│
├── ReportPreview (报告预览)
│   └── 模态框展示最终报告
│
└── SearchResultsView (检索结果 - 旧版)
    └── 展示检索结果（可能不再使用）
```

---

## 🎨 样式文件

所有组件都有对应的CSS文件，用于样式定义：
- `SmartReport.css` - 主组件样式
- `WorkflowProgress.css` - 进度组件样式
- `WorkflowNode.css` - 节点组件样式
- `EditableMarkdown.css` - Markdown编辑器样式
- `ReportPreview.css` - 预览组件样式
- `SearchResultsView.css` - 检索结果样式
- `SearchProcess.css` - 检索过程样式（未使用）
- `SearchResultsHistory.css` - 检索历史样式（未使用）

---

## 🔄 工作流流程

### Deep Research工作流（当前使用）

1. **用户输入需求** → `SmartReport.handleSubmit`
2. **生成大纲** → `generateDeepResearchOutline` API
   - 显示规划节点（`WorkflowNode` type: planning）
3. **用户确认大纲** → `SmartReport.handleConfirmOutline`
   - 使用 `EditableMarkdown` 编辑大纲
4. **执行工作流** → `runDeepResearch` API
   - 显示 `WorkflowProgress`（整体进度）
   - 依次添加 `WorkflowNode`（每个模型请求节点）
5. **完成** → 显示最终报告
   - 使用 `ReportPreview` 预览完整报告

---

## 📝 总结

### ✅ 正在使用的组件
1. `SmartReport.tsx` - 主组件
2. `WorkflowProgress.tsx` - 工作流进度
3. `WorkflowNode.tsx` - 工作流节点详情
4. `EditableMarkdown.tsx` - 大纲编辑器
5. `ReportPreview.tsx` - 报告预览
6. `api.ts` - API封装

### ⚠️ 部分使用的组件
1. `SearchResultsView.tsx` - 检索结果展示（可能用于旧版功能）

### ❌ 未使用的组件（可考虑清理）
1. `SearchProcess.tsx` - 检索过程动画
2. `SearchResultsHistory.tsx` - 检索结果历史

### 🎯 核心功能
- **知识库管理**：上传、初始化、检索
- **联网检索**：网络搜索
- **Deep Research工作流**：规划 → 确认 → 撰写 → 完成
- **实时进度展示**：工作流进度 + 节点详情

