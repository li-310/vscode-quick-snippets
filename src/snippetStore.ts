import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { loadLegacyUiSnippets, mergeLegacySnippets } from "./legacyMigration";
import { Snippet, SnippetStoreData } from "./types";

const STORE_VERSION = 1 as const;

export class SnippetStore {
  private data: SnippetStoreData = { version: STORE_VERSION, snippets: [] };
  private filePath: string;
  private ready: Promise<void>;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.filePath = path.join(
      context.globalStorageUri.fsPath,
      "snippets.json"
    );
    this.ready = this.load();
  }

  async whenReady(): Promise<void> {
    await this.ready;
  }

  getAll(): Snippet[] {
    return [...this.data.snippets].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
  }

  getById(id: string): Snippet | undefined {
    return this.data.snippets.find((s) => s.id === id);
  }

  async add(snippet: Omit<Snippet, "id" | "createdAt" | "updatedAt">): Promise<Snippet> {
    const now = Date.now();
    const item: Snippet = {
      ...snippet,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.data.snippets.push(item);
    await this.save();
    return item;
  }

  async update(
    id: string,
    patch: Partial<Pick<Snippet, "name" | "description" | "body" | "languageId">>
  ): Promise<Snippet | undefined> {
    const index = this.data.snippets.findIndex((s) => s.id === id);
    if (index < 0) {
      return undefined;
    }
    const current = this.data.snippets[index];
    const updated: Snippet = {
      ...current,
      ...patch,
      updatedAt: Date.now(),
    };
    this.data.snippets[index] = updated;
    await this.save();
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    const before = this.data.snippets.length;
    this.data.snippets = this.data.snippets.filter((s) => s.id !== id);
    if (this.data.snippets.length === before) {
      return false;
    }
    await this.save();
    return true;
  }

  private async load(): Promise<void> {
    try {
      await fs.promises.mkdir(path.dirname(this.filePath), { recursive: true });
      const raw = await fs.promises.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as SnippetStoreData;
      if (parsed.version === STORE_VERSION && Array.isArray(parsed.snippets)) {
        this.data = parsed;
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        void vscode.window.showErrorMessage(
          `Quick Snippets: 读取存储失败 — ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    await this.migrateLegacyUiSnippets();
  }

  private async save(): Promise<void> {
    await fs.promises.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.promises.writeFile(
      this.filePath,
      JSON.stringify(this.data, null, 2),
      "utf8"
    );
  }

  private async migrateLegacyUiSnippets(): Promise<void> {
    try {
      const legacy = await loadLegacyUiSnippets();
      if (legacy.length === 0) {
        return;
      }

      const { merged, added } = mergeLegacySnippets(this.data.snippets, legacy);
      if (added === 0) {
        return;
      }

      this.data.snippets = merged;
      await this.save();
      void vscode.window.showInformationMessage(
        `UI Snippets: 已从旧版 ui v0.0.1 迁移 ${added} 条代码片段。`
      );
    } catch (err) {
      void vscode.window.showWarningMessage(
        `UI Snippets: 迁移旧片段失败 — ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }
}
