"""
全局进度管理器
用于在工作流节点和 API 之间传递进度事件
"""
from typing import Dict, Optional, Callable
import threading

class ProgressManager:
    """全局进度管理器单例"""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._callbacks = {}
        return cls._instance
    
    def __init__(self):
        if not hasattr(self, '_callbacks'):
            self._callbacks: Dict[str, Callable] = {}
    
    def register_callback(self, task_id: str, callback: Callable):
        """注册任务的进度回调函数"""
        self._callbacks[task_id] = callback
        print(f"✅ [ProgressManager] 注册回调: task_id={task_id}")
    
    def unregister_callback(self, task_id: str):
        """注销任务的进度回调函数"""
        if task_id in self._callbacks:
            del self._callbacks[task_id]
            print(f"✅ [ProgressManager] 注销回调: task_id={task_id}")
            print(f"[DEBUG] ProgressManager: 当前回调数量: {len(self._callbacks)}")
    
    def clear_all_callbacks(self):
        """清除所有回调（用于清理和调试）"""
        count = len(self._callbacks)
        self._callbacks.clear()
        print(f"[DEBUG] ProgressManager: 已清除所有回调（共 {count} 个）")
    
    def get_callback_count(self) -> int:
        """获取当前回调数量（用于监控）"""
        return len(self._callbacks)
    
    def report_progress(self, task_id: str, progress_data: dict):
        """报告进度（从工作流节点调用）"""
        callback = self._callbacks.get(task_id)
        if callback:
            try:
                callback(progress_data)
            except Exception as e:
                print(f"⚠️  [ProgressManager] 回调执行失败: {e}")
        else:
            print(f"⚠️  [ProgressManager] 未找到 task_id={task_id} 的回调函数")
    
    def has_callback(self, task_id: str) -> bool:
        """检查是否有回调函数"""
        return task_id in self._callbacks


# 全局实例
_progress_manager: Optional[ProgressManager] = None

def get_progress_manager() -> ProgressManager:
    """获取全局进度管理器实例"""
    global _progress_manager
    if _progress_manager is None:
        _progress_manager = ProgressManager()
    return _progress_manager


