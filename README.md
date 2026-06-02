# Quick Snippets

在 VS Code / Cursor 中快捷保存、管理与插入自定义代码片段。

## 功能

- **默认启动**：扩展在 `onStartupFinished` 时自动激活，无需打开特定文件
- **保存片段**：选中编辑器中的代码，保存为可复用片段
- **编辑 / 删除**：通过命令面板或管理面板维护片段
- **UI 选取插入**：Quick Pick 列表搜索并插入片段
- **Prefix 快捷输入**：输入 prefix 后在补全建议中回车快速插入

## 命令

| 命令 | 说明 |
|------|------|
| `Quick Snippets: 插入代码片段` | 弹出列表，插入所选片段 |
| `Quick Snippets: 保存为代码片段` | 将当前选区保存为片段 |
| `Quick Snippets: 管理代码片段` | 新建 / 插入 / 编辑 / 删除入口 |
| `Quick Snippets: 编辑代码片段` | 编辑已有片段 |
| `Quick Snippets: 删除代码片段` | 删除已有片段 |

默认快捷键（可在键盘快捷方式中修改）：

- **插入片段**：`Cmd+Alt+S`（macOS）/ `Ctrl+Alt+S`（Windows/Linux）

右键编辑器上下文菜单也提供「保存」与「插入」。

## 开发与调试

```bash
cd vscode-quick-snippets
npm install
npm run compile
```

在 VS Code 中按 **F5** 打开「扩展开发宿主」窗口进行调试。

## 打包安装

```bash
npm run package
```

生成 `.vsix` 后，在扩展视图中选择「从 VSIX 安装」。

## 数据存储

片段保存在扩展全局存储目录下的 `snippets.json`，卸载扩展前数据会保留。
