# 国内平台部署指南

## 📋 平台推荐（按推荐优先级排序）

### 1. 腾讯云 Serverless 容器服务（推荐 ⭐⭐⭐⭐⭐）

**优势：**
- ✅ 国内访问速度快
- ✅ 有免费额度（每月有一定免费使用量）
- ✅ 支持 Docker 直接部署
- ✅ 价格相对便宜
- ✅ 配置简单，适合个人项目

**快速开始：**
1. 访问 [腾讯云 Serverless 容器](https://console.cloud.tencent.com/tke2/eci)
2. 创建容器实例（使用现有 Dockerfile）
3. 配置环境变量：`PORT`、`DASHSCOPE_API_KEY`、`CORS_ORIGINS`
4. 部署完成

**价格参考：** 约 ¥0.5-2/天（按使用量计费）

---

### 2. 阿里云容器服务 ACK Serverless（推荐 ⭐⭐⭐⭐）

**优势：**
- ✅ 国内访问速度快
- ✅ 稳定性高
- ✅ 支持 Docker
- ✅ 与 DashScope（你的 API）同平台，网络更优

**快速开始：**
1. 访问 [阿里云容器服务](https://cs.console.aliyun.com/)
2. 创建 Serverless Kubernetes 集群
3. 使用 Dockerfile 部署
4. 配置环境变量

**价格参考：** 约 ¥1-3/天

---

### 3. 华为云容器实例 CCI（推荐 ⭐⭐⭐⭐）

**优势：**
- ✅ 无需管理集群（Serverless）
- ✅ 按需付费
- ✅ 支持 Docker
- ✅ 新用户有优惠

**快速开始：**
1. 访问 [华为云容器实例](https://console.huaweicloud.com/cci/)
2. 创建容器实例
3. 上传 Dockerfile 或使用镜像
4. 配置环境变量

**价格参考：** 约 ¥0.8-2.5/天

---

### 4. UCloud（推荐 ⭐⭐⭐）

**优势：**
- ✅ 价格便宜
- ✅ 对个人开发者友好
- ✅ 支持 Docker

**快速开始：**
1. 访问 [UCloud 容器服务](https://console.ucloud.cn/)
2. 创建容器实例
3. 部署应用

**价格参考：** 约 ¥0.4-1.5/天

---

## 🚀 迁移步骤（以腾讯云为例）

### 步骤 1：准备 Docker 镜像

你的项目已有 Dockerfile，可以直接使用：

```bash
# 本地构建测试（可选）
docker build -t your-app-name .
docker run -p 8001:8001 -e PORT=8001 your-app-name
```

### 步骤 2：在腾讯云创建容器服务

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 进入 **容器服务** → **Serverless 容器**
3. 点击 **新建** 创建容器实例
4. 选择 **使用 Dockerfile 部署** 或 **使用镜像部署**

### 步骤 3：配置环境变量

在容器实例配置中添加以下环境变量：

```env
PORT=8001
DASHSCOPE_API_KEY=你的API密钥
CORS_ORIGINS=https://your-frontend-domain.com,https://your-another-domain.com
```

### 步骤 4：配置网络和域名

1. **公网访问**：开启公网访问，会获得一个公网 IP
2. **域名绑定**（可选）：
   - 如果使用腾讯云域名服务，可以直接绑定
   - 也可以使用其他域名服务商的 CNAME 解析

### 步骤 5：更新前端配置

在 Cloudflare Pages（或你的前端部署平台）中更新环境变量：

```env
VITE_API_BASE_URL=https://你的新后端域名或IP
```

---

## 🔧 环境变量清单

迁移时需要配置以下环境变量：

| 变量名 | 说明 | 必需 | 示例值 |
|--------|------|------|--------|
| `PORT` | 服务端口 | 是 | `8001` |
| `DASHSCOPE_API_KEY` | 阿里云 DashScope API Key | 是 | `sk-xxxxx` |
| `CORS_ORIGINS` | 允许跨域的域名（逗号分隔） | 是 | `https://xxx.pages.dev,https://xxx.com` |

---

## 💰 成本对比

| 平台 | 预估月费用 | 免费额度 | 推荐指数 |
|------|-----------|---------|---------|
| 腾讯云 Serverless | ¥15-60 | 有 | ⭐⭐⭐⭐⭐ |
| 阿里云 ACK Serverless | ¥30-90 | 有限 | ⭐⭐⭐⭐ |
| 华为云 CCI | ¥24-75 | 新用户有 | ⭐⭐⭐⭐ |
| UCloud | ¥12-45 | 有 | ⭐⭐⭐ |

> **注意**：实际费用取决于：
> - CPU/内存配置
> - 流量使用量
> - 运行时间（按小时计费 vs 按天计费）
> - 是否有免费额度

---

## 🎯 快速决策指南

**如果你：**
- ✅ **优先考虑价格** → 选择 **UCloud** 或 **腾讯云**
- ✅ **优先考虑稳定性** → 选择 **阿里云** 或 **华为云**
- ✅ **优先考虑速度** → 选择 **腾讯云** 或 **阿里云**
- ✅ **使用阿里云 DashScope** → 选择 **阿里云**（同平台网络更优）
- ✅ **新手，想要简单** → 选择 **腾讯云 Serverless 容器**

---

## 📝 迁移检查清单

- [ ] 选择部署平台
- [ ] 注册账号并完成实名认证
- [ ] 准备 Dockerfile（✅ 已存在）
- [ ] 配置环境变量（PORT、DASHSCOPE_API_KEY、CORS_ORIGINS）
- [ ] 测试部署是否成功
- [ ] 更新前端 API 地址（Cloudflare Pages 环境变量）
- [ ] 验证 API 连接和 CORS 配置
- [ ] 监控服务运行状态

---

## 🔗 相关链接

- [腾讯云 Serverless 容器文档](https://cloud.tencent.com/document/product/457/39804)
- [阿里云容器服务文档](https://help.aliyun.com/product/85222.html)
- [华为云容器实例文档](https://support.huaweicloud.com/productdesc-cci/cci_01_0010.html)
- [UCloud 容器服务文档](https://docs.ucloud.cn/compute/uk8s)

---

## ❓ 常见问题

### Q: 需要修改代码吗？
A: **不需要**。你的 Dockerfile 和代码已经兼容，只需要：
1. 在新平台创建容器服务
2. 配置环境变量
3. 部署即可

### Q: 数据会丢失吗？
A: **不会**。你的代码和数据都在 Git 仓库中，迁移只是换个部署平台。

### Q: 迁移需要停机吗？
A: **建议双跑一段时间**：
1. 在新平台部署并测试
2. 确认无误后切换前端配置
3. 观察一段时间再停止旧服务

### Q: 域名需要重新配置吗？
A: **视情况而定**：
- 如果使用平台提供的默认域名，前端直接更新地址即可
- 如果想使用自己的域名，需要在域名服务商配置 CNAME 解析

---

## 📞 需要帮助？

如果遇到问题：
1. 查看平台的官方文档
2. 联系平台技术支持（通常都有在线客服）
3. 检查环境变量配置是否正确
4. 查看容器日志排查错误

