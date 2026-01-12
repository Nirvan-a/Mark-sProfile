"""
PDF 生成器 - 使用 Playwright 生成带图片的 PDF（异步版本）
"""
import os
from pathlib import Path
from typing import Optional
from io import BytesIO

try:
    from playwright.async_api import async_playwright, Browser, Page
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

from dotenv import load_dotenv

# 加载环境变量
env_path = Path(__file__).parent.parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path, override=False)


class PDFGeneratorError(Exception):
    """PDF 生成错误"""
    pass


class PDFGenerator:
    """PDF 生成器 - 使用 Playwright 生成 PDF（异步版本）"""
    
    def __init__(self):
        """初始化 PDF 生成器"""
        if not PLAYWRIGHT_AVAILABLE:
            raise PDFGeneratorError(
                "Playwright 未安装。请运行: pip install playwright && playwright install chromium"
            )
        
        self.playwright = None
        self.browser: Optional[Browser] = None
    
    async def __aenter__(self):
        """异步上下文管理器入口"""
        try:
            self.playwright = await async_playwright().start()
            # 使用系统安装的 Chromium（如果已安装）
            # 否则需要运行: playwright install chromium
            self.browser = await self.playwright.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                ]
            )
        except Exception as e:
            error_msg = str(e)
            if "Executable doesn't exist" in error_msg or "BrowserType.launch" in error_msg:
                raise PDFGeneratorError(
                    f"Playwright 浏览器未安装。错误: {error_msg}\n\n"
                    "请在服务器上运行以下命令安装浏览器:\n"
                    "  pip install playwright\n"
                    "  playwright install chromium\n"
                    "或者运行安装脚本: bash install_playwright.sh"
                ) from e
            else:
                raise PDFGeneratorError(f"启动 Playwright 浏览器失败: {error_msg}") from e
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """异步上下文管理器出口"""
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
    
    async def generate_pdf(
        self,
        html_content: str,
        output_path: Optional[str] = None,
        base_url: Optional[str] = None,
        wait_for_images: bool = True,
        timeout: int = 30000,  # 30秒超时
    ) -> bytes:
        """
        生成 PDF
        
        Args:
            html_content: HTML 内容
            output_path: 输出文件路径（可选，如果提供则保存到文件）
            base_url: 基础 URL（用于解析相对路径的图片）
            wait_for_images: 是否等待图片加载完成
            timeout: 超时时间（毫秒），默认30秒
        
        Returns:
            PDF 文件的字节数据
        """
        if not self.browser:
            raise PDFGeneratorError("浏览器未初始化，请使用上下文管理器")
        
        # 创建新页面
        page = await self.browser.new_page()
        
        try:
            # 设置页面超时
            page.set_default_timeout(timeout)
            
            # 设置视口大小（A4 纸张）
            await page.set_viewport_size({"width": 1200, "height": 1600})
            
            # 监听失败的资源请求，用于日志记录
            failed_resources = []
            def handle_request_failed(request):
                failed_resources.append(str(request.url))
                print(f"⚠️ [PDF生成] 资源请求失败: {request.url}")
            
            page.on("requestfailed", handle_request_failed)
            
            print(f"📄 [PDF生成] 开始设置页面内容，超时: {timeout}ms")
            
            # 设置内容，使用超时控制
            # 使用 "load" 而不是 "networkidle" 来避免无限等待
            try:
                await page.set_content(html_content, wait_until="load", timeout=timeout)
                print("✅ [PDF生成] 页面内容已加载")
            except Exception as e:
                print(f"⚠️ [PDF生成] 页面加载超时或失败: {e}，继续生成 PDF")
                # 即使加载失败，也尝试生成 PDF
            
            # 等待图片加载完成（使用超时）
            if wait_for_images:
                try:
                    # 等待所有图片加载完成，但设置超时
                    await page.wait_for_load_state("domcontentloaded", timeout=5000)
                    # 等待一小段时间让图片有机会加载，但不无限等待
                    await page.wait_for_timeout(2000)
                    print("✅ [PDF生成] 图片加载完成（或超时）")
                except Exception as e:
                    print(f"⚠️ [PDF生成] 等待图片加载超时: {e}，继续生成 PDF")
            
            if failed_resources:
                print(f"⚠️ [PDF生成] 以下资源加载失败: {failed_resources}")
            
            print("📄 [PDF生成] 开始生成 PDF...")
            # 生成 PDF
            pdf_bytes = await page.pdf(
                format="A4",
                margin={
                    "top": "2cm",
                    "right": "2cm",
                    "bottom": "2cm",
                    "left": "2cm",
                },
                print_background=True,  # 包含背景色和图片
                prefer_css_page_size=False,
                timeout=timeout,  # 设置 PDF 生成超时
            )
            print(f"✅ [PDF生成] PDF 生成完成，大小: {len(pdf_bytes)} bytes")
            
            # 如果指定了输出路径，保存到文件
            if output_path:
                output_file = Path(output_path)
                output_file.parent.mkdir(parents=True, exist_ok=True)
                output_file.write_bytes(pdf_bytes)
            
            return pdf_bytes
            
        finally:
            # 取消路由拦截
            try:
                await page.unroute("**/*")
            except Exception:
                pass
            await page.close()
    
    async def generate_pdf_from_markdown(
        self,
        markdown_content: str,
        title: str = "报告",
        output_path: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: int = 30000,  # 30秒超时
    ) -> bytes:
        """
        从 Markdown 内容生成 PDF
        
        Args:
            markdown_content: Markdown 内容
            title: 报告标题
            output_path: 输出文件路径（可选）
            base_url: 基础 URL（用于解析图片路径）
            timeout: 超时时间（毫秒），默认30秒
        
        Returns:
            PDF 文件的字节数据
        """
        print(f"📄 [PDF生成] 开始生成PDF: title='{title}', base_url='{base_url}', timeout={timeout}ms")
        print(f"📄 [PDF生成] Markdown内容长度: {len(markdown_content)} 字符")
        
        # 检查Markdown中是否包含图片
        import re
        image_matches = re.findall(r'!\[([^\]]*)\]\(([^)]+)\)', markdown_content)
        if image_matches:
            print(f"🖼️  [PDF生成] 发现 {len(image_matches)} 个图片引用:")
            for alt, src in image_matches:
                print(f"   - {alt}: {src}")
        else:
            print("⚠️  [PDF生成] 未发现图片引用")
        
        # 将 Markdown 转换为 HTML
        html_content = self._markdown_to_html(markdown_content, title, base_url)
        print(f"📄 [PDF生成] HTML内容长度: {len(html_content)} 字符")
        
        # 生成 PDF
        return await self.generate_pdf(html_content, output_path, base_url, timeout=timeout)
    
    def _markdown_to_html(self, markdown: str, title: str, base_url: Optional[str] = None) -> str:
        """
        将 Markdown 转换为 HTML（带完整样式）
        
        Args:
            markdown: Markdown 内容
            title: 标题
            base_url: 基础 URL（用于图片路径）
        
        Returns:
            HTML 字符串
        """
        # 简单的 Markdown 到 HTML 转换
        html = markdown
        
        import re
        
        # 处理标题
        html = re.sub(r'^### (.*)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
        html = re.sub(r'^## (.*)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
        html = re.sub(r'^# (.*)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)
        
        # 处理加粗和斜体
        html = re.sub(r'\*\*\*(.+?)\*\*\*', r'<strong><em>\1</em></strong>', html)
        html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)
        html = re.sub(r'\*(.+?)\*', r'<em>\1</em>', html)
        
        # 处理图片（必须在链接之前，因为图片格式 ![alt](src) 会被链接正则误匹配）
        # 处理图片（将本地图片转换为 base64 嵌入，避免网络请求）
        import base64
        
        def replace_image(match):
            alt = match.group(1) or ""
            original_src = match.group(2) or ""
            
            print(f"🔍 [PDF生成] 处理图片: alt='{alt}', src='{original_src}'")
            
            if not original_src:
                print("⚠️  [PDF生成] 图片路径为空")
                return f'<img src="" alt="{alt}" />'
            
            src = original_src
            
            # 如果是本地静态文件路径（以 /static/ 开头），转换为 base64
            if original_src.startswith('/static/'):
                # 获取服务器根目录（pdf_generator.py 在 server/tools/smartreport/ 下）
                # __file__ = server/tools/smartreport/pdf_generator.py
                # parent.parent.parent = server/
                server_dir = Path(__file__).parent.parent.parent
                image_path = server_dir / original_src.lstrip('/')
                
                print(f"📁 [PDF生成] 服务器目录: {server_dir}")
                print(f"📁 [PDF生成] 图片完整路径: {image_path}")
                print(f"📁 [PDF生成] 路径是否存在: {image_path.exists()}")
                
                if image_path.exists() and image_path.is_file():
                    try:
                        # 读取图片文件并转换为 base64
                        with open(image_path, 'rb') as f:
                            image_data = f.read()
                            image_base64 = base64.b64encode(image_data).decode('utf-8')
                        
                        # 获取文件扩展名以确定 MIME 类型
                        ext = image_path.suffix.lower()
                        mime_types = {
                            '.png': 'image/png',
                            '.jpg': 'image/jpeg',
                            '.jpeg': 'image/jpeg',
                            '.gif': 'image/gif',
                            '.webp': 'image/webp',
                        }
                        mime_type = mime_types.get(ext, 'image/png')
                        
                        # 使用 base64 数据 URI
                        src = f"data:{mime_type};base64,{image_base64}"
                        print(f"✅ [PDF生成] 已嵌入图片: {image_path.name} ({len(image_data)} bytes, MIME: {mime_type})")
                        print(f"✅ [PDF生成] Base64 长度: {len(image_base64)} 字符")
                    except Exception as e:
                        print(f"❌ [PDF生成] 无法读取图片文件 {image_path}: {e}")
                        import traceback
                        traceback.print_exc()
                        # 如果读取失败，尝试使用 URL
                        if base_url:
                            src = f"{base_url.rstrip('/')}/{original_src.lstrip('/')}"
                            print(f"🔄 [PDF生成] 回退到URL: {src}")
                else:
                    print(f"❌ [PDF生成] 图片文件不存在: {image_path}")
                    # 列出目录内容以便调试
                    parent_dir = image_path.parent
                    if parent_dir.exists():
                        print(f"📂 [PDF生成] 父目录存在，内容: {list(parent_dir.iterdir())}")
                    # 如果文件不存在，尝试使用 URL
                    if base_url:
                        src = f"{base_url.rstrip('/')}/{original_src.lstrip('/')}"
                        print(f"🔄 [PDF生成] 回退到URL: {src}")
            elif original_src.startswith('http'):
                # 已经是完整的 URL，直接使用
                src = original_src
                print(f"🌐 [PDF生成] 使用HTTP URL: {src}")
            elif base_url:
                # 相对路径，转换为绝对 URL
                src = f"{base_url.rstrip('/')}/{original_src.lstrip('/')}"
                print(f"🔄 [PDF生成] 转换为URL: {src}")
            else:
                print(f"⚠️  [PDF生成] 无法处理路径，使用原始路径: {src}")
            
            return f'<img src="{src}" alt="{alt}" />'
        
        html = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', replace_image, html)
        
        # 处理链接（必须在图片之后，避免误匹配图片格式）
        html = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', html)
        
        # 处理列表
        html = re.sub(r'^\* (.+)$', r'<li>\1</li>', html, flags=re.MULTILINE)
        html = re.sub(r'^- (.+)$', r'<li>\1</li>', html, flags=re.MULTILINE)
        
        # 处理段落
        paragraphs = html.split('\n\n')
        processed_paragraphs = []
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            if para.startswith('<'):
                processed_paragraphs.append(para)
            else:
                processed_paragraphs.append(f'<p>{para.replace(chr(10), "<br>")}</p>')
        html = '\n'.join(processed_paragraphs)
        
        # 包装列表项
        html = re.sub(r'(<li>.*?</li>)', r'<ul>\1</ul>', html, flags=re.DOTALL)
        
        # 完整的 HTML 文档
        full_html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>{title}</title>
  <style>
    @page {{
      margin: 2cm;
    }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      line-height: 1.8;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }}
    h1 {{
      font-size: 2em;
      margin-top: 0.5em;
      margin-bottom: 0.5em;
      border-bottom: 2px solid #333;
      padding-bottom: 0.3em;
    }}
    h2 {{
      font-size: 1.5em;
      margin-top: 1em;
      margin-bottom: 0.5em;
      border-bottom: 1px solid #ddd;
      padding-bottom: 0.3em;
    }}
    h3 {{
      font-size: 1.25em;
      margin-top: 0.8em;
      margin-bottom: 0.4em;
    }}
    p {{
      margin-bottom: 1em;
      text-align: justify;
    }}
    ul, ol {{
      margin-bottom: 1em;
      padding-left: 2em;
    }}
    li {{
      margin-bottom: 0.3em;
    }}
    table {{
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 1em;
    }}
    th, td {{
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }}
    th {{
      background-color: #f5f5f5;
      font-weight: bold;
    }}
    img {{
      max-width: 100%;
      height: auto;
      display: block;
      margin: 1em auto;
    }}
    code {{
      background-color: #f5f5f5;
      padding: 2px 5px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }}
    pre {{
      background-color: #f5f5f5;
      padding: 10px;
      border-radius: 5px;
      overflow-x: auto;
    }}
    blockquote {{
      border-left: 4px solid #ddd;
      padding-left: 1em;
      margin-left: 0;
      color: #666;
    }}
    a {{
      color: #0066cc;
      text-decoration: none;
    }}
    a:hover {{
      text-decoration: underline;
    }}
  </style>
</head>
<body>
  {html}
</body>
</html>"""
        
        return full_html


async def generate_pdf_from_markdown(
    markdown_content: str,
    title: str = "报告",
    base_url: Optional[str] = None,
    timeout: int = 30000,  # 30秒超时
) -> bytes:
    """
    便捷函数：从 Markdown 生成 PDF（异步版本）
    
    Args:
        markdown_content: Markdown 内容
        title: 报告标题
        base_url: 基础 URL（用于解析图片路径）
        timeout: 超时时间（毫秒），默认30秒
    
    Returns:
        PDF 文件的字节数据
    """
    async with PDFGenerator() as generator:
        return await generator.generate_pdf_from_markdown(
            markdown_content=markdown_content,
            title=title,
            base_url=base_url,
            timeout=timeout,
        )

