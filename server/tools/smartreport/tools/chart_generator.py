"""
图表生成模块
使用 matplotlib 生成各种类型的图表
"""
import os
import json
from typing import Dict, Any, Optional, List
from pathlib import Path
import hashlib
from datetime import datetime

try:
    import matplotlib
    matplotlib.use('Agg')  # 使用非GUI后端
    import matplotlib.pyplot as plt
    import matplotlib.font_manager as fm
    import platform
    
    # 配置中文字体
    def setup_chinese_font():
        """设置中文字体，优先使用系统字体，如果不存在则尝试加载字体文件"""
        system = platform.system()
        
        # 尝试的字体列表（按优先级）
        font_candidates = []
        
        if system == 'Darwin':  # macOS
            font_candidates = ['PingFang SC', 'Arial Unicode MS', 'Heiti TC', 'STHeiti', 'STSong']
        elif system == 'Windows':
            font_candidates = ['Microsoft YaHei', 'SimHei', 'SimSun', 'KaiTi']
        else:  # Linux
            font_candidates = [
                'Noto Sans CJK SC',
                'Noto Sans CJK',
                'Source Han Sans CN',
                'WenQuanYi Micro Hei',
                'WenQuanYi Zen Hei', 
                'Droid Sans Fallback',
                'DejaVu Sans'
            ]
        
        # 首先尝试查找已安装的字体文件路径
        font_file_paths = []
        home_dir = Path.home()
        
        # 检查用户字体目录
        user_font_dir = home_dir / ".local" / "share" / "fonts"
        if user_font_dir.exists():
            for font_file in user_font_dir.glob("*.otf"):
                if "noto" in font_file.name.lower() or "cjk" in font_file.name.lower():
                    font_file_paths.append(str(font_file))
            for font_file in user_font_dir.glob("*.ttf"):
                if "noto" in font_file.name.lower() or "cjk" in font_file.name.lower() or "chinese" in font_file.name.lower():
                    font_file_paths.append(str(font_file))
        
        # 检查系统字体目录
        system_font_dirs = [
            "/usr/share/fonts/truetype/noto",
            "/usr/share/fonts/truetype",
            "/usr/share/fonts/opentype/noto",
        ]
        for font_dir in system_font_dirs:
            font_path = Path(font_dir)
            if font_path.exists():
                for font_file in font_path.glob("*.otf"):
                    if "noto" in font_file.name.lower() and "cjk" in font_file.name.lower():
                        font_file_paths.append(str(font_file))
                for font_file in font_path.glob("*.ttf"):
                    if "noto" in font_file.name.lower() and "cjk" in font_file.name.lower():
                        font_file_paths.append(str(font_file))
        
        # 如果找到字体文件，尝试直接加载
        if font_file_paths:
            try:
                # 使用第一个找到的字体文件
                font_file_path = font_file_paths[0]
                print(f"📁 找到字体文件: {font_file_path}")
                
                # 直接使用字体文件路径创建字体属性
                font_prop = fm.FontProperties(fname=font_file_path)
                # 获取字体名称
                font_name = font_prop.get_name()
                print(f"✅ 加载字体文件: {font_name} ({font_file_path})")
                
                # 设置字体
                plt.rcParams['font.sans-serif'] = [font_name] + font_candidates + ['DejaVu Sans']
                plt.rcParams['axes.unicode_minus'] = False
                
                return font_name
            except Exception as e:
                print(f"⚠️  加载字体文件失败: {e}，尝试其他方法...")
        
        # 如果字体文件加载失败，尝试从已注册的字体中查找
        # 强制重新扫描字体（如果可能）
        try:
            # 清除字体缓存并重新扫描
            fm._rebuild()
        except:
            pass
        
        # 查找可用的中文字体
        available_fonts = [f.name for f in fm.fontManager.ttflist]
        chinese_font = None
        
        for font_name in font_candidates:
            if font_name in available_fonts:
                chinese_font = font_name
                break
        
        # 如果找不到，尝试查找任何包含中文支持的字体
        if not chinese_font:
            # 查找包含 CJK 或中文相关的字体
            for font in fm.fontManager.ttflist:
                font_name = font.name.lower()
                if any(keyword in font_name for keyword in ['cjk', 'chinese', 'han', 'hei', 'song', 'kai', 'ming', 'noto']):
                    chinese_font = font.name
                    break
        
        # 如果还是找不到，尝试使用字体文件路径（即使名称不匹配）
        if not chinese_font and font_file_paths:
            try:
                font_file_path = font_file_paths[0]
                # 直接使用字体文件路径
                plt.rcParams['font.sans-serif'] = font_candidates + ['DejaVu Sans']
                # 在运行时使用 FontProperties
                print(f"✅ 将使用字体文件路径: {font_file_path}")
                plt.rcParams['axes.unicode_minus'] = False
                return font_file_path  # 返回文件路径而不是名称
            except Exception as e:
                print(f"⚠️  无法使用字体文件路径: {e}")
        
        # 如果还是找不到，使用 DejaVu Sans 作为回退（至少不会显示方框）
        if not chinese_font:
            chinese_font = 'DejaVu Sans'
            print("⚠️  未找到中文字体，使用 DejaVu Sans 作为回退（可能无法正确显示中文）")
        else:
            print(f"✅ 使用字体: {chinese_font}")
        
        # 设置字体
        plt.rcParams['font.sans-serif'] = [chinese_font] + font_candidates + ['DejaVu Sans']
        plt.rcParams['axes.unicode_minus'] = False  # 解决负号显示问题
        
        return chinese_font
    
    # 初始化字体
    _chinese_font_name = setup_chinese_font()
    _chinese_font_file = None
    
    # 查找字体文件路径（用于直接加载）
    def get_chinese_font_prop():
        """获取中文字体属性，优先使用字体文件路径"""
        global _chinese_font_file
        
        # 如果已经找到字体文件，直接使用
        if _chinese_font_file and Path(_chinese_font_file).exists():
            try:
                return fm.FontProperties(fname=_chinese_font_file)
            except:
                pass
        
        # 尝试查找字体文件
        home_dir = Path.home()
        font_dirs = [
            home_dir / ".local" / "share" / "fonts",
            Path("/usr/share/fonts/truetype/noto"),
            Path("/usr/share/fonts/truetype"),
        ]
        
        for font_dir in font_dirs:
            if not font_dir.exists():
                continue
            for font_file in font_dir.glob("*.otf"):
                if "noto" in font_file.name.lower() and "cjk" in font_file.name.lower():
                    _chinese_font_file = str(font_file)
                    try:
                        return fm.FontProperties(fname=_chinese_font_file)
                    except:
                        pass
            for font_file in font_dir.glob("*.ttf"):
                if ("noto" in font_file.name.lower() and "cjk" in font_file.name.lower()) or \
                   ("chinese" in font_file.name.lower()):
                    _chinese_font_file = str(font_file)
                    try:
                        return fm.FontProperties(fname=_chinese_font_file)
                    except:
                        pass
        
        # 如果找不到字体文件，使用字体名称
        if _chinese_font_name and isinstance(_chinese_font_name, str) and not Path(_chinese_font_name).exists():
            return fm.FontProperties(family=_chinese_font_name)
        
        # 回退到默认字体
        return None
    
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False
    print("警告: matplotlib 不可用，请安装: pip install matplotlib")

try:
    from langchain_openai import ChatOpenAI
except ImportError:
    from langchain_community.chat_models import ChatOpenAI


class ChartGeneratorError(Exception):
    """图表生成错误"""
    pass


class ChartGenerator:
    """图表生成器 - 根据内容和数据生成图表"""
    
    def __init__(self, output_dir: str = None):
        """
        初始化图表生成器
        
        Args:
            output_dir: 图表输出目录（默认为 server/tools/smartreport/static/charts）
        """
        if not MATPLOTLIB_AVAILABLE:
            raise ChartGeneratorError("matplotlib 不可用")
        
        # 设置输出目录
        if output_dir is None:
            # 默认目录：server/tools/smartreport/resources/static/charts
            smartreport_dir = Path(__file__).parent.parent
            output_dir = smartreport_dir / "resources" / "static" / "charts"
        else:
            output_dir = Path(output_dir)
        
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # 初始化 LLM（用于判断是否需要图表、提取数据）
        from dotenv import load_dotenv
        env_path = Path(__file__).parent.parent.parent.parent / ".env"
        load_dotenv(dotenv_path=env_path, override=False)
        
        api_key = os.getenv("DASHSCOPE_API_KEY")
        if not api_key:
            raise ChartGeneratorError("DASHSCOPE_API_KEY 未配置")
        
        self.llm = ChatOpenAI(
            model="qwen-plus",
            api_key=api_key,
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
            temperature=0.7,
        )
    
    def should_have_chart(self, section_content: str, section: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        判断章节内容是否需要插入图表
        
        Args:
            section_content: 章节内容（Markdown格式）
            section: 章节信息
        
        Returns:
            如果需要图表，返回图表需求字典；否则返回 None
            {
                "need_chart": bool,  # 总是为 True（返回 None 表示不需要）
                "chart_type": str,  # "bar", "line", "pie", "scatter"
                "chart_description": str,  # 图表描述
                "data_suggestion": str,  # 数据建议（从内容中提取的数据提示）
                "insert_after": str,  # 插入位置（内容中的某句话）
                "chart_width": float,  # 图表宽度（英寸）
                "chart_height": float,  # 图表高度（英寸）
            }
        """
        level1_title = section.get("level1_title", "")
        level2_titles = section.get("level2_titles", [])
        
        system_prompt = """你是一位数据可视化专家，擅长判断文本内容是否适合用图表展示。

**任务**：
分析给定的章节内容，判断是否需要插入图表来更好地展示信息。

**判断标准**：
1. 内容中是否包含数值数据、比较、趋势、占比等适合可视化的信息
2. 图表能否显著提升内容的可读性和说服力
3. 数据是否足够清晰，可以提取并可视化

**图表类型**：
- bar: 柱状图（适合：分类对比、排名）
- line: 折线图（适合：趋势变化、时间序列）
- pie: 饼图（适合：占比、构成）
- scatter: 散点图（适合：相关性、分布）

**输出格式**（JSON）：
{
  "need_chart": true/false,
  "chart_type": "bar/line/pie/scatter",  // 如果需要图表
  "chart_description": "图表标题和说明",  // 如果需要图表
  "data_suggestion": "从内容中提取的数据提示（如：2020年50%，2021年60%）",  // 如果需要图表
  "insert_after": "图表应该插入在哪句话后面（从内容中复制该句话的完整文本）",  // 如果需要图表
  "chart_width": 10,  // 图表宽度（英寸），建议范围 8-12
  "chart_height": 6   // 图表高度（英寸），建议范围 4-8
}

**注意**：
- 如果不需要图表，只需返回 {"need_chart": false}
- 只在确实有明确数据且图表能显著提升表达效果时才建议添加图表
- data_suggestion 应该尽可能从内容中提取具体的数据点
- insert_after 必须是内容中存在的完整句子，用于定位图表插入位置
- 图表尺寸要根据数据量和展示需求合理设置，默认建议宽度10英寸，高度6英寸"""

        user_prompt = f"""请分析以下章节内容，判断是否需要插入图表：

章节信息：
- 一级标题：{level1_title}
- 二级标题：{', '.join(level2_titles) if level2_titles else '无'}

章节内容：
{section_content[:2000]}  # 只取前2000字符

请输出JSON格式的判断结果："""

        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
            
            print(f"\n{'='*60}")
            print(f"📊 [ChartGenerator] 判断是否需要图表")
            print(f"{'='*60}")
            print(f"章节: {level1_title}")
            
            response = self.llm.invoke(messages)
            content = response.content.strip()
            
            # 提取 JSON
            content = self._extract_json(content)
            result = json.loads(content)
            
            if result.get("need_chart", False):
                print(f"✅ 需要图表: {result.get('chart_type', 'unknown')}")
                print(f"   描述: {result.get('chart_description', '')[:50]}...")
                print(f"   插入位置: {result.get('insert_after', '')[:50]}...")
                print(f"   尺寸: {result.get('chart_width', 10)}x{result.get('chart_height', 6)} 英寸")
                return result
            else:
                print(f"✅ 不需要图表")
                return None
                
        except Exception as e:
            print(f"⚠️  判断图表需求失败: {e}")
            return None
    
    def generate_chart_from_content(
        self,
        section_content: str,
        chart_requirement: Dict[str, Any],
        section: Dict[str, Any]
    ) -> Optional[str]:
        """
        根据内容生成图表
        
        Args:
            section_content: 章节内容
            chart_requirement: 图表需求（来自 should_have_chart）
            section: 章节信息
        
        Returns:
            图表文件的相对URL路径，如 "/static/charts/abc123.png"
            如果生成失败，返回 None
        """
        chart_type = chart_requirement.get("chart_type", "bar")
        chart_description = chart_requirement.get("chart_description", "图表")
        data_suggestion = chart_requirement.get("data_suggestion", "")
        chart_width = chart_requirement.get("chart_width", 10)
        chart_height = chart_requirement.get("chart_height", 6)
        
        # 步骤1: 使用 LLM 从内容中提取结构化数据
        extracted_data = self._extract_data_from_content(
            section_content,
            chart_type,
            data_suggestion
        )
        
        if not extracted_data:
            print(f"⚠️  无法从内容中提取数据，跳过图表生成")
            return None
        
        # 步骤2: 生成图表
        try:
            chart_path = self._generate_chart(
                chart_type=chart_type,
                data=extracted_data,
                title=chart_description,
                width=chart_width,
                height=chart_height
            )
            
            # 返回相对URL路径
            relative_path = f"/static/charts/{os.path.basename(chart_path)}"
            print(f"✅ 图表生成成功: {relative_path}")
            return relative_path
            
        except Exception as e:
            print(f"⚠️  图表生成失败: {e}")
            return None
    
    def _extract_data_from_content(
        self,
        content: str,
        chart_type: str,
        data_suggestion: str
    ) -> Optional[Dict[str, Any]]:
        """
        从内容中提取结构化数据
        
        Args:
            content: 章节内容
            chart_type: 图表类型
            data_suggestion: 数据提示
        
        Returns:
            结构化数据字典，格式根据图表类型不同：
            - bar/line: {"labels": [...], "values": [...]}
            - pie: {"labels": [...], "values": [...]}
            - scatter: {"x": [...], "y": [...]}
        """
        if chart_type in ["bar", "line"]:
            data_format_example = """
{
  "labels": ["类别1", "类别2", "类别3"],
  "values": [10, 20, 15]
}"""
        elif chart_type == "pie":
            data_format_example = """
{
  "labels": ["部分1", "部分2", "部分3"],
  "values": [30, 50, 20]
}"""
        elif chart_type == "scatter":
            data_format_example = """
{
  "x": [1, 2, 3, 4, 5],
  "y": [10, 15, 13, 17, 20]
}"""
        else:
            data_format_example = "{}"
        
        system_prompt = f"""你是一位数据提取专家，需要从文本中提取结构化数据用于生成图表。

**任务**：
从给定的内容中提取适合生成{chart_type}图的数据。

**输出格式**（JSON）：
{data_format_example}

**要求**：
1. 数据必须真实、准确，来自内容本身
2. 数值必须是数字类型（整数或小数）
3. 标签应该简洁明了
4. 数据点数量：3-8个为宜（过少或过多都不好）
5. 如果内容中没有明确的数据，返回 null"""

        user_prompt = f"""数据提示：
{data_suggestion}

请从以下内容中提取数据：
{content[:3000]}

请输出JSON格式的数据："""

        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
            
            print(f"\n📊 [ChartGenerator] 提取数据（图表类型: {chart_type}）")
            
            response = self.llm.invoke(messages)
            content = response.content.strip()
            
            # 检查是否返回 null
            if content.lower().strip() in ["null", "none", "{}"]:
                print(f"⚠️  LLM返回空数据")
                return None
            
            # 提取 JSON
            content = self._extract_json(content)
            data = json.loads(content)
            
            # 验证数据
            if chart_type in ["bar", "line", "pie"]:
                if "labels" not in data or "values" not in data:
                    print(f"⚠️  数据格式错误：缺少 labels 或 values")
                    return None
                if len(data["labels"]) != len(data["values"]):
                    print(f"⚠️  数据格式错误：labels 和 values 长度不匹配")
                    return None
                if len(data["labels"]) < 2:
                    print(f"⚠️  数据点太少（<2）")
                    return None
            elif chart_type == "scatter":
                if "x" not in data or "y" not in data:
                    print(f"⚠️  数据格式错误：缺少 x 或 y")
                    return None
                if len(data["x"]) != len(data["y"]):
                    print(f"⚠️  数据格式错误：x 和 y 长度不匹配")
                    return None
                if len(data["x"]) < 3:
                    print(f"⚠️  数据点太少（<3）")
                    return None
            
            print(f"✅ 成功提取数据: {len(data.get('labels', data.get('x', [])))} 个数据点")
            return data
            
        except Exception as e:
            print(f"⚠️  提取数据失败: {e}")
            return None
    
    def _generate_chart(
        self,
        chart_type: str,
        data: Dict[str, Any],
        title: str,
        width: float = 10,
        height: float = 6
    ) -> str:
        """
        生成图表文件
        
        Args:
            chart_type: 图表类型
            data: 结构化数据
            title: 图表标题
            width: 图表宽度（英寸）
            height: 图表高度（英寸）
        
        Returns:
            图表文件的绝对路径
        """
        # 生成唯一的文件名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        data_hash = hashlib.md5(json.dumps(data, sort_keys=True).encode()).hexdigest()[:8]
        filename = f"chart_{chart_type}_{timestamp}_{data_hash}.png"
        filepath = self.output_dir / filename
        
        # 设置现代配色方案
        # 使用渐变色系：从蓝色到青色，更现代美观
        colors = [
            '#4A90E2',  # 现代蓝
            '#50C878',  # 翠绿
            '#FF6B6B',  # 珊瑚红
            '#FFA07A',  # 浅橙
            '#9370DB',  # 中紫
            '#20B2AA',  # 浅海绿
            '#FFD700',  # 金色
            '#FF69B4',  # 热粉
            '#00CED1',  # 深青
            '#32CD32',  # 酸橙绿
        ]
        
        # 创建图表，设置背景为白色
        fig, ax = plt.subplots(figsize=(width, height), facecolor='white')
        fig.patch.set_facecolor('white')
        
        # 设置整体样式
        ax.set_facecolor('#FAFAFA')  # 浅灰背景
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['left'].set_color('#E0E0E0')
        ax.spines['bottom'].set_color('#E0E0E0')
        
        # 添加浅色网格
        ax.grid(True, linestyle='--', linewidth=0.5, color='#E0E0E0', alpha=0.7, axis='y')
        ax.set_axisbelow(True)
        
        if chart_type == "bar":
            # 计算柱子数量，动态调整宽度
            num_bars = len(data["labels"])
            bar_width = max(0.3, min(0.5, 0.6 - num_bars * 0.02))  # 柱子宽度在0.3-0.5之间（更窄）
            
            # 使用渐变色，根据数值大小分配颜色
            values = data["values"]
            max_val = max(values) if values else 1
            bar_colors = []
            for i, val in enumerate(values):
                # 根据数值大小选择颜色，创建渐变效果
                color_idx = int((val / max_val) * (len(colors) - 1)) if max_val > 0 else 0
                bar_colors.append(colors[color_idx % len(colors)])
            
            bars = ax.bar(data["labels"], data["values"], width=bar_width, 
                         color=bar_colors, edgecolor='white', linewidth=1.5, 
                         alpha=0.85, zorder=3)
            
            # 添加数值标签在柱子顶部
            for bar in bars:
                height = bar.get_height()
                ax.text(bar.get_x() + bar.get_width() / 2., height,
                       f'{height:.1f}' if height < 1000 else f'{height/1000:.1f}K',
                       ha='center', va='bottom', fontsize=9, color='#333333')
            
            # 获取中文字体属性
            font_prop = get_chinese_font_prop()
            if font_prop:
                ax.set_ylabel('数值', fontsize=11, color='#666666', fontproperties=font_prop)
            else:
                ax.set_ylabel('数值', fontsize=11, color='#666666')
            # 旋转x轴标签，避免重叠
            plt.xticks(rotation=45, ha='right', fontsize=10)
            
        elif chart_type == "line":
            # 使用渐变色和更粗的线条
            line_color = colors[0]
            ax.plot(data["labels"], data["values"], marker='o', color=line_color, 
                   linewidth=2.5, markersize=8, markerfacecolor='white', 
                   markeredgewidth=2, markeredgecolor=line_color, zorder=3)
            # 获取中文字体属性
            font_prop = get_chinese_font_prop()
            if font_prop:
                ax.set_ylabel('数值', fontsize=11, color='#666666', fontproperties=font_prop)
            else:
                ax.set_ylabel('数值', fontsize=11, color='#666666')
            plt.xticks(rotation=45, ha='right', fontsize=10)
            
        elif chart_type == "pie":
            # 使用现代配色，添加阴影效果
            wedges, texts, autotexts = ax.pie(
                data["values"], 
                labels=data["labels"], 
                autopct='%1.1f%%', 
                startangle=90,
                colors=colors[:len(data["values"])],
                explode=[0.05] * len(data["values"]),  # 轻微分离
                shadow=True,
                textprops={'fontsize': 10, 'color': '#333333'}
            )
            # 优化百分比文字样式
            for autotext in autotexts:
                autotext.set_color('white')
                autotext.set_fontweight('bold')
                autotext.set_fontsize(9)
            ax.axis('equal')
            
        elif chart_type == "scatter":
            # 使用渐变色散点图
            # 如果有values字段，使用它作为颜色；否则使用y值作为颜色
            color_values = data.get("values", data.get("y", range(len(data["x"]))))
            scatter = ax.scatter(data["x"], data["y"], c=color_values, 
                               cmap='viridis', alpha=0.75, s=120, edgecolors='white', 
                               linewidth=1.5, zorder=3)
            # 获取中文字体属性
            font_prop = get_chinese_font_prop()
            if font_prop:
                ax.set_xlabel('X轴', fontsize=11, color='#666666', fontproperties=font_prop)
                ax.set_ylabel('Y轴', fontsize=11, color='#666666', fontproperties=font_prop)
            else:
                ax.set_xlabel('X轴', fontsize=11, color='#666666')
                ax.set_ylabel('Y轴', fontsize=11, color='#666666')
            # 添加颜色条
            cbar = plt.colorbar(scatter, ax=ax)
            cbar.ax.tick_params(colors='#666666', labelsize=9)
        
        # 优化标题样式
        # 获取中文字体属性并设置标题
        font_prop = get_chinese_font_prop()
        if font_prop:
            ax.set_title(title, fontsize=15, fontweight='bold', pad=20, color='#333333', fontproperties=font_prop)
        else:
            ax.set_title(title, fontsize=15, fontweight='bold', pad=20, color='#333333')
        
        # 优化坐标轴标签颜色
        ax.tick_params(colors='#666666', labelsize=10)
        
        plt.tight_layout()
        
        # 保存图表，提高DPI以获得更清晰的图片
        plt.savefig(filepath, dpi=200, bbox_inches='tight', facecolor='white', edgecolor='none')
        plt.close(fig)
        
        print(f"✅ 图表已保存: {filepath}")
        return str(filepath)
    
    def _extract_json(self, text: str) -> str:
        """从文本中提取 JSON"""
        text = text.strip()
        
        # 如果包含 markdown 代码块
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
        
        # 查找 JSON 对象
        start_idx = text.find("{")
        end_idx = text.rfind("}")
        
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            text = text[start_idx:end_idx + 1]
        
        return text.strip()


# 单例
_chart_generator_instance = None


def get_chart_generator() -> ChartGenerator:
    """获取图表生成器实例（单例）"""
    global _chart_generator_instance
    if _chart_generator_instance is None:
        _chart_generator_instance = ChartGenerator()
    return _chart_generator_instance

