"""
智能点单工具路由
代理DashScope API请求
"""
import os
from typing import Any, Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import OpenAI

# 创建工具路由
router = APIRouter(prefix="/api")


class RecommendRequest(BaseModel):
    model: str
    input: Dict[str, Any]
    parameters: Dict[str, Any]


@router.post("/smartorder/recommend")
async def recommend(payload: RecommendRequest):
    """代理DashScope API请求"""
    api_key = os.getenv("DASHSCOPE_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=401,
            detail="Missing DASHSCOPE_API_KEY in server environment"
        )

    try:
        client = OpenAI(
            api_key=api_key,
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        )

        # 构建请求
        messages = payload.input.get("messages", [])
        
        # 过滤掉 OpenAI 兼容模式不支持的参数
        # DashScope 特有参数：result_format, top_k, seed, repetition_penalty, think_content
        # 只保留 OpenAI 兼容的参数
        openai_params = {}
        supported_params = ['temperature', 'top_p', 'max_tokens', 'stream', 'stop', 'presence_penalty', 'frequency_penalty']
        
        for key, value in payload.parameters.items():
            if key in supported_params:
                openai_params[key] = value
        
        completion = client.chat.completions.create(
            model=payload.model,
            messages=messages,
            **openai_params
        )

        if not completion.choices:
            raise HTTPException(
                status_code=500,
                detail="模型未返回任何结果"
            )

        message = completion.choices[0].message
        content = message.content

        # 处理content可能是字符串或None的情况
        if content is None:
            content = ""
        elif isinstance(content, str):
            content = content.strip()
        else:
            # 如果content是其他类型（如数组），转换为字符串
            content = str(content)

        # 构建响应格式（与DashScope兼容）
        return {
            "output": {
                "choices": [
                    {
                        "message": {
                            "content": content
                        }
                    }
                ]
            }
        }

    except Exception as exc:
        error_msg = str(exc)
        if "API key" in error_msg or "401" in error_msg or "authentication" in error_msg.lower():
            raise HTTPException(
                status_code=401,
                detail="API Key 认证失败，请检查 DASHSCOPE_API_KEY 配置是否正确"
            ) from exc
        raise HTTPException(
            status_code=500,
            detail=f"推荐服务出错: {error_msg}"
        ) from exc






