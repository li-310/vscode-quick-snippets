import * as vscode from "vscode";
import { SnippetStore } from "./snippetStore";

const DEFAULT_ENABLED_LANGUAGE_IDS = new Set([
  "javascript",
  "javascriptreact",
  "typescript",
  "typescriptreact",
]);

export function registerSnippetCompletionProvider(
  context: vscode.ExtensionContext,
  store: SnippetStore
): void {
  const provider: vscode.CompletionItemProvider = {
    provideCompletionItems(document, position) {
      const currentWordRange = document.getWordRangeAtPosition(
        position,
        /[\w-]+/
      );
      const typed = currentWordRange
        ? document.getText(currentWordRange).trim()
        : "";

      if (!typed) {
        return [];
      }

      const snippets = store
        .getAll()
        .filter(
          (s) =>
            Boolean(s.prefix) &&
            (s.languageId
              ? s.languageId === document.languageId
              : DEFAULT_ENABLED_LANGUAGE_IDS.has(document.languageId)) &&
            s.prefix!.toLowerCase().startsWith(typed.toLowerCase())
        );

      return snippets.map((snippet) => {
        const item = new vscode.CompletionItem(
          snippet.prefix!,
          vscode.CompletionItemKind.Snippet
        );
        item.detail = `Quick Snippets: ${snippet.name}`;
        item.documentation = new vscode.MarkdownString(
          snippet.description ?? snippet.body
        );
        item.insertText = snippet.body;
        if (currentWordRange) {
          item.range = currentWordRange;
        }
        item.sortText = snippet.prefix === typed ? "0" : `1-${snippet.prefix}`;
        return item;
      });
    },
  };

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      { scheme: "file" },
      provider
    )
  );
}
