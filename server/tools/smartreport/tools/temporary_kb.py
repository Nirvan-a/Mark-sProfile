"""
临时知识库管理器
管理单次任务的临时知识库，任务完成后清空
"""
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from uuid import uuid4

try:
    from langchain_dashscope import DashScopeEmbeddings
except ImportError:
    from langchain_community.embeddings import DashScopeEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    from langchain.text_splitter import RecursiveCharacterTextSplitter

import tempfile
from pathlib import Path

# 上传目录配置
UPLOAD_DIR = Path(tempfile.gettempdir()) / "profile-page" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class TemporaryKnowledgeBaseError(Exception):
    """临时知识库错误"""
    pass


class TemporaryKnowledgeBase:
    """临时知识库管理器 - 任务隔离的向量存储"""
    
    def __init__(self, task_id: Optional[str] = None):
        """
        初始化临时知识库
        
        Args:
            task_id: 任务ID，如果不提供则自动生成
        """
        self.task_id = task_id or uuid4().hex
        self.embeddings = None
        self.vector_store = None
        self.storage_dir = UPLOAD_DIR / "smartreport" / "temp_kb" / self.task_id
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        
        self._init_embeddings()
        self._load_or_create_vector_store()
    
    def _init_embeddings(self):
        """初始化嵌入模型"""
        # 确保加载 .env 文件
        from dotenv import load_dotenv
        from pathlib import Path
        env_path = Path(__file__).parent.parent.parent.parent / ".env"
        load_dotenv(dotenv_path=env_path, override=False)
        
        api_key = os.getenv("DASHSCOPE_API_KEY")
        if not api_key:
            raise TemporaryKnowledgeBaseError("DASHSCOPE_API_KEY 未配置")
        
        self.embeddings = DashScopeEmbeddings(
            model="text-embedding-v1",
            dashscope_api_key=api_key,
        )
    
    def _load_or_create_vector_store(self):
        """加载或创建向量存储"""
        vector_store_path = self.storage_dir / "faiss_index"
        
        if vector_store_path.exists():
            try:
                self.vector_store = FAISS.load_local(
                    str(vector_store_path),
                    self.embeddings,
                    allow_dangerous_deserialization=True,
                )
                print(f"已加载临时知识库: {self.task_id}")
            except Exception as e:
                print(f"加载临时知识库失败: {e}，将创建新的")
                self.vector_store = None
        else:
            self.vector_store = None
    
    def _save_vector_store(self):
        """保存向量存储"""
        if self.vector_store:
            vector_store_path = self.storage_dir / "faiss_index"
            self.vector_store.save_local(str(vector_store_path))
    
    def add_search_results(self, results: List[Dict[str, Any]]):
        """
        添加检索结果到临时知识库
        
        Args:
            results: 检索结果列表，每个结果包含:
                - content: 内容
                - title: 标题（可选）
                - url: URL（可选）
                - source: 来源（可选）
        """
        # ===== 临时跳过：暂时禁用添加到临时知识库功能 =====
        # 原因：避免 SSL 错误等临时问题影响工作流
        # 恢复方法：删除此段注释和 return 语句，取消下方代码的注释
        # ===================================================
        print(f"⚠️  [临时跳过] 临时知识库添加功能已禁用，跳过 {len(results) if results else 0} 条结果")
        return
        # ===== 以下为原始代码，已暂时注释，方便后续恢复 =====
        # if not results:
        #     return
        # 
        # # 转换为 Document 对象
        # documents = []
        # for result in results:
        #     content = result.get("content", "")
        #     if not content:
        #         continue
        #     
        #     metadata = {
        #         "source": result.get("source", "unknown"),
        #         "title": result.get("title", ""),
        #         "url": result.get("url", ""),
        #         "task_id": self.task_id,
        #     }
        #     
        #     doc = Document(page_content=content, metadata=metadata)
        #     documents.append(doc)
        # 
        # if not documents:
        #     return
        # 
        # # 文本分割：如果内容过长，需要分割以避免超出嵌入模型的输入限制
        # # 使用与主知识库相同的分割参数（chunk_size=1000, overlap=200）
        # text_splitter = RecursiveCharacterTextSplitter(
        #     chunk_size=1000,
        #     chunk_overlap=200,
        #     length_function=len,
        # )
        # splits = text_splitter.split_documents(documents)
        # 
        # if not splits:
        #     return
        # 
        # # 添加到向量存储（添加容错处理）
        # try:
        #     if self.vector_store is None:
        #         self.vector_store = FAISS.from_documents(splits, self.embeddings)
        #         print(f"创建临时知识库: {self.task_id}，添加 {len(splits)} 个文档片段（来自 {len(documents)} 个原始结果）")
        #     else:
        #         self.vector_store.add_documents(splits)
        #         print(f"临时知识库 {self.task_id} 添加 {len(splits)} 个文档片段（来自 {len(documents)} 个原始结果）")
        #     
        #     # 保存向量存储
        #     self._save_vector_store()
        # except Exception as e:
        #     # 捕获错误，记录日志，但继续执行（不阻止工作流）
        #     # 这样可以避免因为临时知识库添加失败导致整个流程中断
        #     error_msg = f"临时知识库添加失败 (task_id={self.task_id}, docs_count={len(documents)}): {e}"
        #     print(f"⚠️  {error_msg}")
        #     # 不抛出异常，允许程序继续执行
        #     # 即使无法添加到临时知识库，检索到的结果仍然可以使用
    
    def search(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        """
        从临时知识库检索
        
        Args:
            query: 搜索查询
            k: 返回结果数量
        
        Returns:
            检索结果列表（如果发生错误，返回空列表而不是抛出异常）
        """
        # ===== 临时跳过：暂时禁用从临时知识库检索功能 =====
        # 原因：避免 SSL 错误等临时问题影响工作流
        # 恢复方法：删除此段注释和 return 语句，取消下方代码的注释
        # ===================================================
        print(f"⚠️  [临时跳过] 临时知识库检索功能已禁用，查询: {query[:50] if query else ''}")
        return []
        # ===== 以下为原始代码，已暂时注释，方便后续恢复 =====
        # if not self.vector_store:
        #     return []
        # 
        # try:
        #     docs_with_scores = self.vector_store.similarity_search_with_score(query, k=k)
        #     
        #     results = []
        #     for doc, score in docs_with_scores:
        #         # 将距离转换为相关性分数
        #         relevance = max(0, 1.0 - score / 2.0)
        #         
        #         results.append({
        #             "content": doc.page_content,
        #             "title": doc.metadata.get("title", ""),
        #             "url": doc.metadata.get("url", ""),
        #             "source": doc.metadata.get("source", "临时知识库"),
        #             "relevance": round(relevance, 3),
        #             "score": round(float(score), 4),
        #         })
        #     
        #     return results
        # except Exception as e:
        #     # 捕获错误，记录日志，返回空列表以继续后续流程
        #     # 这样可以避免因为临时知识库检索失败导致整个流程中断
        #     error_msg = f"临时知识库检索失败 (task_id={self.task_id}, query={query[:50]}): {e}"
        #     print(f"⚠️  {error_msg}")
        #     # 返回空列表，相当于检索到0个结果，程序会继续执行后续流程
        #     return []
    
    def get_count(self) -> int:
        """获取临时知识库中的文档数量"""
        if not self.vector_store:
            return 0
        # FAISS 不直接支持计数，这里返回一个估算值
        # 可以通过搜索所有可能的查询来获取，但效率较低
        return 0  # 暂时返回0，后续可以优化
    
    def clear(self):
        """清空临时知识库"""
        self.vector_store = None
        
        # 删除存储目录
        if self.storage_dir.exists():
            import shutil
            shutil.rmtree(self.storage_dir)
            print(f"已清空临时知识库: {self.task_id}")
    
    def __del__(self):
        """析构函数 - 注意：Python 的 __del__ 不保证一定执行"""
        # 不在这里自动清理，由调用者显式调用 clear()
        pass

