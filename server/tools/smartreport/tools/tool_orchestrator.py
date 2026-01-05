"""
工具调用协调器
协调检索和写作流程，管理检索轮次（每章节最多3次）
"""
import os
import json
from typing import List, Dict, Any, Optional
from pathlib import Path

from dotenv import load_dotenv
try:
    from langchain_openai import ChatOpenAI
except ImportError:
    from langchain_community.chat_models import ChatOpenAI

from ..services.knowledge_base import get_knowledge_base_manager
from ..services.web_search import get_web_search_manager
from .temporary_kb import TemporaryKnowledgeBase
from ..agents.information_evaluator import InformationSufficiencyEvaluator


class ToolOrchestratorError(Exception):
    """工具协调器错误"""
    pass


class ToolOrchestrator:
    """工具调用协调器 - 协调检索和写作流程"""
    
    def __init__(self, temp_kb: TemporaryKnowledgeBase):
        """
        初始化工具协调器
        
        Args:
            temp_kb: 临时知识库管理器
        """
        self.temp_kb = temp_kb
        self.main_kb = get_knowledge_base_manager()
        self.web_search = get_web_search_manager()
        self.evaluator = InformationSufficiencyEvaluator()
        
        # 初始化 LLM（用于查询优化）
        env_path = Path(__file__).parent.parent.parent.parent / ".env"
        load_dotenv(dotenv_path=env_path, override=False)
        api_key = os.getenv("DASHSCOPE_API_KEY")
        if api_key:
            self.llm = ChatOpenAI(
                model="qwen-plus",
                api_key=api_key,
                base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
                temperature=0.3,
            )
        else:
            self.llm = None
    
    def _generate_search_query(
        self,
        section: Dict[str, Any],
        requirement: Optional[str] = None,
        previous_results: Optional[List[Dict[str, Any]]] = None,
        previous_evaluation: Optional[Dict[str, Any]] = None,
        previous_query: Optional[str] = None,
        round_num: int = 1
    ) -> str:
        """
        使用LLM生成优化的检索查询语句
        
        Args:
            section: 章节信息，包含 level1_title, level2_title
            requirement: 文章整体需求（可选）
            previous_results: 前一轮的检索结果（可选，用于多轮检索时优化查询）
            previous_evaluation: 前一轮的评估结果（可选，包含评估理由）
            previous_query: 前一轮使用的查询语句（可选，用于后续轮次）
            round_num: 当前检索轮次（从1开始）
        
        Returns:
            优化的查询语句
        """
        # 如果没有LLM，回退到原始标题
        if not self.llm:
            return section.get("level2_title", "") or section.get("level1_title", "")
        
        level1_title = section.get("level1_title", "")
        level2_title = section.get("level2_title", "")
        original_query = previous_query or (level2_title or level1_title)  # 如果有前一轮查询，使用它；否则使用章节标题
        
        # 根据是否有前一轮结果，选择不同的prompt策略
        if round_num == 1 or not previous_results:
            # 第一轮：基于章节信息生成初始查询
            system_prompt = """你是一位专业的检索查询优化专家，擅长根据章节信息生成精确、有效的检索查询语句。

**任务**：
将给定的章节标题转换为一个优化的检索查询语句，该查询语句应该：
1. **包含关键人物、事件、主题**：如果章节涉及特定人物（如"埃隆·马斯克"），查询语句必须包含该人物的名字
2. **包含章节核心内容**：结合章节标题和文章主题，生成包含核心关键词的查询语句
3. **适合向量检索和网络搜索**：查询语句应该清晰、具体，能够匹配到相关内容
4. **简洁明了**：查询语句长度控制在20字以内，避免冗余

**输出格式**：
只输出优化后的查询语句，不要包含任何解释或其他内容。

**示例**：
- 输入章节："童年成长与教育背景"，文章主题："埃隆·马斯克"
  输出："埃隆·马斯克 童年 教育背景"
  
- 输入章节："Zip2与PayPal的创业历程"，文章主题："埃隆·马斯克"
  输出："埃隆·马斯克 Zip2 PayPal 创业"
  
- 输入章节："核能装机容量分析"，文章主题："中国核电发展"
  输出："中国 核电 装机容量" """

            user_prompt_parts = [
                f"章节信息：",
                f"- 一级标题：{level1_title}",
                f"- 二级标题：{level2_title}",
            ]
            
            if requirement:
                user_prompt_parts.append(f"\n文章整体主题：{requirement}")
            
            user_prompt_parts.append(f"\n原始查询语句：{original_query}")
            user_prompt_parts.append("\n请生成优化的检索查询语句：")
        else:
            # 后续轮次：基于前一轮结果和评估情况，生成不同角度的查询
            system_prompt = """你是一位专业的检索查询优化专家，擅长根据前一轮检索结果和评估情况，生成从不同角度或维度检索的查询语句。

**任务**：
前一轮检索的结果不够充分，需要从不同角度或维度进行检索。请根据以下信息生成一个新的、优化的检索查询语句：

**要求**：
1. **避免重复前一轮的查询角度**：如果前一轮查询了"A角度"，新查询应该从"B角度"或"C角度"检索
2. **结合评估反馈**：根据评估理由中指出的问题，调整查询重点
3. **包含关键人物、事件、主题**：如果章节涉及特定人物，查询语句必须包含该人物名字
4. **尝试不同的关键词组合**：使用同义词、相关概念、不同表述方式等
5. **简洁明了**：查询语句长度控制在20字以内

**输出格式**：
只输出优化后的查询语句，不要包含任何解释或其他内容。

**示例**：
- 前一轮查询："埃隆·马斯克 童年 教育背景"，评估理由："检索到的是通用童年教育文章，缺少马斯克的具体信息"
  新查询："埃隆·马斯克 南非 早期经历 家庭背景"

- 前一轮查询："中国 核电 装机容量"，评估理由："检索到的信息不够详细"
  新查询："中国 核电站 装机规模 统计数据" """

            # 格式化前一轮检索结果摘要
            results_summary = self._format_results_summary(previous_results[:5])  # 只显示前5条
            evaluation_reason = previous_evaluation.get("reason", "") if previous_evaluation else ""
            
            user_prompt_parts = [
                f"章节信息：",
                f"- 一级标题：{level1_title}",
                f"- 二级标题：{level2_title}",
            ]
            
            if requirement:
                user_prompt_parts.append(f"\n文章整体主题：{requirement}")
            
            user_prompt_parts.extend([
                f"\n前一轮查询语句：{previous_query or original_query}",
                f"\n前一轮检索结果（共{len(previous_results)}条，显示前5条）：",
                results_summary,
            ])
            
            if evaluation_reason:
                user_prompt_parts.append(f"\n评估反馈：{evaluation_reason}")
            
            user_prompt_parts.append(f"\n当前检索轮次：第 {round_num} 轮")
            user_prompt_parts.append("\n请生成一个新的、从不同角度检索的查询语句：")
        
        user_prompt = "\n".join(user_prompt_parts)
        
        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
            
            print(f"\n{'='*60}")
            print(f"🔍 [QueryOptimizer] 生成优化的检索查询语句 (第{round_num}轮)")
            print(f"{'='*60}")
            print(f"原始查询: {original_query}")
            if round_num > 1 and previous_evaluation:
                print(f"前一轮评估: 充分性={previous_evaluation.get('score', 0):.2f}, 理由={previous_evaluation.get('reason', '')[:100]}...")
            print(f"开始请求...")
            
            response = self.llm.invoke(messages)
            optimized_query = response.content.strip()
            
            # 清理可能的Markdown代码块格式
            if optimized_query.startswith("```"):
                lines = optimized_query.split("\n")
                optimized_query = "\n".join(lines[1:-1]) if len(lines) > 2 else optimized_query
            optimized_query = optimized_query.strip('"\'')  # 移除可能的引号
            
            print(f"✅ [QueryOptimizer] 查询优化完成")
            print(f"优化后查询: {optimized_query}")
            
            # 如果优化后的查询为空，回退到原始查询
            if not optimized_query:
                print(f"⚠️  优化查询为空，使用原始查询")
                optimized_query = original_query
            
            return optimized_query
            
        except Exception as e:
            print(f"⚠️  查询优化失败: {e}，使用原始查询")
            return original_query
    
    def collect_information(
        self, 
        section: Dict[str, Any], 
        max_rounds: int = 3,
        k_per_round: int = 5,
        requirement: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        收集信息（最多3轮）
        
        检索优先级：临时知识库 → 全部知识库 → 联网检索
        
        Args:
            section: 章节信息，包含 level1_title, level2_title
            max_rounds: 最大检索轮次（默认3）
            k_per_round: 每轮检索返回结果数量（默认5）
            requirement: 文章整体需求（可选，用于优化查询语句）
        
        Returns:
            收集结果字典:
            {
                "all_results": List[Dict],  # 所有检索结果
                "rounds": int,              # 实际检索轮次
                "sufficient": bool,          # 信息是否足够
                "evaluation": Dict,          # 最终评估结果
            }
        """
        all_results = []
        query = None  # 初始化query变量
        previous_evaluation = None  # 存储前一轮的评估结果
        previous_query = None  # 存储前一轮的查询语句
        
        for round_num in range(1, max_rounds + 1):
            # 根据轮次生成或优化查询语句
            if round_num == 1:
                # 第一轮：基于章节信息生成初始查询
                query = self._generate_search_query(
                    section=section,
                    requirement=requirement,
                    round_num=round_num
                )
                print(f"开始收集信息: {query} (最多{max_rounds}轮)")
            else:
                # 后续轮次：基于前一轮结果和评估情况，生成新的查询
                query = self._generate_search_query(
                    section=section,
                    requirement=requirement,
                    previous_results=all_results,
                    previous_evaluation=previous_evaluation,
                    previous_query=previous_query,
                    round_num=round_num
                )
                print(f"  第 {round_num} 轮检索，使用新查询: {query}")
            
            if not query:
                raise ToolOrchestratorError(f"第{round_num}轮查询语句不能为空")
            
            print(f"  第 {round_num} 轮检索...")
            
            round_results = []
            
            # 1. 先查临时知识库（优先）
            temp_results = self.temp_kb.search(query, k=k_per_round)
            if temp_results:
                print(f"    临时知识库: 找到 {len(temp_results)} 条结果")
                round_results.extend(temp_results)
                # 注意：临时知识库的结果已经存在，不需要再次添加
            
            # 2. 如果临时知识库没有结果，再查全部知识库和联网
            if not temp_results:
                # 查全部知识库
                try:
                    kb_results = self.main_kb.search(query, k=k_per_round)
                    if kb_results:
                        print(f"    全部知识库: 找到 {len(kb_results)} 条结果")
                        round_results.extend(kb_results)
                        # 存入临时知识库
                        self.temp_kb.add_search_results(kb_results)
                except Exception as e:
                    print(f"    全部知识库检索失败: {e}")
                
                # 联网检索
                try:
                    web_results = self.web_search.search(query, k=k_per_round)
                    if web_results:
                        print(f"    联网检索: 找到 {len(web_results)} 条结果")
                        round_results.extend(web_results)
                        # 存入临时知识库
                        self.temp_kb.add_search_results(web_results)
                except Exception as e:
                    print(f"    联网检索失败: {e}")
            
            # 合并本轮结果
            all_results.extend(round_results)
            
            # 3. 评估信息是否足够
            evaluation = self.evaluator.evaluate(
                section=section,
                search_results=all_results,
                round_num=round_num,
                max_rounds=max_rounds
            )
            
            # 保存当前评估结果和查询语句，供下一轮查询优化使用
            previous_evaluation = evaluation
            previous_query = query
            
            print(f"    评估结果: 充分性={evaluation['score']:.2f}, 足够={evaluation['sufficient']}")
            
            # 如果信息足够或达到最大轮次，停止检索
            if evaluation["sufficient"] or not evaluation["should_continue"]:
                print(f"  信息收集完成 (共 {round_num} 轮)")
                break
        
        return {
            "all_results": all_results,
            "rounds": round_num,
            "sufficient": evaluation["sufficient"],
            "evaluation": evaluation,
        }
    
    def create_langchain_tools(self) -> List[Any]:
        """
        创建 LangChain Tools（用于写作智能体）
        
        Returns:
            LangChain Tool 列表
        """
        from langchain.tools import Tool
        
        tools = [
            Tool(
                name="search_temporary_kb",
                func=lambda q: self.temp_kb.search(q, k=5),
                description="从临时知识库检索信息（优先使用）。输入：搜索查询字符串"
            ),
            Tool(
                name="search_main_kb",
                func=lambda q: self.main_kb.search(q, k=5),
                description="从全部知识库检索信息。输入：搜索查询字符串"
            ),
            Tool(
                name="search_web",
                func=lambda q: self.web_search.search(q, k=5),
                description="联网检索信息。输入：搜索查询字符串"
            ),
        ]
        
        return tools
    
    def _format_results_summary(self, search_results: List[Dict[str, Any]], max_items: int = 5) -> str:
        """
        格式化检索结果摘要（用于查询优化）
        
        Args:
            search_results: 检索结果列表
            max_items: 最大显示条目数
        
        Returns:
            格式化的摘要字符串
        """
        if not search_results:
            return "无检索结果"
        
        summary_parts = []
        for i, result in enumerate(search_results[:max_items], 1):
            title = result.get("title", result.get("filename", "无标题"))
            source = result.get("source", result.get("url", "未知来源"))
            content_preview = result.get("content", "")[:100]
            
            summary_parts.append(f"{i}. {title}")
            summary_parts.append(f"   来源: {source}")
            if content_preview:
                summary_parts.append(f"   内容预览: {content_preview}...")
        
        if len(search_results) > max_items:
            summary_parts.append(f"... (还有 {len(search_results) - max_items} 条结果)")
        
        return "\n".join(summary_parts)

