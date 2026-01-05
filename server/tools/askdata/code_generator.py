import json
import os
from typing import Any, Dict, Optional

from openai import OpenAI

SYSTEM_PROMPT_TEMPLATE = """=== 一、角色设定 ===
你是一位精通数据分析与计算的专家，擅长使用 Python Pandas 处理 Excel 数据。

=== 二、任务目标 ===
1.查看"用户问题"、"表格信息"与"历史代码和结果"(如有)，
2.根据"代码模板"和"代码生成规则"，直接生成代码进行输出。

=== 三、参考信息  ===
- "用户问题"：{{#input_21eac.user_input#}}
- 针对每个数据表的每个Sheet页的 "表格信息-表结构（字段名、数据类型）"、"表格信息-数据预览（前5行示例）":   {{#code_a8be4.sheets#}}
- "Excel文件路径"：{{#input_ae04e.file_path#}}

=== 四、输出限制 ===
直接输出代码时，从 import pandas as pd 开始直接输出，严禁从 ```python 开始，或将代码嵌套入代码块中输出

=== 五、代码生成规则 ===
请根据表格信息，考虑用户问题的别称、可能出现口误、实际情况等，解析用户问题为所需字段，梳理解答逻辑，自动补全可执行的 Pandas 代码，完成用户的查询或计算需求。规则如下，
1.仅使用 Pandas，不引入其他外部库。
2.返回格式必须严格符合 {"results": …, "error": …} 
3.如果用户提出了多条独立问题，返回一个“问题-答案”字典数组  
   格式示例：  
   ```json
   [
     {"问题一": "答案一对应的代码或结果描述"},
     {"问题二": "答案二对应的代码或结果描述"}
   ]
4.无需包含任何注释
5.凡要返回为 JSON 的数据，先统一清洗掉 NaN/±Infinity——把它们转为 None（或提前格式化为字符串），只返回已清洗字段(非常重要)，否则会报错。示例：
```code
df_safe = df.replace([np.inf, -np.inf], np.nan).where(pd.notnull(df), None)
```
6.严禁包含危险函数(最高优先级)**Exception()**、**eval()**、**ValueError()**、**hasattr()**、**KeyError()**
7.应该避免的常见错误：
     "name 'XXX' is not defined"
     "module 'pandas' has no attribute 'isinf'"

=== 六、代码模版 ===
import pandas as pd

def main(code: str) -> dict: (**此入口非常重要，如果没有该句将导致整个代码运行失败**)
    errorMessage = None
    results = {}
    try:
        # ===== 修改此处为你的 Excel 文件路径，可能不只一个路径 =====
        file_path = "/path/to/your/file.xlsx"
        # 读取 Excel
        df = pd.read_excel(
            file_path,
            sheet_name=XX, 如需指定sheet页
            keep_default_na=False, # 不把默认的空字符串/NA识别为 NaN
            na_filter=False # 可选：完全关闭 NA 过滤
        )

        # ===== 在此处补充你的 Pandas 处理逻辑 =====
        return {"results": results, "errorMessage": errorMessage}

    except Exception as e:
        # 捕获并返回错误信息
        errorMessage = str(e)
        return {"results": results, "errorMessage": errorMessage}

=== 七、输出前自检验规则 ===
由于代码需要直接执行，因此应该直接从 import pandas as pd  开始输出；且必须严格符合“五、代码生成规则 ”"""

USER_PROMPT_TEMPLATE = """历史代码结果：{{#code_c0db7.codeResultList#}}
用户问题：
{{#input_21eac.user_input#}}

如果问题为总体分析、宽泛问题或者没有明确要求，只进行简单分析，代码尽量短
"""


class CodeGenerationError(RuntimeError):
    """Raised when the model response is missing or invalid."""


def _ensure_api_key() -> str:
    api_key = os.getenv("DASHSCOPE_API_KEY")
    if not api_key:
        raise EnvironmentError("DASHSCOPE_API_KEY 未配置，无法调用模型接口")
    return api_key


def _format_sheets(sheets: Optional[Dict[str, Any]]) -> str:
    if not sheets:
        return "（无解析到的表格信息）"
    return json.dumps(sheets, ensure_ascii=False, indent=2)


def build_prompts(
    user_question: str,
    sheets: Optional[Dict[str, Any]],
    file_path: str,
    history: Optional[str] = None,
    custom_system_prompt: Optional[str] = None,
    custom_user_prompt: Optional[str] = None,
) -> Dict[str, str]:
    sheet_text = _format_sheets(sheets)
    
    # 使用自定义提示词或默认提示词
    system_template = custom_system_prompt or SYSTEM_PROMPT_TEMPLATE
    user_template = custom_user_prompt or USER_PROMPT_TEMPLATE
    
    # 替换占位符（支持两种格式：旧的 {{#...#}} 和新的 {{变量名}}）
    system_prompt = (
        system_template.replace("{{user_question}}", user_question or "")
        .replace("{{sheets}}", sheet_text)
        .replace("{{file_path}}", file_path or "")
        .replace("{{#input_21eac.user_input#}}", user_question or "")
        .replace("{{#code_a8be4.sheets#}}", sheet_text)
        .replace("{{#input_ae04e.file_path#}}", file_path or "")
    )

    user_prompt = (
        user_template.replace("{{history}}", history or "（暂无历史记录）")
        .replace("{{user_question}}", user_question or "")
        .replace("{{#code_c0db7.codeResultList#}}", history or "（暂无历史记录）")
        .replace("{{#input_21eac.user_input#}}", user_question or "")
    )

    return {"system": system_prompt, "user": user_prompt}


def generate_python_code(
    user_question: str,
    sheets: Optional[Dict[str, Any]],
    file_path: str,
    history: Optional[str] = None,
    model: str = "qwen-plus",
    temperature: float = 0.1,
    custom_system_prompt: Optional[str] = None,
    custom_user_prompt: Optional[str] = None,
) -> str:
    prompts = build_prompts(
        user_question,
        sheets,
        file_path,
        history,
        custom_system_prompt,
        custom_user_prompt,
    )
    api_key = _ensure_api_key()
    client = OpenAI(
        api_key=api_key,
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
    )

    completion = client.chat.completions.create(
        model=model,
        temperature=temperature,
        messages=[
            {"role": "system", "content": prompts["system"]},
            {"role": "user", "content": prompts["user"]},
        ],
    )

    if not completion.choices:
        raise CodeGenerationError("模型未返回任何结果")

    message = completion.choices[0].message
    content = (message.content or "").strip()
    if not content:
        raise CodeGenerationError("模型返回内容为空")

    return content


def summarize_execution(
    user_question: str,
    execution_result: Any,
    model: str = "qwen-plus",
    temperature: float = 0.2,
    custom_system_prompt: Optional[str] = None,
    custom_user_prompt: Optional[str] = None,
) -> str:
    api_key = _ensure_api_key()
    client = OpenAI(
        api_key=api_key,
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
    )

    # 使用自定义提示词或默认提示词
    system_prompt = custom_system_prompt or "你是一名资深数据分析师，擅长把 Pandas 结果用 Markdown 方式简洁描述。"
    
    if custom_user_prompt:
        user_prompt = (
            custom_user_prompt.replace("{{user_question}}", user_question)
            .replace("{{execution_result}}", json.dumps(execution_result, ensure_ascii=False))
        )
    else:
        user_prompt = f"""你是一名数据分析助手，请用专业且简洁的 Markdown 语气总结以下执行结果，突出与用户问题相关的洞察。不要重复代码内容，可用表格/列表表达。

- 用户问题：{user_question}
- 执行结果（JSON 格式）：{json.dumps(execution_result, ensure_ascii=False)}
"""

    completion = client.chat.completions.create(
        model=model,
        temperature=temperature,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )

    if not completion.choices:
        raise CodeGenerationError("模型未返回任何总结结果")

    content = (completion.choices[0].message.content or "").strip()
    if not content:
        raise CodeGenerationError("总结内容为空")

    return content

