## 本地 Python 服务启动方式

1. 进入目录：
   ```bash
   cd /Users/nirvana/Desktop/Cursor/Profile-Page/server
   ```
2. 使用本地 Anaconda 创建/激活环境，例如：
   ```bash
   conda create -n excel-tool python=3.11 -y
   conda activate excel-tool
   ```
3. 安装依赖：
   ```bash
   pip install -r requirements.txt
   ```
4. 配置环境变量：
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，填入 DASHSCOPE_API_KEY
   ```
   > **获取 API Key**：访问 [阿里云 DashScope 控制台](https://dashscope.console.aliyun.com/)
5. 启动 FastAPI 服务：
   ```bash
   uvicorn app:app --reload --port 8000
   ```

## 项目结构

```
server/
├── app.py                    # 主应用，注册路由和中间件
├── tools/                    # 工具特定代码
│   └── askdata/             # 智能问数工具
│       ├── router.py        # 工具路由定义
│       ├── code_generator.py # 代码生成逻辑
│       └── excel_processor.py # Excel 处理逻辑
└── requirements.txt
```

## 可用接口

### 通用接口
- `GET /api/health`：健康检查

### 智能问数工具接口
- `POST /api/analyze`：上传 `.xlsx`，返回结构化表格信息及 `stored_file_path`
- `POST /api/generate-code`：生成 Pandas 代码
- `POST /api/execute-code`：执行生成的代码
- `POST /api/summarize-result`：总结执行结果

### 智能报告工具接口
- `POST /api/smartreport/generate-outline`：生成报告大纲
- `POST /api/smartreport/split-tasks`：拆分撰写任务
- `POST /api/smartreport/write-content`：撰写单个任务的内容（使用 RAG）
- `POST /api/smartreport/knowledge-base/upload`：上传文档到知识库
- `GET /api/smartreport/knowledge-base/list`：列出知识库中的文档
- `POST /api/smartreport/knowledge-base/clear`：清空知识库

### 智能点单工具接口
- `POST /api/smartorder/recommend`：智能点单推荐（代理 DashScope API）

### 智能规划工具
- 前端专用工具，无后端接口

## 添加新工具

1. 在 `tools/` 下创建新工具目录（如 `tools/your-tool/`）
2. 创建 `router.py` 定义工具路由
3. 在 `app.py` 中导入并注册路由：
   ```python
   from tools.your_tool.router import router as your_tool_router
   app.include_router(your_tool_router)
   ```

