# 🗄️ CodeVault

**Save, organize, copy and execute commands, code snippets, functions and notes — your personal developer vault.**

## Features

- **Commands** — Save shell commands and execute them directly from the sidebar
- **Snippets** — Store reusable code snippets in any language
- **Functions** — Keep utility functions at your fingertips
- **Notes** — Save important information and references

### Sidebar Tree View

Items are organized by category in a clean tree view, sorted alphabetically. Each category shows the count of items.

### Quick Actions

| Action | Description |
|--------|-------------|
| 📋 **Copy** | Copy any item's content to clipboard |
| ▶️ **Execute** | Run command items directly in the terminal |
| ✏️ **Edit** | Rich editor panel for creating/editing items |
| 🔍 **Search** | Fuzzy search across all items |
| 📤 **Export** | Export all data as versioned JSON |
| 📥 **Import** | Import from JSON (merge or replace) |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Alt+V A` | Add new item |
| `Ctrl+Alt+V S` | Search items |
| `Ctrl+Alt+V C` | Copy selected item |
| `Ctrl+Alt+V E` | Execute command |

## Usage

1. Click the **CodeVault** icon in the Activity Bar
2. Click **+** to add a new item
3. Fill in the details in the editor panel
4. Right-click items to copy, edit, delete, or execute
5. Use the toolbar buttons for search, export, and import

## Extension Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `codevault.defaultTerminal` | `""` | Terminal profile name for executing commands |
| `codevault.confirmBeforeDelete` | `true` | Show confirmation before deleting items |
| `codevault.showLanguageBadge` | `true` | Show language badge on snippets/functions |

## Data Storage

All data is stored in VS Code's global state, which means:
- ✅ Persists across sessions
- ✅ Synced with VS Code Settings Sync
- ✅ No external database needed
- ✅ Exportable as JSON for backup/sharing

## Development

```bash
# Install dependencies
npm install

# Compile
npm run compile

# Watch for changes
npm run watch

# Package as VSIX
npm run package
```

## License

MIT