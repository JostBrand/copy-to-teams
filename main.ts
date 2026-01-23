/**
 * Copy to Teams - Obsidian Plugin
 * Transform and copy Markdown content to Microsoft Teams format
 */

import { Editor, MarkdownView, Notice, Plugin, TFile } from 'obsidian';
import { CopyToTeamsSettingTab } from './settings';
import { parseMarkdown, stripFrontmatter, extractFrontmatter } from './parser';
import { transformToTeams, createHeadingState } from './transformer';
import { copyToClipboard } from './clipboard';
import { CopyToTeamsSettings, DEFAULT_SETTINGS, ImageData } from './types';
import { PreviewModal } from './preview';

// Supported image extensions and their MIME types
const IMAGE_MIME_TYPES: Record<string, string> = {
	'png': 'image/png',
	'jpg': 'image/jpeg',
	'jpeg': 'image/jpeg',
	'gif': 'image/gif',
	'webp': 'image/webp',
	'bmp': 'image/bmp',
	'svg': 'image/svg+xml',
};

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

		// Extract frontmatter before stripping (for metadata header)
		const frontmatter = extractFrontmatter(markdown);
		const metadataHeader = this.generateMetadataHeader(frontmatter);

		// Strip frontmatter if configured
		if (this.settings.stripFrontmatter) {
			markdown = stripFrontmatter(markdown);
		}

		// Strip tags if configured
		if (this.settings.stripTags) {
			markdown = markdown.replace(/(^|\s)#[a-zA-Z0-9\-_/]+/g, '$1');
		}

		// Process @mentions
		markdown = this.processMentions(markdown);

		// Format dates
		markdown = this.formatDates(markdown);

		// Handle wikilinks
		markdown = this.processWikilinks(markdown);

		// Process image embeds and collect image data
		const { markdown: processedMarkdown, images } = await this.processImageEmbeds(markdown);
		markdown = processedMarkdown;

		// Parse Markdown to AST
		const ast = parseMarkdown(markdown);

		// Transform to Teams format
		const context = {
			settings: this.settings,
			headingState: createHeadingState(),
			images,
		};

		const result = transformToTeams(ast, context);

		// Prepend metadata header if present
		if (metadataHeader.html) {
			result.html = metadataHeader.html + result.html;
			result.plainText = metadataHeader.plain + result.plainText;
		}

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

	/**
	 * Process image embeds and collect image data
	 * Returns the markdown with image placeholders and a map of image data
	 */
	private async processImageEmbeds(markdown: string): Promise<{ markdown: string; images: Map<string, ImageData> }> {
		const images = new Map<string, ImageData>();

		// Match ![[image.png]] or ![[image.png|alt text]] or ![[image.png|100]] or ![[image.png|100x200]]
		const imageEmbedRegex = /!\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]/g;

		// Collect all matches first (async replacement needs this)
		const matches: { full: string; path: string; altOrSize: string | undefined }[] = [];
		let match;
		while ((match = imageEmbedRegex.exec(markdown)) !== null) {
			matches.push({
				full: match[0],
				path: match[1],
				altOrSize: match[2],
			});
		}

		// Process each image
		for (const m of matches) {
			const imagePath = m.path;
			const altOrSize = m.altOrSize || '';

			// Determine alt text (ignore size specifications like "100" or "100x200")
			const altText = /^\d+(x\d+)?$/.test(altOrSize) ? imagePath : (altOrSize || imagePath);

			// Get file extension
			const ext = imagePath.split('.').pop()?.toLowerCase() || '';
			const mimeType = IMAGE_MIME_TYPES[ext];

			if (!mimeType) {
				// Not a supported image, leave as text placeholder
				markdown = markdown.replace(m.full, `[Image: ${altText}]`);
				continue;
			}

			// Try to resolve and read the image file
			const file = this.app.metadataCache.getFirstLinkpathDest(imagePath, '');
			if (file && file instanceof TFile) {
				try {
					const arrayBuffer = await this.app.vault.readBinary(file);
					const base64 = this.arrayBufferToBase64(arrayBuffer);

					// Create a unique placeholder for this image
					const placeholder = `__IMG_${images.size}__`;
					images.set(placeholder, {
						base64,
						mimeType,
						altText,
					});

					// Replace the embed with a standard markdown image using placeholder
					markdown = markdown.replace(m.full, `![${altText}](${placeholder})`);
				} catch (error) {
					console.error(`Failed to read image ${imagePath}:`, error);
					markdown = markdown.replace(m.full, `[Image: ${altText}]`);
				}
			} else {
				// File not found, leave as text placeholder
				markdown = markdown.replace(m.full, `[Image: ${altText}]`);
			}
		}

		return { markdown, images };
	}

	/**
	 * Convert ArrayBuffer to base64 string
	 */
	private arrayBufferToBase64(buffer: ArrayBuffer): string {
		const bytes = new Uint8Array(buffer);
		let binary = '';
		for (let i = 0; i < bytes.byteLength; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		return btoa(binary);
	}

	/**
	 * Process @mentions to make them stand out in Teams
	 * Converts @person and [[People/Person Name]] to bold @mentions
	 */
	private processMentions(markdown: string): string {
		// Convert [[People/Person Name]] or [[people/Person Name]] to @Person Name
		markdown = markdown.replace(
			/\[\[(?:[Pp]eople|[Pp]ersons?|[Cc]ontacts?)\/([^\]|]+)(?:\|([^\]]+))?\]\]/g,
			(match, path, display) => {
				const name = display || path.split('/').pop() || path;
				return `**@${name}**`;
			}
		);

		// Convert standalone @mentions (not in code blocks or links)
		// Match @Name or @FirstName LastName (up to 3 words)
		markdown = markdown.replace(
			/(?<![`\w])@([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})(?![`\w])/g,
			'**@$1**'
		);

		return markdown;
	}

	/**
	 * Format dates in the content to be more readable
	 * Handles: due:: 2024-02-15, 📅 2024-02-15, date: 2024-02-15, and ISO dates
	 */
	private formatDates(markdown: string): string {
		// Format inline dates with property syntax (due:: 2024-02-15)
		markdown = markdown.replace(
			/(\w+)::\s*(\d{4}-\d{2}-\d{2})/g,
			(match, property, dateStr) => {
				const formatted = this.formatDate(dateStr);
				const emoji = this.getDateEmoji(property.toLowerCase());
				return `${emoji} **${this.capitalizeFirst(property)}:** ${formatted}`;
			}
		);

		// Format dates with emoji prefix (📅 2024-02-15)
		markdown = markdown.replace(
			/(📅|📆|🗓️|⏰|⏳)\s*(\d{4}-\d{2}-\d{2})/g,
			(match, emoji, dateStr) => {
				const formatted = this.formatDate(dateStr);
				return `${emoji} ${formatted}`;
			}
		);

		// Format standalone ISO dates in brackets or parentheses
		markdown = markdown.replace(
			/\[(\d{4}-\d{2}-\d{2})\]/g,
			(match, dateStr) => {
				const formatted = this.formatDate(dateStr);
				return `[${formatted}]`;
			}
		);

		return markdown;
	}

	/**
	 * Format a date string to a readable format
	 */
	private formatDate(dateStr: string): string {
		try {
			const date = new Date(dateStr + 'T00:00:00');
			if (isNaN(date.getTime())) {
				return dateStr;
			}

			const options: Intl.DateTimeFormatOptions = {
				weekday: 'short',
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			};

			return date.toLocaleDateString(undefined, options);
		} catch {
			return dateStr;
		}
	}

	/**
	 * Get an appropriate emoji for a date property
	 */
	private getDateEmoji(property: string): string {
		const emojiMap: Record<string, string> = {
			'due': '📅',
			'deadline': '⏰',
			'date': '📆',
			'start': '🚀',
			'end': '🏁',
			'created': '✨',
			'modified': '✏️',
			'scheduled': '🗓️',
			'completed': '✅',
		};
		return emojiMap[property] || '📅';
	}

	/**
	 * Capitalize first letter
	 */
	private capitalizeFirst(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	/**
	 * Generate a meeting metadata header from frontmatter
	 */
	private generateMetadataHeader(frontmatter: Record<string, string | string[]>): { html: string; plain: string } {
		if (Object.keys(frontmatter).length === 0) {
			return { html: '', plain: '' };
		}

		const parts: { emoji: string; label: string; value: string }[] = [];

		// Common meeting metadata fields with their emoji
		const fieldConfig: Record<string, { emoji: string; label: string }> = {
			'date': { emoji: '📅', label: 'Date' },
			'meeting_date': { emoji: '📅', label: 'Date' },
			'attendees': { emoji: '👥', label: 'Attendees' },
			'participants': { emoji: '👥', label: 'Participants' },
			'client': { emoji: '🏢', label: 'Client' },
			'project': { emoji: '📁', label: 'Project' },
			'location': { emoji: '📍', label: 'Location' },
			'duration': { emoji: '⏱️', label: 'Duration' },
			'type': { emoji: '📋', label: 'Type' },
			'status': { emoji: '🔖', label: 'Status' },
			'owner': { emoji: '👤', label: 'Owner' },
			'tags': { emoji: '🏷️', label: 'Tags' },
		};

		for (const [key, config] of Object.entries(fieldConfig)) {
			if (frontmatter[key]) {
				let value = frontmatter[key];
				if (Array.isArray(value)) {
					value = value.join(', ');
				}
				// Format dates if the field is a date field
				if ((key === 'date' || key === 'meeting_date') && /^\d{4}-\d{2}-\d{2}/.test(value)) {
					value = this.formatDate(value.substring(0, 10));
				}
				parts.push({ emoji: config.emoji, label: config.label, value });
			}
		}

		if (parts.length === 0) {
			return { html: '', plain: '' };
		}

		// Build the header
		const htmlParts = parts.map(p => `${p.emoji} <b>${p.label}:</b> ${this.escapeHtml(p.value)}`);
		const plainParts = parts.map(p => `${p.emoji} ${p.label}: ${p.value}`);

		const html = `<p style="background-color: #f0f0f0; padding: 10px; border-radius: 5px;">${htmlParts.join(' &nbsp;│&nbsp; ')}</p>\n<hr />\n`;
		const plain = `${plainParts.join(' │ ')}\n${'─'.repeat(50)}\n\n`;

		return { html, plain };
	}

	/**
	 * Escape HTML special characters
	 */
	private escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}
}
