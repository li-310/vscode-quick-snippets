import * as vscode from "vscode";
import { registerSnippetCompletionProvider } from "./completionProvider";
import { registerCommands } from "./commands";
import { SnippetStore } from "./snippetStore";

let store: SnippetStore;

export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  store = new SnippetStore(context);
  await store.whenReady();

  registerCommands(context, store);
  registerSnippetCompletionProvider(context, store);

  const count = store.getAll().length;
  console.log(`Quick Snippets 已启动，共 ${count} 条代码片段`);
}

export function deactivate(): void {
  // persistence is file-based; nothing to flush
}
