# 推送到 GitHub 的步骤

## 步骤 1：在 GitHub 创建仓库

1. 访问 https://github.com/new
2. 填写信息：
   - **Repository name**: `Profile-Page`（或你喜欢的名字）
   - **Description**: `个人主页 - 智能工具集`
   - 选择 **Public** 或 **Private**
   - **不要**勾选 "Initialize this repository with a README"
3. 点击 "Create repository"

## 步骤 2：推送代码

创建仓库后，GitHub 会显示推送命令。运行以下命令（替换 `YOUR_USERNAME` 为你的 GitHub 用户名）：

```bash
# 添加远程仓库（替换 YOUR_USERNAME 和 REPO_NAME）
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# 或者使用 SSH（如果你配置了 SSH key）
# git remote add origin git@github.com:YOUR_USERNAME/REPO_NAME.git

# 推送代码
git push -u origin main
```

## 如果遇到问题

### 问题 1：需要认证
如果提示需要登录，可以：
- 使用 GitHub Personal Access Token（推荐）
- 或配置 SSH key

### 问题 2：仓库已存在文件
如果 GitHub 仓库有 README 等文件，需要先拉取：
```bash
git pull origin main --allow-unrelated-histories
git push -u origin main
```

