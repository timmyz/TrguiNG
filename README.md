# TrguiNG 汉化版（基于 openscopeproject/TrguiNG）

**Remote GUI for Transmission torrent daemon —— 中文版**

> 本仓库基于 [openscopeproject/TrguiNG](https://github.com/openscopeproject/TrguiNG) 同步开发，
> 在上游功能基础上提供**简体中文界面**与若干实用增强功能。

---

## 当前版本

| 项目 | 版本 |
|---|---|
| 上游基线 | **v1.5.1**（`611f8d8`，2026-10-26） |
| 本仓库版本 | **v1.5.3-zh** |
| i18n 框架 | 合并自上游 PR [#339](https://github.com/openscopeproject/TrguiNG/pull/339)（ManuZhu0728） |
| Tauri | v2.12 |
| Mantine | v8 |
| 界面语言 | 简体中文（`zh-CN`），支持英文 / 俄语回退 |

---

## 汉化方式：从硬编码改为 i18n 架构

旧版本把中文直接硬编码在 `.tsx` 里，导致每次同步上游都要重新逐处贴回约 600 条文案。
本版改为上游认可的 **i18n 架构**：

```
src/i18n/
├── index.ts              # i18next 实例与初始化
├── language.ts           # 语言注册表（不引入 i18next，保证启动包体积）
├── translate.ts          # 核心模块用的翻译器注入
├── locales/
│   ├── en.json           # 英文基准（key 的唯一来源）
│   ├── zh-CN.json        # 简体中文
│   └── ru.json           # 俄语（上游提供）
└── README.md             # 新增语言的注册说明
src-tauri/src/i18n.rs     # Rust 端，与前端共用同一份 JSON 资源
```

**带来的直接收益：**

- 同步上游时**不再产生文案冲突**，只需增量补充新增 key
- 托盘菜单、macOS 菜单、通知标题等原生界面也走同一套翻译
- 语言可自动识别（`zh` / `zh-CN` 均可匹配），也可在界面设置里手动指定
- 英文为兜底语言，缺失的词条自动回退，不会出现空白

新增语言只需三步：放入 `locales/<code>.json` → 在 `language.ts` 注册 → 在 Rust 的 `define_languages!` 宏注册。

---

## 自研增强功能

以下功能为上游没有、本仓库独有的：

| 功能 | 位置 | 说明 |
|---|---|---|
| **暂停子状态** | 过滤面板 | 「已暂停」下分出「已完成 / 未完成」两级子过滤器 |
| **批量开始 / 暂停** | 工具栏 | 一键开始全部、开始已完成的、暂停全部、暂停出错的、暂停下载中的 |
| **错误分布分组** | 过滤面板 | 按 `cachedError` 聚合，新增「错误分布」分组与「无错误」汇总行 |
| **目录分组复制路径** | 过滤面板 | 目录行右侧一键复制路径 |
| **双击全选分组** | 过滤面板 | 双击分组行即选中该分组全部种子（可在右键菜单开关） |
| **隐藏 / 展示运行状态** | 界面右下 | 常驻状态面板，显示运行中的操作与当前选中项 |
| **复制名称 / 路径** | 种子列表右键 | 批量复制选中项的名称或完整路径（自动去重） |
| **单选也删数据** | 删除弹窗 | 只选中一个种子时也可删除其数据，且会自动避开其他种子共享的路径 |
| **tr3 批量改 Tracker** | 种子列表右键 | 在 transmission 4.0 以下也允许对多个选中种子批量修改 Tracker |
| **拖拽批量添加** | 添加种子 | 一次拖入多个种子文件时逐个处理，而非只处理第一个 |
| **磁力链接下载间隔** | 添加种子 | 批量添加磁力链接时可设置间隔秒数 |
| **分享率按数值变色** | 种子列表 | 分享率 `< 1` 红、`1 ~ seedRatioLimit` 橙、`≥ seedRatioLimit` 绿，PT 站一眼看清资源情况 |
| **表格行分隔线** | 所有表格 | 行间横线，密集列时更易对位 |
| **种子信息悬窗** | 种子列表 | 名称被截断时悬停显示全名、保存目录与错误信息 |

### 与上游重复、已改用上游实现的部分

| 旧版实现 | 现采用 |
|---|---|
| 列表不显示子目录种子 | 上游 `recursiveDirectories`（语义等价，默认递归） |
| 显示分组体积 | 上游 `showSizesInFilters`（覆盖面更广） |
| 字体大小设置 | 上游 `fontSize` / `fontSizeBase` |
| TB / EB 体积单位 | 上游大 SI 单位支持 |
| 进度条静态/动态/多颜色 | 上游 `animatedProgressbars` + `colorfulProgressbars` |

### 界面开关

以下显示选项在工具栏「布局」菜单中切换，Web 版与桌面版均可用：

- 隐藏 / 展示运行状态
- 切换分享率变色
- 切换表格行分隔线

分享率变色的上界取自服务端的 `seedRatioLimit`（transmission 中「达到该分享率自动停止做种」的阈值，默认 2），
因此无需额外配置即可与站点达标线对齐。

### 旧配置迁移

汉化版旧配置里的分组名是中文（`种子状态` / `数据目录` / `用户标签` / `服务器分布` / `错误分布` …），
与新架构的英文 key 不兼容。`src/config.ts` 中的 `migrateLegacySectionNames()` 会在加载时自动映射，
**存量用户升级后不会丢失分组可见性设置**。

---

## 部署（Docker / Web 版）

1. 从 [releases](https://github.com/jayzcoder/TrguiNG/releases) 下载 `trguing-web-<version>-zh.zip`
2. 解压到目标目录，确保 `index.html` 位于该目录**第一层**
3. 设置 transmission 环境变量：
   ```
   TRANSMISSION_WEB_HOME=/config/webui/trguing-zh
   ```
4. 重启 transmission 服务

> 使用 AppArmor / SELinux 的系统还需放行该目录的读取权限，详见上游 README。

---

## 本地构建

前置：Node.js 20+（桌面端另需 Rust 1.92+）

```bash
npm ci
npm run webpack-prod     # 仅构建 Web 产物，输出到 dist/
npm run tauri-dev        # 桌面端开发模式
```

或直接用封装好的 Web 发布脚本（构建 + 打包 zip）：

```bash
ci/build_web_zh.sh
VERSION=1.5.1 ci/build_web_zh.sh   # 指定版本号
```

---

## License

遵循上游的 GNU Affero General Public License v3，详见 `LICENSE.txt`。
