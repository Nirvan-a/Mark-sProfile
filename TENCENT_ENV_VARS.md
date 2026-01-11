# 腾讯云环境变量配置

## 📋 必需的环境变量

在腾讯云 Serverless 容器服务中，需要在创建容器实例时配置以下环境变量：

### 1. PORT（端口）

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `PORT` | `8001` | 服务监听端口 |

### 2. DASHSCOPE_API_KEY（API 密钥）

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DASHSCOPE_API_KEY` | `sk-xxxxx` | 阿里云 DashScope API Key |

**获取方式：**
1. 访问 [阿里云 DashScope 控制台](https://dashscope.console.aliyun.com/)
2. 创建 API Key
3. 复制密钥值

### 3. CORS_ORIGINS（跨域域名）

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `CORS_ORIGINS` | `https://domain1.com,https://domain2.com` | 允许跨域的前端域名 |

**格式说明：**
- 多个域名用**逗号分隔**
- **不要有空格**
- 必须包含 `https://` 或 `http://` 协议

**示例：**
```
正确：https://your-app.pages.dev,https://profile.mazhaofeng.com
错误：https://your-app.pages.dev, https://profile.mazhaofeng.com（有空格）
错误：your-app.pages.dev,profile.mazhaofeng.com（缺少协议）
```

---

## 🔧 在腾讯云控制台配置

### 步骤 1：进入容器实例配置

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 进入 [Serverless 容器控制台](https://console.cloud.tencent.com/tke2/eci)
3. 点击 **"新建"** 创建容器实例
4. 在 **"高级设置"** → **"环境变量"** 部分配置

### 步骤 2：添加环境变量

点击 **"添加环境变量"**，依次添加：

**变量 1：**
- 变量名：`PORT`
- 变量值：`8001`

**变量 2：**
- 变量名：`DASHSCOPE_API_KEY`
- 变量值：`你的API密钥`（例如：`sk-xxxxxxxxxxxxx`）

**变量 3：**
- 变量名：`CORS_ORIGINS`
- 变量值：`https://你的前端域名1,https://你的前端域名2`

### 步骤 3：保存配置

配置完成后，点击 **"创建"** 保存并启动容器实例。

---

## ✅ 验证配置

### 方法 1：查看日志

1. 在容器实例详情页，点击 **"日志"** 标签
2. 查看启动日志，确认：
   - ✅ 没有 "API key 未配置" 错误
   - ✅ 没有 "CORS" 相关错误
   - ✅ 应用正常启动

### 方法 2：测试 API

```bash
# 健康检查
curl http://你的公网IP:8001/api/health

# 应该返回
{"status": "ok"}
```

### 方法 3：测试 CORS

在前端应用中测试 API 调用，检查浏览器控制台：
- ✅ 没有 CORS 错误
- ✅ API 请求成功

---

## 🔄 更新环境变量

如果需要更新环境变量（例如添加新的前端域名）：

1. 进入容器实例详情页
2. 点击 **"配置"** 或 **"编辑"**
3. 修改环境变量
4. 保存并重启容器实例

---

## ❓ 常见问题

### Q: 环境变量不生效？

**检查：**
1. 确认变量名拼写正确（注意大小写）
2. 确认没有多余的空格
3. 确认容器实例已重启
4. 查看容器日志确认配置是否正确读取

### Q: CORS 仍然报错？

**检查：**
1. 确认 `CORS_ORIGINS` 包含前端域名（完整的 URL，包括协议）
2. 确认多个域名之间用逗号分隔，**没有空格**
3. 确认容器实例已重启
4. 清除浏览器缓存并强制刷新（Cmd+Shift+R 或 Ctrl+Shift+R）

### Q: API Key 认证失败？

**检查：**
1. 确认 `DASHSCOPE_API_KEY` 值正确（完整复制，不要有空格）
2. 确认 API Key 未过期
3. 确认 API Key 有相应权限
4. 查看容器日志中的错误信息

---

## 📝 快速参考

```env
PORT=8001
DASHSCOPE_API_KEY=sk-your-api-key-here
CORS_ORIGINS=https://your-frontend.pages.dev,https://your-custom-domain.com
```

