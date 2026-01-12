"""
智能报告工具路由
"""
import json
import shutil
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from .api import get_deep_research_api, WorkflowError
from .services.knowledge_base import get_knowledge_base_manager, DOCUMENTS_DIR
from .services.web_search import get_web_search_manager

# 创建工具路由
router = APIRouter(prefix="/api")


class DeepResearchRequest(BaseModel):
    requirement: str
    task_id: Optional[str] = None
    outline: Optional[dict] = None


class GenerateOutlineRequest(BaseModel):
    requirement: str


@router.post("/smartreport/deep-research/generate-outline")
async def generate_outline(payload: GenerateOutlineRequest):
    """
    仅生成 Deep Research 大纲（不执行完整工作流）
    """
    try:
        api = get_deep_research_api()
        result = api.generate_outline_only(payload.requirement)
        return result
    except WorkflowError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成大纲失败: {str(e)}")


@router.post("/smartreport/deep-research/run")
async def run_deep_research(payload: DeepResearchRequest):
    """
    运行 Deep Research 工作流（流式输出）
    使用 Server-Sent Events (SSE) 实时返回工作流状态更新
    """
    task_id = payload.task_id
    last_state = None
    
    try:
        api = get_deep_research_api()
        
        def event_generator():
            """生成 SSE 事件"""
            nonlocal last_state
            import time
            chunk_count = 0
            print(f"[DEBUG] event_generator: 开始，任务ID: {task_id}，时间: {time.strftime('%H:%M:%S')}")
            try:
                stream_iter = api.stream_workflow(
                    requirement=payload.requirement,
                    task_id=task_id,
                    outline=payload.outline
                )
                print(f"[DEBUG] event_generator: stream_workflow 迭代器已创建")
                
                for chunk in stream_iter:
                    chunk_count += 1
                    print(f"[DEBUG] event_generator: 收到 chunk #{chunk_count}，长度: {len(chunk)} 字符，时间: {time.strftime('%H:%M:%S')}")
                    
                    # chunk 已经是 JSON 字符串，尝试从中提取 state（用于客户端断开时的清理）
                    try:
                        event_data = json.loads(chunk.strip())
                        event_type = event_data.get('type', 'unknown')
                        node_name = event_data.get('node', 'unknown')
                        print(f"[DEBUG] event_generator: chunk #{chunk_count} 类型: {event_type}，节点: {node_name}")
                        if event_data.get('state'):
                            last_state = event_data['state']
                            print(f"[DEBUG] event_generator: 已更新 last_state")
                    except Exception as e:
                        print(f"[DEBUG] event_generator: 解析 chunk 失败: {e}，chunk 内容: {chunk[:200]}")
                    
                    # SSE 格式: "data: {json}\n\n"
                    sse_data = f"data: {chunk}\n\n"
                    print(f"[DEBUG] event_generator: 准备 yield SSE 数据，长度: {len(sse_data)} 字符")
                    yield sse_data
                    print(f"[DEBUG] event_generator: SSE 数据已 yield，时间: {time.strftime('%H:%M:%S')}")
                
                print(f"[DEBUG] event_generator: stream_workflow 迭代完成，共处理 {chunk_count} 个 chunk，时间: {time.strftime('%H:%M:%S')}")
            except GeneratorExit:
                # 客户端断开连接，清理资源
                print(f"[DEBUG] event_generator: GeneratorExit，客户端断开连接，任务ID: {task_id}，时间: {time.strftime('%H:%M:%S')}")
                print(f"⚠️ 客户端断开连接，任务ID: {task_id}")
                _cleanup_task_resources(task_id, last_state)
                raise
            except Exception as e:
                # 发送错误事件
                import traceback
                print(f"[ERROR] event_generator: 异常发生，任务ID: {task_id}，时间: {time.strftime('%H:%M:%S')}")
                print(f"[ERROR] event_generator: 异常信息: {str(e)}")
                print(f"[ERROR] event_generator: 异常堆栈:\n{traceback.format_exc()}")
                error_data = json.dumps({
                    "type": "error",
                    "error": str(e),
                }, ensure_ascii=False)
                yield f"data: {error_data}\n\n"
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",  # 禁用 Nginx 缓冲
            }
        )
    except WorkflowError as e:
        _cleanup_task_resources(task_id, last_state)
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        _cleanup_task_resources(task_id, last_state)
        raise HTTPException(status_code=500, detail=f"工作流执行失败: {str(e)}")


def _cleanup_task_resources(task_id: Optional[str], last_state: Optional[dict] = None):
    """清理任务资源（临时知识库）"""
    if not task_id:
        return
    
    try:
        from .tools.temporary_kb import TemporaryKnowledgeBase
        
        # 优先从 last_state 获取 temp_kb
        temp_kb = None
        if last_state:
            temp_kb = last_state.get("temp_kb")
        
        # 如果无法从 state 获取，则根据 task_id 创建临时实例来清除
        if not temp_kb:
            temp_kb = TemporaryKnowledgeBase(task_id=task_id)
        
        if temp_kb:
            temp_kb.clear()
            print(f"✅ 任务终止，已清除临时知识库: {task_id}")
    except Exception as clear_error:
        print(f"⚠️  清除临时知识库失败: {clear_error}")


@router.post("/smartreport/deep-research/cancel")
async def cancel_deep_research(payload: dict):
    """
    终止 Deep Research 工作流
    清理任务的临时知识库资源
    """
    task_id = payload.get("task_id")
    if not task_id:
        raise HTTPException(status_code=400, detail="task_id is required")
    
    _cleanup_task_resources(task_id)
    
    return {"status": "success", "message": f"任务 {task_id} 已终止"}


class SearchRequest(BaseModel):
    query: str
    k: int = 5


class WebSearchRequest(BaseModel):
    query: str
    k: int = 5


@router.post("/smartreport/knowledge-base/search")
async def search_knowledge_base(payload: SearchRequest):
    """
    检索知识库
    """
    try:
        kb_manager = get_knowledge_base_manager()
        results = kb_manager.search(payload.query, k=payload.k)
        return {
            "results": results,
            "query": payload.query,
            "total": len(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"知识库检索失败: {str(e)}")


@router.post("/smartreport/web-search/search")
async def web_search(payload: WebSearchRequest):
    """
    联网检索
    """
    try:
        web_search_manager = get_web_search_manager()
        results = web_search_manager.search(payload.query, k=payload.k)
        return {
            "results": results,
            "query": payload.query,
            "total": len(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"联网检索失败: {str(e)}")


# ===== 知识库管理 API =====

@router.post("/smartreport/knowledge-base/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    上传文档到知识库（仅保存到 documents 目录，不自动构建向量库）
    需要点击"覆盖构建"按钮来构建向量库
    """
    try:
        # 确保 documents 目录存在
        DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)
        
        # 保存文件到 documents 目录
        file_path = DOCUMENTS_DIR / file.filename
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 验证文档是否可以加载（不实际构建）
        kb_manager = get_knowledge_base_manager()
        loader = kb_manager._get_loader(file_path)
        documents = loader.load()
        
        if not documents:
            raise HTTPException(status_code=400, detail="文档内容为空")
        
        # 获取文件大小
        file_size = file_path.stat().st_size
        
        # 注意：不再自动构建向量存储，需要手动点击"覆盖构建"按钮
        
        return {
            "doc_id": str(file_path),
            "filename": file.filename,
            "chunks": 0,  # 未构建时返回 0
            "path": str(file_path),
            "size": file_size,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传文档失败: {str(e)}")


@router.get("/smartreport/knowledge-base/list")
async def list_documents():
    """
    列出知识库中的文档（返回 documents 目录中的文件列表）
    不包括片段数（需要构建后才能查看片段）
    """
    try:
        if not DOCUMENTS_DIR.exists():
            return {"documents": []}
        
        documents = []
        
        for file_path in DOCUMENTS_DIR.iterdir():
            if file_path.is_file():
                # 获取文件大小（字节）
                file_size = file_path.stat().st_size
                
                documents.append({
                    "doc_id": str(file_path),
                    "filename": file_path.name,
                    "chunks": 0,  # 未构建时返回 0
                    "path": str(file_path),
                    "size": file_size,
                })
        
        return {"documents": documents}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"列出文档失败: {str(e)}")


class DeleteDocumentRequest(BaseModel):
    doc_id: str  # 文档的完整路径


@router.post("/smartreport/knowledge-base/delete")
async def delete_document(payload: DeleteDocumentRequest):
    """
    删除文档（从 documents 目录删除文件）
    注意：删除文件后需要重新构建知识库才能更新向量存储
    """
    try:
        file_path = Path(payload.doc_id)
        
        # 安全检查：确保文件在 DOCUMENTS_DIR 目录下
        try:
            file_path.resolve().relative_to(DOCUMENTS_DIR.resolve())
        except ValueError:
            raise HTTPException(status_code=403, detail="不允许删除此文件")
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="文件不存在")
        
        # 删除文件
        file_path.unlink()
        
        return {"message": f"文档已删除: {file_path.name}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除文档失败: {str(e)}")


@router.get("/smartreport/knowledge-base/chunks")
async def list_chunks():
    """
    列出知识库中的所有片段
    """
    try:
        kb_manager = get_knowledge_base_manager()
        chunks = kb_manager.list_all_chunks()
        return {"chunks": chunks, "total": len(chunks)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"列出片段失败: {str(e)}")


@router.post("/smartreport/knowledge-base/clear")
async def clear_knowledge_base():
    """
    清空知识库（删除向量存储和 documents 目录中的文件）
    """
    try:
        kb_manager = get_knowledge_base_manager()
        kb_manager.clear()
        
        # 清空 documents 目录
        if DOCUMENTS_DIR.exists():
            for file_path in DOCUMENTS_DIR.iterdir():
                if file_path.is_file():
                    file_path.unlink()
        
        return {"message": "知识库已清空"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"清空知识库失败: {str(e)}")


class InitializeKnowledgeBaseRequest(BaseModel):
    force_rebuild: bool = False


@router.post("/smartreport/knowledge-base/initialize")
async def initialize_knowledge_base(payload: InitializeKnowledgeBaseRequest):
    """
    初始化知识库（从 documents 目录加载文档）
    """
    try:
        kb_manager = get_knowledge_base_manager()
        docs_loaded, chunks_loaded, errors, stats = kb_manager.initialize_from_documents_dir(
            force_rebuild=payload.force_rebuild
        )
        
        return {
            "message": "知识库初始化完成",
            "documents_loaded": docs_loaded,
            "chunks_loaded": chunks_loaded,
            "documents_dir": str(DOCUMENTS_DIR),
            "errors": errors if errors else None,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"初始化知识库失败: {str(e)}")


class GeneratePDFRequest(BaseModel):
    content: str  # Markdown 内容
    title: str = "报告"  # 报告标题
    base_url: Optional[str] = None  # 基础 URL（用于图片路径）


@router.post("/smartreport/generate-pdf")
async def generate_pdf(payload: GeneratePDFRequest):
    """
    生成 PDF 文件（使用 Playwright）
    
    请求体：
    {
        "content": "Markdown 内容",
        "title": "报告标题",
        "base_url": "http://localhost:8001"  // 可选，用于解析图片路径
    }
    """
    import asyncio
    try:
        from .tools.pdf_generator import generate_pdf_from_markdown
        
        # 获取基础 URL（如果没有提供，使用默认值）
        base_url = payload.base_url or "http://localhost:8001"
        
        print(f"📄 [PDF API] 收到PDF生成请求: title='{payload.title}', base_url='{base_url}'")
        
        # 使用 asyncio.wait_for 添加整体超时（60秒）
        try:
            pdf_bytes = await asyncio.wait_for(
                generate_pdf_from_markdown(
                    markdown_content=payload.content,
                    title=payload.title,
                    base_url=base_url,
                    timeout=30000,  # 30秒
                ),
                timeout=60.0  # 整体超时60秒
            )
            print(f"✅ [PDF API] PDF 生成成功，大小: {len(pdf_bytes)} bytes")
        except asyncio.TimeoutError:
            print("❌ [PDF API] PDF 生成超时（超过60秒）")
            raise HTTPException(status_code=504, detail="PDF 生成超时，请稍后重试或联系管理员")
        except Exception as e:
            print(f"❌ [PDF API] PDF 生成过程中出错: {str(e)}")
            import traceback
            traceback.print_exc()
            raise  # 重新抛出异常，让外层处理
        
        # 返回 PDF 文件
        from io import BytesIO
        from urllib.parse import quote
        
        # 处理文件名：移除非法字符
        safe_title = payload.title.replace("/", "_").replace("\\", "_")
        
        # 检查文件名是否包含非 ASCII 字符
        try:
            safe_title.encode('ascii')
            # 如果文件名只包含 ASCII 字符，直接使用
            ascii_filename = safe_title
            content_disposition = f"attachment; filename=\"{ascii_filename}.pdf\""
        except UnicodeEncodeError:
            # 如果包含非 ASCII 字符，使用 RFC 5987 标准
            # filename 参数使用 ASCII 安全的编码名称作为后备
            ascii_fallback = "report"
            # filename* 参数使用 UTF-8 编码的原始文件名
            encoded_filename = quote(safe_title, safe='', encoding='utf-8')
            content_disposition = f"attachment; filename=\"{ascii_fallback}.pdf\"; filename*=UTF-8''{encoded_filename}.pdf"
        
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": content_disposition
            }
        )
        
    except ImportError as e:
        raise HTTPException(
            status_code=503,
            detail="PDF 生成功能不可用。请安装 Playwright: pip install playwright && playwright install chromium"
        ) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成 PDF 失败: {str(e)}")


@router.get("/smartreport/example")
async def get_example_report():
    """
    获取示例报告内容
    """
    try:
        # 获取示例文件路径
        example_file = Path(__file__).parent / "resources" / "example" / "example.md"
        
        if not example_file.exists():
            raise HTTPException(status_code=404, detail="示例文件不存在")
        
        # 读取文件内容
        content = example_file.read_text(encoding="utf-8")
        
        # 提取标题（第一行的 # 标题）
        title = "示例报告"
        lines = content.split("\n")
        for line in lines:
            if line.startswith("# "):
                title = line[2:].strip()
                break
        
        # 替换图表路径：从 /static/charts/ 改为 /static/example/
        content = content.replace("/static/charts/", "/static/example/")
        
        return {
            "title": title,
            "content": content
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取示例文件失败: {str(e)}")
