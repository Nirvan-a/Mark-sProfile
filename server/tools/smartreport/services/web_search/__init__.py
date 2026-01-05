"""
联网检索模块
使用 LangChain Tavily 实现网络搜索
"""
import os
from typing import List, Dict, Any, Optional

try:
    from langchain_community.retrievers import TavilySearchAPIRetriever
    TAVILY_AVAILABLE = True
except ImportError:
    TAVILY_AVAILABLE = False
    print("警告: TavilySearchAPIRetriever 不可用，请安装: pip install tavily-python")


class WebSearchError(Exception):
    """联网检索错误"""
    pass


class WebSearchManager:
    """联网检索管理器 - 使用 LangChain Tavily"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        初始化联网检索管理器
        
        Args:
            api_key: Tavily API Key，如果不提供则从环境变量读取
        """
        self.api_key = api_key or os.getenv("TAVILY_API_KEY")
        if not self.api_key:
            raise WebSearchError("TAVILY_API_KEY 未配置，请在 .env 文件中设置 TAVILY_API_KEY")
        
        self.retriever = None
        self._init_retriever()
    
    def _init_retriever(self):
        """初始化 Tavily 检索器"""
        if not TAVILY_AVAILABLE:
            raise WebSearchError("TavilySearchAPIRetriever 不可用，请安装: pip install tavily-python")
        
        try:
            self.retriever = TavilySearchAPIRetriever(
                api_key=self.api_key,
                k=5,  # 默认返回前5个结果
            )
            print("✅ Tavily 检索器初始化成功")
        except Exception as e:
            raise WebSearchError(f"初始化 Tavily 检索器失败: {str(e)}") from e
    
    def search(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        """
        执行联网搜索
        
        Args:
            query: 搜索查询
            k: 返回结果数量
        
        Returns:
            搜索结果列表，包含 title, content, url, score 等
        """
        if not self.retriever:
            raise WebSearchError("检索器未初始化")
        
        try:
            # 临时设置返回结果数量
            if k != 5:
                self.retriever.k = k
            
            # 执行搜索 - 使用 invoke 方法（新版本 LangChain）
            docs = self.retriever.invoke(query)
            
            # 转换结果格式
            results = []
            for idx, doc in enumerate(docs):
                # Tavily 返回的文档：url在metadata的"source"字段中
                result = {
                    "title": doc.metadata.get("title", ""),
                    "content": doc.page_content,
                    "url": doc.metadata.get("source", ""),  # ✅ 修复：url在source字段中
                    "source": "web",  # 标记为联网来源
                }
                results.append(result)
            
            return results
        except Exception as e:
            raise WebSearchError(f"搜索失败: {str(e)}") from e


# 全局联网检索管理器实例
_web_search_manager: Optional[WebSearchManager] = None


def get_web_search_manager(api_key: Optional[str] = None) -> WebSearchManager:
    """
    获取联网检索管理器单例
    
    Args:
        api_key: Tavily API Key（可选）
    
    Returns:
        WebSearchManager 实例
    """
    global _web_search_manager
    if _web_search_manager is None:
        _web_search_manager = WebSearchManager(api_key=api_key)
    return _web_search_manager

