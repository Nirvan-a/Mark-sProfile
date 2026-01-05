"""
文件上传通用功能
"""
import tempfile
from pathlib import Path
from typing import Any, Dict
from uuid import uuid4


# 上传目录配置
UPLOAD_DIR = Path(tempfile.gettempdir()) / "profile-page" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def save_uploaded_file(
    filename: str, content: bytes, suffix: str, subdir: str = "uploads"
) -> Path:
    """
    保存上传的文件
    
    Args:
        filename: 原始文件名
        content: 文件内容（字节）
        suffix: 文件后缀（如 .xlsx）
        subdir: 子目录名称（用于区分不同工具）
    
    Returns:
        保存的文件路径
    """
    tool_dir = UPLOAD_DIR / subdir
    tool_dir.mkdir(parents=True, exist_ok=True)
    
    unique_name = f"{uuid4().hex}{suffix}"
    stored_path = tool_dir / unique_name
    stored_path.write_bytes(content)
    return stored_path


def build_response_with_path(
    result: Dict[str, Any], stored_path: Path
) -> Dict[str, Any]:
    """在响应中添加文件路径"""
    enriched = dict(result)
    enriched["stored_file_path"] = str(stored_path)
    return enriched

