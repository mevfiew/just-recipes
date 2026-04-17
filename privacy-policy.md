# Privacy Policy — Just Recipes

**Last updated:** April 17, 2026

## Overview

Just Recipes is a browser extension that saves recipe pages into a clean local reader. Your privacy is fundamental to this extension's design.

## Data Collection

**We do not collect, transmit, or share any data.** All data is stored locally in your browser via `chrome.storage.local`.

## What is stored locally

For each recipe you save:
- Canonical source URL and hostname (tracking parameters stripped)
- Recipe name, description (truncated to 300 chars), author
- Image URL
- Ingredients list and instructions list
- Time fields (total / prep / cook, in minutes)
- Yield, cuisine, category, keywords
- Timestamp saved

## Network activity

The extension does NOT make network requests of its own. Saving a recipe is a one-time snapshot from the current page — no background fetching, no re-checking. The only images that load are the recipe thumbnails you already allowed by visiting the source page.

## Permissions

- **storage** — save your recipes locally
- **activeTab** — read the page you are currently on, only when you open the popup
- **scripting** — inject a small data-extraction function into the active tab when you open the popup

No host permissions. No background service worker. No network requests.

## Data retention

Data is stored until you delete it. You can delete individual recipes, clear all data from the popup, or uninstall the extension (which wipes everything).

## Contact

For questions about this privacy policy, contact: mehdehaan13@gmail.com

## Changes

Any changes to this privacy policy will be reflected in the "Last updated" date above.
