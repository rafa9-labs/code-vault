import * as vscode from 'vscode';
import { CodeVaultItem, ItemCategory } from '../models/types';
import { CATEGORY_CONFIGS, LANGUAGES } from '../constants';

export class EditorPopup {
	public static currentPanel: EditorPopup | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private _disposables: vscode.Disposable[] = [];
	private _onSave: (data: EditData) => void;
	private _onDelete: ((id: string) => void) | undefined;

	private constructor(
		panel: vscode.WebviewPanel,
		extensionUri: vscode.Uri,
		item: CodeVaultItem | null,
		onSave: (data: EditData) => void,
		onDelete?: (id: string) => void,
	) {
		this._panel = panel;
		this._onSave = onSave;
		this._onDelete = onDelete;

		this._panel.webview.html = this._getHtml(extensionUri, item);

		this._panel.webview.onDidReceiveMessage(async (msg) => {
			switch (msg.command) {
				case 'save':
					this._onSave(msg.data);
					this.dispose();
					break;
				case 'delete':
					if (this._onDelete && item) {
						this._onDelete(item.id);
					}
					this.dispose();
					break;
				case 'close':
					this.dispose();
					break;
			}
		});

		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
	}

	public static show(
		extensionUri: vscode.Uri,
		item: CodeVaultItem | null,
		onSave: (data: EditData) => void,
		onDelete?: (id: string) => void,
	): EditorPopup {
		// If already open, dispose and reopen
		if (EditorPopup.currentPanel) {
			EditorPopup.currentPanel.dispose();
		}

		const title = item ? `✏️ Edit: ${item.name}` : '➕ New Item';

		const panel = vscode.window.createWebviewPanel(
			'codevault-editor',
			title,
			{ viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
			{ enableScripts: true, localResourceRoots: [extensionUri] },
		);

		panel.iconPath = new vscode.ThemeIcon('edit');

		EditorPopup.currentPanel = new EditorPopup(panel, extensionUri, item, onSave, onDelete);
		return EditorPopup.currentPanel;
	}

	public dispose(): void {
		EditorPopup.currentPanel = undefined;
		this._panel.dispose();
		while (this._disposables.length) {
			const d = this._disposables.pop();
			if (d) { d.dispose(); }
		}
	}

	private _getHtml(_extensionUri: vscode.Uri, item: CodeVaultItem | null): string {
		const categories = CATEGORY_CONFIGS.map(c => ({ label: c.label, category: c.category, icon: c.icon.id }));
		const languages = LANGUAGES;
		const isEdit = item !== null;

		return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<title>${isEdit ? 'Edit Item' : 'New Item'}</title>
<style>
:root {
	--bg: var(--vscode-editor-background);
	--fg: var(--vscode-editor-foreground);
	--border: var(--vscode-panel-border, rgba(128,128,128,0.25));
	--input-bg: var(--vscode-input-background);
	--input-border: var(--vscode-input-border, rgba(128,128,128,0.4));
	--input-fg: var(--vscode-input-foreground);
	--btn: var(--vscode-button-background);
	--btn-fg: var(--vscode-button-foreground);
	--btn-h: var(--vscode-button-hoverBackground);
	--btn2: var(--vscode-button-secondaryBackground);
	--btn2-fg: var(--vscode-button-secondaryForeground);
	--btn2-h: var(--vscode-button-secondaryHoverBackground);
	--danger: var(--vscode-errorForeground, #f14c4c);
	--muted: var(--vscode-descriptionForeground);
	--focus: var(--vscode-focusBorder);
	--font: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
	--mono: var(--vscode-editor-font-family, 'Consolas', monospace);
	--fs: var(--vscode-font-size, 13px);
	--accent: var(--vscode-button-background);
	--card: var(--vscode-list-hoverBackground);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
	background: var(--bg);
	color: var(--fg);
	font-family: var(--font);
	font-size: var(--fs);
	line-height: 1.5;
	padding: 20px 24px;
	max-width: 560px;
	margin: 0 auto;
}

.header {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-bottom: 20px;
	padding-bottom: 14px;
	border-bottom: 1px solid var(--border);
}
.header-icon {
	width: 32px;
	height: 32px;
	background: var(--accent);
	border-radius: 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1em;
	color: var(--btn-fg);
	font-weight: 700;
}
.header-title {
	font-size: 1.2em;
	font-weight: 700;
	letter-spacing: -0.3px;
}
.header-sub {
	font-size: 0.8em;
	color: var(--muted);
	font-weight: 400;
}

.field {
	margin-bottom: 14px;
}
.field-label {
	display: block;
	font-size: 0.75em;
	font-weight: 600;
	color: var(--muted);
	text-transform: uppercase;
	letter-spacing: 0.6px;
	margin-bottom: 4px;
}
.field-input, .field-select, .field-textarea {
	width: 100%;
	padding: 8px 10px;
	background: var(--input-bg);
	color: var(--input-fg);
	border: 1px solid var(--input-border);
	border-radius: 6px;
	font-family: var(--font);
	font-size: 0.95em;
	outline: none;
	transition: border-color 0.15s;
}
.field-input:focus, .field-select:focus, .field-textarea:focus {
	border-color: var(--focus);
}
.field-textarea {
	resize: vertical;
	min-height: 100px;
}
.field-textarea.code {
	font-family: var(--mono);
	min-height: 160px;
	tab-size: 4;
	line-height: 1.6;
	border-radius: 8px;
}
.field-row {
	display: flex;
	gap: 12px;
}
.field-row .field { flex: 1; }

.actions {
	display: flex;
	gap: 8px;
	margin-top: 20px;
	padding-top: 16px;
	border-top: 1px solid var(--border);
}

.btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	padding: 8px 20px;
	border: none;
	border-radius: 6px;
	font-size: 0.92em;
	font-weight: 600;
	cursor: pointer;
	font-family: var(--font);
	transition: background 0.15s;
}
.btn:focus { outline: 2px solid var(--focus); outline-offset: 2px; }
.btn-primary { background: var(--btn); color: var(--btn-fg); flex: 1; }
.btn-primary:hover { background: var(--btn-h); }
.btn-secondary { background: var(--btn2); color: var(--btn2-fg); }
.btn-secondary:hover { background: var(--btn2-h); }
.btn-danger { background: transparent; color: var(--danger); border: 1px solid var(--danger); }
.btn-danger:hover { background: rgba(244,76,76,0.1); }

.help-text {
	font-size: 0.75em;
	color: var(--muted);
	margin-top: 3px;
	opacity: 0.7;
}
</style>
</head>
<body>

<div class="header">
	<div class="header-icon">${isEdit ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M11.5 1.5l3 3L5 14H2v-3z"/><path d="M9.5 3.5l3 3"/></svg>' : '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 1v14M1 8h14"/></svg>'}</div>
	<div>
		<div class="header-title">${isEdit ? 'Edit Item' : 'New Item'}</div>
		<div class="header-sub">${isEdit ? 'Update your saved item' : 'Add a new item to your vault'}</div>
	</div>
</div>

<div class="field">
	<label class="field-label">Name *</label>
	<input class="field-input" type="text" id="f-name" placeholder="e.g., build-project" value="${isEdit ? item.name : ''}" />
</div>

<div class="field-row">
	<div class="field">
		<label class="field-label">Category</label>
		<select class="field-select" id="f-cat">
			${categories.map(c => '<option value="' + c.category + '"' + (isEdit && item.category === c.category ? ' selected' : '') + '>' + c.icon + ' ' + c.label + '</option>').join('\n')}
		</select>
	</div>
	<div class="field">
		<label class="field-label">Language</label>
		<select class="field-select" id="f-lang">
			<option value="">None</option>
			${languages.map(l => '<option value="' + l + '"' + (isEdit && item.language === l ? ' selected' : '') + '>' + l + '</option>').join('\n')}
		</select>
	</div>
</div>

<div class="field">
	<label class="field-label">Content *</label>
	<textarea class="field-textarea code" id="f-content" placeholder="Enter your code, command, or text...">${isEdit ? item.content : ''}</textarea>
	<div class="help-text">Tab inserts indent &middot; Ctrl+Enter saves</div>
</div>

<div class="field">
	<label class="field-label">Description</label>
	<input class="field-input" type="text" id="f-desc" placeholder="Optional description..." value="${isEdit ? (item.description || '') : ''}" />
</div>

<div class="field">
	<label class="field-label">Tags</label>
	<input class="field-input" type="text" id="f-tags" placeholder="react, api, utility (comma-separated)" value="${isEdit ? (item.tags || []).join(', ') : ''}" />
</div>

<div class="actions">
	${isEdit ? '<button class="btn btn-danger" id="btn-del"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2 4h12M5.3 4V2.7a.7.7 0 01.7-.7h4a.7.7 0 01.7.7V4M6.5 7v4.5M9.5 7v4.5"/><path d="M3.5 4l.7 9.3a.7.7 0 00.7.7h6.2a.7.7 0 00.7-.7L12.5 4"/></svg> Delete</button>' : ''}
	<button class="btn btn-secondary" id="btn-cancel">Cancel</button>
	<button class="btn btn-primary" id="btn-save"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 8l3.5 3.5L13 4"/></svg> Save</button>
</div>

<script>
const vscode = acquireVsCodeApi();

document.getElementById('btn-save').addEventListener('click', () => {
	const name = document.getElementById('f-name').value.trim();
	const content = document.getElementById('f-content').value;
	if (!name) { document.getElementById('f-name').focus(); return; }
	if (!content.trim()) { document.getElementById('f-content').focus(); return; }
	vscode.postMessage({
		command: 'save',
		data: {
			name,
			category: document.getElementById('f-cat').value,
			language: document.getElementById('f-lang').value,
			content,
			description: document.getElementById('f-desc').value.trim(),
			tags: document.getElementById('f-tags').value.trim()
				? document.getElementById('f-tags').value.split(',').map(t => t.trim()).filter(t => t)
				: [],
		}
	});
});

document.getElementById('btn-cancel').addEventListener('click', () => {
	vscode.postMessage({ command: 'close' });
});

${isEdit ? `document.getElementById('btn-del').addEventListener('click', () => {
	if (confirm('Delete this item?')) {
		vscode.postMessage({ command: 'delete' });
	}
});` : ''}

// Tab key support in textarea
document.getElementById('f-content').addEventListener('keydown', (e) => {
	if (e.key === 'Tab') {
		e.preventDefault();
		const ta = e.target;
		const s = ta.selectionStart, end = ta.selectionEnd;
		ta.value = ta.value.substring(0, s) + '\\t' + ta.value.substring(end);
		ta.selectionStart = ta.selectionEnd = s + 1;
	}
});

// Ctrl+Enter to save
document.addEventListener('keydown', (e) => {
	if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
		document.getElementById('btn-save').click();
	}
	if (e.key === 'Escape') {
		vscode.postMessage({ command: 'close' });
	}
});

// Focus name on load
document.getElementById('f-name').focus();
</script>
</body>
</html>`;
	}
}

export interface EditData {
	name: string;
	category: string;
	language: string;
	content: string;
	description: string;
	tags: string[];
}