"""
代码执行通用功能
"""
import contextlib
import io
import json
from typing import Any, Dict


def sanitize_result(value: Any) -> Any:
    """
    清理执行结果，确保可以 JSON 序列化
    """
    try:
        return json.loads(json.dumps(value, ensure_ascii=False, default=str))
    except Exception:
        return value


def run_generated_code(code: str) -> Dict[str, Any]:
    """
    执行生成的代码
    
    Args:
        code: 要执行的 Python 代码字符串
    
    Returns:
        包含执行结果的字典：
        - result: 执行结果
        - stdout: 标准输出
        - errorMessage: 错误信息（如果有）
    """
    exec_globals: Dict[str, Any] = {
        "__builtins__": __builtins__,
        "__name__": "__generated__",
    }
    output_buffer = io.StringIO()

    try:
        with contextlib.redirect_stdout(output_buffer):
            exec(code, exec_globals)
            main_func = exec_globals.get("main")
            if not callable(main_func):
                raise RuntimeError("生成的代码缺少 main 函数")
            raw_result = main_func("")
        return {
            "result": sanitize_result(raw_result),
            "stdout": output_buffer.getvalue(),
            "errorMessage": None,
        }
    except Exception as exc:
        return {
            "result": None,
            "stdout": output_buffer.getvalue(),
            "errorMessage": f"{type(exc).__name__}: {exc}",
        }

