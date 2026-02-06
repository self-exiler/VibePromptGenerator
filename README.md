# Vibe Prompt Generator

高效生成标准化软件需求 Prompt 的前端工具。

## 项目简介

Vibe Prompt Generator 是一个纯前端实现的工具，旨在通过结构化参数配置界面，引导用户输入关键信息，并自动生成格式统一的 Markdown 文档（Prompt.md），用于规范化软件开发需求说明。

## 功能特性

- 多语言与关键库（轮子）选择快速确定开发的技术栈。
- 软件架构、运行环境、总体描述、注意事项等需求参数配置。
- 支持模块化需求编辑，每个模块可分别填写前端/上层与后端/底层需求，并可插入常用语句。
- 语言与轮子、常用语句库可自定义增删改。
- 一键生成并下载标准化的 Prompt.md 文档。
- 纯前端实现，无需后端依赖，数据本地存储。

## 安装与使用

1. 克隆或下载本项目到本地：
   ```
   git clone <your-repo-url>
   ```
2. 直接用浏览器打开 `index.html` 即可使用，无需任何构建或依赖安装。

## 目录结构

```
VibePromptGenerator/
├── index.html         # 主页面
├── js/
│   ├── main.js        # 主逻辑脚本
│   └── data.js        # 默认数据与配置
├── data.json          # 语言、库、常用语等数据
├── docs/              # 文档
```

## 依赖

- [Tailwind CSS](https://tailwindcss.com/)（CDN）
- [Font Awesome](https://fontawesome.com/)（CDN）

## 贡献

欢迎提交 Issue 或 PR 以完善功能和数据。

## 许可证

MIT License

# AI使用情况

全部由Minimax 2.1 agent 专业模式编写。
