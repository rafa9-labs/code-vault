import * as vscode from 'vscode';
import { StorageService } from './services/StorageService';
import { CommandExecutor } from './services/CommandExecutor';
import { CodeVaultSidebar } from './providers/CodeVaultSidebar';
import { EditorPopup, EditData } from './webviews/EditorPopup';
import { ItemCategory } from './models/types';

/** Discriminated union for sidebar editor actions */
type EditorAction =
	| { action: 'add'; data: null }
	| { action: 'edit'; data: { id: string } };

/** Shared editor open handler */
type EditorCallback = (msg: EditorAction) => void;

export function activate(context: vscode.ExtensionContext): void {
	const storage = new StorageService(context);
	const executor = new CommandExecutor();

	/** Helper: open the add/edit popup */
	const openEditor: EditorCallback = (msg) => {
		if (msg.action === 'add') {
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
		} else if (msg.action === 'edit') {
			const item = storage.getItemById(msg.data.id);
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
	};

	// Create sidebar webview provider
	const sidebar = new CodeVaultSidebar(context.extensionUri, storage, executor, openEditor);

	// Register webview view provider
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(CodeVaultSidebar.viewType, sidebar),
	);

	// ── Register commands for command palette & keybindings ──────
	context.subscriptions.push(
		vscode.commands.registerCommand('codevault.add', () => openEditor({ action: 'add', data: null })),
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('codevault.search', () => {
			// Focus the sidebar and trigger search via the webview
			vscode.commands.executeCommand('codevault-explorer.focus');
			sidebar.triggerSearch();
		}),
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('codevault.copy', async () => {
			const items = storage.getAllItems();
			if (items.length === 0) {
				vscode.window.showWarningMessage('No items in your vault.');
				return;
			}
			const picked = await vscode.window.showQuickPick(
				items.map(i => ({ label: i.name, description: i.category, id: i.id })),
				{ placeHolder: 'Select an item to copy...' },
			);
			if (picked) {
				const item = storage.getItemById(picked.id);
				if (item) {
					storage.trackUsage(item.id);
					await vscode.env.clipboard.writeText(item.content);
					vscode.window.showInformationMessage(`Copied "${item.name}" to clipboard.`);
					sidebar.refresh();
				}
			}
		}),
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('codevault.execute', async () => {
			const commands = storage.getItemsByCategory(ItemCategory.Command);
			if (commands.length === 0) {
				vscode.window.showWarningMessage('No commands in your vault.');
				return;
			}
			const picked = await vscode.window.showQuickPick(
				commands.map(i => ({ label: i.name, description: i.content.substring(0, 60), id: i.id })),
				{ placeHolder: 'Select a command to execute...' },
			);
			if (picked) {
				const item = storage.getItemById(picked.id);
				if (item && item.category === ItemCategory.Command) {
					storage.trackUsage(item.id);
					executor.executeCommand(item.content);
					sidebar.refresh();
				}
			}
		}),
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('codevault.edit', async () => {
			const items = storage.getAllItems();
			if (items.length === 0) {
				vscode.window.showWarningMessage('No items in your vault.');
				return;
			}
			const picked = await vscode.window.showQuickPick(
				items.map(i => ({ label: i.name, description: i.category, id: i.id })),
				{ placeHolder: 'Select an item to edit...' },
			);
			if (picked) {
				openEditor({ action: 'edit', data: { id: picked.id } });
			}
		}),
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('codevault.delete', async () => {
			const items = storage.getAllItems();
			if (items.length === 0) {
				vscode.window.showWarningMessage('No items in your vault.');
				return;
			}
			const picked = await vscode.window.showQuickPick(
				items.map(i => ({ label: i.name, description: i.category, id: i.id })),
				{ placeHolder: 'Select an item to delete...' },
			);
			if (picked) {
				const config = vscode.workspace.getConfiguration('codevault');
				const confirm = config.get<boolean>('confirmBeforeDelete', true);
				if (confirm) {
					const answer = await vscode.window.showWarningMessage(
						`Delete "${picked.label}"?`,
						{ modal: true },
						'Delete',
					);
					if (answer !== 'Delete') {
						return;
					}
				}
				storage.deleteItem(picked.id);
				sidebar.refresh();
				vscode.window.showInformationMessage(`Deleted "${picked.label}".`);
			}
		}),
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('codevault.export', async () => {
			if (!storage.getAllItems().length) {
				vscode.window.showWarningMessage('No items to export.');
				return;
			}
			const uri = await vscode.window.showSaveDialog({
				defaultUri: vscode.Uri.file('codevault-export.json'),
				filters: { 'JSON': ['json'] },
			});
			if (uri) {
				const data = storage.exportData();
				await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(data, null, 2), 'utf-8'));
				vscode.window.showInformationMessage(`Exported ${data.items.length} items.`);
			}
		}),
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('codevault.import', async () => {
			const uris = await vscode.window.showOpenDialog({
				canSelectMany: false,
				filters: { 'JSON': ['json'] },
			});
			if (uris?.length) {
				try {
					const content = await vscode.workspace.fs.readFile(uris[0]);
					const data = JSON.parse(Buffer.from(content).toString('utf-8'));
					const choice = await vscode.window.showQuickPick(['Merge', 'Replace all'], {
						placeHolder: 'Import mode?',
					});
					if (choice) {
						const result = storage.importData(data, choice === 'Merge');
						sidebar.refresh();
						vscode.window.showInformationMessage(`Imported ${result.imported} items.`);
					}
				} catch (e) {
					vscode.window.showErrorMessage(`Import failed: ${e}`);
				}
			}
		}),
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('codevault.refresh', () => {
			sidebar.refresh();
		}),
	);
}

export function deactivate(): void {
	// Cleanup handled by disposables
}