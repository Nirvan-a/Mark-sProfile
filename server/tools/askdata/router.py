"""
智能问数工具路由
"""
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from tools.askdata.code_executor import run_generated_code
from tools.askdata.file_upload import build_response_with_path, save_uploaded_file
from tools.askdata.code_generator import (
    CodeGenerationError,
    generate_python_code,
    summarize_execution,
)
from tools.askdata.excel_processor import main as process_excel

# 创建工具路由
router = APIRouter(prefix="/api")

EXAMPLE_FILE_NAME = "industrial_production_demo.xlsx"
EXAMPLE_FILE_PATH = Path(__file__).parent / "resources" / EXAMPLE_FILE_NAME


@router.post("/analyze")
async def analyze_excel(file: UploadFile = File(...)):
    """上传并解析 Excel 文件"""
    suffix = Path(file.filename).suffix or ".xlsx"

    if suffix.lower() not in {".xlsx"}:
        raise HTTPException(status_code=400, detail="仅支持 .xlsx 文件")

    content = await file.read()
    stored_path = save_uploaded_file(
        file.filename, content, suffix, subdir="askdata"
    )

    result = process_excel(
        {
            "file_path": [
                {
                    "file_path": str(stored_path),
                    "file_name": file.filename,
                    "file_type": suffix.lstrip("."),
                }
            ]
        }
    )

    if "errorMessage" in result:
        raise HTTPException(status_code=400, detail=result["errorMessage"])

    return build_response_with_path(result, stored_path)


@router.get("/askdata/example-excel")
async def download_example_excel():
    """下载内置示例 Excel 文件"""
    if not EXAMPLE_FILE_PATH.exists():
        raise HTTPException(status_code=404, detail="示例文件不存在")

    return FileResponse(
        EXAMPLE_FILE_PATH,
        filename=EXAMPLE_FILE_NAME,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


class CodeGenerationRequest(BaseModel):
    question: str
    file_path: str
    sheets: Optional[Dict[str, Any]] = None
    history: Optional[str] = None
    custom_system_prompt: Optional[str] = None
    custom_user_prompt: Optional[str] = None


@router.post("/generate-code")
async def generate_code(payload: CodeGenerationRequest):
    """生成 Python 代码"""
    try:
        code = generate_python_code(
            user_question=payload.question,
            sheets=payload.sheets,
            file_path=payload.file_path,
            history=payload.history,
            custom_system_prompt=payload.custom_system_prompt,
            custom_user_prompt=payload.custom_user_prompt,
        )
        return {"code": code}
    except EnvironmentError as exc:
        # API Key 相关错误
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except CodeGenerationError as exc:
        # 代码生成错误
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        # 其他未预期的错误（如 openai.AuthenticationError）
        error_msg = str(exc)
        if "API key" in error_msg or "401" in error_msg or "authentication" in error_msg.lower():
            raise HTTPException(
                status_code=401,
                detail="API Key 认证失败，请检查 DASHSCOPE_API_KEY 配置是否正确"
            ) from exc
        raise HTTPException(status_code=500, detail=f"生成代码时出错: {error_msg}") from exc


class ExecuteCodeRequest(BaseModel):
    code: str


@router.post("/execute-code")
async def execute_code(payload: ExecuteCodeRequest):
    """执行生成的代码"""
    execution = run_generated_code(payload.code)
    return execution


class SummarizeRequest(BaseModel):
    question: str
    result: Dict[str, Any]
    custom_system_prompt: Optional[str] = None
    custom_user_prompt: Optional[str] = None


@router.post("/summarize-result")
async def summarize_result(payload: SummarizeRequest):
    """总结执行结果"""
    try:
        summary = summarize_execution(
            user_question=payload.question,
            execution_result=payload.result,
            custom_system_prompt=payload.custom_system_prompt,
            custom_user_prompt=payload.custom_user_prompt,
        )
        return {"markdown": summary}
    except EnvironmentError as exc:
        # API Key 相关错误
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except CodeGenerationError as exc:
        # 代码生成错误
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        # 其他未预期的错误（如 openai.AuthenticationError）
        error_msg = str(exc)
        if "API key" in error_msg or "401" in error_msg or "authentication" in error_msg.lower():
            raise HTTPException(
                status_code=401,
                detail="API Key 认证失败，请检查 DASHSCOPE_API_KEY 配置是否正确"
            ) from exc
        raise HTTPException(status_code=500, detail=f"总结结果时出错: {error_msg}") from exc

