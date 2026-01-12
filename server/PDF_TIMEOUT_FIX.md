# PDF 下载超时问题修复说明

## 问题描述

本地环境PDF下载正常，但线上（Fly.io）环境出现超时问题。

## 根本原因

1. **Fly.io HTTP代理默认超时**：约60秒
2. **服务器环境启动Playwright较慢**：需要加载Chromium浏览器
3. **内存限制**：服务器环境下浏览器启动和运行需要更多时间
4. **多层超时设置不匹配**：前端、后端、PDF生成器的超时时间不一致

## 已实施的修复

### 1. 增加后端API超时时间

**文件**: `server/tools/smartreport/router.py`

- 整体超时：从60秒增加到**120秒**
- PDF生成器超时：从30秒增加到**60秒**

```python
timeout=120.0  # 整体超时120秒（2分钟）
timeout=60000  # PDF生成器超时60秒
```

### 2. 增加前端超时时间

**文件**: `web/src/tools/smartreport/components/ReportPreview.tsx`

- 前端请求超时：从70秒增加到**130秒**

```typescript
setTimeout(() => controller.abort(), 130000) // 130秒超时（2分10秒）
```

### 3. 优化Uvicorn配置

**文件**: `server/Dockerfile`

- 添加了keep-alive超时配置，支持长时间连接

```dockerfile
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001", "--timeout-keep-alive", "120"]
```

### 4. 优化Playwright浏览器启动参数

**文件**: `server/tools/smartreport/tools/pdf_generator.py`

- 添加单进程模式，减少内存占用
- 添加后台优化参数，加快启动速度

```python
'--single-process',  # 单进程模式，减少内存占用（服务器环境）
'--disable-background-timer-throttling',
'--disable-backgrounding-occluded-windows',
'--disable-renderer-backgrounding',
```

## 超时时间层次

现在的超时时间设置（从外层到内层）：

1. **前端请求超时**: 130秒
2. **后端API整体超时**: 120秒
3. **PDF生成器超时**: 60秒
4. **Uvicorn keep-alive**: 120秒

## 如果仍然超时

如果仍然出现超时问题，可以考虑以下额外优化：

### 方案1：增加服务器内存

```bash
flyctl scale memory 1024 --app profile-page-api
```

### 方案2：使用异步任务队列（推荐用于生产环境）

将PDF生成改为异步任务：
1. 立即返回任务ID
2. 客户端轮询任务状态
3. 完成后下载PDF

### 方案3：优化PDF内容

- 减少图片数量
- 压缩图片大小
- 分批生成大型报告

## 测试建议

1. 在本地模拟服务器环境测试：
   ```bash
   # 限制内存使用
   docker run --memory="768m" ...
   ```

2. 监控Fly.io日志：
   ```bash
   flyctl logs --app profile-page-api
   ```

3. 测试不同大小的报告，确保超时设置足够

## 部署后验证

部署后，请测试：
1. 小型报告（无图片）- 应该快速完成
2. 中型报告（少量图片）- 应该在60秒内完成
3. 大型报告（多张图片）- 应该在120秒内完成

如果仍然超时，查看日志中的具体错误信息，进一步优化。
