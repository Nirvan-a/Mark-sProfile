"""
信息充分性判断器
判断检索信息是否足够，决定是否需要继续检索（最多3轮）
"""
import os
from typing import List, Dict, Any

try:
    from langchain_openai import ChatOpenAI
except ImportError:
    from langchain_community.chat_models import ChatOpenAI


class InformationEvaluatorError(Exception):
    """信息评估错误"""
    pass


class InformationSufficiencyEvaluator:
    """信息充分性判断器"""
    
    def __init__(self):
        """初始化信息充分性判断器"""
        # 确保加载 .env 文件
        from dotenv import load_dotenv
        from pathlib import Path
        env_path = Path(__file__).parent.parent.parent.parent / ".env"
        load_dotenv(dotenv_path=env_path, override=False)
        
        api_key = os.getenv("DASHSCOPE_API_KEY")
        if not api_key:
            raise InformationEvaluatorError("DASHSCOPE_API_KEY 未配置")
        
        self.llm = ChatOpenAI(
            model="qwen-plus",
            api_key=api_key,
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
            temperature=0.3,  # 较低温度，更确定性
        )
    
    def evaluate(
        self, 
        section: Dict[str, Any], 
        search_results: List[Dict[str, Any]], 
        round_num: int,
        max_rounds: int = 3
    ) -> Dict[str, Any]:
        """
        评估信息是否足够
        
        Args:
            section: 章节信息，包含 level1_title, level2_title
            search_results: 检索结果列表
            round_num: 当前检索轮次（从1开始）
            max_rounds: 最大检索轮次（默认3）
        
        Returns:
            评估结果字典:
            {
                "sufficient": bool,  # 信息是否足够
                "reason": str,       # 判断理由
                "score": float,      # 充分性分数（0-1）
                "should_continue": bool  # 是否应该继续检索
            }
        """
        # 如果没有检索结果，继续检索（除非已达到最大轮次）
        if not search_results:
            if round_num >= max_rounds:
                return {
                    "sufficient": False,
                    "reason": f"已达到最大检索轮次({max_rounds})且未检索到任何结果",
                    "score": 0.0,
                    "should_continue": False,
                }
            return {
                "sufficient": False,
                "reason": "未检索到任何结果，需要继续检索",
                "score": 0.0,
                "should_continue": True,
            }
        
        # 注意：即使达到最大轮次，也进行LLM评估，以反映真实的充分性
        # 只是在should_continue中标记为False，表示不再继续检索
        if not search_results:
            return {
                "sufficient": False,
                "reason": "未检索到任何结果，需要继续检索",
                "score": 0.0,
                "should_continue": True,
            }
        
        # 使用LLM评估信息充分性
        system_prompt = """你是一位严格的信息评估专家，擅长判断检索到的信息是否足够支撑某个章节的写作。

**评估要求**：
你必须非常严格地评估信息的相关性。只有当检索到的信息**直接且具体地**与章节主题相关时，才能给出高分。

**评估标准（按重要性排序）**：
1. **主题相关性（最重要）**：
   - 信息必须与章节标题中的核心人物、事件、主题高度相关
   - 如果章节是关于特定人物（如"埃隆·马斯克的童年"），信息必须直接涉及该人物，而不是一般性的主题（如"童年教育"）
   - 如果章节是关于特定事件或概念，信息必须直接涉及该事件或概念的具体内容
   - 完全不相关的信息（如章节是关于A人物，但检索到的是B主题）应视为0分

2. **内容完整性**：
- 信息是否覆盖章节的主要要点
- 信息是否足够详细和深入
   - 是否有足够的信息支撑完整的章节写作

3. **信息质量**：
- 信息是否来自可靠来源
   - 信息是否准确和有用

**评分规则**：
- 0.0-0.3：信息与章节主题不相关或几乎不相关
- 0.4-0.6：信息部分相关，但不够具体或不够完整
- 0.7-0.9：信息高度相关且较为完整，可以支撑写作
- 1.0：信息完全相关且非常完整，完全满足写作需求

**特别注意**：
- 如果检索到的信息虽然包含章节标题中的关键词，但实际上与章节主题不相关（例如：章节是关于"埃隆·马斯克的童年"，但检索到的是"童年教育的一般性文章"），应该给予低分（0.3-0.5）
- 只有当信息直接涉及章节主题的具体内容时，才能给予高分（>=0.7）

请给出：
1. 充分性判断（是/否）
2. 判断理由（详细说明为什么给出这个分数，特别是相关性分析）
3. 充分性分数（0-1之间，0.7以上认为足够）

输出格式必须是严格的JSON：
{
  "sufficient": true/false,
  "reason": "详细的判断理由，包括相关性分析",
  "score": 0.0-1.0
}"""

        # 格式化检索结果摘要
        results_summary = self._format_results_summary(search_results)
        
        user_prompt = f"""请评估以下信息是否足够支撑章节写作：

章节信息：
- 一级标题：{section.get('level1_title', '')}
- 二级标题：{section.get('level2_title', '')}

检索结果（共{len(search_results)}条）：
{results_summary}

当前检索轮次：{round_num}/{max_rounds}

请判断信息是否足够，并返回JSON格式的评估结果。"""

        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
            
            print(f"\n{'='*60}")
            print(f"📊 [InformationEvaluator] 调用 LLM 评估信息充分性")
            print(f"{'='*60}")
            print(f"模型: qwen-plus")
            print(f"章节: {section.get('level1_title', '')} - {section.get('level2_title', '')}")
            print(f"检索轮次: {round_num}/{max_rounds}")
            print(f"检索结果数: {len(search_results)}")
            print(f"开始请求...")
            
            response = self.llm.invoke(messages)
            content = response.content.strip()
            
            print(f"✅ [InformationEvaluator] LLM 响应完成")
            print(f"\n[InformationEvaluator] LLM 原始响应:")
            print(content[:500])  # 打印前500字符
            print("...")
            
            # 提取JSON
            content = self._extract_json(content)
            
            # 解析JSON
            import json
            evaluation = json.loads(content)
            
            # 验证和规范化
            sufficient = bool(evaluation.get("sufficient", False))
            score = float(evaluation.get("score", 0.0))
            reason = str(evaluation.get("reason", ""))
            
            print(f"\n[InformationEvaluator] 解析后的评估结果:")
            print(f"  充分性: {sufficient}")
            print(f"  分数: {score:.2f}")
            print(f"  理由: {reason}")
            
            # 如果分数>=0.7，认为足够
            if score >= 0.7:
                sufficient = True
            
            # 决定是否继续检索
            # 如果达到最大轮次，无论评估结果如何，都不再继续检索
            should_continue = not sufficient and round_num < max_rounds
            
            result = {
                "sufficient": sufficient,
                "reason": reason,
                "score": round(score, 2),
                "should_continue": should_continue,
            }
            
            print(f"\n[InformationEvaluator] 最终返回结果:")
            print(f"  充分性: {result['sufficient']}")
            print(f"  分数: {result['score']:.2f}")
            print(f"  应该继续: {result['should_continue']}")
            
            return result
            
        except Exception as e:
            error_msg = str(e)
            print(f"\n[InformationEvaluator] 评估出错: {error_msg}")
            import traceback
            traceback.print_exc()
            
            if "API key" in error_msg or "401" in error_msg:
                raise InformationEvaluatorError("API Key 认证失败") from e
            
            # 如果LLM评估失败，使用简单规则
            print(f"[InformationEvaluator] 使用回退评估逻辑")
            return self._fallback_evaluation(search_results, round_num, max_rounds)
    
    def _format_results_summary(self, results: List[Dict[str, Any]], max_items: int = 5) -> str:
        """格式化检索结果摘要"""
        if not results:
            return "无检索结果"
        
        summary_lines = []
        for i, result in enumerate(results[:max_items], 1):
            content = result.get("content", "")[:200]  # 只取前200字符
            source = result.get("source", "未知来源")
            title = result.get("title", "")
            
            summary_lines.append(
                f"{i}. [{source}] {title}\n   {content}..."
            )
        
        if len(results) > max_items:
            summary_lines.append(f"\n... 还有 {len(results) - max_items} 条结果")
        
        return "\n".join(summary_lines)
    
    def _extract_json(self, text: str) -> str:
        """从文本中提取JSON"""
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
    
    def _fallback_evaluation(
        self, 
        search_results: List[Dict[str, Any]], 
        round_num: int, 
        max_rounds: int
    ) -> Dict[str, Any]:
        """回退评估（当LLM评估失败时使用简单规则）"""
        # 回退规则：如果检索结果数量>=3，只给中等分数，不自动认为足够
        # 因为回退逻辑无法判断相关性，所以应该保守处理
        if len(search_results) >= 3:
            return {
                "sufficient": False,  # 改为False，因为无法判断相关性
                "reason": f"LLM评估失败，使用回退逻辑。检索到{len(search_results)}条结果，但无法判断相关性，建议继续检索",
                "score": 0.5,  # 降低分数，因为无法判断相关性
                "should_continue": True if round_num < max_rounds else False,
            }
        elif round_num >= max_rounds:
            return {
                "sufficient": True,
                "reason": f"已达到最大检索轮次({max_rounds})",
                "score": 0.6,
                "should_continue": False,
            }
        else:
            return {
                "sufficient": False,
                "reason": f"检索结果较少({len(search_results)}条)，继续检索",
                "score": 0.4,
                "should_continue": True,
            }

