"""
Deep Research 工作流编排器
使用 LangGraph 编排完整的深度研究写作流程
"""
import os
from typing import TypedDict, List, Dict, Any, Optional
from uuid import uuid4

try:
    from langgraph.graph import StateGraph, END
    from langgraph.graph.message import add_messages
    LANGGRAPH_AVAILABLE = True
except ImportError:
    LANGGRAPH_AVAILABLE = False
    print("警告: LangGraph 不可用，请安装: pip install langgraph")

from ..agents.planning_agent import PlanningAgent, PlanningAgentError
from ..tools.temporary_kb import TemporaryKnowledgeBase
from ..tools.writing_history import WritingHistoryManager
from ..tools.tool_orchestrator import ToolOrchestrator
from ..agents.writing_agent import WritingAgent
from ..agents.result_filter_agent import ResultFilterAgent


class WorkflowError(Exception):
    """工作流错误"""
    pass


class WorkflowState(TypedDict):
    """工作流状态"""
    # 输入
    requirement: str  # 用户需求
    task_id: str  # 任务ID
    
    # 规划阶段
    outline: Optional[Dict[str, Any]]  # 大纲
    sections: List[Dict[str, Any]]  # 所有二级标题章节列表
    current_section_index: int  # 当前章节索引
    
    # 写作阶段
    current_section: Optional[Dict[str, Any]]  # 当前章节信息
    search_results: List[Dict[str, Any]]  # 当前章节的最终检索结果（用于写作）
    history_sections: List[str]  # 需要回顾的历史章节标题（用于前端展示）
    history_section_ids: List[str]  # 需要回顾的历史章节ID（用于获取内容）
    written_content: str  # 当前章节的写作内容
    written_citations: List[Dict[str, Any]]  # 当前章节实际使用的引用列表
    chart_requirement: Optional[Dict[str, Any]]  # 当前章节的图表需求
    
    # 新流程的状态字段
    initial_search_queries: List[str]  # 准备阶段生成的初始检索语句
    initial_temp_kb_results: List[Dict[str, Any]]  # 临时知识库的初始检索结果
    info_sufficiency_evaluation: Optional[Dict[str, Any]]  # 信息充足性判断结果
    additional_search_queries: List[str]  # 如果信息不足，生成的额外检索语句
    additional_search_results: List[Dict[str, Any]]  # 额外检索的结果（筛选前）
    filtered_results: List[Dict[str, Any]]  # 筛选后的结果
    
    # 完成状态
    all_written_sections: List[Dict[str, Any]]  # 所有已写章节
    is_complete: bool  # 是否完成
    
    # 组件实例（不序列化，运行时使用）
    temp_kb: Optional[TemporaryKnowledgeBase]
    history_manager: Optional[WritingHistoryManager]
    tool_orchestrator: Optional[ToolOrchestrator]
    writing_agent: Optional[WritingAgent]


def create_deep_research_workflow():
    """创建 Deep Research 工作流"""
    if not LANGGRAPH_AVAILABLE:
        raise WorkflowError("LangGraph 不可用，请安装: pip install langgraph")
    
    workflow = StateGraph(WorkflowState)
    
    # 添加节点
    workflow.add_node("initialize", initialize_node)
    workflow.add_node("planning", planning_node)
    workflow.add_node("prepare_section", prepare_section_node)
    workflow.add_node("collect_info", collect_info_node)
    workflow.add_node("writing", writing_node)
    workflow.add_node("save_section", save_section_node)
    workflow.add_node("complete", complete_node)
    
    # 设置入口点
    workflow.set_entry_point("initialize")
    
    # 添加边
    workflow.add_edge("initialize", "planning")
    workflow.add_edge("planning", "prepare_section")
    
    # 条件边：是否还有章节
    workflow.add_conditional_edges(
        "prepare_section",
        has_more_sections,
        {
            "yes": "collect_info",
            "no": "complete",
        }
    )
    
    workflow.add_edge("collect_info", "writing")
    workflow.add_edge("writing", "save_section")
    
    # 条件边：是否还有章节
    workflow.add_conditional_edges(
        "save_section",
        has_more_sections,
        {
            "yes": "prepare_section",
            "no": "complete",
        }
    )
    
    workflow.add_edge("complete", END)
    
    return workflow.compile()


def initialize_node(state: WorkflowState) -> WorkflowState:
    """初始化节点"""
    print("=" * 50)
    print("初始化 Deep Research 工作流")
    print("=" * 50)
    
    # 生成任务ID
    if not state.get("task_id"):
        state["task_id"] = uuid4().hex
    
    # 初始化组件
    state["temp_kb"] = TemporaryKnowledgeBase(task_id=state["task_id"])
    state["history_manager"] = WritingHistoryManager()
    state["tool_orchestrator"] = ToolOrchestrator(state["temp_kb"])
    state["writing_agent"] = WritingAgent(history_manager=state["history_manager"])
    
    # 初始化状态（如果 sections 已存在，不要清空，因为可能是从前端传递过来的）
    existing_sections = state.get("sections", [])
    if not existing_sections:
        state["sections"] = []
    else:
        print(f"[Initialize] 保留已存在的 sections，数量: {len(existing_sections)}")
    if "current_section_index" not in state:
        state["current_section_index"] = 0
    if "all_written_sections" not in state:
        state["all_written_sections"] = []
    if "is_complete" not in state:
        state["is_complete"] = False
    
    print(f"任务ID: {state['task_id']}")
    print("✅ 初始化完成")
    
    return state


def planning_node(state: WorkflowState) -> WorkflowState:
    """规划节点 - 生成大纲（如果已有大纲则跳过生成）"""
    print("\n" + "=" * 50)
    print("规划阶段：生成写作大纲")
    print("=" * 50)
    
    # 如果已有大纲（从前端传递过来的），直接使用，不重新生成
    existing_outline = state.get("outline")
    existing_sections = state.get("sections", [])
    
    if existing_outline and existing_sections:
        print(f"✅ 使用已提供的大纲（跳过生成）")
        print(f"  总标题: {existing_outline.get('title', '')}")
        print(f"  章节数（一级标题）: {len(existing_sections)}")
        print(f"  预估字数: {existing_outline.get('estimated_words', 0)}")
        state["current_section_index"] = 0
        return state
    
    # 如果没有大纲，则生成新的大纲
    requirement = state.get("requirement", "")
    if not requirement:
        raise WorkflowError("用户需求不能为空")
    
    try:
        planner = PlanningAgent()
        outline = planner.generate_outline(requirement)
        
        # 获取所有一级标题章节列表（改为按一级标题为单位）
        sections = planner.get_all_level1_sections(outline)
        
        state["outline"] = outline
        state["sections"] = sections
        state["current_section_index"] = 0
        
        print(f"✅ 大纲生成完成")
        print(f"  总标题: {outline['title']}")
        print(f"  章节数（一级标题）: {len(sections)}")
        print(f"  预估字数: {outline.get('estimated_words', 0)}")
        
    except PlanningAgentError as e:
        raise WorkflowError(f"规划失败: {str(e)}") from e
    
    return state


def prepare_section_node(state: WorkflowState) -> WorkflowState:
    """准备章节节点 - 准备当前章节信息"""
    import time
    
    sections = state.get("sections", [])
    current_index = state.get("current_section_index", 0)
    
    # 检查是否还有章节
    if current_index >= len(sections):
        state["is_complete"] = True
        state["current_section"] = None
        return state
    
    current_section = sections[current_index]
    state["current_section"] = current_section
    state["search_results"] = []
    state["history_sections"] = []
    state["history_section_ids"] = []
    state["written_content"] = ""
    
    # 初始化新流程的状态字段
    state["initial_search_queries"] = []
    state["initial_temp_kb_results"] = []
    state["info_sufficiency_evaluation"] = None
    state["additional_search_queries"] = []
    state["additional_search_results"] = []
    state["filtered_results"] = []
    
    print("\n" + "=" * 50)
    print(f"准备章节 {current_index + 1}/{len(sections)}")
    print(f"  一级标题: {current_section.get('level1_title', '')}")
    print(f"  二级标题: {current_section.get('level2_title', '')}")
    print("=" * 50)
    
    outline = state.get("outline", {})
    requirement = state.get("requirement", "")
    writing_agent = state.get("writing_agent")
    temp_kb = state.get("temp_kb")
    history_manager = state.get("history_manager")
    
    # 使用全局进度管理器
    from ..tools.progress_manager import get_progress_manager
    progress_manager = get_progress_manager()
    task_id = state.get("task_id")
    
    def report_progress(step: int, total: int, message: str, data: dict = None):
        """报告步骤进度到前端"""
        if task_id:
            event_data = {
                "type": "step_progress",
                "node": "prepare_section",
                "step": step,
                "total": total,
                "message": message,
                "timestamp": int(time.time() * 1000)
            }
            if data:
                event_data["data"] = data
            progress_manager.report_progress(task_id, event_data)
    
    # 记录开始时间
    step_start_time = time.time()
    
    # 1. 选择需要回顾的历史章节
    if history_manager:
        history_titles = history_manager.get_history_titles_formatted()
        print(f"\n历史章节列表:\n{history_titles}\n")
        
        if writing_agent:
            report_progress(1, 6, "🔍 判断是否需要回顾历史章节...")
            print(f"⏱️  [步骤1开始] 选择历史章节 - {time.strftime('%H:%M:%S')}")
            history_titles, history_ids = writing_agent.select_history_sections(
                current_section,
                max_sections=3
            )
            state["history_sections"] = history_titles  # 标题列表（用于前端展示）
            state["history_section_ids"] = history_ids  # ID列表（用于获取内容）
            
            elapsed = time.time() - step_start_time
            if history_titles:
                print(f"✅ [步骤1完成] 选择回顾 {len(history_titles)} 个历史章节 - 耗时 {elapsed:.2f}秒")
                report_progress(1, 6, f"✅ 需要回顾 {len(history_titles)} 个历史章节", {
                    "history_sections": history_titles
                })
            else:
                print(f"✅ [步骤1完成] 无需回顾历史章节 - 耗时 {elapsed:.2f}秒")
                report_progress(1, 6, "✅ 无需回顾历史章节")
    
    # 2. 生成检索语句并并行检索、筛选、入库
    if writing_agent and outline and temp_kb:
        step_start_time = time.time()
        report_progress(2, 6, "🔍 生成检索查询...")
        print(f"\n⏱️  [步骤2开始] 生成检索查询语句 - {time.strftime('%H:%M:%S')}")
        search_queries = writing_agent.generate_search_queries(
            section=current_section,
            outline=outline,
            requirement=requirement
        )
        state["initial_search_queries"] = search_queries
        elapsed = time.time() - step_start_time
        print(f"✅ [步骤2完成] 生成 {len(search_queries)} 个检索查询 - 耗时 {elapsed:.2f}秒")
        report_progress(2, 6, f"已生成 {len(search_queries)} 个检索查询", {
            "search_queries": search_queries
        })
        
        # 步骤3: 先在临时知识库检索（每个查询只取第1个结果）
        step_start_time = time.time()
        report_progress(3, 6, "🔍 临时知识库检索...")
        print(f"\n⏱️  [步骤3开始] 临时知识库检索 - {time.strftime('%H:%M:%S')}")
        temp_kb_results = []
        for query in search_queries:
            results = temp_kb.search(query, k=1)  # 只取第1个结果
            if results:
                result = results[0].copy()
                result["query"] = query  # 记录使用的查询语句
                temp_kb_results.append(result)
        elapsed = time.time() - step_start_time
        print(f"✅ [步骤3完成] 临时知识库找到 {len(temp_kb_results)} 条结果 - 耗时 {elapsed:.2f}秒")
        report_progress(3, 6, f"临时知识库找到 {len(temp_kb_results)} 条结果")
        
        # 步骤4: 并行检索知识库和联网（每个查询语句取前2结果）
        from ..services.knowledge_base import get_knowledge_base_manager
        from ..services.web_search import get_web_search_manager
        from ..agents.result_filter_agent import ResultFilterAgent
        import hashlib
        
        main_kb = get_knowledge_base_manager()
        web_search = get_web_search_manager()
        filter_agent = ResultFilterAgent()
        
        # 获取已入库的结果ID（用于去重）
        def get_result_id(result):
            content = result.get("content", "")
            source = result.get("source", "")
            id_str = f"{content}|{source}"
            return hashlib.md5(id_str.encode()).hexdigest()
        
        existing_ids = set()
        for result in temp_kb_results:
            existing_ids.add(get_result_id(result))
        
        all_initial_results = []
        
        step_start_time = time.time()
        report_progress(4, 6, "🔍 并行检索（知识库 + 联网）...")
        print(f"\n⏱️  [步骤4开始] 并行检索（知识库 + 联网）- {time.strftime('%H:%M:%S')}")
        for query in search_queries:
            # 检索知识库（取前3结果，过滤已入库的）
            try:
                kb_results = main_kb.search(query, k=5)  # 多取一些以便过滤
                kb_filtered = []
                for result in kb_results:
                    result_id = get_result_id(result)
                    if result_id not in existing_ids:
                        kb_filtered.append(result)
                        existing_ids.add(result_id)
                    if len(kb_filtered) >= 3:  # 每个查询取3个结果
                        break
                all_initial_results.extend(kb_filtered)
                if kb_filtered:
                    print(f"  查询 '{query}': 知识库找到 {len(kb_filtered)} 条结果")
            except Exception as e:
                print(f"  查询 '{query}': 知识库检索失败: {e}")
            
            # 联网检索（取前3结果，过滤已入库的）
            try:
                web_results = web_search.search(query, k=5)  # 多取一些以便过滤
                web_filtered = []
                for result in web_results:
                    result_id = get_result_id(result)
                    if result_id not in existing_ids:
                        web_filtered.append(result)
                        existing_ids.add(result_id)
                    if len(web_filtered) >= 3:  # 每个查询取3个结果
                        break
                all_initial_results.extend(web_filtered)
                if web_filtered:
                    print(f"  查询 '{query}': 联网找到 {len(web_filtered)} 条结果")
            except Exception as e:
                print(f"  查询 '{query}': 联网检索失败: {e}")
        
        elapsed = time.time() - step_start_time
        print(f"✅ [步骤4完成] 并行检索完成: 共 {len(all_initial_results)} 条结果 - 耗时 {elapsed:.2f}秒")
        
        # 准备精简的结果数据发送到前端
        results_preview = []
        for result in all_initial_results:
            preview = {
                "source": result.get("source", ""),
                "title": result.get("title", ""),
                "url": result.get("url", ""),
                "filename": result.get("filename", ""),  # 添加filename字段（知识库结果需要）
                "snippet": result.get("content", "")[:200] + "..." if len(result.get("content", "")) > 200 else result.get("content", "")
            }
            results_preview.append(preview)
        
        report_progress(4, 6, f"✅ 并行检索完成，共 {len(all_initial_results)} 条结果", {
            "retrieval_results": results_preview
        })
        
        # 步骤5: 筛选结果：选出约60%的结果（保留更多信息）
        step_start_time = time.time()
        report_progress(5, 6, "🔍 筛选检索结果...")
        print(f"\n⏱️  [步骤5开始] 筛选检索结果 - {time.strftime('%H:%M:%S')}")
        filtered_results = []
        if all_initial_results:
            outline_markdown = outline.get("outline_markdown", "")
            if not outline_markdown:
                outline_markdown = _format_outline_markdown(outline)
            
            # 确保 outline_markdown 不为空（避免 LLM 输入长度错误）
            if not outline_markdown or len(outline_markdown.strip()) == 0:
                print(f"⚠️  警告: outline_markdown 为空，使用默认值")
                outline_markdown = f"# {outline.get('title', '报告')}\n\n## {current_section.get('level1_title', '章节')}\n\n### {current_section.get('level2_title', '内容')}"
            
            # 计算目标筛选数量：保留约60%的结果，但至少保留3个，最多保留10个
            target_count = max(3, min(10, int(len(all_initial_results) * 0.6)))
            filtered_results = filter_agent.filter_results(
                search_results=all_initial_results,
                section=current_section,
                search_queries=search_queries,
                outline=outline_markdown,
                target_count=target_count
            )
            
            # 步骤6: 将筛选结果加入临时知识库
            if filtered_results:
                elapsed = time.time() - step_start_time
                print(f"✅ [步骤5完成] 筛选完成: 从 {len(all_initial_results)} 条中选出 {len(filtered_results)} 条 - 耗时 {elapsed:.2f}秒")
                
                # 准备精简的筛选结果数据发送到前端
                filtered_preview = []
                for result in filtered_results:
                    preview = {
                        "source": result.get("source", ""),
                        "title": result.get("title", ""),
                        "url": result.get("url", ""),
                        "filename": result.get("filename", ""),  # 添加filename字段（知识库结果需要）
                        "snippet": result.get("content", "")[:200] + "..." if len(result.get("content", "")) > 200 else result.get("content", "")
                    }
                    filtered_preview.append(preview)
                
                report_progress(5, 6, f"✅ 已筛选出 {len(filtered_results)} 条高质量结果（从 {len(all_initial_results)} 条中）", {
                    "filtered_results": filtered_preview
                })
                
                step_start_time = time.time()
                report_progress(6, 6, "🔍 保存到临时知识库...")
                print(f"\n⏱️  [步骤6开始] 保存到临时知识库 - {time.strftime('%H:%M:%S')}")
                temp_kb.add_search_results(filtered_results)
                elapsed = time.time() - step_start_time
                print(f"✅ [步骤6完成] 已入库 {len(filtered_results)} 条结果 - 耗时 {elapsed:.2f}秒")
                report_progress(6, 6, f"✅ 已保存 {len(filtered_results)} 条结果到临时库")
        
        # 合并结果：临时KB结果 + 筛选后的结果
        initial_temp_kb_results = temp_kb_results + filtered_results
        state["initial_temp_kb_results"] = initial_temp_kb_results
        print(f"\n✅ prepare_section 节点完成: 临时KB {len(temp_kb_results)} 条 + 筛选后 {len(filtered_results)} 条 = 共 {len(initial_temp_kb_results)} 条结果")
    
    return state


def collect_info_node(state: WorkflowState) -> WorkflowState:
    """信息收集节点 - 新流程：先判断充足性，不足则检索"""
    import hashlib
    import time
    
    current_section = state.get("current_section")
    writing_agent = state.get("writing_agent")
    temp_kb = state.get("temp_kb")
    history_manager = state.get("history_manager")
    outline = state.get("outline", {})
    requirement = state.get("requirement", "")
    
    if not current_section:
        raise WorkflowError("当前章节信息为空")
    if not writing_agent:
        raise WorkflowError("写作智能体未初始化")
    
    print("\n" + "-" * 50)
    print("信息收集阶段")
    print("-" * 50)
    
    # 使用全局进度管理器
    from ..tools.progress_manager import get_progress_manager
    progress_manager = get_progress_manager()
    task_id = state.get("task_id")
    
    def report_progress(step: int, total: int, message: str, data: dict = None):
        """报告步骤进度到前端"""
        if task_id:
            event_data = {
                "type": "step_progress",
                "node": "collect_info",
                "step": step,
                "total": total,
                "message": message,
                "timestamp": int(time.time() * 1000)
            }
            if data:
                event_data["data"] = data
            progress_manager.report_progress(task_id, event_data)
    
    # 获取初始信息
    initial_temp_kb_results = state.get("initial_temp_kb_results", [])
    history_section_ids = state.get("history_section_ids", [])
    
    # 步骤1: 获取历史章节内容
    step_start_time = time.time()
    print(f"\n⏱️  [步骤1开始] 获取历史章节内容 - {time.strftime('%H:%M:%S')}")
    history_contents = []
    if history_manager and history_section_ids:
        for section_id in history_section_ids:
            content = history_manager.search_by_title(section_id)
            if content:
                history_contents.append(content)
    elapsed = time.time() - step_start_time
    print(f"✅ [步骤1完成] 获取 {len(history_contents)} 个历史章节 - 耗时 {elapsed:.2f}秒")
    
    # 步骤2: 生成大纲的Markdown格式
    step_start_time = time.time()
    print(f"\n⏱️  [步骤2开始] 生成大纲Markdown - {time.strftime('%H:%M:%S')}")
    outline_markdown = outline.get("outline_markdown", "")
    if not outline_markdown:
        outline_markdown = _format_outline_markdown(outline)
    
    # 确保 outline_markdown 不为空（避免 LLM 输入长度错误）
    if not outline_markdown or len(outline_markdown.strip()) == 0:
        print(f"⚠️  警告: outline_markdown 为空，使用默认值")
        outline_markdown = f"# {outline.get('title', '报告')}\n\n## {current_section.get('level1_title', '章节')}\n\n### {current_section.get('level2_title', '内容')}"
    elapsed = time.time() - step_start_time
    print(f"✅ [步骤2完成] 大纲Markdown已准备 - 耗时 {elapsed:.2f}秒")
    
    # 步骤3: 第一次判断：信息是否充足
    step_start_time = time.time()
    report_progress(1, 4, "🔍 评估信息充足性...")
    print(f"\n⏱️  [步骤3开始] 第一次信息充足性判断 - {time.strftime('%H:%M:%S')}")
    evaluation = writing_agent.evaluate_info_sufficiency(
        section=current_section,
        search_results=initial_temp_kb_results,
        history_sections=history_contents,
        outline=outline_markdown
    )
    state["info_sufficiency_evaluation"] = evaluation
    elapsed = time.time() - step_start_time
    
    if evaluation["sufficient"]:
        # 信息充足，直接使用初始结果
        print(f"✅ [步骤3完成] 信息充足，使用初始检索结果 - 耗时 {elapsed:.2f}秒")
        report_progress(1, 4, "✅ 信息充足，无需补充检索")
        state["search_results"] = initial_temp_kb_results
        print(f"\n✅ collect_info 节点完成: 信息充足，共 {len(initial_temp_kb_results)} 条结果")
        return state
    
    # 信息不足，需要额外检索
    print(f"⚠️  [步骤3完成] 信息不足，缺失点: {evaluation['missing_points']} - 耗时 {elapsed:.2f}秒")
    report_progress(1, 4, f"⚠️ 信息不足，需要补充检索", {
        "is_additional_retrieval": True
    })
    
    # 步骤4: 生成额外检索语句（基于缺失点）
    missing_points = evaluation.get("missing_points", [])
    if not missing_points:
        missing_points = ["需要更多相关信息"]
    
    # 根据缺失点数量动态确定检索语句数量
    # 策略：根据缺失点数量，确保有足够的查询来覆盖所有缺失点
    num_missing_points = len(missing_points)
    if num_missing_points <= 2:
        num_queries = 1
    elif num_missing_points <= 4:
        num_queries = 2
    else:
        num_queries = 3  # 最多3个，因为一个查询可以覆盖多个相关缺失点
    
    # 生成检索语句（使用缺失点）
    step_start_time = time.time()
    print(f"\n⏱️  [步骤4开始] 生成额外检索语句（基于缺失点，需要 {num_queries} 个）- {time.strftime('%H:%M:%S')}")
    additional_queries = writing_agent.generate_search_queries_for_missing_points(
        section=current_section,
        missing_points=missing_points,
        num_queries=num_queries,
        requirement=requirement
    )
    state["additional_search_queries"] = additional_queries
    elapsed = time.time() - step_start_time
    print(f"✅ [步骤4完成] 生成 {len(additional_queries)} 个额外检索语句 - 耗时 {elapsed:.2f}秒")
    report_progress(1, 4, f"已生成 {len(additional_queries)} 个补充检索查询", {
        "additional_search_queries": additional_queries
    })
    
    # 步骤5: 并行检索：知识库 + 联网
    from ..services.knowledge_base import get_knowledge_base_manager
    from ..services.web_search import get_web_search_manager
    
    main_kb = get_knowledge_base_manager()
    web_search = get_web_search_manager()
    
    # 获取已入库的结果ID（用于去重）
    # 使用 content+source 的hash作为ID
    def get_result_id(result):
        content = result.get("content", "")
        source = result.get("source", "")
        id_str = f"{content}|{source}"
        return hashlib.md5(id_str.encode()).hexdigest()
    
    existing_ids = set()
    for result in initial_temp_kb_results:
        existing_ids.add(get_result_id(result))
    
    all_additional_results = []
    
    step_start_time = time.time()
    report_progress(2, 4, "🔍 补充检索（知识库 + 联网）...")
    print(f"\n⏱️  [步骤5开始] 并行检索（知识库 + 联网）- {time.strftime('%H:%M:%S')}")
    for query in additional_queries:
        # 检索知识库（取前3结果，过滤已入库的）
        try:
            kb_results = main_kb.search(query, k=5)  # 多取一些以便过滤
            kb_filtered = []
            for result in kb_results:
                result_id = get_result_id(result)
                if result_id not in existing_ids:
                    kb_filtered.append(result)
                    existing_ids.add(result_id)
                if len(kb_filtered) >= 3:  # 每个查询取3个结果
                    break
            all_additional_results.extend(kb_filtered)
            if kb_filtered:
                print(f"  查询 '{query}': 知识库找到 {len(kb_filtered)} 条结果")
        except Exception as e:
            print(f"  查询 '{query}': 知识库检索失败: {e}")
        
        # 联网检索（取前3结果，过滤已入库的）
        try:
            web_results = web_search.search(query, k=5)  # 多取一些以便过滤
            web_filtered = []
            for result in web_results:
                result_id = get_result_id(result)
                if result_id not in existing_ids:
                    web_filtered.append(result)
                    existing_ids.add(result_id)
                if len(web_filtered) >= 3:  # 每个查询取3个结果
                    break
            all_additional_results.extend(web_filtered)
            if web_filtered:
                print(f"  查询 '{query}': 联网找到 {len(web_filtered)} 条结果")
        except Exception as e:
            print(f"  查询 '{query}': 联网检索失败: {e}")
    
    state["additional_search_results"] = all_additional_results
    elapsed = time.time() - step_start_time
    print(f"✅ [步骤5完成] 并行检索完成: 共 {len(all_additional_results)} 条结果 - 耗时 {elapsed:.2f}秒")
    
    # 准备精简的额外检索结果数据发送到前端
    additional_results_preview = []
    for result in all_additional_results:
        preview = {
            "source": result.get("source", ""),
            "title": result.get("title", ""),
            "url": result.get("url", ""),
            "filename": result.get("filename", ""),  # 添加filename字段（知识库结果需要）
            "snippet": result.get("content", "")[:200] + "..." if len(result.get("content", "")) > 200 else result.get("content", "")
        }
        additional_results_preview.append(preview)
    
    report_progress(2, 4, f"✅ 补充检索完成，共 {len(all_additional_results)} 条结果", {
        "additional_retrieval_results": additional_results_preview
    })
    
    # 步骤6: 筛选结果：使用筛选智能体选出约60%的结果（保留更多信息）
    step_start_time = time.time()
    report_progress(3, 4, "🔍 筛选补充结果...")
    print(f"\n⏱️  [步骤6开始] 筛选额外检索结果 - {time.strftime('%H:%M:%S')}")
    if all_additional_results:
        from ..agents.result_filter_agent import ResultFilterAgent
        filter_agent = ResultFilterAgent()
        
        # 获取缺失点信息（如果有）
        missing_points = evaluation.get("missing_points", [])
        
        # 计算目标筛选数量：保留约60%的结果，但至少保留3个，最多保留10个
        target_count = max(3, min(10, int(len(all_additional_results) * 0.6)))
        filtered_results = filter_agent.filter_results(
            search_results=all_additional_results,
            section=current_section,
            search_queries=additional_queries,
            outline=outline_markdown,
            target_count=target_count,
            missing_points=missing_points if missing_points else None
        )
        state["filtered_results"] = filtered_results
        elapsed = time.time() - step_start_time
        print(f"✅ [步骤6完成] 筛选完成: 从 {len(all_additional_results)} 条中选出 {len(filtered_results)} 条 - 耗时 {elapsed:.2f}秒")
        
        # 准备精简的额外筛选结果数据发送到前端
        additional_filtered_preview = []
        for result in filtered_results:
            preview = {
                "source": result.get("source", ""),
                "title": result.get("title", ""),
                "url": result.get("url", ""),
                "filename": result.get("filename", ""),  # 添加filename字段（知识库结果需要）
                "snippet": result.get("content", "")[:200] + "..." if len(result.get("content", "")) > 200 else result.get("content", "")
            }
            additional_filtered_preview.append(preview)
        
        report_progress(3, 4, f"✅ 已筛选出 {len(filtered_results)} 条高质量结果（从 {len(all_additional_results)} 条中）", {
            "additional_filtered_results": additional_filtered_preview
        })
        
        # 步骤7: 将筛选结果加入临时知识库
        if temp_kb and filtered_results:
            step_start_time = time.time()
            print(f"\n⏱️  [步骤7开始] 保存到临时知识库 - {time.strftime('%H:%M:%S')}")
            temp_kb.add_search_results(filtered_results)
            elapsed = time.time() - step_start_time
            print(f"✅ [步骤7完成] 已入库 {len(filtered_results)} 条结果 - 耗时 {elapsed:.2f}秒")
        
        # 合并所有结果（初始 + 筛选后的）
        final_results = initial_temp_kb_results + filtered_results
        
        # 步骤8: 第二次判断：信息是否充足
        step_start_time = time.time()
        report_progress(4, 4, "🔍 最终评估...")
        print(f"\n⏱️  [步骤8开始] 第二次信息充足性判断 - {time.strftime('%H:%M:%S')}")
        evaluation2 = writing_agent.evaluate_info_sufficiency(
            section=current_section,
            search_results=final_results,
            history_sections=history_contents,
            outline=outline_markdown
        )
        state["info_sufficiency_evaluation"] = evaluation2
        elapsed = time.time() - step_start_time
        
        if evaluation2["sufficient"]:
            print(f"✅ [步骤8完成] 信息充足，使用合并后的检索结果 - 耗时 {elapsed:.2f}秒")
            report_progress(4, 4, "✅ 信息充足")
        else:
            print(f"⚠️  [步骤8完成] 信息仍然不足，将使用现有结果强制写作 - 耗时 {elapsed:.2f}秒")
            report_progress(4, 4, "⚠️ 信息仍不足，使用现有结果继续撰写")
        
        state["search_results"] = final_results
    else:
        # 如果没有额外结果，使用初始结果
        print("⚠️  未检索到额外结果，使用初始检索结果")
        state["search_results"] = initial_temp_kb_results
    
    print(f"\n✅ collect_info 节点完成: 最终检索结果数 {len(state['search_results'])} 条")
    
    return state


def writing_node(state: WorkflowState) -> WorkflowState:
    """写作节点 - 撰写章节内容"""
    import time
    
    current_section = state.get("current_section")
    search_results = state.get("search_results", [])
    history_section_ids = state.get("history_section_ids", [])  # 使用ID获取内容
    outline = state.get("outline", {})
    writing_agent = state.get("writing_agent")
    all_written_sections = state.get("all_written_sections", [])
    history_manager = state.get("history_manager")
    
    if not current_section:
        raise WorkflowError("当前章节信息为空")
    if not writing_agent:
        raise WorkflowError("写作智能体未初始化")
    
    print("\n" + "-" * 50)
    print("写作阶段")
    print("-" * 50)
    
    node_start_time = time.time()
    
    # 生成前文摘要（最近2-3个章节的摘要）
    previous_summary = _generate_previous_summary(all_written_sections[-3:])
    
    # 生成大纲的Markdown格式
    outline_markdown = outline.get("outline_markdown", "")
    if not outline_markdown:
        outline_markdown = _format_outline_markdown(outline)
    
    # 根据ID获取历史章节内容
    history_contents = []
    if history_manager and history_section_ids:
        for section_id in history_section_ids:
            content = history_manager.search_by_title(section_id)
            if content:
                history_contents.append(content)
    
    # 计算总字数和总章节数，传递给写作智能体
    total_words = outline.get("estimated_words", 0)
    sections = state.get("sections", [])
    total_sections = len(sections)
    
    # 计算已写内容的字数
    from ..tools.utils import estimate_word_count
    all_written_sections = state.get("all_written_sections", [])
    written_words = 0
    for written_section in all_written_sections:
        content = written_section.get("content", "")
        # 使用字数统计函数（适用于中英文混合）
        written_words += estimate_word_count(content)
    
    # 调试日志：打印字数信息
    print(f"\n📊 [字数统计]")
    print(f"  总字数要求: {total_words} 字")
    print(f"  已写章节数: {len(all_written_sections)} 个")
    print(f"  已写字数: {written_words} 字")
    print(f"  剩余字数: {total_words - written_words if total_words > 0 else '不限制'}")
    print(f"  剩余章节数: {total_sections - current_section.get('index', 0) + 1} 个")
    
    # 撰写章节
    print(f"\n⏱️  [开始写作] 调用 LLM 撰写章节 - {time.strftime('%H:%M:%S')}")
    try:
        result = writing_agent.write_section(
            section=current_section,
            search_results=search_results,
            history_sections=history_contents,  # 传递完整内容
            outline=outline_markdown,
            previous_sections_summary=previous_summary,
            total_words=total_words if total_words > 0 else None,
            total_sections=total_sections if total_sections > 0 else None,
            written_words=written_words if written_words > 0 else None
        )
        
        # write_section 现在返回 dict: {"content": str, "citations": List[Dict], "chart_requirement": Optional[Dict]}
        content = result["content"]
        citations = result.get("citations", [])
        chart_requirement = result.get("chart_requirement")
        
        state["written_content"] = content
        state["written_citations"] = citations  # 保存引用信息
        state["chart_requirement"] = chart_requirement  # 保存图表需求
        
        elapsed = time.time() - node_start_time
        print(f"\n✅ writing 节点完成")
        print(f"  内容长度: {len(content)} 字符")
        print(f"  估算字数: {estimate_word_count(content)} 字")
        print(f"  引用数量: {len(citations)} 个")
        if chart_requirement:
            print(f"  📊 需要图表: {chart_requirement.get('chart_type', 'unknown')}")
        print(f"  总耗时: {elapsed:.2f}秒")
        
    except Exception as e:
        raise WorkflowError(f"撰写章节失败: {str(e)}") from e
    
    return state


def save_section_node(state: WorkflowState) -> WorkflowState:
    """保存章节节点 - 将完成的章节存入历史"""
    import time
    
    current_section = state.get("current_section")
    written_content = state.get("written_content", "")
    written_citations = state.get("written_citations", [])  # 获取引用信息
    chart_requirement = state.get("chart_requirement")  # 获取图表需求
    history_manager = state.get("history_manager")
    
    if not current_section:
        raise WorkflowError("当前章节信息为空")
    if not written_content:
        raise WorkflowError("章节内容为空")
    if not history_manager:
        raise WorkflowError("历史管理器未初始化")
    
    print("\n" + "-" * 50)
    print("保存章节")
    print("-" * 50)
    
    node_start_time = time.time()
    print(f"⏱️  [开始保存] - {time.strftime('%H:%M:%S')}")
    
    # 保存到历史写作管理器（现在是一级章节）
    level1_title = current_section.get("level1_title", "")
    level2_titles = current_section.get("level2_titles", [])
    section_id = current_section.get("section_id", "")
    
    # 构建完整的章节标题（包含Markdown标记）- 现在是一级标题
    full_level1_title = f"## {level1_title}"
    
    history_manager.add_section(
        title=full_level1_title,
        content=written_content,
        parent_title=None,  # 一级章节没有父标题
        section_id=section_id
    )
    
    # 添加到已写章节列表
    all_written_sections = state.get("all_written_sections", [])
    section_data = {
        "section_id": section_id,
        "level1_title": level1_title,
        "level2_titles": level2_titles,  # 保存二级标题列表
        "content": written_content,
        "citations": written_citations,  # 保存引用信息
        "chart_requirement": chart_requirement,  # 保存图表需求
        "chart_url": None,  # 图表URL（异步生成后填充）
        "chart_generating": False,  # 图表是否正在生成
    }
    all_written_sections.append(section_data)
    state["all_written_sections"] = all_written_sections
    
    # 如果有图表需求，异步生成图表
    if chart_requirement:
        import threading
        from ..tools.chart_generator import get_chart_generator
        
        def generate_chart_async():
            """异步生成图表"""
            try:
                chart_gen = get_chart_generator()
                print(f"\n📊 [异步] 开始为章节 '{level1_title}' 生成图表...")
                
                chart_url = chart_gen.generate_chart_from_content(
                    section_content=written_content,
                    chart_requirement=chart_requirement,
                    section=current_section
                )
                
                if chart_url:
                    # 更新章节数据中的图表URL
                    section_data["chart_url"] = chart_url
                    print(f"✅ [异步] 图表生成成功: {chart_url}")
                else:
                    print(f"⚠️  [异步] 图表生成失败")
            except Exception as e:
                print(f"⚠️  [异步] 图表生成出错: {e}")
            finally:
                section_data["chart_generating"] = False
        
        section_data["chart_generating"] = True
        thread = threading.Thread(target=generate_chart_async, daemon=True)
        thread.start()
        print(f"📊 [异步] 已启动图表生成任务（章节: {level1_title}）")
    
    # 更新索引
    state["current_section_index"] = state.get("current_section_index", 0) + 1
    
    elapsed = time.time() - node_start_time
    print(f"\n✅ save_section 节点完成")
    print(f"  章节ID: {section_id}")
    print(f"  标题: {level1_title}")
    print(f"  包含二级标题: {len(level2_titles)} 个")
    print(f"  引用数: {len(written_citations)} 个")
    print(f"  总耗时: {elapsed:.2f}秒")
    
    return state


def _insert_chart_after_section(content: str, section_title: str, chart_markdown: str) -> Optional[str]:
    """
    在指定章节标题的末尾插入图表
    
    Args:
        content: 章节内容
        section_title: 章节标题（## 一级标题 或 ### 二级标题）
        chart_markdown: 图表的 Markdown 代码
    
    Returns:
        插入后的内容，如果找不到章节标题则返回 None
    """
    import re
    
    # 规范化章节标题（移除可能的空格）
    section_title = section_title.strip()
    
    # 如果标题不以 ## 或 ### 开头，尝试添加
    if not section_title.startswith('#'):
        # 尝试匹配，可能是标题文本而不是完整的 Markdown 格式
        # 先尝试作为二级标题
        if not section_title.startswith('###'):
            section_title_with_marker = f"### {section_title}"
        else:
            section_title_with_marker = section_title
    else:
        section_title_with_marker = section_title
    
    # 查找章节标题在内容中的位置
    # 支持两种格式：## 标题 或 ## 标题\n
    patterns = [
        re.escape(section_title_with_marker) + r'\s*\n',  # 标题后跟换行
        re.escape(section_title_with_marker) + r'(?=\n|$)',  # 标题后跟换行或结尾
    ]
    
    section_start = -1
    for pattern in patterns:
        match = re.search(pattern, content)
        if match:
            section_start = match.end()
            break
    
    if section_start == -1:
        # 如果找不到，尝试不区分大小写匹配
        for pattern in patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                section_start = match.end()
                break
    
    if section_start == -1:
        return None
    
    # 确定章节的结束位置
    # 查找下一个同级或更高级的标题
    remaining_content = content[section_start:]
    
    # 判断当前标题的级别
    if section_title_with_marker.startswith('###'):
        # 二级标题：查找下一个 ### 或 ##
        next_section_pattern = r'\n(?:###|##)\s+'
    elif section_title_with_marker.startswith('##'):
        # 一级标题：查找下一个 ##
        next_section_pattern = r'\n##\s+'
    else:
        # 默认当作二级标题处理
        next_section_pattern = r'\n(?:###|##)\s+'
    
    next_section_match = re.search(next_section_pattern, remaining_content)
    
    if next_section_match:
        # 找到下一个章节，在该章节之前插入
        section_end = section_start + next_section_match.start()
    else:
        # 没有下一个章节，插入到当前章节内容的末尾
        section_end = len(content)
    
    # 在章节末尾插入图表
    # 确保在插入位置之前有适当的换行
    insert_position = section_end
    # 移除末尾的空白字符，然后添加图表
    before_insert = content[:insert_position].rstrip()
    after_insert = content[insert_position:]
    
    # 组合：原内容（去除末尾空白）+ 图表 + 后续内容
    new_content = before_insert + chart_markdown + after_insert
    
    return new_content


def complete_node(state: WorkflowState) -> WorkflowState:
    """完成节点 - 等待所有图表生成完成并插入到报告中，然后清空临时知识库"""
    import time
    
    print("\n" + "=" * 50)
    print("工作流完成 - 等待图表生成并组装报告")
    print("=" * 50)
    
    all_written_sections = state.get("all_written_sections", [])
    
    # 检查是否有需要等待的图表生成任务
    sections_with_charts = [s for s in all_written_sections if s.get("chart_requirement")]
    
    if sections_with_charts:
        print(f"\n📊 检测到 {len(sections_with_charts)} 个章节需要图表，等待异步生成完成...")
        
        # 等待所有图表生成完成（最多等待60秒）
        max_wait_time = 60
        check_interval = 0.5
        start_wait = time.time()
        
        while time.time() - start_wait < max_wait_time:
            all_done = True
            for section in sections_with_charts:
                if section.get("chart_generating", False):
                    all_done = False
                    break
            
            if all_done:
                break
            
            time.sleep(check_interval)
        
        if time.time() - start_wait >= max_wait_time:
            print(f"⚠️  等待图表生成超时（{max_wait_time}秒），继续处理已完成的图表")
    
    # 收集所有已生成的图表URL
    chart_urls = {}  # section_id -> chart_url
    for section in all_written_sections:
        section_id = section.get("section_id", "")
        chart_url = section.get("chart_url")
        if chart_url:
            chart_urls[section_id] = chart_url
            print(f"✅ 章节 '{section.get('level1_title', '')}' 图表已就绪: {chart_url}")
    
    # 将图表URL插入到章节内容中（插入到指定章节标题的末尾）
    if chart_urls:
        print(f"\n📊 插入 {len(chart_urls)} 个图表到报告中...")
        for section in all_written_sections:
            section_id = section.get("section_id", "")
            if section_id in chart_urls:
                chart_url = chart_urls[section_id]
                chart_requirement = section.get("chart_requirement", {})
                chart_description = chart_requirement.get("chart_description", "图表")
                insert_after_section = chart_requirement.get("insert_after_section", "")
                
                # 生成图表的 Markdown
                chart_markdown = f"\n\n![{chart_description}]({chart_url})\n\n*图：{chart_description}*\n\n"
                
                # 尝试插入到指定章节标题的末尾
                content = section["content"]
                if insert_after_section:
                    # 查找章节标题并插入到该章节末尾
                    inserted = _insert_chart_after_section(content, insert_after_section, chart_markdown)
                    if inserted:
                        content = inserted
                        print(f"✅ 已插入图表到章节 '{section.get('level1_title', '')}' 的指定章节 '{insert_after_section}' 末尾")
                    else:
                        # 如果找不到指定章节，插入到整个章节内容末尾
                        content = content + "\n\n---\n\n### 数据可视化\n\n" + chart_markdown
                        print(f"⚠️  未找到指定章节标题 '{insert_after_section}'，图表已插入到章节 '{section.get('level1_title', '')}' 末尾")
                else:
                    # 如果未指定章节标题，插入到整个章节内容末尾
                    content = content + "\n\n---\n\n### 数据可视化\n\n" + chart_markdown
                    print(f"⚠️  未指定插入章节，图表已插入到章节 '{section.get('level1_title', '')}' 末尾")
                
                section["content"] = content
    
    # 清空临时知识库
    temp_kb = state.get("temp_kb")
    if temp_kb:
        temp_kb.clear()
        print("\n✅ 临时知识库已清空")
    
    print(f"✅ 共完成 {len(all_written_sections)} 个章节")
    if chart_urls:
        print(f"✅ 共生成 {len(chart_urls)} 个图表")
    
    state["is_complete"] = True
    
    return state


def has_more_sections(state: WorkflowState) -> str:
    """判断是否还有更多章节"""
    sections = state.get("sections", [])
    current_index = state.get("current_section_index", 0)
    
    if current_index >= len(sections):
        return "no"
    return "yes"


def _generate_previous_summary(sections: List[Dict[str, Any]]) -> Optional[str]:
    """生成前文摘要"""
    if not sections:
        return None
    
    summaries = []
    for section in sections:
        level2_title = section.get("level2_title", "")
        content = section.get("content", "")
        # 取内容的前200字符作为摘要
        summary = content[:200] + "..." if len(content) > 200 else content
        summaries.append(f"### {level2_title}\n{summary}")
    
    return "\n\n".join(summaries)


def _format_outline_markdown(outline: Dict[str, Any]) -> str:
    """格式化大纲为Markdown"""
    if not outline:
        return ""
    
    lines = [f"# {outline.get('title', '')}", ""]
    
    for section in outline.get("sections", []):
        level1_title = section.get("level1_title", "")
        lines.append(f"## {level1_title}")
        lines.append("")
        
        for level2_title in section.get("level2_titles", []):
            lines.append(f"### {level2_title}")
        
        lines.append("")
    
    return "\n".join(lines)


# 工作流实例（单例）
_workflow_instance = None


def get_deep_research_workflow():
    """获取 Deep Research 工作流实例（单例）"""
    global _workflow_instance
    if _workflow_instance is None:
        _workflow_instance = create_deep_research_workflow()
    return _workflow_instance

