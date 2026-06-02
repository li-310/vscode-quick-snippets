import { execFile } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { promisify } from "util";
import { Snippet } from "./types";

const execFileAsync = promisify(execFile);

const LEGACY_UI_STATE_KEY = "undefined_publisher.ui";

const LEGACY_STATE_DB_PATHS = [
  path.join(
    os.homedir(),
    "Library/Application Support/Code/User/globalStorage/state.vscdb"
  ),
  path.join(
    os.homedir(),
    "Library/Application Support/Cursor/User/globalStorage/state.vscdb"
  ),
];

const LEGACY_UI_SNIPPET_FILE_PATHS = [
  path.join(
    os.homedir(),
    ".cursor/extensions/undefined_publisher.ui-0.0.1/out/snippets.json"
  ),
  path.join(
    os.homedir(),
    ".vscode/extensions/undefined_publisher.ui-0.0.1/out/snippets.json"
  ),
];

interface LegacyUiSnippetEntry {
  content: string;
  description?: string;
}

interface LegacyUiGlobalState {
  snippets?: Record<string, LegacyUiSnippetEntry>;
  tsxSnippets?: Record<string, string>;
}

export interface LegacySnippetCandidate {
  name: string;
  body: string;
  description?: string;
}

async function readLegacyUiGlobalState(): Promise<LegacyUiGlobalState | null> {
  for (const dbPath of LEGACY_STATE_DB_PATHS) {
    try {
      const { stdout } = await execFileAsync("sqlite3", [
        dbPath,
        `SELECT value FROM ItemTable WHERE key = '${LEGACY_UI_STATE_KEY}' LIMIT 1;`,
      ]);
      const trimmed = stdout.trim();
      if (trimmed) {
        return JSON.parse(trimmed) as LegacyUiGlobalState;
      }
    } catch {
      // try next path
    }
  }
  return null;
}

function collectFromGlobalState(
  state: LegacyUiGlobalState
): LegacySnippetCandidate[] {
  const result: LegacySnippetCandidate[] = [];

  for (const [name, entry] of Object.entries(state.snippets ?? {})) {
    if (!name.trim() || !entry?.content?.trim()) {
      continue;
    }
    result.push({
      name: name.trim(),
      body: entry.content,
      description: entry.description?.trim() || undefined,
    });
  }

  for (const [name, body] of Object.entries(state.tsxSnippets ?? {})) {
    if (!name.trim() || typeof body !== "string" || !body.trim()) {
      continue;
    }
    result.push({
      name: name.trim(),
      body,
    });
  }

  return result;
}

async function collectFromLegacySnippetFiles(): Promise<LegacySnippetCandidate[]> {
  const result: LegacySnippetCandidate[] = [];

  for (const filePath of LEGACY_UI_SNIPPET_FILE_PATHS) {
    try {
      const raw = await fs.promises.readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      for (const [name, body] of Object.entries(parsed)) {
        if (typeof name !== "string" || typeof body !== "string") {
          continue;
        }
        if (!name.trim() || !body.trim()) {
          continue;
        }
        result.push({ name: name.trim(), body });
      }
    } catch {
      // ignore missing files
    }
  }

  return result;
}

export async function loadLegacyUiSnippets(): Promise<LegacySnippetCandidate[]> {
  const byName = new Map<string, LegacySnippetCandidate>();

  const globalState = await readLegacyUiGlobalState();
  if (globalState) {
    for (const item of collectFromGlobalState(globalState)) {
      byName.set(item.name, item);
    }
  }

  for (const item of await collectFromLegacySnippetFiles()) {
    if (!byName.has(item.name)) {
      byName.set(item.name, item);
    }
  }

  return [...byName.values()];
}

export function mergeLegacySnippets(
  existing: Snippet[],
  legacy: LegacySnippetCandidate[]
): { merged: Snippet[]; added: number } {
  const existingNames = new Set(existing.map((s) => s.name));
  const merged = [...existing];
  let added = 0;

  for (const item of legacy) {
    if (existingNames.has(item.name)) {
      continue;
    }
    const now = Date.now();
    merged.push({
      id: crypto.randomUUID(),
      name: item.name,
      prefix: item.name,
      description: item.description,
      body: item.body,
      createdAt: now,
      updatedAt: now,
    });
    existingNames.add(item.name);
    added++;
  }

  return { merged, added };
}
