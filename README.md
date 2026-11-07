# Zotero Reading Status (Zotero 阅读状态色块标记插件)

[![Zotero Version](https://img.shields.io/badge/Zotero-7%20%7C%208%20%7C%2010+-2ea44f?style=flat-square&logo=zotero)](https://www.zotero.org)
[![License](https://img.shields.io/badge/License-AGPL%203.0-blue?style=flat-square)](LICENSE)

一个轻量、高效、美观的 Zotero 插件，在文献列表主界面通过醒目的**彩色胶囊色块**直观展示文献阅读进度（未读、在读、已读完），并支持 PDF 阅读器进度自动识别与一键快捷切换。

---

## ✨ 特性一览

* 🎨 **主列表醒彩色块**：
  * ⚪ **未读 (Unread)**：浅灰柔和胶囊
  * 🟡 **在读 (Reading)**：活力琥珀黄色块
  * 🟢 **已读 (Finished)**：清爽翡翠绿色块
* ⚡ **极速单点轮换**：
  * 在主列表的阅读状态色块上**单击鼠标左键**，即刻循环切换：`未读` ➔ `在读` ➔ `已读` ➔ `未读`。
* 📖 **智能自动感应**：
  * **打开即在读**：双击打开文献 PDF 阅读器，自动从“未读”切换为“在读”。
  * **笔记即在读**：划线、高亮或添加注释笔记时，自动保持为“在读”。
  * **翻到文末自动已读**：阅读器翻页或滚动达到 90% 以上（或倒数 1-2 页），自动标记为“已读完”。
* 🛠️ **阅读器顶部工具栏快捷按钮**：
  * 阅读 PDF 时，顶部工具栏右上侧注入专属状态按钮，随手一键标记读完。
* 📋 **右键菜单批量操作**：
  * 支持多选条目，右键选择【📖 标记阅读状态】批量更改。
* ☁️ **多设备云端自动同步**：
  * 状态持久化于文献标准的 `Extra` 字段（`ReadingStatus: ...`），换电脑无缝多端同步。

---

## 🚀 安装方法

1. 下载项目根目录下的 **`zotero-reading-status.xpi`**（或前往 [Releases](https://github.com/Matall725/zotero-reading-status/releases) 页面下载最新构建包）；
2. 打开 Zotero，点击顶部菜单栏：**【工具】 ➔ 【附加组件】**；
3. 将下载的 `.xpi` 文件拖入附加组件窗口中，点击安装并重启 Zotero；
4. **显示列**：在文献列表表头（如“标题”或“创建者”所在那一横行）**点击鼠标右键**，勾选 **【阅读状态】** 即可！

---

## 💻 开发者指南

```bash
# 1. 安装依赖
npm install

# 2. 编译打包生成 .xpi
npm run build
```

---

## 📄 License
[AGPL-3.0-or-later](LICENSE)
