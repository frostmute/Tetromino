// src/main.ts
import { App, Plugin, PluginManifest } from "obsidian";
import { SettingsTab } from "./settings-tab";
import { DEFAULT_SETTINGS, TetrominoSettings } from "./types";
import { ArenaApi } from "./api";
import { SyncEngine } from "./sync-engine";

export default class TetrominoPlugin extends Plugin {
  settings: TetrominoSettings;
  api: ArenaApi;
  engine: SyncEngine;

  async onload() {
    await this.loadSettings();
    this.api = new ArenaApi(this);
    this.engine = new SyncEngine(this);
    this.addSettingTab(new SettingsTab(this.app, this));
    // Register commands etc.
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
