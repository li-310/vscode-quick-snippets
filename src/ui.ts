import * as vscode from "vscode";
import { Snippet } from "./types";
import { SnippetStore } from "./snippetStore";

export async function pickSnippet(
  store: SnippetStore,
  placeholder = "选择要插入的代码片段"
): Promise<Snippet | undefined> {
  const snippets = store.getAll();
  if (snippets.length === 0) {
    void vscode.window.showInformationMessage(
      "还没有代码片段。先用「保存为代码片段」创建一条。"
    );
    return undefined;
  }

  const picked = await vscode.window.showQuickPick(
    snippets.map((s) => ({
      label: s.name,
      description:
        [s.prefix ? `prefix: ${s.prefix}` : "", s.languageId ? `[${s.languageId}]` : ""]
          .filter(Boolean)
          .join(" "),
      detail: s.description ?? previewBody(s.body),
      snippet: s,
    })),
    { placeHolder: placeholder, matchOnDescription: true, matchOnDetail: true }
  );

  return picked?.snippet;
}

function previewBody(body: string, maxLen = 80): string {
  const oneLine = body.replace(/\s+/g, " ").trim();
  return oneLine.length <= maxLen ? oneLine : `${oneLine.slice(0, maxLen)}…`;
}

export async function promptSnippetMeta(
  defaults: Partial<
    Pick<Snippet, "name" | "description" | "prefix" | "body" | "languageId">
  > = {},
  options: { allowEditExistingBody?: boolean } = {}
): Promise<Omit<Snippet, "id" | "createdAt" | "updatedAt"> | undefined> {
  const name = await vscode.window.showInputBox({
    title: "代码片段名称",
    prompt: "为片段起一个便于搜索的名字",
    value: defaults.name,
    validateInput: (v) => (v.trim() ? null : "名称不能为空"),
  });
  if (!name) {
    return undefined;
  }

  const description = await vscode.window.showInputBox({
    title: "描述（可选）",
    prompt: "简短说明，会显示在选择列表中",
    value: defaults.description ?? "",
  });
  if (description === undefined) {
    return undefined;
  }

  const hasDefaultBody = Boolean(defaults.body?.length);
  let finalBody = defaults.body ?? "";

  if (!hasDefaultBody) {
    const openEditor = await vscode.window.showInformationMessage(
      "在编辑器中编写片段内容（推荐多行代码）",
      { modal: true },
      "打开编辑器",
      "取消"
    );
    if (openEditor !== "打开编辑器") {
      return undefined;
    }
    const edited = await editBodyInDocument("", name.trim());
    if (edited === undefined) {
      return undefined;
    }
    finalBody = edited;
  } else if (options.allowEditExistingBody ?? true) {
    const openEditor = await vscode.window.showInformationMessage(
      "需要修改片段内容吗？",
      "在编辑器中编辑",
      "保持当前内容"
    );
    if (openEditor === "在编辑器中编辑") {
      const edited = await editBodyInDocument(finalBody, name.trim());
      if (edited === undefined) {
        return undefined;
      }
      finalBody = edited;
    }
  }

  if (!finalBody.trim()) {
    void vscode.window.showWarningMessage("片段内容不能为空。");
    return undefined;
  }

  const languageId = await vscode.window.showInputBox({
    title: "语言 ID（可选）",
    prompt: "例如 typescript、python；留空表示任意语言",
    value: defaults.languageId ?? "",
  });
  if (languageId === undefined) {
    return undefined;
  }

  return {
    name: name.trim(),
    description: description.trim() || undefined,
    prefix: name.trim(),
    body: finalBody,
    languageId: languageId.trim() || undefined,
  };
}

async function editBodyInDocument(
  initial: string,
  title: string
): Promise<string | undefined> {
  const doc = await vscode.workspace.openTextDocument({
    content: initial,
    language: "plaintext",
  });
  const editor = await vscode.window.showTextDocument(doc, {
    preview: false,
    viewColumn: vscode.ViewColumn.Beside,
  });

  const save = "保存并关闭";
  const cancel = "取消";
  const choice = await vscode.window.showInformationMessage(
    `正在编辑「${title}」的片段内容，完成后点击保存。`,
    { modal: true },
    save,
    cancel
  );

  if (choice !== save) {
    await vscode.commands.executeCommand(
      "workbench.action.closeActiveEditor"
    );
    return undefined;
  }

  const text = editor.document.getText();
  await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
  return text;
}

export async function confirmDelete(snippet: Snippet): Promise<boolean> {
  const choice = await vscode.window.showWarningMessage(
    `确定删除代码片段「${snippet.name}」？`,
    { modal: true },
    "删除"
  );
  return choice === "删除";
}
