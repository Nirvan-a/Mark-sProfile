"""
结果筛选智能体
从检索结果中筛选出最相关、最完整的信息
"""
import os
from typing import List, Dict, Any, Optional

try:
    from langchain_openai import ChatOpenAI
except ImportError:
    from langchain_community.chat_models import ChatOpenAI


class ResultFilterAgentError(Exception):
    """结果筛选智能体错误"""
    pass


class ResultFilterAgent:
    """结果筛选智能体 - 从检索结果中筛选出最符合要求的信息"""
    
    def __init__(self):
        """初始化结果筛选智能体"""
        # 确保加载 .env 文件
        from dotenv import load_dotenv
        from pathlib import Path
        env_path = Path(__file__).parent.parent.parent.parent / ".env"
        load_dotenv(dotenv_path=env_path, override=False)
        
        api_key = os.getenv("DASHSCOPE_API_KEY")
        if not api_key:
            raise ResultFilterAgentError("DASHSCOPE_API_KEY 未配置")
        
        self.llm = ChatOpenAI(
            model="qwen-plus",
            api_key=api_key,
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
            temperature=0.3,  # 较低温度，更确定性
        )
    
    def filter_results(
        self,
        search_results: List[Dict[str, Any]],
        section: Dict[str, Any],
        search_queries: List[str],
        outline: str,
        target_count: Optional[int] = None,
        missing_points: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        从检索结果中筛选出最相关、最完整的信息
        
        Args:
            search_results: 检索结果列表
            section: 当前章节信息
            search_queries: 使用的检索语句列表
            outline: 完整大纲
            target_count: 目标筛选数量（默认选出一半）
            missing_points: 信息缺失点列表（可选），如果有，将优先筛选能覆盖这些缺失点的结果
        
        Returns:
            筛选后的结果列表
        """
        if not search_results:
            return []
        
        # 如果未指定目标数量，选出一半
        if target_count is None:
            target_count = max(1, len(search_results) // 2)
        target_count = min(target_count, len(search_results))
        
        level1_title = section.get("level1_title", "")
        level2_title = section.get("level2_title", "")
        
        # 根据是否有缺失点，构建不同的筛选标准
        if missing_points:
            system_prompt = """你是一位信息筛选专家，擅长从大量检索结果中筛选出最相关、最完整的信息。

**筛选标准（按重要性排序）**：
1. **覆盖缺失点（最重要）**：优先选择能够覆盖或部分覆盖信息缺失点的结果。信息缺失点是经过信息充足性评估后确定的关键信息缺口，筛选结果应该优先填补这些缺口
2. **相关性**：信息必须与章节主题高度相关，直接涉及章节的核心内容
3. **完整性**：信息应该完整、详细，包含具体的细节和事实，能够支撑章节写作
4. **信息质量**：信息应该准确、可靠，来自可信来源
5. **多样性**：尽量选择提供不同角度或不同维度的信息，确保筛选结果能够共同覆盖所有缺失点
6. **互补性**：优先选择提供不同缺失点信息的结果，避免重复

**输出格式**：
输出格式必须是严格的JSON数组，包含筛选出的结果索引（从0开始）：
[0, 2, 5, ...]

请从所有结果中选出最相关、最完整的 {target_count} 个结果，**优先选择能够覆盖信息缺失点的结果**，确保这些结果能够共同覆盖所有缺失的信息点。""".format(target_count=target_count)
        else:
            system_prompt = """你是一位信息筛选专家，擅长从大量检索结果中筛选出最相关、最完整的信息。

**筛选标准（按重要性排序）**：
1. **相关性（最重要）**：信息必须与章节主题高度相关，直接涉及章节的核心内容
2. **完整性**：信息应该完整、详细，包含具体的细节和事实，能够支撑章节写作
3. **信息质量**：信息应该准确、可靠，来自可信来源
4. **多样性**：尽量选择提供不同角度或不同维度的信息，避免重复
5. **新颖性**：优先选择提供新角度或新信息的结果，与已有信息互补

**输出格式**：
输出格式必须是严格的JSON数组，包含筛选出的结果索引（从0开始）：
[0, 2, 5, ...]

请从所有结果中选出最相关、最完整的 {target_count} 个结果，确保这些结果能够共同覆盖章节所需的主要信息点。""".format(target_count=target_count)

        # 格式化检索结果
        results_text = ""
        for i, result in enumerate(search_results):
            title = result.get("title", result.get("filename", "无标题"))
            content = result.get("content", "")
            # 只取后300字符（如果内容长度超过300字符）
            if len(content) > 300:
                content = "..." + content[-300:]  # 取后300字符，前面加省略号
            source = result.get("source", result.get("url", "未知来源"))
            results_text += f"\n[结果 {i}]\n标题: {title}\n来源: {source}\n内容: {content}\n"

        # 构建用户提示，如果有缺失点则加入缺失点信息
        user_prompt_parts = [
            f"请从以下检索结果中筛选出最相关、最完整的 {target_count} 个结果：",
            "",
            "章节信息：",
            f"- 一级标题：{level1_title}",
            f"- 二级标题：{level2_title}",
            "",
            "使用的检索语句：",
        ]
        user_prompt_parts.extend([f"- {q}" for q in search_queries])
        
        if missing_points:
            user_prompt_parts.extend([
                "",
                "信息缺失点（经过信息充足性评估确定的关键信息缺口，筛选结果应优先覆盖这些缺失点）：",
            ])
            for i, point in enumerate(missing_points, 1):
                user_prompt_parts.append(f"{i}. {point}")
        
        user_prompt_parts.extend([
            "",
            "完整大纲：",
            outline,
            "",
            f"检索结果（共{len(search_results)}条）：",
            results_text,
            "",
            "请返回筛选出的结果索引数组（JSON格式）：",
        ])
        
        user_prompt = "\n".join(user_prompt_parts)

        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
            
            print(f"\n{'='*60}")
            print(f"🔍 [ResultFilterAgent] 筛选检索结果")
            print(f"{'='*60}")
            print(f"章节: {level1_title} - {level2_title}")
            print(f"原始结果数: {len(search_results)}")
            print(f"目标筛选数: {target_count}")
            if missing_points:
                print(f"缺失点数量: {len(missing_points)}")
                print(f"缺失点: {missing_points[:3]}..." if len(missing_points) > 3 else f"缺失点: {missing_points}")
            print(f"开始请求...")
            
            response = self.llm.invoke(messages)
            content = response.content.strip()
            
            print(f"✅ [ResultFilterAgent] LLM 响应完成")
            
            # 提取JSON数组
            content = self._extract_json_array(content)
            
            # 解析JSON
            import json
            selected_indices = json.loads(content)
            
            # 验证和规范化
            if not isinstance(selected_indices, list):
                raise ValueError("返回的不是数组格式")
            
            # 转换为整数索引，并过滤无效索引
            valid_indices = []
            for idx in selected_indices:
                try:
                    idx = int(idx)
                    if 0 <= idx < len(search_results):
                        valid_indices.append(idx)
                except (ValueError, TypeError):
                    continue
            
            # 去重并保持顺序
            seen = set()
            unique_indices = []
            for idx in valid_indices:
                if idx not in seen:
                    seen.add(idx)
                    unique_indices.append(idx)
            
            # 限制数量
            unique_indices = unique_indices[:target_count]
            
            # 根据索引筛选结果
            filtered_results = [search_results[i] for i in unique_indices]
            
            print(f"✅ 筛选完成: 从 {len(search_results)} 个结果中选出 {len(filtered_results)} 个")
            
            return filtered_results
            
        except Exception as e:
            print(f"⚠️  结果筛选失败: {e}，返回前 {target_count} 个结果")
            # 回退：返回前 target_count 个结果
            return search_results[:target_count]
    
    def _extract_json_array(self, text: str) -> str:
        """从文本中提取JSON数组"""
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
        
        # 查找JSON数组
        start_idx = text.find("[")
        end_idx = text.rfind("]")
        
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            text = text[start_idx:end_idx + 1]
        
        return text.strip()

