import * as vscode from 'vscode';
import { StorageService } from './services/StorageService';
import { CommandExecutor } from './services/CommandExecutor';
import { CodeVaultSidebar } from './providers/CodeVaultSidebar';
import { EditorPopup, EditData } from './webviews/EditorPopup';
import { ItemCategory } from './models/types';

export function activate(context: vscode.ExtensionContext): void {
	const storage = new StorageService(context);
	const executor = new CommandExecutor();

	// Create sidebar but inject a callback to open the popup editor
	const sidebar = new CodeVaultSidebar(
		context.extensionUri,
		storage,
		executor,
		(action: string, data: any) => {
			if (action === 'add') {
				EditorPopup.show(
					context.extensionUri,
					null,
					(ed: EditData) => {
						storage.addItem({
							name: ed.name,
							category: ed.category as ItemCategory,
							content: ed.content,
							description: ed.description || '',
							language: ed.language || '',
							tags: ed.tags || [],
						});
						sidebar.refresh();
					},
				);
			} else if (action === 'edit') {
				const item = storage.getItemById(data.id);
				if (item) {
					EditorPopup.show(
						context.extensionUri,
						item,
						(ed: EditData) => {
							storage.updateItem(item.id, {
								name: ed.name,
								category: ed.category as ItemCategory,
								content: ed.content,
								description: ed.description,
								language: ed.language,
								tags: ed.tags,
							});
							sidebar.refresh();
						},
						(id: string) => {
							storage.deleteItem(id);
							sidebar.refresh();
						},
					);
				}
			}
		},
	);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(CodeVaultSidebar.viewType, sidebar),
	);
}

export function deactivate(): void {
	// Cleanup handled by disposables
}