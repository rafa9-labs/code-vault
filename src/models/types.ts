export enum ItemCategory {
	Command = 'command',
	Snippet = 'snippet',
	Function = 'function',
	Note = 'note',
}

export interface CodeVaultItem {
	id: string;
	name: string;
	category: ItemCategory;
	content: string;
	description: string;
	language: string;
	tags: string[];
	createdAt: number;
	updatedAt: number;
	useCount: number;
	lastUsedAt: number;
}

export interface CodeVaultExport {
	version: string;
	exportedAt: number;
	exportedBy: string;
	items: CodeVaultItem[];
}

export interface TreeItemContext {
	type: 'category' | 'item';
	category?: ItemCategory;
	itemId?: string;
}