// src/services/settings.service.js
// Settings service - handles site configuration

import { db, settings } from '../db/index.js';
import { eq, and, inArray } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Settings Service
 * Handles all settings-related database operations
 */
class SettingsService {
  /**
   * Get all settings
   * @returns {Promise<Array>} - All settings
   */
  async getAllSettings() {
    const results = await db
      .select({
        id: settings.id,
        key: settings.key,
        value: settings.value,
        group: settings.group,
        type: settings.type,
        updatedAt: settings.updatedAt,
      })
      .from(settings)
      .orderBy(settings.group, settings.key);

    return results;
  }

  /**
   * Get settings by group
   * @param {string} group - Setting group (GENERAL, SECURITY, CONTENT, EMAIL, SOCIAL)
   * @returns {Promise<Array>} - Settings in group
   */
  async getSettingsByGroup(group) {
    const results = await db
      .select({
        id: settings.id,
        key: settings.key,
        value: settings.value,
        group: settings.group,
        type: settings.type,
        updatedAt: settings.updatedAt,
      })
      .from(settings)
      .where(eq(settings.group, group))
      .orderBy(settings.key);

    return results;
  }

  /**
   * Get setting by key
   * @param {string} key - Setting key
   * @returns {Promise<Object|null>} - Setting or null
   */
  async getSettingByKey(key) {
    const [setting] = await db
      .select({
        id: settings.id,
        key: settings.key,
        value: settings.value,
        group: settings.group,
        type: settings.type,
      })
      .from(settings)
      .where(eq(settings.key, key));

    return setting || null;
  }

  /**
   * Get multiple settings by keys
   * @param {Array<string>} keys - Setting keys
   * @returns {Promise<Object>} - Settings as key-value object
   */
  async getSettingsByKeys(keys) {
    const results = await db
      .select({
        key: settings.key,
        value: settings.value,
        type: settings.type,
      })
      .from(settings)
      .where(inArray(settings.key, keys));

    return results.reduce((acc, row) => {
      acc[row.key] = this.parseValue(row.value, row.type);
      return acc;
    }, {});
  }

  /**
   * Create or update a setting
   * @param {string} key - Setting key
   * @param {string} value - Setting value
   * @param {string} group - Setting group
   * @param {string} type - Value type (STRING, NUMBER, BOOLEAN, JSON)
   * @returns {Promise<Object>} - Updated setting
   */
  async upsertSetting(key, value, group = 'GENERAL', type = 'STRING') {
    // Check if setting exists
    const existing = await this.getSettingByKey(key);

    if (existing) {
      // Update
      await db
        .update(settings)
        .set({
          value: String(value),
          type,
          updatedAt: new Date(),
        })
        .where(eq(settings.key, key));

      const [updated] = await db
        .select({
          id: settings.id,
          key: settings.key,
          value: settings.value,
          group: settings.group,
          type: settings.type,
        })
        .from(settings)
        .where(eq(settings.key, key))
        .limit(1);

      return updated;
    } else {
      // Create
      const settingId = crypto.randomUUID();

      await db
        .insert(settings)
        .values({
          id: settingId,
          key,
          value: String(value),
          group,
          type,
        });

      const [created] = await db
        .select({
          id: settings.id,
          key: settings.key,
          value: settings.value,
          group: settings.group,
          type: settings.type,
        })
        .from(settings)
        .where(eq(settings.id, settingId))
        .limit(1);

      return created;
    }
  }

  /**
   * Update multiple settings at once
   * @param {Object} settingsData - Key-value pairs of settings
   * @param {string} group - Setting group
   * @returns {Promise<Array>} - Updated settings
   */
  async updateSettings(settingsData, group = 'GENERAL') {
    const results = [];

    for (const [key, value] of Object.entries(settingsData)) {
      const updated = await this.upsertSetting(key, value, group, this.inferType(value));
      results.push(updated);
    }

    return results;
  }

  /**
   * Delete a setting
   * @param {string} key - Setting key
   * @returns {Promise<boolean>} - True if deleted
   */
  async deleteSetting(key) {
    await db.delete(settings).where(eq(settings.key, key));
    return true;
  }

  /**
   * Initialize default settings
   * Run this on app startup to ensure required settings exist
   */
  async initializeDefaults() {
    const defaults = [
      // General
      { key: 'siteName', value: 'My Blog', group: 'GENERAL', type: 'STRING' },
      { key: 'siteTagline', value: 'Thoughts, stories and ideas', group: 'GENERAL', type: 'STRING' },
      { key: 'siteUrl', value: 'https://example.com', group: 'GENERAL', type: 'STRING' },
      { key: 'timezone', value: 'UTC', group: 'GENERAL', type: 'STRING' },
      { key: 'dateFormat', value: 'MM/DD/YYYY', group: 'GENERAL', type: 'STRING' },
      { key: 'language', value: 'en-US', group: 'GENERAL', type: 'STRING' },

      // Content
      { key: 'postsPerPage', value: '10', group: 'CONTENT', type: 'NUMBER' },
      { key: 'enableComments', value: 'true', group: 'CONTENT', type: 'BOOLEAN' },
      { key: 'moderateComments', value: 'false', group: 'CONTENT', type: 'BOOLEAN' },

      // Security
      { key: 'sessionTimeout', value: '3600', group: 'SECURITY', type: 'NUMBER' },
      { key: 'requireStrongPasswords', value: 'true', group: 'SECURITY', type: 'BOOLEAN' },
      { key: 'twoFactorAuth', value: 'false', group: 'SECURITY', type: 'BOOLEAN' },
    ];

    for (const def of defaults) {
      const existing = await this.getSettingByKey(def.key);
      if (!existing) {
        await this.upsertSetting(def.key, def.value, def.group, def.type);
      }
    }
  }

  /**
   * Parse value based on type
   * @param {string} value - Raw value
   * @param {string} type - Value type
   * @returns {*} - Parsed value
   */
  parseValue(value, type) {
    switch (type) {
      case 'NUMBER':
        return Number(value);
      case 'BOOLEAN':
        return value === 'true';
      case 'JSON':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  }

  /**
   * Infer type from value
   * @param {*} value - Value to check
   * @returns {string} - Inferred type
   */
  inferType(value) {
    if (typeof value === 'boolean') return 'BOOLEAN';
    if (typeof value === 'number') return 'NUMBER';
    if (typeof value === 'object') return 'JSON';
    return 'STRING';
  }

  /**
   * Get settings formatted for UI
   * Returns settings grouped by category
   */
  async getSettingsForUI() {
    const allSettings = await this.getAllSettings();

    const grouped = {
      GENERAL: [],
      SECURITY: [],
      CONTENT: [],
      EMAIL: [],
      SOCIAL: [],
    };

    for (const setting of allSettings) {
      if (grouped[setting.group]) {
        grouped[setting.group].push({
          ...setting,
          parsedValue: this.parseValue(setting.value, setting.type),
        });
      }
    }

    return grouped;
  }
}

export const settingsService = new SettingsService();
