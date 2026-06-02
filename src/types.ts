export interface Snippet {
  id: string;
  name: string;
  description?: string;
  prefix?: string;
  body: string;
  languageId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SnippetStoreData {
  version: 1;
  snippets: Snippet[];
}
