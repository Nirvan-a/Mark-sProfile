# Deep Research 模块

## 📋 模块说明

Deep Research 模块实现了深度研究写作工作流的核心组件。

## 📦 Phase 1 已实现模块

### 1. 临时知识库管理器 (`temporary_kb.py`)

**功能**:
- 为每个任务创建独立的临时向量库
- 存储检索结果（联网+知识库）
- 支持检索优先级：临时知识库 → 全部知识库/联网
- 任务完成后可清空

**使用示例**:
```python
from tools.smartreport.deep_research import TemporaryKnowledgeBase

# 创建临时知识库
temp_kb = TemporaryKnowledgeBase(task_id="task_123")

# 添加检索结果
results = [
    {"content": "这是检索到的内容", "title": "标题", "source": "web"}
]
temp_kb.add_search_results(results)

# 检索
search_results = temp_kb.search("查询内容", k=5)

# 任务完成后清空
temp_kb.clear()
```

**主要方法**:
- `add_search_results(results)`: 添加检索结果
- `search(query, k=5)`: 检索临时知识库
- `clear()`: 清空临时知识库

### 2. 历史写作管理器 (`writing_history.py`)

**功能**:
- 存储已完成的章节（按层级索引）
- 支持标题精确匹配
- 提供历史标题列表（用于展示给模型）

**使用示例**:
```python
from tools.smartreport.deep_research import WritingHistoryManager

# 创建历史管理器
history = WritingHistoryManager()

# 添加已完成的章节
section_id = history.add_section(
    title="### 1.1 子标题",
    content="章节内容...",
    parent_title="## 第一章"
)

# 获取历史标题列表（给模型展示）
titles = history.get_history_titles_formatted()

# 按标题精确检索
content = history.search_by_title(section_id)

# 清空历史
history.clear()
```

**主要方法**:
- `add_section(title, content, parent_title, section_id)`: 添加章节
- `get_history_titles()`: 获取所有历史标题
- `get_history_titles_formatted()`: 获取格式化的标题列表
- `search_by_title(section_id)`: 按ID精确检索
- `search_by_title_name(title)`: 按标题名称精确检索
- `clear()`: 清空历史

## 🔧 技术实现

### 临时知识库
- 使用 FAISS 向量存储
- 任务隔离（每个任务独立的存储目录）
- 基于 DashScope 嵌入模型

### 历史写作管理器
- 双重索引：标题索引 + 向量索引
- 层级管理：支持总标题、一级标题、二级标题
- 语义检索：只检索二级标题，限制最多3个结果

## 📝 注意事项

1. **临时知识库**：
   - 每个任务应该有唯一的 `task_id`
   - 任务完成后记得调用 `clear()` 清理
   - 存储位置：`uploads/smartreport/temp_kb/{task_id}/`

2. **历史写作管理器**：
   - 章节标题会自动清理 Markdown 标记
   - 只有二级标题会被加入向量库用于语义检索
   - 语义检索限制最多返回3个结果

3. **环境变量**：
   - 需要配置 `DASHSCOPE_API_KEY` 用于嵌入模型

## 📦 Phase 2 已实现模块

### 3. 规划智能体 (`planning_agent.py`)

**功能**:
- 根据用户问题/需求生成结构化写作大纲
- 包含总标题、一级标题（2-4个）、二级标题（每个一级标题下2-4个）
- 生成Markdown格式大纲
- 提供二级标题章节列表（用于写作循环）

**使用示例**:
```python
from tools.smartreport.deep_research import PlanningAgent

# 创建规划智能体
planner = PlanningAgent()

# 生成大纲
outline = planner.generate_outline("分析核能发展现状与未来趋势")

# 获取所有二级标题章节列表
sections = planner.get_all_level2_sections(outline)
# 返回: [
#   {"section_id": "section_1", "level1_title": "...", "level2_title": "...", "index": 1},
#   ...
# ]
```

**主要方法**:
- `generate_outline(requirement)`: 生成大纲
- `get_all_level2_sections(outline)`: 获取所有二级标题章节列表

**输出格式**:
```python
{
    "title": "总标题",
    "sections": [
        {
            "level1_title": "一级标题",
            "level2_titles": ["二级标题1", "二级标题2", ...]
        },
        ...
    ],
    "estimated_words": 预估字数,
    "outline_markdown": "Markdown格式的大纲"
}
```

### 4. 信息充分性判断器 (`information_evaluator.py`)

**功能**:
- 评估检索信息是否足够支撑章节写作
- 使用LLM进行智能判断
- 决定是否需要继续检索（最多3轮）
- 提供评估分数和理由

**使用示例**:
```python
from tools.smartreport.deep_research import InformationSufficiencyEvaluator

# 创建评估器
evaluator = InformationSufficiencyEvaluator()

# 评估信息充分性
section = {
    "level1_title": "核能发展现状",
    "level2_title": "全球核能装机容量分析"
}
search_results = [...]  # 检索结果列表

evaluation = evaluator.evaluate(
    section=section,
    search_results=search_results,
    round=1,  # 当前检索轮次
    max_rounds=3
)

# 返回: {
#   "sufficient": True/False,
#   "reason": "判断理由",
#   "score": 0.0-1.0,
#   "should_continue": True/False
# }
```

**主要方法**:
- `evaluate(section, search_results, round, max_rounds)`: 评估信息充分性

**评估逻辑**:
- 使用LLM评估信息的相关性和完整性
- 分数>=0.7认为足够
- 达到最大轮次时强制停止
- LLM评估失败时使用简单规则回退

## 📦 Phase 3 已实现模块

### 5. 工具调用协调器 (`tool_orchestrator.py`)

**功能**:
- 协调多个检索源（临时知识库、全部知识库、联网检索）
- 管理检索轮次（每章节最多3次）
- 实现检索优先级：临时知识库 → 全部知识库 → 联网检索
- 自动将检索结果存入临时知识库
- 集成信息充分性判断

**使用示例**:
```python
from tools.smartreport.deep_research import ToolOrchestrator, TemporaryKnowledgeBase

# 创建临时知识库和协调器
temp_kb = TemporaryKnowledgeBase(task_id="task_123")
orchestrator = ToolOrchestrator(temp_kb)

# 收集信息
section = {
    "level1_title": "核能发展现状",
    "level2_title": "全球核能装机容量分析"
}

result = orchestrator.collect_information(
    section=section,
    max_rounds=3,
    k_per_round=5
)

# 返回: {
#   "all_results": [...],      # 所有检索结果
#   "rounds": 2,                # 实际检索轮次
#   "sufficient": True,         # 信息是否足够
#   "evaluation": {...}         # 评估结果
# }
```

**主要方法**:
- `collect_information(section, max_rounds, k_per_round)`: 收集信息（最多3轮）
- `create_langchain_tools()`: 创建 LangChain Tools（用于写作智能体）

**检索流程**:
1. 第1轮：先查临时知识库，如果没有再查全部知识库+联网
2. 评估信息是否足够
3. 如果不够，继续第2轮...
4. 最多3轮，或信息足够时停止

### 6. 写作智能体 (`writing_agent.py`)

**功能**:
- 执行章节写作任务
- 生成完整的二级标题章节
- 支持历史章节回顾（最多3个二级标题）
- 整合检索结果和历史内容
- 确保章节完整性

**使用示例**:
```python
from tools.smartreport.deep_research import WritingAgent, WritingHistoryManager

# 创建写作智能体和历史管理器
history = WritingHistoryManager()
writer = WritingAgent(history_manager=history)

# 撰写章节
section = {
    "section_id": "section_1",
    "level1_title": "核能发展现状",
    "level2_title": "全球核能装机容量分析",
    "index": 1
}

content = writer.write_section(
    section=section,
    search_results=[...],  # 检索结果
    history_sections=[...],  # 历史章节内容（最多3个）
    outline="完整大纲...",
    previous_sections_summary="前文摘要..."
)

# 返回完整的章节内容（Markdown格式）
```

**主要方法**:
- `write_section(section, search_results, history_sections, outline, previous_sections_summary)`: 撰写完整章节
- `select_history_sections(section, max_sections)`: 选择需要回顾的历史章节（使用LLM判断）

**写作流程**:
1. 获取历史标题列表
2. 使用LLM判断是否需要回顾历史章节（最多3个二级标题）
3. 整合检索结果、历史内容、前文摘要
4. 生成完整的二级标题章节
5. 验证章节完整性

## 📦 Phase 4 已实现模块

### 7. 工作流编排器 (`workflow.py`)

**功能**:
- 使用 LangGraph 编排完整的 Deep Research 工作流
- 状态管理和流程控制
- 条件分支和循环控制

**工作流节点**:
1. `initialize` - 初始化（创建临时知识库、历史管理器等）
2. `planning` - 规划（生成大纲）
3. `prepare_section` - 准备章节（选择历史章节回顾）
4. `collect_info` - 信息收集（最多3轮检索）
5. `writing` - 写作（撰写完整章节）
6. `save_section` - 保存章节（存入历史）
7. `complete` - 完成（清空临时知识库）

**工作流流程**:
```
初始化 → 规划 → [准备章节 → 信息收集 → 写作 → 保存章节] × N → 完成
```

**使用示例**:
```python
from tools.smartreport.deep_research import get_deep_research_workflow

# 获取工作流
workflow = get_deep_research_workflow()

# 运行工作流
initial_state = {
    "requirement": "分析核能发展现状",
    "task_id": "task_123",
    # ... 其他状态字段
}

final_state = workflow.invoke(initial_state)
```

### 8. Deep Research API (`api.py`)

**功能**:
- 封装工作流调用
- 提供简洁的 API 接口
- 状态管理

**使用示例**:
```python
from tools.smartreport.deep_research import get_deep_research_api

# 获取 API 实例
api = get_deep_research_api()

# 运行完整工作流
result = api.run_workflow(
    requirement="分析核能发展现状与未来趋势",
    task_id="task_123"  # 可选
)

# 返回: {
#   "task_id": "...",
#   "outline": {...},
#   "sections": [...],
#   "all_written_sections": [...],
#   "is_complete": True
# }
```

## 🔌 API 接口

### Deep Research 工作流接口

**POST** `/api/smartreport/deep-research/run`

**请求体**:
```json
{
  "requirement": "用户需求/问题",
  "task_id": "任务ID（可选）"
}
```

**响应**:
```json
{
  "task_id": "任务ID",
  "outline": {
    "title": "总标题",
    "sections": [...],
    "estimated_words": 8000
  },
  "sections": [
    {
      "section_id": "section_1",
      "level1_title": "一级标题",
      "level2_title": "二级标题",
      "index": 1
    },
    ...
  ],
  "all_written_sections": [
    {
      "section_id": "section_1",
      "level1_title": "一级标题",
      "level2_title": "二级标题",
      "content": "完整的章节内容..."
    },
    ...
  ],
  "is_complete": true
}
```

## 🎯 完整工作流说明

### 工作流执行流程

1. **初始化阶段**
   - 生成任务ID
   - 创建临时知识库
   - 创建历史写作管理器
   - 初始化工具协调器和写作智能体

2. **规划阶段**
   - 使用规划智能体生成大纲
   - 提取所有二级标题章节列表
   - 用户确认（后续可扩展）

3. **写作循环**（对每个二级标题章节）
   - **准备章节**：
     - 获取历史标题列表
     - 使用LLM判断是否需要回顾历史章节（最多3个）
   - **信息收集**（最多3轮）：
     - 第1轮：先查临时知识库，没有则查全部知识库+联网
     - 评估信息是否足够
     - 如果不够，继续第2轮...
     - 最多3轮或信息足够时停止
   - **写作**：
     - 整合检索结果、历史内容、前文摘要
     - 生成完整的二级标题章节
   - **保存**：
     - 存入历史写作管理器
     - 更新索引

4. **完成阶段**
   - 清空临时知识库
   - 返回所有已写章节

## 📝 注意事项

1. **LangGraph 依赖**：
   - 需要安装 `langgraph>=0.0.20`
   - 如果未安装，工作流功能不可用

2. **环境变量**：
   - `DASHSCOPE_API_KEY` - 必需，用于 LLM 和嵌入模型
   - `TAVILY_API_KEY` - 可选，用于联网检索（有默认值）

3. **任务隔离**：
   - 每个任务有独立的临时知识库
   - 任务完成后自动清空临时知识库
   - 历史写作管理器是全局的（跨任务共享）

4. **性能考虑**：
   - 工作流是同步执行的，可能需要较长时间
   - 后续可以扩展为异步执行和流式输出

