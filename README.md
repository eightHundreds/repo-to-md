# GitHub 仓库转 Markdown 工具

这是一个基于 WebContainer 技术的在线工具，可以将 GitHub 仓库中的文件转换为单一的 Markdown 文档。

## 功能特点

- 🚀 在线转换：无需本地克隆，直接在浏览器中完成转换
- 🎯 灵活筛选：支持使用 glob 模式包含或排除特定文件
- 📝 实时预览：内置 Monaco 编辑器，支持 Markdown 实时预览和编辑
- 💾 一键下载：转换完成后可直接下载 Markdown 文件
- 🔍 文件列表：显示所有已处理的文件清单

## 使用方法

1. 访问网站，输入 GitHub 仓库的 URL（例如：https://github.com/owner/repo）
2. 可选：设置文件包含模式（例如：`**/*.md` 仅包含 markdown 文件）
3. 可选：设置文件排除模式（例如：`**/node_modules/**` 排除 node_modules 目录）
4. 点击"转换"按钮开始处理
5. 等待转换完成后，可以：
   - 在编辑器中预览和编辑内容
   - 点击"下载 Markdown"保存文件

## 技术栈

- React + TypeScript
- Ant Design UI 组件库
- Monaco Editor 代码编辑器
- WebContainer API 用于在浏览器中执行 Git 操作
- Isomorphic Git 用于 Git 操作
- Fast Glob 用于文件匹配

## 注意事项

- 由于使用了 WebContainer 技术，请确保在支持 SharedArrayBuffer 的现代浏览器中使用
- 建议在 HTTPS 或 localhost 环境下运行
- 对于大型仓库，转换过程可能需要一些时间，请耐心等待
