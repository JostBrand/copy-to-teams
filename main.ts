/**
 * Copy to Teams - Obsidian Plugin
 * Transform and copy Markdown content to Microsoft Teams format
 */

import { Editor, MarkdownView, Notice, Plugin } from 'obsidian';
import { CopyToTeamsSettingTab } from './settings';
import { parseMarkdown, stripFrontmatter } from './parser';
import { transformToTeams, createHeadingState } from './transformer';
import { copyToClipboard } from './clipboard';
import { CopyToTeamsSettings, DEFAULT_SETTINGS } from './types';

export default class CopyToTeamsPlugin extends Plugin {
	settings: CopyToTeamsSettings;

	async onload() {
		await this.loadSettings();

		// Add command to command palette
		this.addCommand({
			id: 'copy-to-teams',
			name: 'Copy to Teams',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.copyToTeams(editor);
			},
		});

		// Add context menu item
		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu, editor) => {
				menu.addItem((item) => {
					item
						.setTitle('Copy to Teams')
						.setIcon('clipboard-copy')
						.onClick(() => {
							this.copyToTeams(editor);
						});
				});
			})
		);

		// Add settings tab
		this.addSettingTab(new CopyToTeamsSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Main function to copy content to Teams format
	 */
	async copyToTeams(editor: Editor) {
		try {
			// Get selection or entire document
			let markdown = editor.getSelection();
			if (!markdown || markdown.trim().length === 0) {
				markdown = editor.getValue();
			}

			// Strip frontmatter if configured
			if (this.settings.stripFrontmatter) {
				markdown = stripFrontmatter(markdown);
			}

			// Strip tags if configured
			if (this.settings.stripTags) {
				markdown = markdown.replace(/#[\w-]+/g, '');
			}

			// Handle wikilinks
			markdown = this.processWikilinks(markdown);

			// Parse Markdown to AST
			const ast = parseMarkdown(markdown);

			// Transform to Teams format
			const context = {
				settings: this.settings,
				headingState: createHeadingState(),
			};
			const result = transformToTeams(ast, context);

			// Copy to clipboard
			await copyToClipboard(result);

			// Show notification
			if (this.settings.showNotification) {
				new Notice('✓ Copied to clipboard (Teams format)');
			}
		} catch (error) {
			console.error('Copy to Teams error:', error);
			new Notice('Failed to copy to Teams: ' + (error as Error).message);
		}
	}

	/**
	 * Process wikilinks according to settings
	 */
	private processWikilinks(markdown: string): string {
		// Match [[Page]] or [[Page|Display]]
		const wikilinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

		return markdown.replace(wikilinkRegex, (match, page, display) => {
			const text = display || page;

			if (this.settings.showWikilinkUrls) {
				// Try to resolve the file
				const file = this.app.metadataCache.getFirstLinkpathDest(page, '');
				if (file) {
					return `${text} (obsidian://open?vault=${encodeURIComponent(
						this.app.vault.getName()
					)}&file=${encodeURIComponent(file.path)})`;
				}
			}

			return text;
		});
	}
}
