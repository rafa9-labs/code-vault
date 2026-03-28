import * as vscode from 'vscode';
import { CodeVaultItem, CodeVaultExport, ItemCategory } from '../models/types';
import { STORAGE_KEY, EXPORT_VERSION } from '../constants';

export class StorageService {
	private _context: vscode.ExtensionContext;

	constructor(context: vscode.ExtensionContext) {
		this._context = context;
	}

	// ── CRUD Operations ──────────────────────────────────────────

	getAllItems(): CodeVaultItem[] {
		return this._context.globalState.get<CodeVaultItem[]>(STORAGE_KEY, []);
	}

	getItemById(id: string): CodeVaultItem | undefined {
		return this.getAllItems().find(item => item.id === id);
	}

	getItemsByCategory(category: ItemCategory): CodeVaultItem[] {
		return this.getAllItems()
			.filter(item => item.category === category)
			.sort((a, b) => a.name.localeCompare(b.name));
	}

	addItem(item: Omit<CodeVaultItem, 'id' | 'createdAt' | 'updatedAt' | 'useCount' | 'lastUsedAt'>): CodeVaultItem {
		const items = this.getAllItems();
		const newItem: CodeVaultItem = {
			...item,
			id: this.generateId(),
			createdAt: Date.now(),
			updatedAt: Date.now(),
			useCount: 0,
			lastUsedAt: 0,
		};
		items.push(newItem);
		this._context.globalState.update(STORAGE_KEY, items);
		return newItem;
	}

	updateItem(id: string, updates: Partial<Omit<CodeVaultItem, 'id' | 'createdAt'>>): CodeVaultItem | undefined {
		const items = this.getAllItems();
		const index = items.findIndex(item => item.id === id);
		if (index === -1) {
			return undefined;
		}
		items[index] = {
			...items[index],
			...updates,
			updatedAt: Date.now(),
		};
		this._context.globalState.update(STORAGE_KEY, items);
		return items[index];
	}

	deleteItem(id: string): boolean {
		const items = this.getAllItems();
		const filtered = items.filter(item => item.id !== id);
		if (filtered.length === items.length) {
			return false;
		}
		this._context.globalState.update(STORAGE_KEY, filtered);
		return true;
	}

	deleteItems(ids: string[]): number {
		const idSet = new Set(ids);
		const items = this.getAllItems();
		const filtered = items.filter(item => !idSet.has(item.id));
		const deleted = items.length - filtered.length;
		this._context.globalState.update(STORAGE_KEY, filtered);
		return deleted;
	}

	// ── Usage Tracking ───────────────────────────────────────────

	trackUsage(id: string): CodeVaultItem | undefined {
		const items = this.getAllItems();
		const index = items.findIndex(item => item.id === id);
		if (index === -1) {
			return undefined;
		}
		items[index].useCount = (items[index].useCount || 0) + 1;
		items[index].lastUsedAt = Date.now();
		this._context.globalState.update(STORAGE_KEY, items);
		return items[index];
	}

	getMostUsed(count: number = 5): CodeVaultItem[] {
		return this.getAllItems()
			.filter(item => (item.useCount || 0) > 0)
			.sort((a, b) => (b.useCount || 0) - (a.useCount || 0))
			.slice(0, count);
	}

	getRecent(count: number = 5): CodeVaultItem[] {
		return this.getAllItems()
			.filter(item => (item.lastUsedAt || 0) > 0)
			.sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0))
			.slice(0, count);
	}

	// ── Search ───────────────────────────────────────────────────

	searchItems(query: string): CodeVaultItem[] {
		const lower = query.toLowerCase();
		return this.getAllItems().filter(item =>
			item.name.toLowerCase().includes(lower) ||
			item.content.toLowerCase().includes(lower) ||
			item.description.toLowerCase().includes(lower) ||
			item.tags.some(tag => tag.toLowerCase().includes(lower))
		).sort((a, b) => a.name.localeCompare(b.name));
	}

	// ── Import / Export ──────────────────────────────────────────

	exportData(userIdentifier?: string): CodeVaultExport {
		return {
			version: EXPORT_VERSION,
			exportedAt: Date.now(),
			exportedBy: userIdentifier ?? '',
			items: this.getAllItems(),
		};
	}

	/**
	 * Validates that an imported item has the required fields and correct types.
	 * Strips any unexpected properties.
	 */
	private validateImportItem(item: unknown): CodeVaultItem | null {
		if (!item || typeof item !== 'object') {
			return null;
		}

		const obj = item as Record<string, unknown>;

		// Required string fields
		const requiredStrings = ['id', 'name', 'content', 'description', 'language'];
		for (const field of requiredStrings) {
			if (typeof obj[field] !== 'string') {
				return null;
			}
		}

		// Validate category is a valid enum value
		if (!Object.values(ItemCategory).includes(obj.category as ItemCategory)) {
			return null;
		}

		// Validate tags is a string array
		if (!Array.isArray(obj.tags) || !obj.tags.every((t: unknown) => typeof t === 'string')) {
			return null;
		}

		// Validate timestamps are numbers
		if (typeof obj.createdAt !== 'number' || typeof obj.updatedAt !== 'number') {
			return null;
		}

		// Return a clean item with only known fields
		return {
			id: obj.id as string,
			name: (obj.name as string).substring(0, 200),
			category: obj.category as ItemCategory,
			content: obj.content as string,
			description: (obj.description as string).substring(0, 1000),
			language: (obj.language as string).substring(0, 50),
			tags: (obj.tags as string[]).map(t => t.substring(0, 50)).slice(0, 20),
			createdAt: obj.createdAt as number,
			updatedAt: obj.updatedAt as number,
			useCount: typeof obj.useCount === 'number' ? obj.useCount : 0,
			lastUsedAt: typeof obj.lastUsedAt === 'number' ? obj.lastUsedAt : 0,
		};
	}

	importData(data: CodeVaultExport, merge: boolean = false): { imported: number; skipped: number } {
		if (!data.version || !Array.isArray(data.items)) {
			throw new Error('Invalid CodeVault export format.');
		}

		// Validate and sanitize all imported items
		const validatedItems: CodeVaultItem[] = [];
		for (const item of data.items) {
			const validated = this.validateImportItem(item);
			if (validated) {
				validatedItems.push(validated);
			}
		}

		if (validatedItems.length === 0) {
			throw new Error('No valid items found in import data.');
		}

		if (merge) {
			const existingItems = this.getAllItems();
			const existingIds = new Set(existingItems.map(i => i.id));
			const newItems = validatedItems.filter(item => !existingIds.has(item.id));
			const allItems = [...existingItems, ...newItems];
			this._context.globalState.update(STORAGE_KEY, allItems);
			return { imported: newItems.length, skipped: validatedItems.length - newItems.length };
		} else {
			this._context.globalState.update(STORAGE_KEY, validatedItems);
			return { imported: validatedItems.length, skipped: 0 };
		}
	}

	// ── Helpers ──────────────────────────────────────────────────

	private generateId(): string {
		return 'cv_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
	}
}