/**
 * Settings tab for the Copy to Teams plugin
 */

import { App, PluginSettingTab, Setting } from 'obsidian';
import type CopyToTeamsPlugin from './main';

export class CopyToTeamsSettingTab extends PluginSettingTab {
	plugin: CopyToTeamsPlugin;

	constructor(app: App, plugin: CopyToTeamsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Header
		containerEl.createEl('h2', { text: 'Copy to Teams Settings' });

		// Checkbox formatting section
		containerEl.createEl('h3', { text: 'Checkbox Formatting' });

		new Setting(containerEl)
			.setName('Checked checkbox')
			.setDesc('Symbol for checked checkboxes')
			.addDropdown(dropdown => dropdown
				.addOption('✅', '✅ (Check Mark)')
				.addOption('☑️', '☑️ (Ballot Box)')
				.addOption('[x]', '[x] (Text)')
				.setValue(this.plugin.settings.checkboxChecked)
				.onChange(async (value) => {
					this.plugin.settings.checkboxChecked = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Unchecked checkbox')
			.setDesc('Symbol for unchecked checkboxes')
			.addDropdown(dropdown => dropdown
				.addOption('⬜', '⬜ (White Square)')
				.addOption('☐', '☐ (Ballot Box)')
				.addOption('[ ]', '[ ] (Text)')
				.setValue(this.plugin.settings.checkboxUnchecked)
				.onChange(async (value) => {
					this.plugin.settings.checkboxUnchecked = value;
					await this.plugin.saveSettings();
				}));

		// Content handling section
		containerEl.createEl('h3', { text: 'Content Handling' });

		new Setting(containerEl)
			.setName('Strip tags')
			.setDesc('Remove #tags from output')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.stripTags)
				.onChange(async (value) => {
					this.plugin.settings.stripTags = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Strip frontmatter')
			.setDesc('Remove YAML frontmatter from output')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.stripFrontmatter)
				.onChange(async (value) => {
					this.plugin.settings.stripFrontmatter = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Collapse empty lines')
			.setDesc('Reduce multiple consecutive empty lines to one')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.collapseEmptyLines)
				.onChange(async (value) => {
					this.plugin.settings.collapseEmptyLines = value;
					await this.plugin.saveSettings();
				}));

		// Heading style section
		containerEl.createEl('h3', { text: 'Heading Style' });

		new Setting(containerEl)
			.setName('Heading style')
			.setDesc('How to format headings in the output')
			.addDropdown(dropdown => dropdown
				.addOption('numbered', 'Numbered (1, 1.1, 1.1.1)')
				.addOption('bold', 'Bold')
				.addOption('uppercase', 'Uppercase')
				.setValue(this.plugin.settings.headingStyle)
				.onChange(async (value: any) => {
					this.plugin.settings.headingStyle = value;
					await this.plugin.saveSettings();
				}));

		// Link handling section
		containerEl.createEl('h3', { text: 'Link Formatting' });

		new Setting(containerEl)
			.setName('Show wikilink URLs')
			.setDesc('Show resolved URLs for [[wikilinks]] in parentheses')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showWikilinkUrls)
				.onChange(async (value) => {
					this.plugin.settings.showWikilinkUrls = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('External link format')
			.setDesc('How to format external links')
			.addDropdown(dropdown => dropdown
				.addOption('text-only', 'Text only')
				.addOption('text-url', 'Text (URL)')
				.addOption('hyperlink', 'Hyperlink')
				.setValue(this.plugin.settings.externalLinkFormat)
				.onChange(async (value: any) => {
					this.plugin.settings.externalLinkFormat = value;
					await this.plugin.saveSettings();
				}));

		// Table style section
		containerEl.createEl('h3', { text: 'Table Style' });

		new Setting(containerEl)
			.setName('Table style')
			.setDesc('How to format tables')
			.addDropdown(dropdown => dropdown
				.addOption('simple-grid', 'Simple grid (|---|)')
				.addOption('unicode-box', 'Unicode box (┌─┐)')
				.setValue(this.plugin.settings.tableStyle)
				.onChange(async (value: any) => {
					this.plugin.settings.tableStyle = value;
					await this.plugin.saveSettings();
				}));

		// UI section
		containerEl.createEl('h3', { text: 'User Interface' });

		new Setting(containerEl)
			.setName('Show notification')
			.setDesc('Show a notification when content is copied')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showNotification)
				.onChange(async (value) => {
					this.plugin.settings.showNotification = value;
					await this.plugin.saveSettings();
				}));
	}
}
