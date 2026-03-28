import { ItemCategory } from '../models/types';
import { ThemeIcon } from 'vscode';

export const EXTENSION_ID = 'codevault';
export const STORAGE_KEY = 'codevault.items';
export const VIEW_ID = 'codevault-explorer';
export const EXPORT_VERSION = '1.0.0';

export interface CategoryConfig {
	label: string;
	category: ItemCategory;
	icon: ThemeIcon;
	description: string;
}

export const CATEGORY_CONFIGS: CategoryConfig[] = [
	{
		label: 'Commands',
		category: ItemCategory.Command,
		icon: new ThemeIcon('terminal'),
		description: 'Executable shell commands',
	},
	{
		label: 'Snippets',
		category: ItemCategory.Snippet,
		icon: new ThemeIcon('code'),
		description: 'Reusable code snippets',
	},
	{
		label: 'Functions',
		category: ItemCategory.Function,
		icon: new ThemeIcon('symbol-method'),
		description: 'Utility functions',
	},
	{
		label: 'Notes',
		category: ItemCategory.Note,
		icon: new ThemeIcon('note'),
		description: 'General notes and information',
	},
];

export function getCategoryConfig(category: ItemCategory): CategoryConfig {
	return CATEGORY_CONFIGS.find(c => c.category === category) ?? CATEGORY_CONFIGS[0];
}

export const LANGUAGES: string[] = [
	'Bash',
	'Bat',
	'C',
	'C#',
	'C++',
	'CSS',
	'Dart',
	'Dockerfile',
	'Elixir',
	'Go',
	'GraphQL',
	'HTML',
	'Java',
	'JavaScript',
	'JSON',
	'Kotlin',
	'Lua',
	'Markdown',
	'Objective-C',
	'PHP',
	'PowerShell',
	'Python',
	'R',
	'Ruby',
	'Rust',
	'SCSS',
	'Shell',
	'SQL',
	'Swift',
	'TypeScript',
	'XML',
	'YAML',
];

export const LANGUAGE_SHORT: Record<string, string> = {
	'Bash': 'SH',
	'Bat': 'BAT',
	'C': 'C',
	'C#': 'C#',
	'C++': 'C++',
	'CSS': 'CSS',
	'Dart': 'DART',
	'Dockerfile': 'DKR',
	'Elixir': 'EX',
	'Go': 'GO',
	'GraphQL': 'GQL',
	'HTML': 'HTML',
	'Java': 'JAVA',
	'JavaScript': 'JS',
	'JSON': 'JSON',
	'Kotlin': 'KT',
	'Lua': 'LUA',
	'Markdown': 'MD',
	'Objective-C': 'OBJ-C',
	'PHP': 'PHP',
	'PowerShell': 'PS',
	'Python': 'PY',
	'R': 'R',
	'Ruby': 'RB',
	'Rust': 'RS',
	'SCSS': 'SCSS',
	'Shell': 'SH',
	'SQL': 'SQL',
	'Swift': 'SW',
	'TypeScript': 'TS',
	'XML': 'XML',
	'YAML': 'YML',
};