import * as vscode from 'vscode';

/** Maximum allowed command length to prevent abuse */
const MAX_COMMAND_LENGTH = 10000;

/** Patterns that are commonly associated with destructive or dangerous commands */
const DANGEROUS_PATTERNS: ReadonlyArray<RegExp> = [
	/\brm\s+(-rf?|-fr?)\s+\//i,           // rm -rf /
	/\bformat\s+[a-zA-Z]:/i,               // format drive
	/\bdd\s+if=.*of=\/dev\//i,             // dd to device
	/\b:()\s*:\s*\(\)\s*\{/i,              // fork bomb
	/\bcurl\s+.*\|\s*(ba)?sh/i,            // pipe curl to shell
	/\bwget\s+.*\|\s*(ba)?sh/i,            // pipe wget to shell
];

export class CommandExecutor {
	/**
	 * Validates a command before execution.
	 * @throws {Error} if the command is empty, too long, or matches dangerous patterns
	 */
	private validateCommand(command: string): void {
		const trimmed = command.trim();

		if (!trimmed) {
			throw new Error('Cannot execute an empty command.');
		}

		if (trimmed.length > MAX_COMMAND_LENGTH) {
			throw new Error(`Command exceeds maximum length of ${MAX_COMMAND_LENGTH} characters.`);
		}

		for (const pattern of DANGEROUS_PATTERNS) {
			if (pattern.test(trimmed)) {
				throw new Error('Command matches a potentially dangerous pattern and was blocked for safety.');
			}
		}
	}

	executeCommand(command: string, terminalName?: string): vscode.Terminal {
		this.validateCommand(command);

		const config = vscode.workspace.getConfiguration('codevault');
		const defaultTerminal = config.get<string>('defaultTerminal', '') || terminalName;

		const terminal = vscode.window.createTerminal({
			name: defaultTerminal || 'CodeVault',
		});

		terminal.show();
		terminal.sendText(command);
		return terminal;
	}

}
