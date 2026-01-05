"""
规划智能体
根据用户问题生成写作大纲，包含总标题、一级标题、二级标题
"""
import os
import json
import re
from typing import Dict, List, Any, Optional

try:
    from langchain_openai import ChatOpenAI
except ImportError:
    from langchain_community.chat_models import ChatOpenAI


class PlanningAgentError(Exception):
    """规划智能体错误"""
    pass


class PlanningAgent:
    """规划智能体 - 生成写作大纲"""
    
    def __init__(self):
        """初始化规划智能体"""
        # 确保加载 .env 文件
        from dotenv import load_dotenv
        from pathlib import Path
        env_path = Path(__file__).parent.parent.parent.parent / ".env"
        load_dotenv(dotenv_path=env_path, override=False)
        
        api_key = os.getenv("DASHSCOPE_API_KEY")
        if not api_key:
            raise PlanningAgentError("DASHSCOPE_API_KEY 未配置")
        
        self.llm = ChatOpenAI(
            model="qwen-plus",
            api_key=api_key,
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
            temperature=0.7,
        )
    
    def generate_outline(self, requirement: str) -> Dict[str, Any]:
        """
        生成写作大纲
        
        Args:
            requirement: 用户需求/问题
        
        Returns:
            大纲字典，包含:
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
        """
        system_prompt = """你是一位专业的报告规划专家，擅长根据用户需求生成结构清晰、逻辑严密的写作大纲。

请严格按照以下要求生成大纲：
1. 必须包含一个总标题（一级标题 #）
2. 包含2-3个一级标题（二级标题 ##）
3. 每个一级标题下可以包含2-4个二级标题（三级标题 ###），也可以不包含二级标题
4. 如果章节内容简单，可以不设置二级标题，直接在一级标题下撰写
5. 使用Markdown格式输出
6. 大纲应该结构清晰、逻辑严密
7. **字数要求**：
   - 仔细分析用户需求，提取用户明确提到的目标字数（如"写一篇5000字的文章"、"大约3000字"等）
   - 如果用户明确提到了字数，使用用户提到的字数作为 estimated_words
   - 如果用户没有提到字数，使用默认值 1500 作为 estimated_words

输出格式必须是严格的JSON，包含以下字段：
- title: 总标题（字符串）
- sections: 一级标题数组，每个元素包含：
  - level1_title: 一级标题（字符串）
  - level2_titles: 二级标题数组（字符串数组，可以为空数组 []，或者包含2-4个二级标题）
- estimated_words: 预估总字数（整数，优先使用用户提到的字数，否则使用1500）
- outline_markdown: Markdown格式的完整大纲（字符串）

示例JSON格式：
{
  "title": "核能发展现状与未来展望",
  "sections": [
    {
      "level1_title": "核能发展现状",
      "level2_titles": [
        "全球核能装机容量分析",
        "主要国家核能政策对比",
        "核能技术发展趋势"
      ]
    },
    {
      "level1_title": "核能发展面临的挑战",
      "level2_titles": [
        "安全性问题",
        "核废料处理",
        "公众接受度"
      ]
    },
    {
      "level1_title": "核能未来发展展望",
      "level2_titles": [
        "小型模块化反应堆",
        "核聚变技术",
        "核能与其他能源的协同"
      ]
    }
  ],
  "estimated_words": 8000,
  "outline_markdown": "# 核能发展现状与未来展望\\n\\n## 核能发展现状\\n\\n### 全球核能装机容量分析\\n### 主要国家核能政策对比\\n### 核能技术发展趋势\\n\\n## 核能发展面临的挑战\\n\\n### 安全性问题\\n### 核废料处理\\n### 公众接受度\\n\\n## 核能未来发展展望\\n\\n### 小型模块化反应堆\\n### 核聚变技术\\n### 核能与其他能源的协同"
}

请确保：
- JSON格式严格正确，可以被Python的json.loads()解析
- 总标题和所有一级、二级标题都有意义且相关
- 二级标题数量合理（每个一级标题下2-3个）
"""

        user_prompt = f"""请根据以下用户需求，生成一份详细的写作大纲：

用户需求：{requirement}

请仔细分析用户需求，提取用户明确提到的目标字数。如果用户提到了字数（如"写一篇5000字的文章"、"大约3000字"、"控制在2000字以内"等），使用该字数作为 estimated_words；如果没有提到，使用默认值 1500。

请生成包含总标题、2-3个一级标题、每个一级标题下2-3个二级标题的JSON格式大纲。"""

        try:
            # 调用 LLM
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
            
            print(f"\n{'='*60}")
            print(f"🤖 [PlanningAgent] 调用 LLM 生成大纲")
            print(f"{'='*60}")
            print(f"模型: qwen-plus")
            print(f"用户需求: {requirement[:100]}...")
            print(f"开始请求...")
            
            response = self.llm.invoke(messages)
            content = response.content.strip()
            
            print(f"✅ [PlanningAgent] LLM 响应完成 (长度: {len(content)} 字符)")
            
            # 尝试提取JSON（可能包含markdown代码块）
            content = self._extract_json(content)
            
            # 解析JSON
            outline_data = json.loads(content)
            
            # 验证和规范化
            outline_data = self._validate_and_normalize(outline_data)
            
            # 生成Markdown格式的大纲（如果不存在）
            if "outline_markdown" not in outline_data or not outline_data["outline_markdown"]:
                outline_data["outline_markdown"] = self._generate_markdown_outline(outline_data)
            
            return outline_data
            
        except json.JSONDecodeError as e:
            raise PlanningAgentError(f"解析大纲JSON失败: {str(e)}") from e
        except Exception as e:
            error_msg = str(e)
            if "API key" in error_msg or "401" in error_msg or "authentication" in error_msg.lower():
                raise PlanningAgentError("API Key 认证失败，请检查 DASHSCOPE_API_KEY 配置") from e
            raise PlanningAgentError(f"生成大纲失败: {error_msg}") from e
    
    def _extract_json(self, text: str) -> str:
        """从文本中提取JSON（可能包含markdown代码块）"""
        text = text.strip()
        
        # 如果包含markdown代码块
        if text.startswith("```"):
            lines = text.split("\n")
            json_start = 0
            json_end = len(lines)
            
            for i, line in enumerate(lines):
                if line.strip().startswith("```"):
                    if json_start == 0:
                        json_start = i + 1
                    else:
                        json_end = i
                        break
            
            text = "\n".join(lines[json_start:json_end])
        
        # 尝试找到JSON对象
        # 查找第一个 { 和最后一个 }
        start_idx = text.find("{")
        end_idx = text.rfind("}")
        
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            text = text[start_idx:end_idx + 1]
        
        return text.strip()
    
    def _validate_and_normalize(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """验证和规范化大纲数据"""
        # 必需字段
        if "title" not in data:
            raise PlanningAgentError("大纲缺少总标题")
        if "sections" not in data:
            raise PlanningAgentError("大纲缺少章节列表")
        
        # 验证sections
        if not isinstance(data["sections"], list):
            raise PlanningAgentError("sections必须是数组")
        
        if len(data["sections"]) < 2 or len(data["sections"]) > 4:
            raise PlanningAgentError("一级标题数量应该在2-4个之间")
        
        # 规范化每个section
        normalized_sections = []
        for i, section in enumerate(data["sections"]):
            if not isinstance(section, dict):
                raise PlanningAgentError(f"第{i+1}个section格式不正确")
            
            if "level1_title" not in section:
                raise PlanningAgentError(f"第{i+1}个section缺少一级标题")
            
            if "level2_titles" not in section:
                raise PlanningAgentError(f"第{i+1}个section缺少二级标题列表")
            
            level2_titles = section["level2_titles"]
            if not isinstance(level2_titles, list):
                raise PlanningAgentError(f"第{i+1}个section的二级标题必须是数组")
            
            # 允许二级标题为空（0个），或者2-4个
            if len(level2_titles) > 0 and (len(level2_titles) < 2 or len(level2_titles) > 4):
                raise PlanningAgentError(f"第{i+1}个section的二级标题数量应该在2-4个之间，或者为空（不需要二级标题）")
            
            normalized_sections.append({
                "level1_title": str(section["level1_title"]).strip(),
                "level2_titles": [str(t).strip() for t in level2_titles],
            })
        
        # 估算字数（如果LLM没有生成，使用默认值1500）
        if "estimated_words" not in data or not data.get("estimated_words"):
            data["estimated_words"] = 1500  # 默认1500字
        
        return {
            "title": str(data["title"]).strip(),
            "sections": normalized_sections,
            "estimated_words": int(data.get("estimated_words", 0)),
            "outline_markdown": data.get("outline_markdown", ""),
        }
    
    def _generate_markdown_outline(self, data: Dict[str, Any]) -> str:
        """生成Markdown格式的大纲"""
        lines = [f"# {data['title']}", ""]
        
        for section in data["sections"]:
            lines.append(f"## {section['level1_title']}")
            lines.append("")
            for level2_title in section["level2_titles"]:
                lines.append(f"### {level2_title}")
            lines.append("")
        
        return "\n".join(lines)
    
    def get_all_level2_sections(self, outline: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        获取所有二级标题章节列表（用于写作循环）
        
        Args:
            outline: 大纲字典
        
        Returns:
            二级标题章节列表，每个元素包含:
            {
                "section_id": 章节ID,
                "level1_title": 一级标题,
                "level2_title": 二级标题,
                "index": 索引（从1开始）
            }
        """
        sections = []
        index = 1
        
        for section in outline["sections"]:
            level1_title = section["level1_title"]
            for level2_title in section["level2_titles"]:
                sections.append({
                    "section_id": f"section_{index}",
                    "level1_title": level1_title,
                    "level2_title": level2_title,
                    "index": index,
                })
                index += 1
        
        return sections
    
    def get_all_level1_sections(self, outline: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        获取所有一级标题章节列表（用于新的写作循环，按一级标题为单位）
        
        遍历大纲的所有章节，为每个一级标题创建一个 section 对象
        
        Args:
            outline: 大纲字典
        
        Returns:
            一级标题章节列表，每个元素包含:
            {
                "section_id": 章节ID,
                "level1_title": 一级标题,
                "level2_titles": 二级标题列表,
                "index": 索引（从1开始）
            }
        """
        sections = []
        
        for index, section in enumerate(outline["sections"], 1):
            sections.append({
                "section_id": f"section_{index}",
                "level1_title": section["level1_title"],
                "level2_titles": section["level2_titles"],
                "index": index,
            })
        
        return sections

    def parse_markdown_outline(self, markdown_text: str) -> Dict[str, Any]:
        """
        从 Markdown 文本解析大纲结构
        
        Args:
            markdown_text: Markdown 格式的大纲文本
            
        Returns:
            大纲字典，包含:
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
                "outline_markdown": markdown_text
            }
        """
        lines = markdown_text.strip().split('\n')
        title = ""
        sections = []
        current_level1 = None
        current_level2_titles = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # 解析总标题（# 开头）
            if line.startswith('# ') and not line.startswith('##'):
                title = line[2:].strip()
            # 解析一级标题（## 开头）
            elif line.startswith('## ') and not line.startswith('###'):
                # 保存之前的章节
                if current_level1 is not None:
                    sections.append({
                        "level1_title": current_level1,
                        "level2_titles": current_level2_titles
                    })
                # 开始新的一级标题
                current_level1 = line[3:].strip()
                current_level2_titles = []
            # 解析二级标题（### 开头）
            elif line.startswith('### '):
                level2_title = line[4:].strip()
                if level2_title:
                    current_level2_titles.append(level2_title)
        
        # 保存最后一个章节
        if current_level1 is not None:
            sections.append({
                "level1_title": current_level1,
                "level2_titles": current_level2_titles
            })
        
        # 如果从 markdown 解析，使用默认值1500字（因为无法从 markdown 中获取用户提到的字数）
        estimated_words = 1500
        
        return {
            "title": title,
            "sections": sections,
            "estimated_words": estimated_words,
            "outline_markdown": markdown_text
        }

