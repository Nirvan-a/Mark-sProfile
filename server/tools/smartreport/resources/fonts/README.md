# 中文字体目录

此目录用于存放中文字体文件，供图表生成功能使用。

## 字体文件

图表生成功能会自动从此目录查找中文字体文件（`.otf` 或 `.ttf` 格式）。

推荐使用 **Noto Sans SC**（思源黑体简体中文），这是一个免费开源的中文字体。

## 下载字体

### 方法 1: 使用脚本自动下载（推荐）

运行以下命令：

```bash
cd server/tools/smartreport/resources/fonts
./download_font.sh
```

脚本会自动下载 TTF 格式的字体文件。

### 方法 2: 手动下载（使用 curl）

```bash
cd server/tools/smartreport/resources/fonts
curl -L "https://fonts.gstatic.com/s/notosanssc/v39/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG9_FnYw.ttf" -o NotoSansSC-Regular.ttf
```

### 方法 3: 从 Google Fonts 网站下载

1. 访问 [Google Fonts - Noto Sans SC](https://fonts.google.com/noto/specimen/Noto+Sans+SC)
2. 点击 "Download family" 下载字体包
3. 解压后找到 `NotoSansSC-Regular.ttf` 文件
4. 将字体文件放到此目录：`server/tools/smartreport/resources/fonts/`

## 字体文件命名

字体文件可以命名为：
- `NotoSansSC-Regular.ttf`（推荐，已测试可用）
- `NotoSansCJKsc-Regular.otf`
- `NotoSansCJKsc-Regular.ttf`
- 任何包含 `noto`、`cjk` 或 `chinese` 关键词的文件名

代码会自动识别这些文件（支持 `.otf` 和 `.ttf` 格式）。

## 注意事项

- 字体文件会随项目一起部署，无需在服务器上单独安装
- 如果此目录中没有字体文件，代码会回退到查找系统字体
- 在 Render 等平台上部署时，确保字体文件已包含在 Git 仓库中

