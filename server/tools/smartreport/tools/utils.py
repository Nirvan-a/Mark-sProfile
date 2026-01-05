"""
工具函数
"""
import re


def count_chinese_characters(text: str) -> int:
    """
    统计中文字符数量（包括中文标点）
    
    Args:
        text: 文本内容
        
    Returns:
        中文字符数量
    """
    # 中文字符Unicode范围：
    # \u4e00-\u9fff: 中文字符（CJK统一汉字）
    # \u3400-\u4dbf: CJK扩展A
    # \u20000-\u2a6df: CJK扩展B
    # \uf900-\ufaff: CJK兼容汉字
    # \u3300-\u33ff: CJK兼容
    # \ufe30-\ufe4f: CJK兼容形式
    # \u3000-\u303f: CJK符号和标点
    # \uff00-\uffef: 全角ASCII、全角标点
    
    # 匹配中文字符（包括中文标点）
    chinese_pattern = r'[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef]'
    chinese_chars = re.findall(chinese_pattern, text)
    return len(chinese_chars)


def count_total_characters(text: str) -> int:
    """
    统计文本总字符数（去除空白字符后）
    
    Args:
        text: 文本内容
        
    Returns:
        总字符数（去除空白字符后）
    """
    # 去除空白字符（空格、换行、制表符等）
    cleaned_text = re.sub(r'\s+', '', text)
    return len(cleaned_text)


def estimate_word_count(text: str) -> int:
    """
    估算文本字数（适用于中英文混合）
    
    对于中文为主的文本，使用中文字符数作为字数
    对于英文为主的文本，使用总字符数作为字数
    
    Args:
        text: 文本内容
        
    Returns:
        估算的字数
    """
    chinese_count = count_chinese_characters(text)
    total_chars = count_total_characters(text)
    
    # 如果中文字符占比超过50%，使用中文字符数
    # 否则使用总字符数
    if total_chars > 0 and chinese_count / total_chars > 0.5:
        return chinese_count
    else:
        return total_chars

