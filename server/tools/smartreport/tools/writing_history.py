"""
历史写作管理器
存储和检索已完成的章节，支持标题索引
"""
from typing import List, Dict, Any, Optional
import re


class WritingHistoryError(Exception):
    """历史写作错误"""
    pass


class WritingHistoryManager:
    """历史写作管理器 - 存储和检索已完成的章节"""
    
    def __init__(self):
        """初始化历史写作管理器"""
        self.history_store: Dict[str, Dict[str, Any]] = {}  # {section_id: {title, content, level, ...}}
        self.title_index: Dict[str, str] = {}  # {title: section_id}
    
    def _get_section_level(self, title: str) -> int:
        """
        获取章节层级
        
        Args:
            title: 章节标题（可能包含 Markdown 标记）
        
        Returns:
            层级：0=总标题, 1=一级标题, 2=二级标题
        """
        # 移除 Markdown 标记
        clean_title = re.sub(r'^#+\s*', '', title).strip()
        
        # 判断层级
        if title.startswith('###'):
            return 2  # 二级标题
        elif title.startswith('##'):
            return 1  # 一级标题
        elif title.startswith('#'):
            return 0  # 总标题
        else:
            # 如果没有标记，尝试从内容判断
            # 默认假设是二级标题（最小写作单位）
            return 2
    
    def _generate_section_id(self, title: str, parent_title: Optional[str] = None) -> str:
        """
        生成章节ID
        
        Args:
            title: 章节标题
            parent_title: 父级标题（可选）
        
        Returns:
            章节ID
        """
        # 使用标题的哈希值作为ID
        import hashlib
        key = f"{parent_title}_{title}" if parent_title else title
        return hashlib.md5(key.encode()).hexdigest()[:12]
    
    def add_section(
        self, 
        title: str, 
        content: str, 
        parent_title: Optional[str] = None,
        section_id: Optional[str] = None
    ) -> str:
        """
        添加已完成的章节
        
        Args:
            title: 章节标题（可能包含 Markdown 标记）
            content: 章节内容
            parent_title: 父级标题（可选）
            section_id: 章节ID（可选，如果不提供则自动生成）
        
        Returns:
            章节ID
        """
        if not content.strip():
            raise WritingHistoryError("章节内容不能为空")
        
        # 生成或使用提供的 section_id
        if not section_id:
            section_id = self._generate_section_id(title, parent_title)
        
        # 获取层级
        level = self._get_section_level(title)
        
        # 清理标题（移除 Markdown 标记）
        clean_title = re.sub(r'^#+\s*', '', title).strip()
        
        # 存储章节信息
        section_info = {
            "section_id": section_id,
            "title": clean_title,
            "full_title": title,  # 保留原始标题（包含 Markdown）
            "content": content,
            "level": level,
            "parent_title": parent_title,
        }
        
        self.history_store[section_id] = section_info
        self.title_index[clean_title] = section_id
        
        print(f"已添加章节到历史: {clean_title} (ID: {section_id}, Level: {level})")
        return section_id
    
    def get_history_titles(self) -> List[Dict[str, Any]]:
        """
        获取所有历史标题（用于展示给模型）
        
        Returns:
            标题列表，包含层级、标题、section_id等信息
        """
        titles = []
        
        # 按层级和顺序组织
        level0 = []  # 总标题
        level1 = []  # 一级标题
        level2 = []  # 二级标题
        
        for section_id, info in self.history_store.items():
            title_info = {
                "section_id": section_id,
                "title": info["title"],
                "full_title": info["full_title"],
                "level": info["level"],
                "parent_title": info.get("parent_title"),
            }
            
            if info["level"] == 0:
                level0.append(title_info)
            elif info["level"] == 1:
                level1.append(title_info)
            elif info["level"] == 2:
                level2.append(title_info)
        
        # 按层级组织返回
        all_titles = level0 + level1 + level2
        return all_titles
    
    def get_history_titles_formatted(self) -> str:
        """
        获取格式化的历史标题列表（用于给模型展示）
        
        Returns:
            格式化的标题字符串
        """
        titles = self.get_history_titles()
        
        if not titles:
            return "暂无历史章节"
        
        # 按层级组织
        level0 = [t for t in titles if t["level"] == 0]
        level1 = [t for t in titles if t["level"] == 1]
        level2 = [t for t in titles if t["level"] == 2]
        
        lines = []
        
        # 总标题
        if level0:
            for t in level0:
                lines.append(f"# {t['title']}")
        
        # 一级和二级标题
        current_level1 = None
        for t in sorted(level1 + level2, key=lambda x: (x.get("parent_title", ""), x["title"])):
            if t["level"] == 1:
                current_level1 = t
                lines.append(f"## {t['title']}")
            elif t["level"] == 2:
                parent = f"  ({current_level1['title']})" if current_level1 else ""
                lines.append(f"  ### {t['title']} [已写] (ID: {t['section_id']}){parent}")
        
        return "\n".join(lines)
    
    def search_by_title(self, section_id: str) -> Optional[str]:
        """
        按标题精确检索（通过 section_id）
        
        Args:
            section_id: 章节ID
        
        Returns:
            章节内容，如果不存在则返回 None
        """
        section_info = self.history_store.get(section_id)
        if section_info:
            return section_info["content"]
        return None
    
    def search_by_title_name(self, title: str) -> Optional[str]:
        """
        按标题名称精确检索
        
        Args:
            title: 章节标题（清理后的，不含 Markdown 标记）
        
        Returns:
            章节内容，如果不存在则返回 None
        """
        section_id = self.title_index.get(title)
        if section_id:
            return self.search_by_title(section_id)
        return None
    
    def get_section_by_id(self, section_id: str) -> Optional[Dict[str, Any]]:
        """
        根据 section_id 获取章节信息
        
        Args:
            section_id: 章节ID
        
        Returns:
            章节信息字典，如果不存在则返回 None
        """
        return self.history_store.get(section_id)
    
    def clear(self):
        """清空历史写作存储"""
        self.history_store = {}
        self.title_index = {}
        print("已清空历史写作存储")

