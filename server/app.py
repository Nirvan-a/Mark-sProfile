"""
个人主页 API 主应用
负责注册路由和配置中间件
"""
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRouter
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

# 加载 .env 文件中的环境变量
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

# 导入所有工具路由（单栈模式）
routers = {}

try:
    from tools.askdata.router import router as askdata_router
    routers['askdata'] = askdata_router
    print("✓ 已加载智能问数工具路由")
except ImportError as e:
    print(f"⚠️ 无法导入智能问数工具路由: {e}")

try:
    from tools.smartreport.router import router as smartreport_router
    routers['smartreport'] = smartreport_router
    print("✓ 已加载智能报告工具路由")
except ImportError as e:
    print(f"⚠️ 无法导入智能报告工具路由: {e}")

try:
    from tools.smartorder.router import router as smartorder_router
    routers['smartorder'] = smartorder_router
    print("✓ 已加载智能点单工具路由")
except ImportError as e:
    print(f"⚠️ 无法导入智能点单工具路由: {e}")

# 打印加载的工具
if routers:
    print(f"🎉 已加载工具路由: {', '.join(routers.keys())}")
else:
    print("⚠️ 未加载任何工具路由")

app = FastAPI(title="个人主页 API", version="1.0.0")

# 挂载图表静态文件服务（smartreport工具）
charts_dir = Path(__file__).parent / "tools" / "smartreport" / "resources" / "static" / "charts"
charts_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static/charts", StaticFiles(directory=str(charts_dir)), name="charts")
print(f"✓ 已挂载图表静态文件服务: /static/charts -> {charts_dir}")

# 挂载知识库文档下载服务
documents_dir = Path(__file__).parent / "tools" / "smartreport" / "resources" / "documents"
documents_dir.mkdir(parents=True, exist_ok=True)
app.mount("/documents", StaticFiles(directory=str(documents_dir)), name="documents")
print(f"✓ 已挂载文档下载服务: /documents -> {documents_dir}")

# 挂载示例文件服务（smartreport工具）
example_dir = Path(__file__).parent / "tools" / "smartreport" / "resources" / "example"
example_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static/example", StaticFiles(directory=str(example_dir)), name="example")
print(f"✓ 已挂载示例文件服务: /static/example -> {example_dir}")


# 全局异常处理
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """全局异常处理器，确保所有错误都返回 JSON 格式"""
    error_message = str(exc)
    
    # 根据异常类型设置状态码
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    if "API key" in error_message or "401" in error_message or "authentication" in error_message.lower():
        status_code = status.HTTP_401_UNAUTHORIZED
        error_message = "API Key 认证失败，请检查 DASHSCOPE_API_KEY 配置"
    elif "404" in error_message or "not found" in error_message.lower():
        status_code = status.HTTP_404_NOT_FOUND
    
    return JSONResponse(
        status_code=status_code,
        content={
            "detail": error_message,
            "error": type(exc).__name__,
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """请求验证异常处理器"""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "请求参数验证失败",
            "errors": exc.errors(),
        }
    )

# CORS 配置
# 开发环境配置
cors_origins = [
    "http://localhost:5173",  # 本地开发
]

# 从环境变量读取额外的允许来源
additional_origins = os.getenv("CORS_ORIGINS", "").split(",")
cors_origins.extend([origin.strip() for origin in additional_origins if origin.strip()])

# 过滤掉空字符串
cors_origins = [origin for origin in cors_origins if origin]

print(f"🔒 CORS 允许的来源: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# 根路径健康检查
@app.get("/")
def root():
    """根路径健康检查"""
    return {"status": "ok", "message": "Profile Page API"}


# 通用 API 路由
api_router = APIRouter(prefix="/api")


@api_router.get("/health")
def health():
    """健康检查"""
    return {"status": "ok"}


# 注册路由
app.include_router(api_router)

# 动态注册工具路由
for tool_name, router in routers.items():
    print(f"注册工具路由: {tool_name}")
    app.include_router(router)
