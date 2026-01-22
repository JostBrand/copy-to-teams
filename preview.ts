import { App, Modal, Setting } from 'obsidian';
import { TransformResult } from './types';
import { copyToClipboard } from './clipboard';

export class PreviewModal extends Modal {
	result: TransformResult;

	constructor(app: App, result: TransformResult) {
		super(app);
		this.result = result;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.addClass('copy-to-teams-preview');

		contentEl.createEl('h2', { text: 'Preview Teams Format' });

		// Tab navigation
		const tabHeader = contentEl.createDiv('nav-buttons');
		const htmlTab = tabHeader.createEl('button', { text: 'HTML (Rich Text)' });
		const textTab = tabHeader.createEl('button', { text: 'Plain Text' });
		
		htmlTab.addClass('mod-cta');
		
		const previewContainer = contentEl.createDiv('preview-container');
		previewContainer.style.border = '1px solid var(--background-modifier-border)';
		previewContainer.style.padding = '10px';
		previewContainer.style.borderRadius = '4px';
		previewContainer.style.backgroundColor = 'var(--background-primary)';
		previewContainer.style.overflow = 'auto';
		previewContainer.style.maxHeight = '500px';
		previewContainer.style.marginTop = '10px';
		previewContainer.style.marginBottom = '20px';

		// Initial view (HTML)
		const htmlPreview = previewContainer.createDiv('html-preview');
		htmlPreview.innerHTML = this.result.html;
		
		const textPreview = previewContainer.createDiv('text-preview');
		textPreview.style.whiteSpace = 'pre-wrap';
		textPreview.style.fontFamily = 'monospace';
		textPreview.setText(this.result.plainText);
		textPreview.hide();

		// Tab switching logic
		htmlTab.onclick = () => {
			htmlTab.addClass('mod-cta');
			textTab.removeClass('mod-cta');
			htmlPreview.show();
			textPreview.hide();
		};

		textTab.onclick = () => {
			textTab.addClass('mod-cta');
			htmlTab.removeClass('mod-cta');
			textPreview.show();
			htmlPreview.hide();
		};

		// Actions
		const actionsContainer = contentEl.createDiv('modal-button-container');
		
		new Setting(actionsContainer)
			.addButton(btn => btn
				.setButtonText('Cancel')
				.onClick(() => {
					this.close();
				}))
			.addButton(btn => btn
				.setButtonText('Copy to Clipboard')
				.setCta()
				.onClick(async () => {
					await copyToClipboard(this.result);
					this.close();
				}));
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
