import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type ArenaSyncPlugin from "./main";
import { BackupFileSuggestModal } from "./modals";
import type {
	AttachmentHandling,
	AttachmentStorage,
	BannerImagePriority,
	ChannelIndexNoteStyle,
	BlockNamingScheme,
	DownloadedAttachmentLinkStyle,
	ImageHandling,
} from "./types";

export class ArenaSyncSettingTab extends PluginSettingTab {
	plugin: ArenaSyncPlugin;

	constructor(app: App, plugin: ArenaSyncPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass("arena-sync-settings");

		containerEl.createEl("h1", { text: "Tetromino" });
		containerEl.createEl("p", {
			text: "Deterministic one-way import from Are.na into your Obsidian vault.",
			cls: "setting-item-description",
		});
		containerEl.createEl("p", {
			text: "Quick start: set API token -> import your channels -> run Import all channels now.",
			cls: "setting-item-description",
		});

		this.renderSectionHeader(
			containerEl,
			"Authentication",
			"Connect your Are.na account for read-only import access.",
		);
		new Setting(containerEl)
			.setName("API token")
			.setDesc(
				"Use a personal token from https://www.are.na/developers/personal-access-tokens.",
			)
			.addText((text) => {
				text.setPlaceholder("Enter your Are.na token")
					.setValue(this.plugin.settings.apiToken)
					.onChange(async (value) => {
						this.plugin.settings.apiToken = value.trim();
						await this.plugin.saveSettings();
					});
				text.inputEl.type = "password";
				return text;
			})
			.addButton((btn) =>
				btn.setButtonText("Verify").onClick(async () => {
					if (!this.plugin.settings.apiToken) {
						new Notice("Please enter an API token first");
						return;
					}
					const ok = await this.plugin.api.verifyToken();
					new Notice(ok ? "Token is valid" : "Invalid token");
				}),
			);

		this.renderSectionHeader(
			containerEl,
			"Content rendering",
			"Configure note format, metadata, and enrichment behavior.",
		);
		new Setting(containerEl)
			.setName("Block file naming")
			.setDesc("Choose the filename format for imported block notes.")
			.addDropdown((dd) =>
				dd
					.addOptions({
						title: "Block title",
						id: "Block ID",
						"title-id": "Title (ID)",
					} as Record<BlockNamingScheme, string>)
					.setValue(this.plugin.settings.blockNaming)
					.onChange(async (value) => {
						this.plugin.settings.blockNaming =
							value as BlockNamingScheme;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Banner frontmatter field")
			.setDesc("Add an optional banner URL frontmatter field for the Banners plugin.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.bannerFieldEnabled)
					.onChange(async (value) => {
						this.plugin.settings.bannerFieldEnabled = value;
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		if (this.plugin.settings.bannerFieldEnabled) {
			new Setting(containerEl)
				.setName("Banner field name")
				.setDesc("Set the frontmatter key that stores the banner URL.")
				.addText((text) =>
					text
						.setPlaceholder("banner")
						.setValue(this.plugin.settings.bannerFieldName)
						.onChange(async (value) => {
							this.plugin.settings.bannerFieldName =
								value.trim() || "banner";
							await this.plugin.saveSettings();
						}),
				);

			new Setting(containerEl)
				.setName("Banner image source priority")
				.setDesc("Choose whether thumbnail or display image is used first.")
				.addDropdown((dd) =>
					dd
						.addOptions({
							"thumb-first": "Thumb first",
							"display-first": "Display first",
						} as Record<BannerImagePriority, string>)
						.setValue(this.plugin.settings.bannerImagePriority)
						.onChange(async (value) => {
							this.plugin.settings.bannerImagePriority =
								value as BannerImagePriority;
							await this.plugin.saveSettings();
						}),
				);
		}

		new Setting(containerEl)
			.setName("Block description in frontmatter")
			.setDesc("Add `arena_description` when a block description is available.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.includeBlockDescriptionFrontmatter)
					.onChange(async (value) => {
						this.plugin.settings.includeBlockDescriptionFrontmatter = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Import block comments")
			.setDesc("Import block comments into a `Comments` section in each note.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.includeBlockComments)
					.onChange(async (value) => {
						this.plugin.settings.includeBlockComments = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Import connected channels")
			.setDesc(
				"Import channels where the block appears into a dedicated note section.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.includeBlockConnectedChannels)
					.onChange(async (value) => {
						this.plugin.settings.includeBlockConnectedChannels = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Channel block preview image")
			.setDesc(
				"For Channel blocks, use a best-effort linked channel preview image.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.includeChannelBlockPreviewImage)
					.onChange(async (value) => {
						this.plugin.settings.includeChannelBlockPreviewImage = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Channel index note naming")
			.setDesc("Choose the channel index filename style for Folder Note compatibility.")
			.addDropdown((dd) =>
				dd
					.addOptions({
						index: "index.md",
						"folder-name": "match folder name",
					} as Record<ChannelIndexNoteStyle, string>)
					.setValue(this.plugin.settings.channelIndexNoteStyle)
					.onChange(async (value) => {
						this.plugin.settings.channelIndexNoteStyle =
							value as ChannelIndexNoteStyle;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Image handling")
			.setDesc(
				"Choose how image blocks are rendered: `Download`, `Embed`, or `Link`.",
			)
			.addDropdown((dd) =>
				dd
					.addOptions({
						download: "Download to vault",
						embed: "Embed reference",
						link: "External link",
					} as Record<ImageHandling, string>)
					.setValue(this.plugin.settings.imageHandling)
					.onChange(async (value) => {
						this.plugin.settings.imageHandling =
							value as ImageHandling;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Attachment handling")
			.setDesc("Choose how PDFs and other non-image files are rendered.")
			.addDropdown((dd) =>
				dd
					.addOptions({
						download: "Download to vault",
						link: "External link",
					} as Record<AttachmentHandling, string>)
					.setValue(this.plugin.settings.attachmentHandling)
					.onChange(async (value) => {
						this.plugin.settings.attachmentHandling =
							value as AttachmentHandling;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Downloaded attachment render")
			.setDesc("Choose whether downloaded attachments are rendered as links or embeds.")
			.addDropdown((dd) =>
				dd
					.addOptions({
						link: "Link",
						embed: "Embed",
					} as Record<DownloadedAttachmentLinkStyle, string>)
					.setValue(
						this.plugin.settings.downloadedAttachmentLinkStyle,
					)
					.onChange(async (value) => {
						this.plugin.settings.downloadedAttachmentLinkStyle =
							value as DownloadedAttachmentLinkStyle;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Attachment storage location")
			.setDesc("Choose where downloaded files are stored in your vault.")
			.addDropdown((dd) =>
				dd
					.addOptions({
						channel: "With channel notes",
						global: "Global folder",
						custom: "Custom folder",
					} as Record<AttachmentStorage, string>)
					.setValue(this.plugin.settings.attachmentStorage)
					.onChange(async (value) => {
						this.plugin.settings.attachmentStorage =
							value as AttachmentStorage;
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		new Setting(containerEl)
			.setName("Global attachment folder")
			.setDesc("Use this path when attachment storage location is set to `Global folder`.")
			.addText((text) =>
				text
					.setPlaceholder("Are.na/Attachments")
					.setValue(this.plugin.settings.globalAttachmentFolder)
					.onChange(async (value) => {
						this.plugin.settings.globalAttachmentFolder =
							value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Custom attachment folder")
			.setDesc("Use this path when attachment storage location is set to `Custom folder`.")
			.addText((text) =>
				text
					.setPlaceholder("Path/In/Vault")
					.setValue(this.plugin.settings.customAttachmentFolder)
					.onChange(async (value) => {
						this.plugin.settings.customAttachmentFolder =
							value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Add frontmatter")
			.setDesc("Include Are.na metadata fields in YAML frontmatter.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.frontmatterEnabled)
					.onChange(async (value) => {
						this.plugin.settings.frontmatterEnabled = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Exclude block classes")
			.setDesc(
				"Enter a comma-separated list of block classes to skip, for example `Image, Media`.",
			)
			.addText((text) =>
				text
					.setPlaceholder("Image, Media")
					.setValue(this.plugin.settings.excludeClasses.join(", "))
					.onChange(async (value) => {
						this.plugin.settings.excludeClasses = value
							.split(",")
							.map((s) => s.trim())
							.filter((s) => s.length > 0);
						await this.plugin.saveSettings();
					}),
			);

		this.renderSectionHeader(
			containerEl,
			"Notifications and logging",
			"Control notices and troubleshooting output.",
		);
		new Setting(containerEl)
			.setName("Sync on startup")
			.setDesc("Automatically run import when Obsidian opens.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.syncOnStartup)
					.onChange(async (value) => {
						this.plugin.settings.syncOnStartup = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Sync interval (minutes)")
			.setDesc("Auto-import on a repeating schedule. Set to 0 to disable.")
			.addText((text) =>
				text
					.setPlaceholder("0")
					.setValue(String(this.plugin.settings.syncInterval))
					.onChange(async (value) => {
						const n = parseInt(value, 10);
						this.plugin.settings.syncInterval = Number.isFinite(n) && n >= 0 ? n : 0;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Show notifications")
			.setDesc("Show notices for import progress, completion, and failures.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.notifyOnSync)
					.onChange(async (value) => {
						this.plugin.settings.notifyOnSync = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Debug logging")
			.setDesc("Log detailed import activity to the developer console.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.debugLogging)
					.onChange(async (value) => {
						this.plugin.settings.debugLogging = value;
						await this.plugin.saveSettings();
					}),
			);

		this.renderSectionHeader(
			containerEl,
			"Channel management",
			"Bulk-manage mappings and safely back up or restore configuration.",
		);
		new Setting(containerEl)
			.setName("Auto-enable imported channels")
			.setDesc(
				"When importing channels, create new mappings in the enabled state.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoEnableImportedChannels)
					.onChange(async (value) => {
						this.plugin.settings.autoEnableImportedChannels = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Import my channels")
			.setDesc(
				"Fetch all your Are.na channels and create missing mappings using `Are.na/<slug>` by default.",
			)
			.addButton((btn) =>
				btn.setButtonText("Import my channels").setCta().onClick(async () => {
					try {
						const result = await this.plugin.importMyChannelsMappings();
						new Notice(
							`Imported channel mappings: ${result.created} created, ${result.updated} updated (${result.totalRemote} remote channels).`,
						);
						this.display();
					} catch (err) {
						new Notice(`Import my channels failed: ${(err as Error).message}`);
					}
				}),
			);

		new Setting(containerEl)
			.setName("Backup channel mappings")
			.setDesc("Save current channel mappings to a JSON backup file in your vault.")
			.addButton((btn) =>
				btn.setButtonText("Backup now").onClick(async () => {
					try {
						const path = await this.plugin.backupChannelMappings();
						new Notice(`Channel mappings backed up to ${path}`);
					} catch (err) {
						new Notice(`Backup failed: ${(err as Error).message}`);
					}
				}),
			);

		new Setting(containerEl)
			.setName("Restore latest backup")
			.setDesc("Replace current mappings with the most recent backup file.")
			.addButton((btn) =>
				btn.setButtonText("Restore latest").onClick(async () => {
					try {
						const path =
							await this.plugin.restoreLatestChannelMappingsBackup();
						new Notice(`Restored channel mappings from ${path}`);
						this.display();
					} catch (err) {
						new Notice(`Restore failed: ${(err as Error).message}`);
					}
				}),
			);

		new Setting(containerEl)
			.setName("Restore from file")
			.setDesc("Choose a specific backup file to restore channel mappings from.")
			.addButton((btn) =>
				btn.setButtonText("Restore from file...").onClick(() => {
					new BackupFileSuggestModal(this.app, async (file) => {
						try {
							const path =
								await this.plugin.restoreChannelMappingsFromFile(
									file.path,
								);
							new Notice(`Restored channel mappings from ${path}`);
							this.display();
						} catch (err) {
							new Notice(
								`Restore failed: ${(err as Error).message}`,
							);
						}
					}).open();
				}),
			);

		new Setting(containerEl)
			.setName("Reset channel mappings")
			.setDesc("Remove all mappings from settings. Create a backup first.")
			.addButton((btn) =>
				btn
					.setButtonText("Reset mappings")
					.setWarning()
					.onClick(async () => {
						const ok = window.confirm(
							"Reset all channel mappings? This can be undone by restoring a backup.",
						);
						if (!ok) return;
						await this.plugin.resetChannelMappings();
						new Notice("Channel mappings reset.");
						this.display();
					}),
			);

		this.renderSectionHeader(
			containerEl,
			"Channel mappings",
			"Each enabled mapping imports one Are.na channel into one vault folder.",
		);
		new Setting(containerEl)
			.setName("Add channel")
			.setDesc(
				"Map an Are.na channel slug to a local folder. Default: `Are.na/<channel-slug>`.",
			)
			.addButton((btn) =>
				btn.setButtonText("+ Add mapping").onClick(async () => {
					this.plugin.settings.channelMappings.push({
						channelSlug: "",
						channelId: 0,
						channelTitle: "",
						localFolder: "",
						lastSyncedAt: null,
						enabled: true,
						attachmentStorageOverride: null,
						customAttachmentFolderOverride: "",
						lastAttachmentBase: null,
					});
					await this.plugin.saveSettings();
					this.display();
				}),
			);

		for (let i = 0; i < this.plugin.settings.channelMappings.length; i++) {
			this.renderMapping(containerEl, i);
		}

		this.renderSectionHeader(
			containerEl,
			"Attachment migration",
			"Use this when changing attachment storage strategy to move files and update embeds safely.",
		);
		new Setting(containerEl)
			.setName("Preview migration")
			.setDesc("Run a dry preview and inspect planned file diffs.")
			.addButton((btn) =>
				btn.setButtonText("Preview").onClick(async () => {
					await this.plugin.checkForMigrationPrompt(true);
				}),
			);
		new Setting(containerEl)
			.setName("Run migration")
			.setDesc("Move attachments and update embeds to new paths.")
			.addButton((btn) =>
				btn.setButtonText("Run").setCta().onClick(async () => {
					await this.plugin.runMigration();
				}),
			);
	}

	private renderMapping(containerEl: HTMLElement, index: number): void {
		const mapping = this.plugin.settings.channelMappings[index];
		const wrapper = containerEl.createDiv({ cls: "arena-sync-mapping" });

		new Setting(wrapper)
			.setName(`Mapping #${index + 1}`)
			.setDesc(
				mapping.lastSyncedAt
					? `Last imported ${new Date(mapping.lastSyncedAt).toLocaleString()}.`
					: "Never imported.",
			)
			.addText((text) =>
				text
					.setPlaceholder("Are.na channel slug")
					.setValue(mapping.channelSlug)
					.onChange(async (v) => {
						const trimmed = v.trim();
						if (!trimmed) {
							new Notice("Channel slug cannot be empty");
							return;
						}
						mapping.channelSlug = trimmed;
						await this.plugin.saveSettings();
					}),
			)
			.addText((text) =>
				text
					.setPlaceholder("Optional custom vault folder (default: Are.na/<slug>)")
					.setValue(mapping.localFolder)
					.onChange(async (v) => {
						mapping.localFolder = v.trim();
						await this.plugin.saveSettings();
					}),
			)
			.addToggle((toggle) =>
				toggle.setValue(mapping.enabled).onChange(async (v) => {
					mapping.enabled = v;
					await this.plugin.saveSettings();
				}),
			)
			.addButton((btn) =>
				btn
					.setButtonText("Remove")
					.setWarning()
					.onClick(async () => {
						this.plugin.settings.channelMappings.splice(index, 1);
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		new Setting(wrapper)
			.setName("Attachment storage override")
			.setDesc("Override the attachment storage location for this channel.")
			.addDropdown((dd) =>
				dd
					.addOptions({
						inherit: "Inherit global setting",
						channel: "With channel notes",
						global: "Global folder",
						custom: "Custom folder",
					})
					.setValue(mapping.attachmentStorageOverride ?? "inherit")
					.onChange(async (value) => {
						mapping.attachmentStorageOverride =
							value === "inherit"
								? null
								: (value as AttachmentStorage);
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		if (mapping.attachmentStorageOverride === "custom") {
			new Setting(wrapper)
				.setName("Channel custom attachment folder")
				.setDesc("Override the global custom folder path for this channel.")
				.addText((text) =>
					text
						.setPlaceholder("Path/In/Vault")
						.setValue(mapping.customAttachmentFolderOverride || "")
						.onChange(async (v) => {
							mapping.customAttachmentFolderOverride = v.trim();
							await this.plugin.saveSettings();
						}),
				);
		}
	}

	private renderSectionHeader(
		containerEl: HTMLElement,
		title: string,
		description: string,
	): void {
		containerEl.createEl("h2", { text: title });
		containerEl.createEl("p", {
			text: description,
			cls: "setting-item-description",
		});
	}
}
