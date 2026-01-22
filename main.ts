/**
 * Copy to Teams - Obsidian Plugin
 * Transform and copy Markdown content to Microsoft Teams format
 */

import { Editor, MarkdownView, Notice, Plugin, TFile } from 'obsidian';
import { CopyToTeamsSettingTab } from './settings';
import { parseMarkdown, stripFrontmatter } from './parser';
import { transformToTeams, createHeadingState } from './transformer';
import { copyToClipboard } from './clipboard';
import { CopyToTeamsSettings, DEFAULT_SETTINGS } from './types';
import { PreviewModal } from './preview';

export default class CopyToTeamsPlugin extends Plugin {
	settings: CopyToTeamsSettings;

	async onload() {
		await this.loadSettings();

		// Add command to command palette
		this.addCommand({
			id: 'copy-to-teams',
			name: 'Copy to Teams',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.copyToTeams(editor, view);
			},
		});
		
		// Add preview command
		this.addCommand({
			id: 'preview-copy-to-teams',
			name: 'Preview Copy to Teams',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.previewCopyToTeams(editor, view);
			},
		});

		// Add context menu item
		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu, editor, view) => {
				if (!(view instanceof MarkdownView)) return;
				
				const selection = editor.getSelection();
				const hasSelection = selection && selection.trim().length > 0;

				menu.addItem((item) => {
					item
						.setTitle(hasSelection ? 'Copy selection to Teams' : 'Copy to Teams')
						.setIcon('clipboard-copy')
						.onClick(() => {
							this.copyToTeams(editor, view);
						});
				});
				
				menu.addItem((item) => {
					item
						.setTitle('Preview Teams format')
						.setIcon('eye')
						.onClick(() => {
							this.previewCopyToTeams(editor, view);
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
	 * Prepare content for transformation
	 */
	async prepareContent(editor: Editor, view: MarkdownView) {
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
			markdown = markdown.replace(/(^|\s)#[a-zA-Z0-9\-_/]+/g, '$1');
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

		// Apply templates
		const variables = await this.getTemplateVariables(view.file);
		result.html = this.applyTemplates(result.html, variables, 'html');
		result.plainText = this.applyTemplates(result.plainText, variables, 'plain');

		return result;
	}

	/**
	 * Get template variables
	 */
	async getTemplateVariables(file: TFile | null) {
		const variables: Record<string, string> = {
			date: new Date().toLocaleDateString(),
			title: file ? file.basename : 'Untitled',
			url: ''
		};

		if (file) {
			variables.url = `obsidian://open?vault=${encodeURIComponent(
				this.app.vault.getName()
			)}&file=${encodeURIComponent(file.path)}`;
		}

		return variables;
	}

	/**
	 * Apply templates to content
	 */
	applyTemplates(content: string, variables: Record<string, string>, format: 'html' | 'plain'): string {
		let header = this.settings.headerTemplate;
		let footer = this.settings.footerTemplate;

		// Replace variables
		for (const [key, value] of Object.entries(variables)) {
			const regex = new RegExp(`{{${key}}}`, 'g');
			header = header.replace(regex, value);
			footer = footer.replace(regex, value);
		}

		if (format === 'html') {
			if (header) content = `<p>${header}</p>\n${content}`;
			if (footer) content = `${content}\n<p>${footer}</p>`;
		} else {
			if (header) content = `${header}\n\n${content}`;
			if (footer) content = `${content}\n\n${footer}`;
		}

		return content;
	}

	/**
	 * Main function to copy content to Teams format
	 */
	async copyToTeams(editor: Editor, view: MarkdownView) {
		try {
			const result = await this.prepareContent(editor, view);

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
	 * Preview transformed content
	 */
	async previewCopyToTeams(editor: Editor, view: MarkdownView) {
		try {
			const result = await this.prepareContent(editor, view);
			new PreviewModal(this.app, result).open();
		} catch (error) {
			console.error('Preview error:', error);
			new Notice('Failed to preview: ' + (error as Error).message);
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
