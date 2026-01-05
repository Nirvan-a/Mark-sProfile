"""
写作智能体
执行章节写作任务，生成完整的一级标题章节（包含该一级标题下的所有二级标题）
"""
import os
from typing import List, Dict, Any, Optional

try:
    from langchain_openai import ChatOpenAI
except ImportError:
    from langchain_community.chat_models import ChatOpenAI

from ..tools.writing_history import WritingHistoryManager


class WritingAgentError(Exception):
    """写作智能体错误"""
    pass


class WritingAgent:
    """写作智能体 - 执行章节写作任务"""
    
    def __init__(self, history_manager: Optional[WritingHistoryManager] = None):
        """
        初始化写作智能体
        
        Args:
            history_manager: 历史写作管理器（可选）
        """
        # 确保加载 .env 文件
        from dotenv import load_dotenv
        from pathlib import Path
        env_path = Path(__file__).parent.parent.parent.parent / ".env"
        load_dotenv(dotenv_path=env_path, override=False)
        
        api_key = os.getenv("DASHSCOPE_API_KEY")
        if not api_key:
            raise WritingAgentError("DASHSCOPE_API_KEY 未配置")
        
        self.llm = ChatOpenAI(
            model="qwen-plus",
            api_key=api_key,
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
            temperature=0.8,
        )
        self.history_manager = history_manager
    
    def write_section(
        self,
        section: Dict[str, Any],
        search_results: List[Dict[str, Any]],
        history_sections: List[str],
        outline: str,
        previous_sections_summary: Optional[str] = None,
        total_words: Optional[int] = None,
        total_sections: Optional[int] = None,
        written_words: Optional[int] = None,
        enable_chart: bool = True
    ) -> Dict[str, Any]:
        """
        撰写完整章节（按一级标题为单位）
        
        Args:
            section: 章节信息，包含 section_id, level1_title, level2_titles, index
            search_results: 检索结果列表
            history_sections: 历史章节内容列表
            outline: 完整大纲
            previous_sections_summary: 前文摘要（可选）
            total_words: 报告总字数（可选）
            total_sections: 总章节数（可选）
            written_words: 已写内容的字数（可选）
            enable_chart: 是否启用图表生成（可选，默认True）
        
        Returns:
            字典，包含章节内容、引用信息和图表需求：
            {
                "content": str,  # Markdown格式的章节内容
                "citations": List[Dict],  # 实际使用的参考资料列表
                "chart_requirement": Optional[Dict]  # 图表需求（如果需要图表）
            }
        """
        level1_title = section.get("level1_title", "")
        level2_titles = section.get("level2_titles", [])
        section_index = section.get("index", 0)
        
        if not level1_title:
            raise WritingAgentError("一级标题不能为空")
        # 允许二级标题为空，这样可以直接写一级标题内容而不需要细分
        
        # 给每个检索结果分配一个唯一的 ref_id
        for idx, result in enumerate(search_results, 1):
            result['ref_id'] = f"ref_{idx}"
        
        # 构建字数要求说明（简化版本：只告知总字数和当前进度，让模型自主规划）
        if total_words:
            words_instruction = f"""3. **字数要求**：
   - 整篇报告总字数约：{total_words}字
   - 当前已写字数约：{written_words or 0}字
   - 共{total_sections}个章节，当前是第{section_index}个章节
   - 请根据该章节在整篇报告中的位置、内容重要性和复杂度，自主合理安排本章节的字数
   - 确保整篇报告的总字数控制在{total_words}字左右"""
        else:
            # 如果没有提供总字数，不限制字数
            words_instruction = """3. **字数要求**：
   - 请根据本章节的内容重要性和复杂度，合理安排字数
   - 确保内容完整、有深度"""
        
        # 构建系统提示
        has_level2_titles = len(level2_titles) > 0
        
        if has_level2_titles:
            structure_instruction = """1. **章节结构要求**：
   - 必须包含完整的一级标题（## 标题）
   - 一级标题后应该先写一段总结概述（2-3段），概括本章节的主要内容
   - 然后按照大纲给定的二级标题（### 标题）顺序，逐一撰写各小节内容
   - 严格遵循大纲的二级标题结构，不得遗漏、增加或修改二级标题"""
        else:
            structure_instruction = """1. **章节结构要求**：
   - 必须包含完整的一级标题（## 标题）
   - 一级标题后直接撰写内容，不需要二级标题
   - 内容应该层次清晰、逻辑严密、信息丰富"""
        
        system_prompt = f"""你是一位专业的报告撰写专家，擅长撰写结构清晰、逻辑严密、内容丰富的报告章节。

请严格按照以下要求撰写：
{structure_instruction}
2. 内容应该专业、有深度、信息丰富
{words_instruction}
4. 需要与之前撰写的内容保持连贯性
5. **格式要求**：
   - 使用Markdown格式，段落之间必须有一个空行（双换行符）
   - 一级标题使用 ##，二级标题使用 ###，一级标题下先有概述段落
   - 适当使用列表、引用、加粗等格式增强可读性
   - **数据可视化：根据数据特点智能选择表格及图表**：
     * **表格**：适合精确数值、多维度数据（如：国家×年份×指标）、数据项较多（5个以上）。使用Markdown表格格式。**重要：如果章节中有适合表格展示的数据（如对比数据、统计数据、分类数据等），尽量为每个章节包含至少一个表格，以提升数据的可读性和专业性。**
     * **图表**：适合展示趋势（折线图line）、占比（饼图pie）、对比（柱状图bar）、相关性（散点图scatter）。使用格式：`[CHART:类型:描述:章节标题]`，例如：`[CHART:bar:2020-2023年全球核电装机容量对比:### 装机容量分析]`。插入位置必须是章节标题（## 一级标题 或 ### 二级标题），图表将插入到该章节的末尾。
     * 图表一章节只能使用一个。表格和图表可以同时使用，它们服务于不同的数据展示需求。
6. **引用标注**：
   - 严禁在正文中使用任何形式的文内引用标注（[ref_1]、[1]、[^ref_1] 等）
   - 在章节末尾单独一行写：CITATIONS: ref_1, ref_3, ref_5（未使用则写：CITATIONS:）
7. 确保内容与报告大纲一致，必须完整，有足够深度和细节
8. 如果提供了历史章节或检索结果，需要参考并充分整合信息"""

        # 构建用户提示
        context_parts = []
        
        # 1. 完整大纲
        context_parts.append(f"## 完整报告大纲：\n{outline}\n")
        
        # 2. 前文摘要（如果有）
        if previous_sections_summary:
            context_parts.append(f"## 前文摘要：\n{previous_sections_summary}\n")
        
        # 3. 历史章节内容（如果有）
        if history_sections:
            context_parts.append("## 相关历史章节内容（供参考，保持连贯性）：\n")
            for i, hist_content in enumerate(history_sections, 1):
                context_parts.append(f"### 历史章节 {i}：\n{hist_content}\n")
        
        # 4. 检索结果（如果有）
        if search_results:
            context_parts.append("## 检索到的相关信息：\n")
            for i, result in enumerate(search_results[:10], 1):  # 最多使用前10条
                title = result.get("title", "")
                content = result.get("content", "")[:300]  # 只取前300字符
                source = result.get("source", "未知来源")
                ref_id = result.get("ref_id", f"ref_{i}")
                context_parts.append(f"[{i}] [{ref_id}] {title} ({source})\n   {content}...\n")
        
        # 5. 当前任务
        words_context = ""
        if total_words:
            words_context = f"""
- **字数要求**：
  * 整篇报告总字数约{total_words}字，共{total_sections}个章节
  * 当前已写约{written_words or 0}字
  * 这是第{section_index}个章节
  * 请根据章节内容的重要性和复杂度自主合理安排字数"""
        
        # 格式化二级标题列表
        if level2_titles:
            level2_titles_str = "\n  ".join([f"- {title}" for title in level2_titles])
            level2_section = f"""
- 该一级标题下包含的二级标题（必须严格按此顺序撰写）：
  {level2_titles_str}"""
            writing_instructions = """
**重要说明**：
- 请撰写完整的一级标题章节内容
- 必须包含一级标题（## {level1_title}）
- 一级标题后先写2-3段总结概述，概括本章节主要内容
- 然后按照上述二级标题列表的顺序，逐一撰写各小节（### 二级标题）
- 严格遵循大纲的二级标题，不得遗漏、增加或修改"""
        else:
            level2_section = ""
            writing_instructions = """
**重要说明**：
- 请撰写完整的一级标题章节内容
- 必须包含一级标题（## {level1_title}）
- 一级标题后直接撰写内容，不需要二级标题"""
        
        context_parts.append(f"""## 当前任务：
- 章节索引：第 {section_index} 个章节（共{total_sections if total_sections else '?'}个章节）
- 一级标题：{level1_title}{level2_section}{words_context}
{writing_instructions}
- 内容应该专业、有深度、有说服力，包含具体的事实和细节
- 与之前撰写的内容保持连贯性，充分整合检索结果中的关键信息
- 确保章节完整，有足够深度

请开始撰写：""")

        user_prompt = "\n".join(context_parts)
        
        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
            
            print(f"\n{'='*60}")
            print(f"✍️  [WritingAgent] 调用 LLM 撰写章节（一级标题）")
            print(f"{'='*60}")
            print(f"模型: qwen-plus")
            print(f"一级标题: {level1_title}")
            print(f"包含二级标题数: {len(level2_titles)}")
            print(f"检索结果数: {len(search_results)}")
            print(f"历史章节数: {len(history_sections)}")
            print(f"开始请求...")
            
            response = self.llm.invoke(messages)
            content = response.content.strip()
            
            print(f"✅ [WritingAgent] LLM 响应完成 (长度: {len(content)} 字符)")
            
            # 显示最后100个字符，用于检查是否有CITATIONS行
            print(f"📄 [WritingAgent] 内容末尾: ...{content[-150:]}")
            
            # 解析引用信息
            citations_data = self._extract_citations(content, search_results)
            content_without_citations = citations_data["content"]
            used_citations = citations_data["citations"]
            
            print(f"📚 [WritingAgent] 提取到 {len(used_citations)} 个引用")
            if len(used_citations) > 0:
                print(f"📚 [WritingAgent] 引用详情: {[c.get('title', 'unknown')[:30] for c in used_citations]}")
            
            # 验证章节完整性（检查一级标题）
            content_without_citations = self._ensure_section_completeness(content_without_citations, level1_title)
            
            # 清理文内引用标记（如果模型仍然生成了）
            content_without_citations = self._remove_inline_citations(content_without_citations)
            
            # 解析图表需求标记（从内容中提取）
            chart_requirement = None
            if enable_chart:
                # 调试：检查原始内容中是否有图表标记
                import re
                chart_pattern = r'\[CHART:([^:]+):([^:]+):([^\]]+)\]'
                chart_matches = re.findall(chart_pattern, content_without_citations)
                if chart_matches:
                    print(f"📊 [WritingAgent] 在原始内容中找到 {len(chart_matches)} 个图表标记")
                else:
                    print(f"⚠️  [WritingAgent] 原始内容中未找到图表标记 [CHART:...]")
                    # 检查是否有类似的标记（可能是格式问题）
                    similar_patterns = [
                        r'\[CHART[^\]]*\]',
                        r'CHART[:\s]',
                        r'图表[:\s]',
                    ]
                    for pattern in similar_patterns:
                        matches = re.findall(pattern, content_without_citations, re.IGNORECASE)
                        if matches:
                            print(f"  ⚠️  找到类似标记: {pattern} -> {matches[:3]}...")
                
                chart_data = self._extract_chart_requirement(content_without_citations)
                if chart_data:
                    chart_requirement = chart_data["requirement"]
                    content_without_citations = chart_data["content"]  # 移除标记后的内容
                    if chart_requirement:
                        print(f"📊 [WritingAgent] 检测到图表需求: {chart_requirement.get('chart_type', 'unknown')}")
                else:
                    print(f"⚠️  [WritingAgent] _extract_chart_requirement 返回 None（未找到有效标记）")
            
            return {
                "content": content_without_citations,
                "citations": used_citations,
                "chart_requirement": chart_requirement
            }
            
        except Exception as e:
            error_msg = str(e)
            if "API key" in error_msg or "401" in error_msg:
                raise WritingAgentError("API Key 认证失败，请检查 DASHSCOPE_API_KEY 配置") from e
            raise WritingAgentError(f"撰写章节失败: {error_msg}") from e
    
    def _extract_citations(self, content: str, search_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        从内容中提取引用信息
        
        Args:
            content: LLM 生成的内容（包含 CITATIONS 行）
            search_results: 检索结果列表（包含 ref_id）
        
        Returns:
            {
                "content": str,  # 移除 CITATIONS 行后的内容
                "citations": List[Dict]  # 实际使用的引用列表
            }
        """
        # 查找 CITATIONS: 行（不区分大小写，允许前后有空格）
        import re
        citations_line = ""
        content_lines = content.split("\n")
        citations_line_index = -1
        
        # 从后往前找 CITATIONS 行
        for i in range(len(content_lines) - 1, -1, -1):
            line = content_lines[i].strip()
            # 使用正则表达式匹配，支持两种格式：
            # 1. CITATIONS: ref_1, ref_2
            # 2. [CITATIONS: ref_1, ref_2]
            if re.search(r'citations\s*:', line, re.IGNORECASE):
                citations_line = line
                citations_line_index = i
                print(f"🔍 [_extract_citations] 在第 {i} 行找到 CITATIONS: {line}")
                # 移除这一行及其后面的所有内容
                content_lines = content_lines[:i]
                break
        
        if citations_line_index == -1:
            print(f"⚠️  [_extract_citations] 未找到 CITATIONS 行，LLM可能没有遵循指令")
            # 显示最后几行，帮助调试
            print(f"📄 [_extract_citations] 内容最后5行:")
            for line in content_lines[-5:]:
                print(f"  | {line}")
        
        # 重新组装内容（不包含 CITATIONS 行）
        clean_content = "\n".join(content_lines).strip()
        
        # 解析引用的 ref_id
        used_ref_ids = []
        if citations_line:
            # 提取 "CITATIONS:" 后面的内容，支持 [CITATIONS: ...] 格式
            # 先移除方括号，再提取 CITATIONS: 后面的内容
            citations_part = re.sub(r'^\[?\s*citations\s*:\s*', '', citations_line, flags=re.IGNORECASE)
            citations_part = re.sub(r'\]?\s*$', '', citations_part).strip()
            if citations_part:
                # 按逗号分割，清理空格
                used_ref_ids = [ref_id.strip() for ref_id in citations_part.split(",") if ref_id.strip()]
        
        # 根据 ref_id 过滤 search_results
        used_citations = []
        for result in search_results:
            ref_id = result.get("ref_id", "")
            if ref_id in used_ref_ids:
                # 提取需要的字段
                citation = {
                    "source": result.get("source", ""),
                    "title": result.get("title", ""),
                    "url": result.get("url", ""),
                    "filename": result.get("filename", ""),
                    "content": result.get("content", "")[:200]  # 保存摘要
                }
                used_citations.append(citation)
        
        print(f"📝 [_extract_citations] 找到 CITATIONS 行: {citations_line}")
        print(f"📝 [_extract_citations] 使用的 ref_id: {used_ref_ids}")
        print(f"📝 [_extract_citations] 匹配到的引用: {len(used_citations)} 个")
        
        return {
            "content": clean_content,
            "citations": used_citations
        }
    
    def _ensure_section_completeness(self, content: str, level1_title: str) -> str:
        """
        确保章节完整性（检查一级标题）
        
        Args:
            content: 生成的内容
            level1_title: 一级标题
        
        Returns:
            完整的章节内容
        """
        # 检查是否包含一级标题
        if f"## {level1_title}" not in content and f"#{level1_title}" not in content:
            # 如果没有标题，添加标题
            content = f"## {level1_title}\n\n{content}"
        
        # 确保内容不为空
        if not content.strip():
            raise WritingAgentError("生成的章节内容为空")
        
        return content
    
    def _extract_chart_requirement(self, content: str) -> Optional[Dict[str, Any]]:
        """
        从内容中提取图表需求标记
        
        Args:
            content: 章节内容（可能包含 [CHART:类型:描述:章节标题] 标记）
        
        Returns:
            如果找到图表标记，返回：
            {
                "content": str,  # 移除标记后的内容
                "requirement": {
                    "chart_type": str,  # "bar", "line", "pie", "scatter"
                    "chart_description": str,  # 图表描述
                    "insert_after_section": str,  # 章节标题（## 一级标题 或 ### 二级标题）
                    "chart_width": float,  # 默认10
                    "chart_height": float,  # 默认6
                }
            }
            如果没有找到，返回 None
        """
        import re
        
        # 匹配 [CHART:类型:描述:章节标题] 格式
        pattern = r'\[CHART:([^:]+):([^:]+):([^\]]+)\]'
        match = re.search(pattern, content)
        
        if not match:
            return None
        
        chart_type = match.group(1).strip()
        chart_description = match.group(2).strip()
        insert_after_section = match.group(3).strip()
        
        # 验证图表类型
        valid_types = ["bar", "line", "pie", "scatter"]
        if chart_type not in valid_types:
            print(f"⚠️  [WritingAgent] 无效的图表类型: {chart_type}，使用默认类型 bar")
            chart_type = "bar"
        
        # 验证章节标题格式（应该是 ## 或 ### 开头的标题）
        if not (insert_after_section.startswith("##") or insert_after_section.startswith("###")):
            print(f"⚠️  [WritingAgent] 插入位置不是有效的章节标题格式: {insert_after_section}，将尝试匹配")
        
        # 移除标记
        content_without_marker = content.replace(match.group(0), "").strip()
        
        return {
            "content": content_without_marker,
            "requirement": {
                "chart_type": chart_type,
                "chart_description": chart_description,
                "insert_after_section": insert_after_section,
                "chart_width": 10.0,
                "chart_height": 6.0,
            }
        }
    
    def _remove_inline_citations(self, content: str) -> str:
        """
        移除内容中的文内引用标记
        
        Args:
            content: 章节内容（可能包含文内引用标记）
        
        Returns:
            移除引用标记后的内容
        """
        import re
        
        # 移除各种格式的文内引用：
        # [ref_1], [ref_2], [1], [2], [^ref_1], [^1] 等
        patterns = [
            r'\[ref_\d+\]',           # [ref_1], [ref_2]
            r'\[\^ref_\d+\]',          # [^ref_1], [^ref_2]
            r'\[\^\d+\]',              # [^1], [^2]
            r'(?<!\[)\[\d+\](?!\()',  # [1], [2] (但不匹配链接格式 [[1]](url))
        ]
        
        cleaned_content = content
        for pattern in patterns:
            cleaned_content = re.sub(pattern, '', cleaned_content)
        
        # 清理多余的空格（引用标记移除后可能留下的），但保留换行符
        # 只清理空格和制表符，不清理换行符
        cleaned_content = re.sub(r'[ \t]+', ' ', cleaned_content)  # 多个空格或制表符合并为一个空格（不包含换行符）
        cleaned_content = re.sub(r'[ \t]+([。，、；：])', r'\1', cleaned_content)  # 标点前的空格
        
        return cleaned_content
    
    def generate_search_queries(
        self,
        section: Dict[str, Any],
        outline: Dict[str, Any],
        requirement: Optional[str] = None
    ) -> List[str]:
        """
        生成检索语句（在准备阶段调用，为整个一级章节生成）
        
        根据章节预估字数和二级标题数量确定检索语句数量：
        - 基础查询数：按总字数和章节数计算
        - 每个二级标题至少1个查询
        
        Args:
            section: 当前章节信息（包含 level1_title 和 level2_titles）
            outline: 大纲信息（包含 estimated_words）
            requirement: 文章整体需求（可选）
        
        Returns:
            检索语句列表
        """
        # 计算当前章节的预估字数
        # 方法：总预估字数 / 一级章节总数
        estimated_words = outline.get("estimated_words", 0)
        total_sections = len(outline.get("sections", []))
        if total_sections > 0:
            avg_words_per_level1 = estimated_words / total_sections
        else:
            avg_words_per_level1 = 500  # 默认500字
        
        # 获取当前章节的二级标题数量
        level2_titles = section.get("level2_titles", [])
        num_level2 = len(level2_titles)
        
        # 根据预估字数和二级标题数量确定检索语句数量
        # 策略：每个二级标题至少1个查询，如果没有二级标题则默认3个
        if num_level2 > 0:
            num_queries = max(3, num_level2)
        else:
            # 没有二级标题时，根据预估字数决定
            num_queries = 3 if avg_words_per_level1 < 800 else 4
        
        level1_title = section.get("level1_title", "")
        
        # 确保 level1_title 不为空（避免输入长度错误）
        if not level1_title:
            level1_title = "章节"
        
        system_prompt = """你是一位专业的检索查询优化专家，擅长根据章节信息生成精确、有效的检索查询语句。

**任务**：
为当前一级章节生成 {num_queries} 个检索查询语句，用于从知识库和网络中检索相关信息。

**要求**：
1. **包含关键人物、事件、主题**：如果章节涉及特定人物或主题，查询语句必须包含相关名称
2. **查询语句应该覆盖章节的不同维度**：{num_queries} 个查询应该从不同角度检索，尽量覆盖该一级章节下所有二级标题涉及的内容
3. **适合向量检索和网络搜索**：查询语句应该清晰、具体，使用关键词组合，能够匹配到相关内容
4. **简洁明了**：每个查询语句长度控制在25字以内，包含3-6个核心关键词，避免冗余
5. **互补性**：多个查询应该互补，共同覆盖章节所需的所有信息点

**输出格式**：
输出格式必须是严格的JSON数组，包含 {num_queries} 个检索查询语句：
["查询语句1", "查询语句2", "查询语句3"]

**示例**：
- 一级章节："核能发展现状"，包含二级标题：["装机容量分析", "主要国家政策对比"]，需要3个查询
  输出：["核能 装机容量 全球", "核电政策 主要国家", "核能发展 现状分析"]""".format(num_queries=num_queries)

        # 格式化二级标题列表
        level2_titles_str = "、".join(level2_titles[:5])  # 最多显示前5个
        if len(level2_titles) > 5:
            level2_titles_str += f"...（共{len(level2_titles)}个）"

        user_prompt_parts = [
            f"章节信息：",
            f"- 一级标题：{level1_title}",
            f"- 包含二级标题：{level2_titles_str}",
        ]
        
        if requirement:
            user_prompt_parts.append(f"\n文章整体主题：{requirement}")
        
        user_prompt_parts.append(f"\n预估字数：{avg_words_per_level1:.0f}字（需要生成 {num_queries} 个检索查询语句）")
        user_prompt_parts.append("\n请生成检索查询语句（JSON数组格式）：")
        
        user_prompt = "\n".join(user_prompt_parts)
        
        # 确保 prompt 长度在允许范围内（DashScope 限制：1-2048 字符）
        MAX_TOTAL_LENGTH = 2000  # 留一些余量
        system_length = len(system_prompt)
        user_length = len(user_prompt)
        total_length = system_length + user_length
        
        if total_length > MAX_TOTAL_LENGTH:
            # 需要截断 user_prompt
            max_user_length = MAX_TOTAL_LENGTH - system_length - 100  # 再留一些余量
            if max_user_length > 0:
                # 保留关键信息，截断 requirement（如果太长）
                essential_parts = [
                    f"章节信息：",
                    f"- 一级标题：{level1_title}",
                    f"- 包含二级标题：{level2_titles_str}",
                    f"\n预估字数：{avg_words_per_level1:.0f}字（需要生成 {num_queries} 个检索查询语句）",
                    "\n请生成检索查询语句（JSON数组格式）："
                ]
                if requirement and len(requirement) < 100:
                    essential_parts.insert(3, f"\n文章整体主题：{requirement}")
                
                user_prompt = "\n".join(essential_parts)
                if len(user_prompt) > max_user_length:
                    user_prompt = user_prompt[:max_user_length] + "\n[内容已截断]"
        
        # 确保 prompt 不为空
        if not user_prompt or len(user_prompt.strip()) == 0:
            user_prompt = f"""章节信息：
- 一级标题：{level1_title}
- 包含二级标题：{level2_titles_str}

请生成 {num_queries} 个检索查询语句（JSON数组格式）："""
        
        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
            
            print(f"\n{'='*60}")
            print(f"🔍 [WritingAgent] 生成检索查询语句（一级章节）")
            print(f"{'='*60}")
            print(f"一级标题: {level1_title}")
            print(f"二级标题数: {num_level2}")
            print(f"预估字数: {avg_words_per_level1:.0f}字")
            print(f"需要生成: {num_queries} 个查询语句")
            print(f"开始请求...")
            
            response = self.llm.invoke(messages)
            content = response.content.strip()
            
            print(f"✅ [WritingAgent] LLM 响应完成")
            
            # 提取JSON
            content = self._extract_json_array(content)
            
            # 解析JSON
            import json
            queries = json.loads(content)
            
            # 验证和规范化
            if not isinstance(queries, list):
                raise ValueError("返回的不是数组格式")
            
            queries = [str(q).strip() for q in queries if q]
            queries = queries[:num_queries]  # 确保不超过需要的数量
            
            # 如果数量不足，补充默认查询
            while len(queries) < num_queries:
                queries.append(level1_title)
            
            print(f"✅ 生成的检索查询语句: {queries}")
            
            return queries
            
        except Exception as e:
            print(f"⚠️  生成检索查询语句失败: {e}，使用默认查询")
            # 回退到默认查询
            default_query = level1_title
            return [default_query] * num_queries
    
    def generate_search_queries_for_missing_points(
        self,
        section: Dict[str, Any],
        missing_points: List[str],
        num_queries: int,
        requirement: Optional[str] = None
    ) -> List[str]:
        """
        基于缺失点生成检索语句
        
        Args:
            section: 当前章节信息
            missing_points: 缺失的信息点列表
            num_queries: 需要生成的查询语句数量
            requirement: 文章整体需求（可选）
        
        Returns:
            检索语句列表
        """
        level1_title = section.get("level1_title", "")
        level2_titles = section.get("level2_titles", [])
        
        system_prompt = """你是一位专业的检索查询优化专家，擅长根据信息缺失点生成精确的检索查询语句。

**任务**：
根据章节信息和缺失的信息点，生成 {num_queries} 个检索查询语句，用于检索缺失的信息。

**要求**：
1. **针对缺失点**：每个查询语句应该针对具体的缺失信息点，优先覆盖最重要的缺失点
2. **包含关键人物、事件、主题**：如果章节涉及特定人物，查询语句必须包含该人物名字
3. **查询语句应该覆盖不同的缺失点**：{num_queries} 个查询应该尽可能覆盖不同的缺失点，可以一个查询覆盖多个相关的缺失点
4. **适合向量检索和网络搜索**：查询语句应该清晰、具体，使用关键词组合
5. **简洁明了**：每个查询语句长度控制在25字以内，包含3-6个核心关键词
6. **互补性**：多个查询应该互补，共同覆盖所有缺失的信息点

**输出格式**：
输出格式必须是严格的JSON数组，包含 {num_queries} 个检索查询语句：
["查询语句1", "查询语句2", "查询语句3"] """.format(num_queries=num_queries)

        # 格式化二级标题列表
        level2_titles_str = "、".join(level2_titles[:5])  # 最多显示前5个
        if len(level2_titles) > 5:
            level2_titles_str += f"...（共{len(level2_titles)}个）"

        user_prompt_parts = [
            f"章节信息：",
            f"- 一级标题：{level1_title}",
            f"- 包含二级标题：{level2_titles_str}",
        ]
        
        if requirement:
            user_prompt_parts.append(f"\n文章整体主题：{requirement}")
        
        user_prompt_parts.append(f"\n缺失的信息点：")
        for i, point in enumerate(missing_points, 1):
            user_prompt_parts.append(f"{i}. {point}")
        
        user_prompt_parts.append(f"\n需要生成 {num_queries} 个检索查询语句来检索这些缺失的信息。")
        user_prompt_parts.append("\n请生成检索查询语句（JSON数组格式）：")
        
        user_prompt = "\n".join(user_prompt_parts)
        
        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
            
            print(f"\n{'='*60}")
            print(f"🔍 [WritingAgent] 基于缺失点生成检索查询语句")
            print(f"{'='*60}")
            print(f"一级标题: {level1_title}")
            print(f"缺失点: {missing_points}")
            print(f"需要生成: {num_queries} 个查询语句")
            print(f"开始请求...")
            
            response = self.llm.invoke(messages)
            content = response.content.strip()
            
            print(f"✅ [WritingAgent] LLM 响应完成")
            
            # 提取JSON
            content = self._extract_json_array(content)
            
            # 解析JSON
            import json
            queries = json.loads(content)
            
            # 验证和规范化
            if not isinstance(queries, list):
                raise ValueError("返回的不是数组格式")
            
            queries = [str(q).strip() for q in queries if q]
            queries = queries[:num_queries]  # 确保不超过需要的数量
            
            # 如果数量不足，补充默认查询
            while len(queries) < num_queries:
                queries.append(level1_title)
            
            print(f"✅ 生成的检索查询语句: {queries}")
            
            return queries
            
        except Exception as e:
            print(f"⚠️  生成检索查询语句失败: {e}，使用默认查询")
            # 回退到默认查询
            default_query = level1_title
            return [default_query] * num_queries
    
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
    
    def _extract_json(self, text: str) -> str:
        """从文本中提取JSON（用于信息充足性评估）"""
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
        
        # 查找JSON对象
        start_idx = text.find("{")
        end_idx = text.rfind("}")
        
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            text = text[start_idx:end_idx + 1]
        
        return text.strip()
    
    def evaluate_info_sufficiency(
        self,
        section: Dict[str, Any],
        search_results: List[Dict[str, Any]],
        history_sections: List[str],
        outline: str
    ) -> Dict[str, Any]:
        """
        判断信息是否充足（用于决定是否需要额外检索）
        
        Args:
            section: 当前章节信息
            search_results: 检索结果列表
            history_sections: 历史章节内容列表
            outline: 完整大纲
        
        Returns:
            评估结果字典:
            {
                "sufficient": bool,  # 信息是否充足
                "missing_points": List[str]  # 缺失的信息点（如果不足）
            }
        """
        level1_title = section.get("level1_title", "")
        level2_title = section.get("level2_title", "")
        
        system_prompt = """你是一位信息充足性评估专家，需要判断当前收集到的信息是否足够支撑某个章节的写作。

**评估标准**（按重要性排序）：
1. **主题相关性（最重要）**：信息是否与章节主题高度相关，直接涉及章节的核心内容
2. **大体覆盖度**：信息是否能够大体覆盖章节的主要信息点，不要求每个细节都齐全
3. **信息质量**：信息是否准确、有用，来自可信来源
4. **写作可行性**：是否有足够的信息支撑撰写一个完整的、有逻辑的章节

**评估原则**（放宽标准）：
- **重点看覆盖范围，不要求细节齐全**：只要信息能够大体覆盖章节的主要信息点即可，不需要所有具体细节（如具体时间、具体金额、具体名称等）都齐全
- **重视整体可用性**：即使某些具体细节缺失，但如果整体信息足够支撑写作，应该认为信息充足
- **只关注关键缺失**：只有当关键的主要信息点完全缺失时，才认为信息不足
- **信息充足的标准**：如果检索结果能够覆盖章节主题的主要方面，有足够的信息支撑撰写一个完整、有逻辑的章节，就应该判断为充足

**输出格式**：
输出格式必须是严格的JSON：
{
  "sufficient": true/false,
  "missing_points": ["缺失点1", "缺失点2", ...]
}

如果信息充足（能够大体覆盖章节主要信息点），`sufficient` 为 `true`，`missing_points` 为空数组 `[]`。
如果信息不足（关键的主要信息点缺失），`sufficient` 为 `false`，`missing_points` 只列出**关键缺失的主要信息点**（不要求列出所有细节缺失）。"""

        # 格式化检索结果摘要
        results_summary = ""
        if search_results:
            results_summary = "检索结果（共{}条）：\n".format(len(search_results))
            for i, result in enumerate(search_results[:5], 1):  # 只显示前5条
                title = result.get("title", result.get("filename", "无标题"))
                content_preview = result.get("content", "")[:150]
                source = result.get("source", result.get("url", "未知来源"))
                results_summary += f"{i}. [{source}] {title}\n   {content_preview}...\n"
        else:
            results_summary = "无检索结果\n"
        
        # 格式化历史章节摘要
        history_summary = ""
        if history_sections:
            history_summary = "历史章节内容（共{}个）：\n".format(len(history_sections))
            for i, hist_content in enumerate(history_sections, 1):
                preview = hist_content[:200] + "..." if len(hist_content) > 200 else hist_content
                history_summary += f"历史章节 {i}：\n{preview}\n"
        else:
            history_summary = "无历史章节\n"
        
        user_prompt = f"""请评估以下信息是否足够支撑章节写作：

章节信息：
- 一级标题：{level1_title}
- 二级标题：{level2_title}

完整大纲：
{outline}

{history_summary}

{results_summary}

**重要提醒**：评估标准应放宽。只要检索结果能够大体覆盖章节主题的主要方面，有足够信息支撑撰写一个完整、有逻辑的章节，就应该判断为充足。不要求所有具体细节（如具体时间、金额、名称等）都齐全。

请判断信息是否充足。如果不足，只列出关键缺失的主要信息点（用于生成后续检索语句）。"""

        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
            
            print(f"\n{'='*60}")
            print(f"📊 [WritingAgent] 判断信息充足性")
            print(f"{'='*60}")
            print(f"章节: {level1_title} - {level2_title}")
            print(f"检索结果数: {len(search_results)}")
            print(f"历史章节数: {len(history_sections)}")
            print(f"开始请求...")
            
            response = self.llm.invoke(messages)
            content = response.content.strip()
            
            print(f"✅ [WritingAgent] LLM 响应完成")
            
            # 提取JSON（使用类似 _extract_json 的逻辑）
            content = self._extract_json(content)
            
            # 解析JSON
            import json
            evaluation = json.loads(content)
            
            # 验证和规范化
            sufficient = bool(evaluation.get("sufficient", False))
            missing_points = evaluation.get("missing_points", [])
            if not isinstance(missing_points, list):
                missing_points = []
            missing_points = [str(p).strip() for p in missing_points if p]
            
            result = {
                "sufficient": sufficient,
                "missing_points": missing_points
            }
            
            print(f"✅ 信息充足性评估结果: 充足={sufficient}, 缺失点={missing_points}")
            
            return result
            
        except Exception as e:
            print(f"⚠️  信息充足性评估失败: {e}，假设信息不足")
            # 回退：假设信息不足
            return {
                "sufficient": False,
                "missing_points": ["信息评估失败，建议继续检索"]
            }
    
    def select_history_sections(
        self,
        section: Dict[str, Any],
        max_sections: int = 3
    ) -> tuple[List[str], List[str]]:
        """
        选择需要回顾的历史章节（最多3个二级标题）
        
        这个方法会：
        1. 获取所有历史标题列表
        2. 让模型判断是否需要回顾
        3. 返回选中的历史章节标题和ID
        
        Args:
            section: 当前章节信息
            max_sections: 最多回顾的章节数（默认3）
        
        Returns:
            (历史章节标题列表, 历史章节ID列表)
        """
        if not self.history_manager:
            return [], []
        
        # 获取所有历史标题
        history_titles = self.history_manager.get_history_titles_formatted()
        
        if not history_titles or history_titles == "暂无历史章节":
            return [], []
        
        # 使用LLM判断需要回顾哪些章节
        system_prompt = """你是一位内容连贯性分析专家，需要判断撰写当前章节时是否需要回顾历史章节内容。

规则：
1. 只能选择二级标题（### 开头的章节）
2. 最多选择3个章节
3. 只选择与当前章节相关、需要参考的历史章节
4. 如果不需要回顾任何章节，返回空列表

输出格式必须是严格的JSON数组，包含选中的章节ID：
["section_id1", "section_id2", "section_id3"]

如果没有需要回顾的章节，返回空数组：[]"""

        user_prompt = f"""当前要撰写的章节：
- 一级标题：{section.get('level1_title', '')}
- 二级标题：{section.get('level2_title', '')}

历史章节列表：
{history_titles}

请判断是否需要回顾历史章节，如果需要，请返回章节ID数组（最多3个）。如果不需要，返回空数组 []。"""
        
        # 确保 prompt 不为空
        if not user_prompt or len(user_prompt.strip()) == 0:
            user_prompt = f"""当前要撰写的章节：
- 一级标题：{section.get('level1_title', '章节')}
- 二级标题：{section.get('level2_title', '内容')}

暂无历史章节。

请判断是否需要回顾历史章节，如果需要，请返回章节ID数组（最多3个）。如果不需要，返回空数组 []。"""

        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
            
            print(f"\n{'='*60}")
            print(f"🔍 [WritingAgent] 调用 LLM 选择历史章节")
            print(f"{'='*60}")
            print(f"模型: qwen-plus")
            print(f"当前章节: {section.get('level1_title', '')} - {section.get('level2_title', '')}")
            history_count = len([line for line in history_titles.split('\n') if line.strip()]) if history_titles else 0
            print(f"历史章节数: {history_count}")
            print(f"开始请求...")
            
            response = self.llm.invoke(messages)
            content = response.content.strip()
            
            print(f"✅ [WritingAgent] 选择历史章节完成")
            
            # 提取JSON数组
            import json
            import re
            
            # 尝试提取JSON数组
            content = re.sub(r'[^\[\],"\w]', '', content)  # 清理非JSON字符
            if content.startswith('[') and content.endswith(']'):
                section_ids = json.loads(content)
            else:
                # 尝试找到数组
                match = re.search(r'\[(.*?)\]', content)
                if match:
                    section_ids = json.loads(match.group(0))
                else:
                    section_ids = []
            
            # 限制最多3个
            section_ids = section_ids[:max_sections]
            
            # 获取章节标题（用于前端展示）
            history_titles = []
            titles_list = self.history_manager.get_history_titles()
            titles_dict = {t['section_id']: t for t in titles_list if t.get('section_id')}
            
            for section_id in section_ids:
                if section_id in titles_dict:
                    title_info = titles_dict[section_id]
                    # 获取标题，移除 markdown 标记
                    title = title_info.get('title', '')
                    # 移除可能的 markdown 标记（###、##、# 等）
                    title = title.lstrip('#').strip()
                    if title:
                        history_titles.append(title)
            
            # 返回标题列表和ID列表
            return history_titles, section_ids
            
        except Exception as e:
            print(f"选择历史章节失败: {e}，将不回顾历史章节")
            return [], []

