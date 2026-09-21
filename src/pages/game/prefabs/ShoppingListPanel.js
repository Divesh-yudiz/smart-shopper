import Phaser from 'phaser';
import { UI_TEXTURE_KEYS } from '../config/componentAssets.js';
import {
    SHOPPING_LIST_ENTRIES,
    SHOPPING_LIST_SLOT_COUNT,
} from '../config/shoppingListConfig.js';
import config from '../utils/config.js';

const PANEL_NATIVE_W = 455;
const PANEL_DISPLAY_W = 415;

// Header (title + count badge) reserves this much native height before the item rows start.
const HEADER_H = 56;
const ROW_PAD_TOP = 2;
const ROW_H = 28;
const ROW_PAD_BOTTOM = 12;
const LIST_COLUMNS = 2;
const LIST_ROWS = Math.ceil(SHOPPING_LIST_SLOT_COUNT / LIST_COLUMNS);
const PANEL_NATIVE_H = HEADER_H + ROW_PAD_TOP + LIST_ROWS * ROW_H + ROW_PAD_BOTTOM;

const TITLE_COLOR = '#1e4a7a';
const PROGRESS_COLOR = '#1e4a7a';
const DIVIDER_COLOR = 0xd9dde3;

/**
 * Top-center shopping list HUD (reference layout).
 */

let array = [1, 5, 6, 7, 4, 6, 8, 1, 6, 4, 5]
let k = 6;


function removeItems(array, k) {
    for (let i = 0; i < array.length; i++) {
        if (array[i] !== k) {
            array[i - 1] = array[i];
        }
    }
    return array.slice(0, array.length - 1);
}

console.log(removeItems(array, k));

export default class ShoppingListPanel extends Phaser.GameObjects.Container {
    constructor(scene, x, y, { displayWidth = PANEL_DISPLAY_W, entries = null } = {}) {
        super(scene, x, y);
        scene.add.existing(this);

        const source = entries ?? SHOPPING_LIST_ENTRIES;
        this._entries = source.map((e) =>
            e ? { ...e, collected: e.collected ?? 0 } : null
        );
        this._slotViews = [];

        this.setDepth(300);
        this._displayWidth = displayWidth;
        this._buildPanel();
        this._refresh();
    }

    _buildPanel() {
        const scale = this._displayWidth / PANEL_NATIVE_W;
        this._scale = scale;
        this._panelW = this._displayWidth;
        this._panelH = PANEL_NATIVE_H * scale;

        const panel = this.scene.add.image(0, 0, UI_TEXTURE_KEYS.shoppingListBase);
        panel.setOrigin(0.5, 0);
        panel.setDisplaySize(this._panelW, this._panelH);
        this.add(panel);

        const headerY = 26 * scale;

        const clipIcon = this.scene.add.image(-this._panelW / 2 + 36 * scale, headerY - 4 * scale, UI_TEXTURE_KEYS.listIcon);
        clipIcon.setOrigin(0.5, 0.5);
        clipIcon.setDisplaySize(52 * scale, 52 * scale);
        this.add(clipIcon);

        this._titleText = this.scene.add.text(-8 * scale, headerY, 'SHOPPING LIST', {
            fontFamily: config.fonts.text,
            fontSize: `${Math.round(22 * scale)}px`,
            fontStyle: 'bold',
            color: TITLE_COLOR,
            align: 'center',
        });
        this._titleText.setOrigin(0.5, 0.5);
        this.add(this._titleText);

        // Count-Base.png is a horizontal pill — keep wide aspect (not square)
        const badgeH = 32 * scale;
        const badgeW = 86 * scale;
        const badgeX = 172 * scale;
        const badgeY = headerY;
        const badge = this.scene.add.image(badgeX, badgeY, UI_TEXTURE_KEYS.countBase);
        badge.setOrigin(0.5, 0.5);
        badge.setDisplaySize(badgeW, badgeH);
        this.add(badge);

        this._progressBadgeText = this.scene.add.text(badgeX, badgeY, '0/6', {
            fontFamily: config.fonts.text,
            fontSize: `${Math.round(18 * scale)}px`,
            fontStyle: 'bold',
            color: '#ffffff',
            align: 'center',
        });
        this._progressBadgeText.setOrigin(0.5, 0.5);
        this.add(this._progressBadgeText);

        const padX = 26 * scale;
        const colGap = 22 * scale;
        const rowsStartY = (HEADER_H + ROW_PAD_TOP) * scale;
        const rowH = ROW_H * scale;
        const colWidth = (this._panelW - padX * 2 - colGap * (LIST_COLUMNS - 1)) / LIST_COLUMNS;
        const bulletRadius = 6 * scale;

        for (let i = 0; i < SHOPPING_LIST_SLOT_COUNT; i++) {
            const col = Math.floor(i / LIST_ROWS);
            const row = i % LIST_ROWS;
            const colLeft = -this._panelW / 2 + padX + col * (colWidth + colGap);
            const bulletX = colLeft + bulletRadius;
            const labelX = bulletX + bulletRadius + 9 * scale;
            const qtyX = colLeft + colWidth;

            const rowCenterY = rowsStartY + (row + 0.5) * rowH;
            const rowContainer = this.scene.add.container(0, rowCenterY);
            this.add(rowContainer);

            const bullet = this.scene.add.graphics();
            bullet.setPosition(bulletX, 0);
            rowContainer.add(bullet);

            const labelText = this.scene.add.text(labelX, 0, '', {
                fontFamily: config.fonts.text,
                fontSize: `${Math.round(17 * scale)}px`,
                fontStyle: 'bold',
                color: TITLE_COLOR,
                align: 'left',
            });
            labelText.setOrigin(0, 0.5);
            rowContainer.add(labelText);

            const progressText = this.scene.add.text(qtyX, 0, '', {
                fontFamily: config.fonts.text,
                fontSize: `${Math.round(17 * scale)}px`,
                fontStyle: 'bold',
                color: PROGRESS_COLOR,
                align: 'right',
            });
            progressText.setOrigin(1, 0.5);
            rowContainer.add(progressText);

            const divider = this.scene.add.graphics();
            if (row < LIST_ROWS - 1) {
                divider.lineStyle(1, DIVIDER_COLOR, 1);
                divider.beginPath();
                divider.moveTo(colLeft, rowH / 2);
                divider.lineTo(colLeft + colWidth, rowH / 2);
                divider.strokePath();
            }
            rowContainer.add(divider);

            const view = { rowContainer, bullet, labelText, progressText, bulletRadius };
            this._drawBullet(view, false);
            this._slotViews.push(view);
        }
    }

    _drawBullet(view, complete) {
        const { bullet, bulletRadius } = view;
        bullet.clear();
        if (complete) {
            bullet.fillStyle(0x2ecc71, 1);
            bullet.fillCircle(0, 0, bulletRadius);
            bullet.lineStyle(Math.max(1, bulletRadius * 0.3), 0xffffff, 1);
            bullet.beginPath();
            bullet.moveTo(-bulletRadius * 0.45, 0);
            bullet.lineTo(-bulletRadius * 0.1, bulletRadius * 0.4);
            bullet.lineTo(bulletRadius * 0.5, -bulletRadius * 0.45);
            bullet.strokePath();
        } else {
            bullet.fillStyle(0xd8dce3, 1);
            bullet.fillCircle(0, 0, bulletRadius);
            bullet.lineStyle(1.5, 0xa8b0bc, 1);
            bullet.strokeCircle(0, 0, bulletRadius);
        }
    }

    /** Returns a shallow copy of the current entries (for checkout comparison). */
    getEntries() {
        return this._entries.map((e) => e ? { ...e } : null);
    }

    /** Call when player removes a product from the cart. */
    onProductRemoved(product) {
        let changed = false;

        this._entries.forEach((entry) => {
            if (!entry) return;
            if (!this._matchesProduct(entry, product)) return;
            if (entry.collected > 0) {
                entry.collected -= 1;
                changed = true;
            }
        });

        if (changed) this._refresh();
    }

    _matchesProduct(entry, product) {
        const key = product.key ?? product.textureKey;
        return (
            entry.key === key ||
            entry.textureKey === product.textureKey ||
            entry.key === product.textureKey?.replace(/^product_\w+_/, '')
        );
    }

    /** True when the product is on the list and still needs collecting. */
    isProductNeeded(product) {
        return this._entries.some(
            (entry) => entry && this._matchesProduct(entry, product) && entry.collected < entry.required
        );
    }

    /** True when the product appears anywhere on the shopping list. */
    isProductOnList(product) {
        return this._entries.some((entry) => entry && this._matchesProduct(entry, product));
    }

    /** How many more of this product the list still needs (null if not on list). */
    getRemainingForProduct(product) {
        const entry = this._entries.find((e) => e && this._matchesProduct(e, product));
        if (!entry) return null;
        return Math.max(0, entry.required - entry.collected);
    }

    /** Call when player picks a product (e.g. added to cart). */
    onProductCollected(product) {
        let changed = false;

        this._entries.forEach((entry) => {
            if (!entry) return;
            if (!this._matchesProduct(entry, product)) return;
            if (entry.collected < entry.required) {
                entry.collected += 1;
                changed = true;
            }
        });

        if (changed) this._refresh();
        return changed;
    }

    _countCompleted() {
        return this._entries.filter((e) => e && e.collected >= e.required).length;
    }

    _countActive() {
        return this._entries.filter(Boolean).length;
    }

    _refresh() {
        const done = this._countCompleted();
        const total = this._countActive();
        this._progressBadgeText.setText(`${done}/${SHOPPING_LIST_SLOT_COUNT}`);

        this._slotViews.forEach((view, i) => {
            const entry = this._entries[i];
            if (!entry) {
                view.rowContainer.setVisible(false);
                return;
            }
            view.rowContainer.setVisible(true);

            const complete = entry.collected >= entry.required;
            const label = entry.label ?? entry.key ?? '';
            view.labelText.setText(label);
            view.progressText.setText(`${entry.collected}/${entry.required}`);

            const textColor = complete ? '#1b7a3d' : TITLE_COLOR;
            view.labelText.setColor(textColor);
            view.progressText.setColor(complete ? '#1b7a3d' : PROGRESS_COLOR);
            this._drawBullet(view, complete);
        });
    }
}
