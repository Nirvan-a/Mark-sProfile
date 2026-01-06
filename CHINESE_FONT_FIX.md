# 图表中文字体显示修复

## 问题

Python 生成的图表中中文显示为方框，原因是 Linux 服务器（Render）上没有安装中文字体。

## 解决方案

### 1. 字体检测和回退机制

已更新 `chart_generator.py`，添加了智能字体检测：
- 自动检测系统可用的中文字体
- 按优先级尝试多个字体
- 如果找不到中文字体，使用 DejaVu Sans 作为回退

### 2. 字体安装脚本

创建了 `server/install_chinese_fonts.sh` 脚本：
- 下载思源黑体（Noto Sans CJK SC）
- 安装到用户字体目录
- 更新字体缓存

### 3. 构建命令更新

在 `render.yaml` 中更新了构建命令：
```yaml
buildCommand: pip install -r requirements.txt && bash install_chinese_fonts.sh || true && playwright install chromium
```

## 部署后验证

部署完成后，可以通过以下方式验证：

1. **查看日志**
   - 在 Render Dashboard 查看构建日志
   - 应该看到 "✅ 使用字体: Noto Sans CJK SC" 或类似信息

2. **测试图表生成**
   - 在智能报告工具中生成包含中文的图表
   - 检查图表中的中文是否正常显示

3. **如果仍然显示方框**
   - 检查构建日志，确认字体安装是否成功
   - 查看应用日志，确认使用的字体名称
   - 可能需要手动安装字体包

## 手动安装字体（如果自动安装失败）

如果自动安装失败，可以在 Render Dashboard 中：

1. 进入服务设置
2. 在构建命令中添加：
   ```bash
   apt-get update && apt-get install -y fonts-noto-cjk || yum install -y google-noto-cjk-fonts || true
   ```

或者使用环境变量指定字体路径。

## 字体优先级

代码会按以下优先级尝试字体：

**Linux 服务器**:
1. Noto Sans CJK SC（思源黑体）
2. Source Han Sans CN
3. WenQuanYi Micro Hei
4. WenQuanYi Zen Hei
5. Droid Sans Fallback
6. DejaVu Sans（回退）

**macOS**:
1. PingFang SC
2. Arial Unicode MS
3. Heiti TC
4. STHeiti

**Windows**:
1. Microsoft YaHei
2. SimHei
3. SimSun

## 注意事项

- 字体文件较大，首次安装可能需要较长时间
- 如果构建超时，可以尝试简化字体安装脚本
- 某些字体可能需要系统权限才能安装

