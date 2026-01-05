"""
知识库管理模块
使用 LangChain + FAISS 实现文档向量化、存储与检索
"""
import os
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from uuid import uuid4

from langchain_community.document_loaders import (
    TextLoader,
    PyPDFLoader,
    Docx2txtLoader,
    CSVLoader,
    UnstructuredMarkdownLoader,
)
try:
    from langchain_dashscope import DashScopeEmbeddings
except ImportError:
    from langchain_community.embeddings import DashScopeEmbeddings
from langchain_community.vectorstores import FAISS
try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
import tempfile
from pathlib import Path

# 上传目录配置
# 优先使用环境变量指定的持久化路径，否则使用临时目录
STORAGE_BASE = os.getenv("STORAGE_PATH", tempfile.gettempdir())
UPLOAD_DIR = Path(STORAGE_BASE) / "profile-page" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# 知识库目录配置
# 使用内置文档目录（项目代码的一部分，始终存在）
# 如果需要使用自定义路径，可以通过环境变量 DOCUMENTS_PATH 指定
DOCUMENTS_BASE = os.getenv("DOCUMENTS_PATH")
if DOCUMENTS_BASE:
    # 如果指定了环境变量，使用自定义路径（用于特殊场景）
    DOCUMENTS_DIR = Path(DOCUMENTS_BASE)
else:
    # 默认使用内置文档目录（作为项目代码的一部分，部署时会一起打包）
DOCUMENTS_DIR = Path(__file__).parent.parent.parent / "resources" / "documents"
# 确保目录存在（内置文档目录应该始终存在，但创建一下更安全）
DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)

KNOWLEDGE_BASE_DIR = UPLOAD_DIR / "smartreport" / "knowledge_base"
KNOWLEDGE_BASE_DIR.mkdir(parents=True, exist_ok=True)

# 向量存储目录（使用持久化路径）
VECTOR_STORE_DIR = UPLOAD_DIR / "smartreport" / "vector_store"
VECTOR_STORE_DIR.mkdir(parents=True, exist_ok=True)


class KnowledgeBaseError(Exception):
    """知识库错误"""
    pass


class KnowledgeBaseManager:
    """知识库管理器 - 使用 LangChain + FAISS"""
    
    def __init__(self):
        """初始化知识库管理器"""
        self.embeddings = None
        self.vector_store = None
        self._init_embeddings()
        self._load_or_create_vector_store()
    
    def _init_embeddings(self):
        """初始化嵌入模型（使用 DashScope）"""
        api_key = os.getenv("DASHSCOPE_API_KEY")
        if not api_key:
            raise KnowledgeBaseError("DASHSCOPE_API_KEY 未配置")
        
        self.embeddings = DashScopeEmbeddings(
            model="text-embedding-v1",
            dashscope_api_key=api_key,
        )
    
    def _load_or_create_vector_store(self):
        """加载或创建向量存储"""
        vector_store_path = VECTOR_STORE_DIR / "faiss_index"
        
        if vector_store_path.exists():
            try:
                self.vector_store = FAISS.load_local(
                    str(vector_store_path),
                    self.embeddings,
                    allow_dangerous_deserialization=True,
                )
                print(f"已加载向量存储: {vector_store_path}")
            except Exception as e:
                print(f"加载向量存储失败: {e}，将创建新的向量存储")
                self.vector_store = None
        else:
            self.vector_store = None
            print(f"向量存储不存在，将创建新的: {vector_store_path}")
    
    def _save_vector_store(self):
        """保存向量存储"""
        if self.vector_store:
            vector_store_path = VECTOR_STORE_DIR / "faiss_index"
            self.vector_store.save_local(str(vector_store_path))
            print(f"向量存储已保存: {vector_store_path}")
    
    def _get_loader(self, file_path: Path):
        """根据文件类型获取对应的文档加载器"""
        suffix = file_path.suffix.lower()
        
        loader_map = {
            ".txt": TextLoader,
            ".md": UnstructuredMarkdownLoader if hasattr(UnstructuredMarkdownLoader, '__call__') else TextLoader,
            ".pdf": PyPDFLoader,
            ".docx": Docx2txtLoader if Docx2txtLoader else None,
            ".csv": CSVLoader,
        }
        
        loader_class = loader_map.get(suffix)
        if not loader_class:
            raise KnowledgeBaseError(f"不支持的文件类型: {suffix}")
        
        return loader_class(str(file_path))
    
    def load_documents_from_directory(self, directory: Path) -> Tuple[List[Document], List[str], Dict[str, int]]:
        """
        从目录加载所有文档
        
        Args:
            directory: 文档目录路径
        
        Returns:
            (文档列表, 错误信息列表, 统计信息字典)
        """
        documents = []
        errors = []
        stats = {
            "total_files": 0,
            "loaded_files": 0,
            "total_chunks": 0,
            "file_chunks": {}  # 文件名 -> 片段数
        }
        
        if not directory.exists():
            error_msg = f"目录不存在: {directory}"
            print(error_msg)
            errors.append(error_msg)
            return documents, errors, stats
        
        # 支持的文件扩展名
        supported_extensions = {".txt", ".md", ".pdf", ".docx", ".csv"}
        
        # 遍历目录中的所有文件
        for file_path in directory.iterdir():
            if file_path.is_file():
                stats["total_files"] += 1
                file_ext = file_path.suffix.lower()
                
                if file_ext not in supported_extensions:
                    print(f"跳过不支持的文件类型: {file_path.name} ({file_ext})")
                    continue
                
                try:
                    loader = self._get_loader(file_path)
                    docs = loader.load()
                    
                    if not docs:
                        error_msg = f"文档内容为空: {file_path.name}"
                        print(error_msg)
                        errors.append(error_msg)
                        continue
                    
                    # 添加元数据
                    for doc in docs:
                        doc.metadata.update({
                            "source": str(file_path),
                            "filename": file_path.name,
                        })
                    
                    documents.extend(docs)
                    stats["loaded_files"] += 1
                    stats["total_chunks"] += len(docs)
                    stats["file_chunks"][file_path.name] = len(docs)
                    print(f"✅ 已加载文档: {file_path.name} ({len(docs)} 个片段)")
                except Exception as e:
                    error_msg = f"加载文档失败 {file_path.name}: {str(e)}"
                    print(error_msg)
                    errors.append(error_msg)
                    import traceback
                    print(traceback.format_exc())
        
        print(f"文档加载统计: 总计 {stats['total_files']} 个文件, 成功加载 {stats['loaded_files']} 个文件 ({stats['total_chunks']} 个片段), 失败 {len(errors)} 个")
        return documents, errors, stats
    
    def build_vector_store_from_documents(self, documents: List[Document], force_rebuild: bool = False):
        """
        从文档列表构建向量存储
        
        Args:
            documents: 文档列表
            force_rebuild: 是否强制重建（清空现有向量存储）
        """
        if not documents:
            raise KnowledgeBaseError("文档列表为空")
        
        # 文本分割
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
        splits = text_splitter.split_documents(documents)
        
        print(f"文档已分割为 {len(splits)} 个片段")
        
        if force_rebuild or self.vector_store is None:
            # 创建新的向量存储
            self.vector_store = FAISS.from_documents(splits, self.embeddings)
            print("已创建新的向量存储")
        else:
            # 添加到现有向量存储
            self.vector_store.add_documents(splits)
            print(f"已添加 {len(splits)} 个片段到现有向量存储")
        
        # 保存向量存储
        self._save_vector_store()
    
    def initialize_from_documents_dir(self, force_rebuild: bool = False) -> Tuple[int, int, List[str], Dict[str, int]]:
        """
        从 documents 目录初始化知识库
        
        Args:
            force_rebuild: 是否强制重建
        
        Returns:
            (原始文件数量, 文档片段数量, 错误信息列表, 统计信息)
        """
        print(f"开始从目录加载文档: {DOCUMENTS_DIR}")
        print(f"目录绝对路径: {DOCUMENTS_DIR.resolve()}")
        print(f"目录是否存在: {DOCUMENTS_DIR.exists()}")
        
        if not DOCUMENTS_DIR.exists():
            error_msg = f"文档目录不存在: {DOCUMENTS_DIR.resolve()}"
            print(error_msg)
            return 0, 0, [error_msg], {}
        
        documents, errors, stats = self.load_documents_from_directory(DOCUMENTS_DIR)
        
        if not documents:
            print("未找到任何文档")
            if not errors:
                errors.append("目录中没有找到支持的文档文件（支持 .txt, .md, .pdf, .docx, .csv）")
            return 0, 0, errors, stats
        
        self.build_vector_store_from_documents(documents, force_rebuild=force_rebuild)
        print(f"知识库初始化完成: {stats['loaded_files']} 个原始文件, {len(documents)} 个文档片段")
        return stats['loaded_files'], len(documents), errors, stats
    
    def search(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        """
        从知识库检索相关信息
        
        Args:
            query: 搜索查询
            k: 返回结果数量
        
        Returns:
            检索结果列表，包含 content, source, filename, score 等
        """
        if not self.vector_store:
            return []
        
        try:
            # 使用相似度搜索
            docs_with_scores = self.vector_store.similarity_search_with_score(query, k=k)
            
            results = []
            for doc, score in docs_with_scores:
                # 将距离转换为相关性分数（距离越小，相关性越高）
                # FAISS 返回的是 L2 距离，需要转换为相似度分数
                relevance = max(0, 1.0 - score / 2.0)  # 简单的归一化
                
                results.append({
                    "content": doc.page_content,
                    "source": doc.metadata.get("source", "未知来源"),
                    "filename": doc.metadata.get("filename", "未知文件"),
                    "relevance": round(relevance, 3),
                    "score": round(float(score), 4),
                })
            
            return results
        except Exception as e:
            raise KnowledgeBaseError(f"检索失败: {e}") from e
    
    def list_documents(self) -> List[Dict[str, Any]]:
        """列出知识库中的所有文档（从向量存储中提取）"""
        if not self.vector_store:
            return []
        
        # 从向量存储中提取文档信息
        # 注意：FAISS 不直接支持列出所有文档，这里返回基本信息
        # 可以通过搜索所有可能的查询来获取文档信息，但效率较低
        # 这里返回一个简单的状态信息
        return [{
            "message": "知识库已加载",
            "vector_store_path": str(VECTOR_STORE_DIR / "faiss_index"),
            "documents_dir": str(DOCUMENTS_DIR),
        }]
    
    def list_all_chunks(self) -> List[Dict[str, Any]]:
        """列出知识库中的所有片段"""
        if not self.vector_store:
            return []
        
        try:
            chunks = []
            # 通过 docstore 获取所有文档
            # FAISS 使用 InMemoryDocstore，通过 _dict 属性访问所有文档
            if hasattr(self.vector_store, 'docstore'):
                docstore = self.vector_store.docstore
                if hasattr(docstore, '_dict'):
                    for chunk_id, doc in docstore._dict.items():
                        chunks.append({
                            "chunk_id": str(chunk_id),
                            "content": doc.page_content,
                            "source": doc.metadata.get("source", "未知来源"),
                            "filename": doc.metadata.get("filename", "未知文件"),
                            "metadata": doc.metadata,
                        })
            return chunks
        except Exception as e:
            import traceback
            print(f"获取片段列表失败: {e}")
            print(traceback.format_exc())
            return []
    
    def clear(self):
        """清空知识库"""
        self.vector_store = None
        # 删除向量存储文件
        vector_store_path = VECTOR_STORE_DIR / "faiss_index"
        if vector_store_path.exists():
            import shutil
            shutil.rmtree(vector_store_path)
            print(f"已删除向量存储: {vector_store_path}")


# 全局知识库管理器实例
_knowledge_base_manager: Optional[KnowledgeBaseManager] = None


def get_knowledge_base_manager() -> KnowledgeBaseManager:
    """获取知识库管理器单例"""
    global _knowledge_base_manager
    if _knowledge_base_manager is None:
        _knowledge_base_manager = KnowledgeBaseManager()
    return _knowledge_base_manager
