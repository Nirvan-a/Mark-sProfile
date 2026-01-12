"""
Deep Research API
提供完整的工作流 API 接口
"""
import json
import queue
import threading
from typing import Dict, Any, Optional, AsyncIterator
from uuid import uuid4

from .workflow import get_deep_research_workflow, WorkflowError, WorkflowState


class DeepResearchAPI:
    """Deep Research API 封装"""
    
    def __init__(self):
        self.workflow = get_deep_research_workflow()
    
    def run_workflow(
        self,
        requirement: str,
        task_id: Optional[str] = None,
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        运行完整的工作流
        
        Args:
            requirement: 用户需求
            task_id: 任务ID（可选，不提供则自动生成）
            config: 运行时配置（可选）
        
        Returns:
            工作流结果字典:
            {
                "task_id": str,
                "outline": Dict,
                "sections": List[Dict],
                "all_written_sections": List[Dict],
                "is_complete": bool,
            }
        """
        if not task_id:
            task_id = uuid4().hex
        
        # 初始化状态
        initial_state: WorkflowState = {
            "requirement": requirement,
            "task_id": task_id,
            "outline": None,
            "sections": [],
            "current_section_index": 0,
            "current_section": None,
            "search_results": [],
            "history_sections": [],
            "written_content": "",
            "all_written_sections": [],
            "is_complete": False,
            "temp_kb": None,
            "history_manager": None,
            "tool_orchestrator": None,
            "writing_agent": None,
        }
        
        # 运行工作流
        try:
            # 设置递归限制（允许更多章节）
            config = config or {}
            if "recursion_limit" not in config:
                config["recursion_limit"] = 100  # 增加递归限制，支持更多章节
            
            final_state = self.workflow.invoke(initial_state, config=config)
            
            # 提取结果（移除不可序列化的组件）
            result = {
                "task_id": final_state.get("task_id"),
                "outline": final_state.get("outline"),
                "sections": final_state.get("sections", []),
                "all_written_sections": final_state.get("all_written_sections", []),
                "is_complete": final_state.get("is_complete", False),
            }
            
            return result
            
        except Exception as e:
            # 任务失败时清除临时知识库
            try:
                from .temporary_kb import TemporaryKnowledgeBase
                temp_kb = TemporaryKnowledgeBase(task_id=task_id)
                temp_kb.clear()
                print(f"✅ 任务失败，已清除临时知识库: {task_id}")
            except Exception as clear_error:
                print(f"⚠️  清除临时知识库失败: {clear_error}")
            
            raise WorkflowError(f"工作流执行失败: {str(e)}") from e
    
    def generate_outline_only(
        self,
        requirement: str
    ) -> Dict[str, Any]:
        """
        仅生成大纲（不执行完整工作流）
        
        Args:
            requirement: 用户需求
        
        Returns:
            大纲字典，包含:
            {
                "title": str,
                "sections": List[Dict],
                "estimated_words": int,
                "outline_markdown": str,
            }
        """
        from .agents.planning_agent import PlanningAgent
        
        planning_agent = PlanningAgent()
        outline = planning_agent.generate_outline(requirement)
        
        return outline
    
    def stream_workflow(
        self,
        requirement: str,
        task_id: Optional[str] = None,
        outline: Optional[Dict[str, Any]] = None,
        config: Optional[Dict[str, Any]] = None
    ) -> AsyncIterator[str]:
        """
        流式运行工作流，实时返回节点状态更新
        
        Args:
            requirement: 用户需求
            task_id: 任务ID（可选，不提供则自动生成）
            outline: 大纲（可选，如果提供则使用已有大纲，否则生成新大纲）
            config: 运行时配置（可选）
        
        Yields:
            JSON 字符串，包含节点状态更新:
            {
                "type": "node_start" | "node_end" | "state_update" | "error" | "complete",
                "node": str,  # 节点名称
                "state": Dict,  # 状态信息（部分）
                "error": str,  # 错误信息（如果有）
            }
        """
        if not task_id:
            task_id = uuid4().hex
        
        # 初始化状态
        # 如果提供了大纲，使用提供的大纲；否则为 None，让 planning_node 生成
        initial_outline = None
        initial_sections = []
        if outline:
            from .agents.planning_agent import PlanningAgent
            planner = PlanningAgent()
            
            # 如果用户修改了大纲 Markdown，需要从 Markdown 重新解析 sections 结构
            # 检查 outline_markdown 是否与现有的 sections 匹配
            # 如果 outline_markdown 存在，尝试从它重新解析
            markdown_text = outline.get("outline_markdown", "")
            if markdown_text:
                print(f"\n[API] 收到大纲，outline_markdown 长度: {len(markdown_text)}")
                print(f"[API] 原始大纲 sections 数量: {len(outline.get('sections', []))}")
                
                # 从 Markdown 重新解析大纲结构
                parsed_outline = planner.parse_markdown_outline(markdown_text)
                print(f"[API] 解析后大纲 sections 数量: {len(parsed_outline.get('sections', []))}")
                
                # 保存用户提供的 estimated_words（如果存在）
                user_provided_estimated_words = outline.get("estimated_words")
                
                # 使用解析后的大纲，保留其他字段（如 title 等）
                # 注意：parsed_outline 会覆盖 outline 中的字段，但我们要保留用户提供的 estimated_words
                initial_outline = {
                    **outline,
                    **parsed_outline,  # 覆盖 sections 等
                }
                
                # 如果用户提供了 estimated_words，优先使用用户的（而不是 parse_markdown_outline 的默认值）
                if user_provided_estimated_words:
                    initial_outline["estimated_words"] = user_provided_estimated_words
                print(f"[API] 合并后大纲 sections 数量: {len(initial_outline.get('sections', []))}")
            else:
                # 如果没有 outline_markdown，使用原始大纲
                initial_outline = outline
            
            # 获取所有一级标题章节列表（使用更新后的大纲）
            initial_sections = planner.get_all_level1_sections(initial_outline)
            print(f"[API] 最终生成的章节列表数量（一级标题）: {len(initial_sections)}")
        
        # 创建进度队列
        progress_queue = queue.Queue()
        
        def progress_callback(progress_data: dict):
            """进度回调函数，将进度事件放入队列"""
            progress_queue.put(progress_data)
        
        # 注册到全局进度管理器
        from .tools.progress_manager import get_progress_manager
        progress_manager = get_progress_manager()
        progress_manager.register_callback(task_id, progress_callback)
        
        initial_state: WorkflowState = {
            "requirement": requirement,
            "task_id": task_id,
            "outline": initial_outline,
            "sections": initial_sections,
            "current_section_index": 0,
            "current_section": None,
            "search_results": [],
            "history_sections": [],
            "history_section_ids": [],
            "written_content": "",
            "all_written_sections": [],
            "is_complete": False,
            "initial_search_queries": [],
            "initial_temp_kb_results": [],
            "info_sufficiency_evaluation": None,
            "additional_search_queries": [],
            "additional_search_results": [],
            "filtered_results": [],
            "temp_kb": None,
            "history_manager": None,
            "tool_orchestrator": None,
            "writing_agent": None,
        }
        
        last_state = None
        workflow_finished = threading.Event()
        workflow_error = None
        
        def run_workflow_thread():
            """在独立线程中运行工作流"""
            nonlocal last_state, workflow_error
            try:
                # 设置递归限制
                local_config = config or {}
                if "recursion_limit" not in local_config:
                    local_config["recursion_limit"] = 100
                
                # 使用 stream 方法获取实时更新
                import time
                print(f"[DEBUG] run_workflow_thread: 开始 stream，时间: {time.strftime('%H:%M:%S')}")
                stream_iter = self.workflow.stream(initial_state, config=local_config)
                print(f"[DEBUG] run_workflow_thread: stream 迭代器已创建")
                
                event_count = 0
                for event in stream_iter:
                    event_count += 1
                    print(f"[DEBUG] run_workflow_thread: 收到事件 #{event_count}，时间: {time.strftime('%H:%M:%S')}")
                    # event 格式: {node_name: state}
                    for node_name, state in event.items():
                        print(f"[DEBUG] run_workflow_thread: 处理节点 '{node_name}'，时间: {time.strftime('%H:%M:%S')}")
                        # 保存最后一个 state
                        last_state = state
                        
                        # 提取可序列化的状态信息
                        serializable_state = {
                            "task_id": state.get("task_id"),
                            "current_section_index": state.get("current_section_index", 0),
                            "outline": state.get("outline"),
                            "sections": state.get("sections", []),
                            "all_written_sections": state.get("all_written_sections", []),
                            "is_complete": state.get("is_complete", False),
                            "current_section": state.get("current_section"),
                            "search_results": state.get("search_results", []),
                            "history_sections": state.get("history_sections", []),
                            "info_sufficiency_evaluation": state.get("info_sufficiency_evaluation"),
                            "written_content": state.get("written_content", ""),
                            # 准备阶段的检索数据
                            "initial_search_queries": state.get("initial_search_queries", []),
                            "initial_temp_kb_results": state.get("initial_temp_kb_results", []),
                            # 信息收集阶段的补充检索数据
                            "additional_search_queries": state.get("additional_search_queries", []),
                            "additional_search_results": state.get("additional_search_results", []),
                            "filtered_results": state.get("filtered_results", []),
                        }
                        
                        # 将节点事件放入队列
                        print(f"[DEBUG] run_workflow_thread: 准备将节点 '{node_name}' 的事件放入队列")
                        
                        try:
                            progress_queue.put({
                                "type": "node_start",
                                "node": node_name,
                                "task_id": state.get("task_id"),
                                "timestamp": int(time.time() * 1000),
                                "state": serializable_state,
                            })
                            print(f"[DEBUG] run_workflow_thread: node_start 事件已放入队列（节点: {node_name}）")
                        except Exception as e:
                            print(f"[ERROR] run_workflow_thread: 放入 node_start 事件失败: {e}")
                        
                        try:
                            progress_queue.put({
                                "type": "state_update",
                                "node": node_name,
                                "timestamp": int(time.time() * 1000),
                                "state": serializable_state,
                            })
                            print(f"[DEBUG] run_workflow_thread: state_update 事件已放入队列（节点: {node_name}）")
                        except Exception as e:
                            print(f"[ERROR] run_workflow_thread: 放入 state_update 事件失败: {e}")
                        
                        try:
                            progress_queue.put({
                                "type": "node_end",
                                "node": node_name,
                                "timestamp": int(time.time() * 1000),
                                "state": serializable_state,
                            })
                            print(f"[DEBUG] run_workflow_thread: node_end 事件已放入队列（节点: {node_name}）")
                        except Exception as e:
                            print(f"[ERROR] run_workflow_thread: 放入 node_end 事件失败: {e}")
                
                # 发送完成事件
                print(f"[DEBUG] run_workflow_thread: stream 完成，准备发送 complete 事件，时间: {time.strftime('%H:%M:%S')}")
                try:
                    progress_queue.put({
                        "type": "complete",
                        "task_id": task_id,
                    })
                    print(f"[DEBUG] run_workflow_thread: complete 事件已放入队列")
                except Exception as e:
                    print(f"[ERROR] run_workflow_thread: 放入 complete 事件失败: {e}")
                
            except Exception as e:
                print(f"[ERROR] run_workflow_thread: 工作流执行异常: {str(e)}")
                import traceback
                print(f"[ERROR] run_workflow_thread: 异常堆栈:\n{traceback.format_exc()}")
                workflow_error = e
            finally:
                print(f"[DEBUG] run_workflow_thread: 工作流线程结束，时间: {time.strftime('%H:%M:%S')}")
                workflow_finished.set()
                # 注销回调
                progress_manager.unregister_callback(task_id)
        
        # 启动工作流线程
        workflow_thread = threading.Thread(target=run_workflow_thread, daemon=True)
        workflow_thread.start()
        
        # 从队列中读取事件并发送到前端
        print(f"[DEBUG] stream_workflow: 开始从队列读取事件，时间: {time.strftime('%H:%M:%S')}")
        event_sent_count = 0
        empty_count = 0
        try:
            while not workflow_finished.is_set() or not progress_queue.empty():
                try:
                    # 设置超时，避免死锁
                    event_data = progress_queue.get(timeout=0.1)
                    event_sent_count += 1
                    empty_count = 0
                    event_type = event_data.get("type", "unknown")
                    node_name = event_data.get("node", "unknown")
                    print(f"[DEBUG] stream_workflow: 从队列获取事件 #{event_sent_count}，类型: {event_type}，节点: {node_name}，时间: {time.strftime('%H:%M:%S')}")
                    
                    # 发送事件到前端（所有事件都有 type 字段）
                    event_json = json.dumps(event_data, ensure_ascii=False) + "\n"
                    print(f"[DEBUG] stream_workflow: 准备 yield 事件，JSON 长度: {len(event_json)} 字符")
                    yield event_json
                    print(f"[DEBUG] stream_workflow: 事件已 yield，时间: {time.strftime('%H:%M:%S')}")
                        
                except queue.Empty:
                    empty_count += 1
                    if empty_count % 100 == 0:  # 每10秒打印一次（100 * 0.1秒）
                        print(f"[DEBUG] stream_workflow: 队列为空（连续 {empty_count} 次），工作流完成状态: {workflow_finished.is_set()}，队列是否为空: {progress_queue.empty()}")
                    continue
            
            print(f"[DEBUG] stream_workflow: 主循环结束，已发送 {event_sent_count} 个事件，时间: {time.strftime('%H:%M:%S')}")
            print(f"[DEBUG] stream_workflow: 等待工作流线程结束...")
            
            # 等待工作流线程结束
            workflow_thread.join(timeout=1.0)
            print(f"[DEBUG] stream_workflow: 工作流线程 join 完成，时间: {time.strftime('%H:%M:%S')}")
            
            # 检查队列中是否还有剩余事件
            remaining_events = []
            while not progress_queue.empty():
                try:
                    event_data = progress_queue.get_nowait()
                    remaining_events.append(event_data)
                except queue.Empty:
                    break
            
            if remaining_events:
                print(f"[DEBUG] stream_workflow: 队列中还有 {len(remaining_events)} 个剩余事件，准备发送...")
                for event_data in remaining_events:
                    event_type = event_data.get("type", "unknown")
                    node_name = event_data.get("node", "unknown")
                    print(f"[DEBUG] stream_workflow: 发送剩余事件，类型: {event_type}，节点: {node_name}")
                    yield json.dumps(event_data, ensure_ascii=False) + "\n"
            
            # 如果有错误，抛出
            if workflow_error:
                print(f"[ERROR] stream_workflow: 工作流错误: {workflow_error}")
                raise workflow_error
                
        except Exception as e:
            # 注销回调
            progress_manager.unregister_callback(task_id)
            
            # 任务失败时清除临时知识库
            try:
                # 优先从 last_state 获取 temp_kb
                temp_kb = None
                if last_state:
                    temp_kb = last_state.get("temp_kb")
                
                # 如果无法从 state 获取，则根据 task_id 创建临时实例来清除
                if not temp_kb:
                    from .temporary_kb import TemporaryKnowledgeBase
                    temp_kb = TemporaryKnowledgeBase(task_id=task_id)
                
                if temp_kb:
                    temp_kb.clear()
                    print(f"✅ 任务失败，已清除临时知识库: {task_id}")
            except Exception as clear_error:
                print(f"⚠️  清除临时知识库失败: {clear_error}")
            
            # 发送错误事件
            yield json.dumps({
                "type": "error",
                "error": str(e),
                "task_id": task_id,
            }, ensure_ascii=False) + "\n"
    
    def get_workflow_status(self, task_id: str) -> Dict[str, Any]:
        """
        获取工作流状态（用于流式输出或状态查询）
        
        Args:
            task_id: 任务ID
        
        Returns:
            状态信息
        """
        # 注意：LangGraph 默认不保存中间状态
        # 如果需要状态查询，需要实现状态持久化
        return {
            "task_id": task_id,
            "message": "状态查询功能需要实现状态持久化",
        }


# 全局 API 实例
_deep_research_api: Optional[DeepResearchAPI] = None


def get_deep_research_api() -> DeepResearchAPI:
    """获取 Deep Research API 实例（单例）"""
    global _deep_research_api
    if _deep_research_api is None:
        _deep_research_api = DeepResearchAPI()
    return _deep_research_api

