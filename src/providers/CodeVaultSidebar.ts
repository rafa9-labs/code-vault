import * as vscode from 'vscode';
import { CodeVaultItem, ItemCategory } from '../models/types';
import { CATEGORY_CONFIGS, LANGUAGE_SHORT } from '../constants';
import { StorageService } from '../services/StorageService';
import { CommandExecutor } from '../services/CommandExecutor';

/** Discriminated union for sidebar editor actions */
type EditorAction =
	| { action: 'add'; data: null }
	| { action: 'edit'; data: { id: string } };

type EditorCallback = (msg: EditorAction) => void;

/* ── SVG icons (monochrome, inherit color) ──────────────────── */
const ICO = {
	add: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1v14M1 8h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>`,
	search: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="6.5" cy="6.5" r="5"/><line x1="10.5" y1="10.5" x2="15" y2="15"/></svg>`,
	copy: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M3 11H2.5A1.5 1.5 0 011 9.5v-7A1.5 1.5 0 012.5 1h7A1.5 1.5 0 0111 2.5V3"/></svg>`,
	play: `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2l10 6-10 6z"/></svg>`,
	edit: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M11.5 1.5l3 3L5 14H2v-3z"/><path d="M9.5 3.5l3 3"/></svg>`,
	trash: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h12M5.3 4V2.7a.7.7 0 01.7-.7h4a.7.7 0 01.7.7V4M6.5 7v4.5M9.5 7v4.5"/><path d="M3.5 4l.7 9.3a.7.7 0 00.7.7h6.2a.7.7 0 00.7-.7L12.5 4"/></svg>`,
	chev: `<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M3 1l4 4-4 4"/></svg>`,
	cmd: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M2 4h12M2 8h12M2 12h8"/><circle cx="13" cy="12" r="1.2" fill="currentColor"/></svg>`,
	snip: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2h8v12H4z"/><path d="M6 5h4M6 8h4M6 11h2"/></svg>`,
	func: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v12M13 2v12"/><path d="M3 5h10M3 11h10"/><path d="M6 5v6M10 5v6"/></svg>`,
	note: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M2 2h12v12H2z"/><path d="M5 6h6M5 8.5h6M5 11h3"/></svg>`,
	star: `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1l2.2 4.5 5 .7-3.6 3.5.8 5L8 12.4 3.6 14.7l.8-5L.8 6.2l5-.7z"/></svg>`,
	clock: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><circle cx="8" cy="8" r="6.5"/><path d="M8 4.5V8l2.5 1.5"/></svg>`,
	importIco: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M8 2v9M4.5 7.5L8 11l3.5-3.5"/><path d="M2 12v2h12v-2"/></svg>`,
	exportIco: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M8 11V2M4.5 5.5L8 2l3.5 3.5"/><path d="M2 12v2h12v-2"/></svg>`,
};

const CAT_ICO: Record<string, string> = {
	[ItemCategory.Command]: ICO.cmd,
	[ItemCategory.Snippet]: ICO.snip,
	[ItemCategory.Function]: ICO.func,
	[ItemCategory.Note]: ICO.note,
};

export class CodeVaultSidebar implements vscode.WebviewViewProvider {
	public static readonly viewType = 'codevault-explorer';
	private _view?: vscode.WebviewView;
	private _storage: StorageService;
	private _executor: CommandExecutor;
	private _extensionUri: vscode.Uri;
	private _openEditor: EditorCallback;

	constructor(extensionUri: vscode.Uri, storage: StorageService, executor: CommandExecutor, openEditor: EditorCallback) {
		this._extensionUri = extensionUri;
		this._storage = storage;
		this._executor = executor;
		this._openEditor = openEditor;
	}

	public refresh(): void { this._sendAll(); }

	/** Focus the sidebar and open the search bar via webview message */
	public triggerSearch(): void {
		this._view?.show(true);
		this._view?.webview.postMessage({ command: 'openSearch' });
	}

	public resolveWebviewView(webviewView: vscode.WebviewView): void {
		this._view = webviewView;
		webviewView.webview.options = { enableScripts: true, localResourceRoots: [this._extensionUri] };
		webviewView.webview.html = this._getHtml();

		webviewView.webview.onDidReceiveMessage(async (msg) => {
			switch (msg.command) {
				case 'getItems': this._sendAll(); break;
				case 'addItem': this._openEditor({ action: 'add', data: null }); break;
				case 'editItem': this._openEditor({ action: 'edit', data: { id: msg.data.id } }); break;
				case 'deleteItem': this._storage.deleteItem(msg.data.id); this._sendAll(); break;
				case 'copyItem': {
					const item = this._storage.getItemById(msg.data.id);
					if (item) { this._storage.trackUsage(item.id); await vscode.env.clipboard.writeText(item.content); vscode.window.showInformationMessage(`Copied "${item.name}"`); this._sendAll(); }
					break;
				}
				case 'executeItem': {
					const cmd = this._storage.getItemById(msg.data.id);
					if (cmd && cmd.category === ItemCategory.Command) { this._storage.trackUsage(cmd.id); this._executor.executeCommand(cmd.content); this._sendAll(); }
					break;
				}
				case 'exportData': {
					if (!this._storage.getAllItems().length) { vscode.window.showWarningMessage('No items.'); break; }
					const uri = await vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file('codevault-export.json'), filters: { 'JSON': ['json'] } });
					if (uri) { const d = this._storage.exportData(); await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(d, null, 2), 'utf-8')); vscode.window.showInformationMessage(`Exported ${d.items.length} items.`); }
					break;
				}
				case 'importData': {
					const uris = await vscode.window.showOpenDialog({ canSelectMany: false, filters: { 'JSON': ['json'] } });
					if (uris?.length) { try { const c = await vscode.workspace.fs.readFile(uris[0]); const d = JSON.parse(Buffer.from(c).toString('utf-8')); const ch = await vscode.window.showQuickPick(['Merge', 'Replace all'], { placeHolder: 'Import mode?' }); if (ch) { const r = this._storage.importData(d, ch === 'Merge'); this._sendAll(); vscode.window.showInformationMessage(`Imported ${r.imported}.`); } } catch (e) { vscode.window.showErrorMessage(`Import failed: ${e}`); } }
					break;
				}
				case 'searchItems': {
					const r = this._storage.searchItems(msg.data.query);
					this._view?.webview.postMessage({ command: 'searchResults', data: r, mostUsed: this._storage.getMostUsed(5), recent: this._storage.getRecent(5) });
					break;
				}
			}
		});
	}

	private _sendAll(): void {
		this._view?.webview.postMessage({ command: 'itemsUpdated', data: this._storage.getAllItems(), mostUsed: this._storage.getMostUsed(5), recent: this._storage.getRecent(5) });
	}

	private _getHtml(): string {
		const ico = JSON.stringify(ICO);
		const catIco = JSON.stringify(CAT_ICO);
		const cats = CATEGORY_CONFIGS.map(c => ({ label: c.label, category: c.category }));
		const ls = LANGUAGE_SHORT;

		return /*html*/`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;background:var(--vscode-sideBar-background);color:var(--vscode-editor-foreground);font-family:var(--vscode-font-family,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif);font-size:var(--vscode-font-size,13px);line-height:1.45;overflow:hidden}
.root{display:flex;flex-direction:column;height:100%}

/* ── Header ─────────────────── */
.hdr{padding:8px 10px 6px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;border-bottom:1px solid var(--vscode-panelBorder,rgba(128,128,128,.2))}
.hdr-l{display:flex;align-items:center;gap:7px}
.hdr-logo{font-size:.85em;font-weight:800;letter-spacing:-.5px;color:var(--vscode-button-background)}
.hdr-t{font-size:1em;font-weight:700;letter-spacing:-.2px}
.hdr-a{display:flex;gap:1px}
.ib{background:0 0;border:none;color:var(--vscode-editor-foreground);cursor:pointer;padding:4px 6px;border-radius:4px;display:flex;align-items:center;justify-content:center;opacity:.5;transition:all .15s}
.ib:hover{opacity:1;background:var(--vscode-list-hoverBackground)}
.ib.on{opacity:1;background:var(--vscode-list-activeSelectionBackground)}

/* ── Search ─────────────────── */
.sb{padding:4px 10px;display:none}
.sb.on{display:block}
.si{width:100%;padding:4px 8px;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-inputBorder,rgba(128,128,128,.35));border-radius:4px;font-family:inherit;font-size:.88em;outline:0;transition:border-color .15s}
.si:focus{border-color:var(--vscode-focusBorder)}
.scroll{flex:1;overflow-y:auto;min-height:0;padding:4px 0}

/* ── Section ────────────────── */
.sec{margin-bottom:2px}
.sec-h{display:flex;align-items:center;padding:4px 10px;gap:5px;cursor:pointer;user-select:none;transition:background .1s;color:var(--vscode-descriptionForeground)}
.sec-h:hover{background:var(--vscode-list-hoverBackground)}
.sec-chev{display:flex;transition:transform .2s}
.sec.open .sec-chev{transform:rotate(90deg)}
.sec-title{font-weight:600;font-size:.72em;text-transform:uppercase;letter-spacing:.5px;flex:1}
.sec-badge{font-size:.65em;background:var(--vscode-badge-background,var(--vscode-panelBorder,rgba(128,128,128,.15)));color:var(--vscode-badge-foreground,var(--vscode-descriptionForeground));padding:1px 6px;border-radius:8px;font-weight:600}
.sec-body{display:none;padding:2px 8px 4px}
.sec.open .sec-body{display:block}

/* ── Card ───────────────────── */
.card{background:var(--vscode-list-hoverBackground);border:1px solid var(--vscode-panelBorder,rgba(128,128,128,.15));border-radius:6px;padding:8px 10px;margin-bottom:4px;transition:all .15s}
.card:hover{border-color:var(--vscode-buttonBackground,rgba(128,128,128,.4))}
.card-name{font-weight:600;font-size:.9em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px;display:flex;align-items:center;gap:4px}
.card-content{font-family:var(--vscode-editor-font-family,'Consolas',monospace);font-size:.75em;color:var(--vscode-descriptionForeground);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:6px;line-height:1.4}
.card-actions{display:flex;gap:4px;align-items:center;flex-wrap:wrap}
.ca{background:0 0;border:1px solid var(--vscode-panelBorder,rgba(128,128,128,.25));color:var(--vscode-editor-foreground);cursor:pointer;padding:3px 8px;border-radius:3px;font-size:.72em;font-family:inherit;display:inline-flex;align-items:center;gap:3px;transition:all .12s;opacity:.7}
.ca:hover{opacity:1;background:var(--vscode-list-hoverBackground);border-color:var(--vscode-buttonBackground,rgba(128,128,128,.4))}
.ca.x:hover{color:var(--vscode-errorForeground,#f14c4c);border-color:var(--vscode-errorForeground,#f14c4c)}
.ca svg{flex-shrink:0}
.card-meta{font-size:.65em;color:var(--vscode-descriptionForeground);margin-left:auto;opacity:.7;white-space:nowrap}
.lang-badge{display:inline-flex;align-items:center;padding:1px 6px;background:var(--vscode-badge-background,rgba(128,128,128,.15));color:var(--vscode-badge-foreground,var(--vscode-descriptionForeground));border-radius:3px;font-size:.7em;font-weight:600;font-family:var(--vscode-editor-font-family,'Consolas',monospace);letter-spacing:.3px}

/* ── Chips ──────────────────── */
.chips{display:flex;flex-wrap:wrap;gap:3px;padding:2px 0}
.chip{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:var(--vscode-list-hoverBackground);border:1px solid var(--vscode-panelBorder,rgba(128,128,128,.15));border-radius:12px;font-size:.78em;cursor:pointer;transition:all .15s;white-space:nowrap}
.chip:hover{border-color:var(--vscode-buttonBackground,rgba(128,128,128,.4))}
.chip-name{font-weight:500}
.chip-count{font-size:.7em;color:var(--vscode-descriptionForeground);opacity:.6}

/* ── Empty ──────────────────── */
.empty{display:flex;flex-direction:column;align-items:center;padding:32px 16px;color:var(--vscode-descriptionForeground);text-align:center;gap:8px}
.empty-t{font-size:.9em;line-height:1.5}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:5px;padding:5px 14px;border:none;border-radius:4px;font-size:.85em;font-weight:500;cursor:pointer;font-family:inherit;transition:background .15s}
.btn:focus{outline:1px solid var(--vscode-focusBorder)}
.bp{background:var(--vscode-button-background);color:var(--vscode-button-foreground)}.bp:hover{background:var(--vscode-button-hoverBackground)}
.bs{background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground)}.bs:hover{background:var(--vscode-button-secondaryHoverBackground)}

/* ── Footer ─────────────────── */
.ftr{padding:4px 8px;border-top:1px solid var(--vscode-panelBorder,rgba(128,128,128,.2));display:flex;gap:4px;flex-shrink:0}
.ftr .btn{flex:1;font-size:.72em;padding:4px 6px;gap:4px}

::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-track{background:0 0}
::-webkit-scrollbar-thumb{background:var(--vscode-panelBorder,rgba(128,128,128,.25));border-radius:2px}
</style>
</head>
<body>
<div class="root">
	<div class="hdr">
		<div class="hdr-l"><span class="hdr-logo">CV</span><span class="hdr-t">CodeVault</span></div>
		<div class="hdr-a">
			<button class="ib" id="btn-search" title="Search">${ICO.search}</button>
			<button class="ib" id="btn-add" title="Add Item">${ICO.add}</button>
		</div>
	</div>
	<div class="sb" id="sb"><input class="si" type="text" id="si" placeholder="Search items..."/></div>
	<div class="scroll" id="list"></div>
	<div class="ftr" id="ftr" style="display:none">
		<button class="btn bs" id="btn-imp">${ICO.importIco} Import</button>
		<button class="btn bs" id="btn-exp">${ICO.exportIco} Export</button>
	</div>
</div>
<script>
const vscode = acquireVsCodeApi();
let allItems = [], mostUsed = [], recent = [];
const ICO = ${ico};
const catIco = ${catIco};
const cats = ${JSON.stringify(cats)};
const ls = ${JSON.stringify(ls)};
const showLang = ${vscode.workspace.getConfiguration('codevault').get<boolean>('showLanguageBadge', true)};

function timeAgo(ts) {
	if (!ts) return '';
	const d = Date.now() - ts, m = Math.floor(d/60000), h = Math.floor(d/3600000), dy = Math.floor(d/86400000);
	if (m < 1) return 'just now'; if (m < 60) return m + 'm ago'; if (h < 24) return h + 'h ago'; return dy + 'd ago';
}
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function makeCard(i) {
	const prev = esc(i.content.substring(0, 80));
	let langHtml = '';
	if (showLang && i.language && (i.category === 'snippet' || i.category === 'function')) {
		const short = ls[i.language] || i.language;
		langHtml = '<span class="lang-badge">' + esc(short) + '</span>';
	}
	let acts = '<button class="ca" onclick="event.stopPropagation();doCopy(\\''+i.id+'\\')">' + ICO.copy + 'Copy</button>';
	if (i.category === 'command') acts += '<button class="ca" onclick="event.stopPropagation();doExec(\\''+i.id+'\\')">' + ICO.play + 'Run</button>';
	acts += '<button class="ca" onclick="event.stopPropagation();doEdit(\\''+i.id+'\\')">' + ICO.edit + 'Edit</button>';
	acts += '<button class="ca x" onclick="event.stopPropagation();doDel(\\''+i.id+'\\')">' + ICO.trash + '</button>';
	acts += '<span class="card-meta">' + timeAgo(i.lastUsedAt||i.updatedAt) + ' &middot; ' + (i.useCount||0) + 'x</span>';
	return '<div class="card"><div class="card-name">' + (catIco[i.category]||'') + ' ' + esc(i.name) + ' ' + langHtml + '</div><div class="card-content">' + prev + '</div><div class="card-actions">' + acts + '</div></div>';
}

function render(items, mu, rc) {
	allItems = items || []; mostUsed = mu || []; recent = rc || [];
	const el = document.getElementById('list');
	const ftr = document.getElementById('ftr');
	if (!allItems.length) {
		ftr.style.display = 'none';
		el.innerHTML = '<div class="empty"><div class="empty-t">Your vault is empty.<br>Add your first item.</div><button class="btn bp" onclick="doAdd()">Add Item</button></div>';
		return;
	}
	ftr.style.display = 'flex';
	let h = '';

	if (mostUsed.length) {
		h += '<div class="sec open"><div class="sec-h" onclick="togSec(this)"><span class="sec-chev">' + ICO.chev + '</span><span style="display:flex">' + ICO.star + '</span><span class="sec-title">Top Used</span><span class="sec-badge">' + mostUsed.length + '</span></div><div class="sec-body"><div class="chips">';
		mostUsed.forEach(i => { h += '<div class="chip" onclick="doCopy(\\''+i.id+'\\')"><span style="display:flex">' + (catIco[i.category]||'') + '</span><span class="chip-name">' + esc(i.name) + '</span><span class="chip-count">' + (i.useCount||0) + '</span></div>'; });
		h += '</div></div></div>';
	}

	if (recent.length) {
		h += '<div class="sec open"><div class="sec-h" onclick="togSec(this)"><span class="sec-chev">' + ICO.chev + '</span><span style="display:flex">' + ICO.clock + '</span><span class="sec-title">Recent</span><span class="sec-badge">' + recent.length + '</span></div><div class="sec-body">';
		recent.forEach(i => { h += makeCard(i); });
		h += '</div></div>';
	}

	for (const cat of cats) {
		const ci = allItems.filter(i => i.category === cat.category).sort((a,b) => a.name.localeCompare(b.name));
		h += '<div class="sec' + (ci.length ? ' open' : '') + '"><div class="sec-h" onclick="togSec(this)"><span class="sec-chev">' + ICO.chev + '</span><span style="display:flex">' + (catIco[cat.category]||'') + '</span><span class="sec-title">' + cat.label + '</span><span class="sec-badge">' + ci.length + '</span></div><div class="sec-body">';
		ci.forEach(i => { h += makeCard(i); });
		h += '</div></div>';
	}
	el.innerHTML = h;
}

function togSec(el) { el.parentElement.classList.toggle('open'); }
function doAdd() { vscode.postMessage({command:'addItem'}); }
function doCopy(id) { vscode.postMessage({command:'copyItem',data:{id}}); }
function doExec(id) { vscode.postMessage({command:'executeItem',data:{id}}); }
function doEdit(id) { vscode.postMessage({command:'editItem',data:{id}}); }
function doDel(id) { const i = allItems.find(x=>x.id===id); if(i && confirm('Delete "'+i.name+'"?')) vscode.postMessage({command:'deleteItem',data:{id}}); }

let st;
function togSearch() {
	const b = document.getElementById('sb'), btn = document.getElementById('btn-search');
	b.classList.toggle('on'); btn.classList.toggle('on');
	if (b.classList.contains('on')) document.getElementById('si').focus();
	else { document.getElementById('si').value = ''; vscode.postMessage({command:'getItems'}); }
}
document.getElementById('si').addEventListener('input', e => { clearTimeout(st); st = setTimeout(() => vscode.postMessage({command:'searchItems',data:{query:e.target.value}}), 200); });
document.getElementById('btn-add').onclick = doAdd;
document.getElementById('btn-search').onclick = togSearch;
document.getElementById('btn-exp').onclick = () => vscode.postMessage({command:'exportData'});
document.getElementById('btn-imp').onclick = () => vscode.postMessage({command:'importData'});
window.addEventListener('message', e => {
	const m = e.data;
	if(m.command==='itemsUpdated') render(m.data, m.mostUsed, m.recent);
	if(m.command==='searchResults') render(m.data, m.mostUsed, m.recent);
	if(m.command==='openSearch') { const b=document.getElementById('sb'),btn=document.getElementById('btn-search'); if(!b.classList.contains('on')){b.classList.add('on');btn.classList.add('on');} document.getElementById('si').focus(); }
});
vscode.postMessage({command:'getItems'});
</script>
</body>
</html>`;
	}
}