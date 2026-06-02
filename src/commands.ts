import * as vscode from "vscode";
import { SnippetStore } from "./snippetStore";
import { confirmDelete, pickSnippet, promptSnippetMeta } from "./ui";

const DEFAULT_ENABLED_LANGUAGE_IDS = new Set([
  "javascript",
  "javascriptreact",
  "typescript",
  "typescriptreact",
]);

export function registerCommands(
  context: vscode.ExtensionContext,
  store: SnippetStore
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("uiSnippets.insert", () =>
      insertSnippet(store)
    ),
    vscode.commands.registerCommand("uiSnippets.save", () =>
      saveSnippet(store)
    ),
    vscode.commands.registerCommand("uiSnippets.manage", () =>
      manageSnippets(store)
    ),
    vscode.commands.registerCommand("uiSnippets.edit", () =>
      editSnippet(store)
    ),
    vscode.commands.registerCommand("uiSnippets.delete", () =>
      deleteSnippet(store)
    )
  );
}

async function insertSnippet(store: SnippetStore): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    void vscode.window.showWarningMessage("请先打开一个编辑器。");
    return;
  }

  const snippet = await pickSnippet(store);
  if (!snippet) {
    return;
  }

  if (snippet.languageId && editor.document.languageId !== snippet.languageId) {
    const proceed = await vscode.window.showWarningMessage(
      `该片段适用于「${snippet.languageId}」，当前文件为「${editor.document.languageId}」。仍要插入吗？`,
      "插入",
      "取消"
    );
    if (proceed !== "插入") {
      return;
    }
  }
  if (
    !snippet.languageId &&
    !DEFAULT_ENABLED_LANGUAGE_IDS.has(editor.document.languageId)
  ) {
    void vscode.window.showWarningMessage(
      "当前文件不在默认生效范围（js/ts/jsx/tsx）内。"
    );
    return;
  }

  const position = editor.selection.active;
  await editor.edit((builder) => {
    if (!editor.selection.isEmpty) {
      builder.replace(editor.selection, snippet.body);
    } else {
      builder.insert(position, snippet.body);
    }
  });
}

async function saveSnippet(store: SnippetStore): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  const defaults =
    editor && !editor.selection.isEmpty
      ? {
          body: editor.document.getText(editor.selection),
          languageId: editor.document.languageId,
        }
      : editor
        ? { languageId: editor.document.languageId }
        : {};

  if (editor && editor.selection.isEmpty) {
    const fromSelection = await vscode.window.showInformationMessage(
      "未选中代码。可从空白创建，或先选中代码再保存。",
      "继续创建",
      "取消"
    );
    if (fromSelection !== "继续创建") {
      return;
    }
  } else if (!editor) {
    const proceed = await vscode.window.showInformationMessage(
      "没有打开的编辑器。仍要创建空白片段吗？",
      "继续创建",
      "取消"
    );
    if (proceed !== "继续创建") {
      return;
    }
  }

  const meta = await promptSnippetMeta(defaults, { allowEditExistingBody: false });
  if (!meta) {
    return;
  }

  const created = await store.add(meta);
  void vscode.window.showInformationMessage(
    `已保存代码片段「${created.name}」`
  );
}

async function editSnippet(store: SnippetStore): Promise<void> {
  const snippet = await pickSnippet(store, "选择要编辑的代码片段");
  if (!snippet) {
    return;
  }

  const meta = await promptSnippetMeta({
    name: snippet.name,
    description: snippet.description,
    prefix: snippet.prefix,
    body: snippet.body,
    languageId: snippet.languageId,
  });
  if (!meta) {
    return;
  }

  await store.update(snippet.id, meta);
  void vscode.window.showInformationMessage(`已更新「${meta.name}」`);
}

async function deleteSnippet(store: SnippetStore): Promise<void> {
  const snippet = await pickSnippet(store, "选择要删除的代码片段");
  if (!snippet) {
    return;
  }

  if (!(await confirmDelete(snippet))) {
    return;
  }

  const ok = await store.remove(snippet.id);
  if (ok) {
    void vscode.window.showInformationMessage(`已删除「${snippet.name}」`);
  }
}

type ManageAction = "insert" | "edit" | "delete" | "new";

async function manageSnippets(store: SnippetStore): Promise<void> {
  const action = await vscode.window.showQuickPick<
    { label: string; description?: string; action: ManageAction }
  >(
    [
      { label: "$(add) 新建代码片段", action: "new" },
      { label: "$(list-selection) 从列表插入", action: "insert" },
      { label: "$(edit) 编辑代码片段", action: "edit" },
      { label: "$(trash) 删除代码片段", action: "delete" },
    ],
    { placeHolder: "管理代码片段", ignoreFocusOut: true }
  );

  if (!action) {
    return;
  }

  switch (action.action) {
    case "new":
      await saveSnippet(store);
      break;
    case "insert":
      await insertSnippet(store);
      break;
    case "edit":
      await editSnippet(store);
      break;
    case "delete":
      await deleteSnippet(store);
      break;
  }
}
