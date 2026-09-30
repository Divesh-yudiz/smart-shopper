import Phaser from 'phaser';
import { UI_TEXTURE_KEYS } from '../config/componentAssets.js';
import {
    SHOPPING_LIST_ENTRIES,
    SHOPPING_LIST_SLOT_COUNT,
} from '../config/shoppingListConfig.js';
import { addCauseText, setCauseText } from '../utils/gameText.js';

const PANEL_NATIVE_W = 259;
const PANEL_DISPLAY_W = 400;

/**
 * Nine-slice caps in source-texture pixels.
 * Top must clear the green header (~y79) so only flat cream stretches vertically.
 */
const SLICE_LEFT = 40;
const SLICE_RIGHT = 40;
const SLICE_TOP = 82;
const SLICE_BOTTOM = 40;

const TITLE_COLOR = '#ffffff';
const LABEL_COLOR = '#1a1a1a';
const LABEL_DONE = '#1b7a3d';
const CHECKOUT_FILL = 0x4a4a4a;
const CHECKOUT_FILL_HOVER = 0x5a5a5a;
const CHECKOUT_HIGHLIGHT = 0x6e6e6e;

/**
 * Right-center shopping list HUD — notepad panel with checkbox rows + checkout.
 * Height always reserves room for SHOPPING_LIST_SLOT_COUNT (6) items.
 */
export default class ShoppingListPanel extends Phaser.GameObjects.Container {
    constructor (scene, x, y, {
        displayWidth = PANEL_DISPLAY_W,
        entries = null,
        onCheckout = null,
    } = {}) {
        super(scene, x, y);
        scene.add.existing(this);

        const source = entries ?? SHOPPING_LIST_ENTRIES;
        this._entries = source.map((e) =>
            e ? { ...e, collected: e.collected ?? 0 } : null
        );
        while (this._entries.length < SHOPPING_LIST_SLOT_COUNT) this._entries.push(null);
        this._entries = this._entries.slice(0, SHOPPING_LIST_SLOT_COUNT);

        this._slotViews = [];
        this._onCheckout = onCheckout;

        this.setDepth(300);
        this._displayWidth = displayWidth;
        this._restX = x;
        this._restY = y;
        this._originX = x;
        this._originY = y;
        this._expanded = true;
        this._expandTween = null;
        this._buildPanel();
        this._refresh();
    }

    /** World point the panel emerges from / collapses into (the toggle button). */
    setExpandOrigin (x, y) {
        this._originX = x;
        this._originY = y;
    }

    _buildPanel () {
        // Always size for 6 slots so the cream body grows via nine-slice, not the header.
        const slotCount = SHOPPING_LIST_SLOT_COUNT;

        this._panelW = this._displayWidth;
        const scale = this._displayWidth / PANEL_NATIVE_W;
        this._scale = scale;

        // Top cap is fixed in display px (matches source SLICE_TOP) — green never stretches.
        const headerH = SLICE_TOP;
        const rowH = Math.round(46 * scale);
        const listPadTop = Math.round(6 * scale);
        const listPadBottom = Math.round(4 * scale);
        const checkoutH = Math.round(44 * scale);
        const checkoutGap = Math.round(10 * scale);
        const bottomPad = Math.round(14 * scale);

        this._panelH = headerH + listPadTop + slotCount * rowH + listPadBottom
            + checkoutGap + checkoutH + bottomPad;
        this._headerH = headerH;
        this._rowH = rowH;
        this._slotCount = slotCount;

        const halfW = this._panelW / 2;
        const halfH = this._panelH / 2;

        const panel = this.scene.add.nineslice(
            0,
            0,
            UI_TEXTURE_KEYS.requiredItemBg,
            undefined,
            this._panelW,
            this._panelH,
            SLICE_LEFT,
            SLICE_RIGHT,
            SLICE_TOP,
            SLICE_BOTTOM,
        );
        panel.setOrigin(0.5, 0.5);
        this.add(panel);

        // Green band sits in the upper part of the fixed top cap (clips ~y17–79 native).
        const titleY = -halfH + 48;
        this._titleText = addCauseText(this.scene, 0, titleY, 'Shopping List', {
            fontSize: `${Math.round(22 * scale)}px`,
            fontStyle: 'bold',
            color: TITLE_COLOR,
            align: 'center',
        });
        this._titleText.setOrigin(0.5, 0.5);
        this._titleText.setStroke('#1a5c28', Math.max(2, 3 * scale));
        this.add(this._titleText);

        const padLeft = Math.round(20 * scale);
        const padRight = Math.round(32 * scale);
        const rowsStartY = -halfH + headerH + listPadTop;
        const checkR = Math.max(7, 8.5 * scale);
        const iconSize = Math.round(32 * scale);

        for (let i = 0; i < slotCount; i++) {
            const rowCenterY = rowsStartY + (i + 0.5) * rowH;
            const rowContainer = this.scene.add.container(0, rowCenterY);
            this.add(rowContainer);

            const checkX = -halfW + padLeft + checkR;
            const bullet = this.scene.add.graphics();
            bullet.setPosition(checkX, 0);
            rowContainer.add(bullet);

            const iconX = checkX + checkR + 7 * scale + iconSize / 2;
            const icon = this.scene.add.image(iconX, 0, UI_TEXTURE_KEYS.listIcon);
            icon.setDisplaySize(iconSize, iconSize);
            icon.setVisible(false);
            rowContainer.add(icon);

            const labelX = iconX + iconSize / 2 + 7 * scale;
            const labelMaxW = Math.max(40, halfW - padRight - labelX);
            const labelText = addCauseText(this.scene, labelX, 0, '', {
                fontSize: `${Math.round(16 * scale)}px`,
                fontStyle: 'bold',
                color: LABEL_COLOR,
                align: 'left',
            });
            labelText.setOrigin(0, 0.5);
            rowContainer.add(labelText);

            const view = {
                rowContainer,
                bullet,
                icon,
                labelText,
                bulletRadius: checkR,
                iconSize,
                labelMaxW,
                labelBaseSize: Math.round(16 * scale),
            };
            this._drawBullet(view, false);
            this._slotViews.push(view);
        }

        const checkoutY = halfH - bottomPad - checkoutH / 2;
        this._buildCheckoutButton(0, checkoutY, this._panelW - padLeft * 2, checkoutH, scale);
    }


    _buildCheckoutButton (x, y, btnW, btnH, scale) {
        const btn = this.scene.add.container(x, y);
        this.add(btn);

        const radius = btnH / 2;
        const gfx = this.scene.add.graphics();
        btn.add(gfx);

        const draw = (hover) => {
            gfx.clear();
            gfx.fillStyle(0x000000, 0.22);
            gfx.fillRoundedRect(-btnW / 2 + 2, -btnH / 2 + 3, btnW, btnH, radius);
            gfx.fillStyle(hover ? CHECKOUT_FILL_HOVER : CHECKOUT_FILL, 1);
            gfx.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, radius);
            gfx.fillStyle(CHECKOUT_HIGHLIGHT, 0.45);
            gfx.fillRoundedRect(
                -btnW / 2 + 3,
                -btnH / 2 + 3,
                btnW - 6,
                btnH * 0.42,
                { tl: radius - 2, tr: radius - 2, bl: 0, br: 0 },
            );
        };
        draw(false);

        const label = addCauseText(this.scene, 0, 0, 'Checkout', {
            fontSize: `${Math.round(22 * scale)}px`,
            fontStyle: 'bold',
            color: '#ffffff',
            align: 'center',
        }).setOrigin(0.5, 0.5);
        btn.add(label);

        const hit = this.scene.add.rectangle(0, 0, btnW, btnH, 0, 0);
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => {
            draw(true);
            this.scene.tweens.add({
                targets: btn,
                scaleX: 1.04,
                scaleY: 1.04,
                duration: 80,
                ease: 'Quad.easeOut',
            });
        });
        hit.on('pointerout', () => {
            draw(false);
            this.scene.tweens.add({
                targets: btn,
                scaleX: 1,
                scaleY: 1,
                duration: 80,
                ease: 'Quad.easeOut',
            });
        });
        hit.on('pointerup', () => this._onCheckout?.());
        btn.add(hit);

        this._checkoutBtn = btn;
    }

    _drawBullet (view, complete) {
        const { bullet, bulletRadius: r } = view;
        bullet.clear();
        if (complete) {
            bullet.fillStyle(0x2ecc71, 1);
            bullet.fillCircle(0, 0, r);
            bullet.lineStyle(Math.max(1.5, r * 0.28), 0xffffff, 1);
            bullet.beginPath();
            bullet.moveTo(-r * 0.45, 0);
            bullet.lineTo(-r * 0.08, r * 0.38);
            bullet.lineTo(r * 0.48, -r * 0.42);
            bullet.strokePath();
        } else {
            bullet.fillStyle(0xffffff, 1);
            bullet.fillCircle(0, 0, r);
            bullet.lineStyle(Math.max(1.5, r * 0.22), 0x2a2a2a, 1);
            bullet.strokeCircle(0, 0, r);
        }
    }

    _fitIcon (icon, textureKey, size) {
        if (!textureKey || !this.scene.textures.exists(textureKey)) {
            icon.setVisible(false);
            return;
        }
        icon.setTexture(textureKey);
        const src = this.scene.textures.get(textureKey).getSourceImage();
        const sw = src?.width || size;
        const sh = src?.height || size;
        const s = Math.min(size / sw, size / sh);
        icon.setDisplaySize(sw * s, sh * s);
        icon.setVisible(true);
    }

    _formatLabel (entry) {
        const name = entry.label ?? entry.key ?? '';
        const qty = entry.required ?? 1;
        const unit = qty === 1 ? 'Pack' : 'Pcs';
        return `${name} ${qty} ${unit}`;
    }

    /** Returns a shallow copy of the current entries (for checkout comparison). */
    getEntries () {
        return this._entries.map((e) => (e ? { ...e } : null));
    }

    /**
     * Replace collected counts from authoritative cart line items (API aCartItems).
     * @param {Array<{sItemKey?:string, nQuantity?:number}>} aCartItems
     * @param {(entries: Array, aCartItems: Array) => Array} applyFn
     */
    syncCollectedFromCart (aCartItems, applyFn) {
        if (typeof applyFn !== 'function') return;
        this._entries = applyFn(this._entries, aCartItems);
        while (this._entries.length < SHOPPING_LIST_SLOT_COUNT) this._entries.push(null);
        this._entries = this._entries.slice(0, SHOPPING_LIST_SLOT_COUNT);
        this._refresh();
    }

    /** Call when player removes a product from the cart. */
    onProductRemoved (product) {
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

    _matchesProduct (entry, product) {
        const key = product.key ?? product.textureKey;
        return (
            entry.key === key ||
            entry.textureKey === product.textureKey ||
            (entry.sItemKey && entry.sItemKey === product.sItemKey) ||
            entry.key === product.textureKey?.replace(/^product_\w+_/, '') ||
            entry.key === product.textureKey?.replace(/^api_item_|_normal$|_eco$/g, '')
        );
    }

    /** True when the product is on the list and still needs collecting. */
    isProductNeeded (product) {
        return this._entries.some(
            (entry) => entry && this._matchesProduct(entry, product) && entry.collected < entry.required
        );
    }

    /** True when the product appears anywhere on the shopping list. */
    isProductOnList (product) {
        return this._entries.some((entry) => entry && this._matchesProduct(entry, product));
    }

    /** How many more of this product the list still needs (null if not on list). */
    getRemainingForProduct (product) {
        const entry = this._entries.find((e) => e && this._matchesProduct(e, product));
        if (!entry) return null;
        return Math.max(0, entry.required - entry.collected);
    }

    /** Call when player picks a product (e.g. added to cart). */
    onProductCollected (product) {
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

    _refresh () {
        const active = this._entries.filter(Boolean);
        this._slotViews.forEach((view, i) => {
            const entry = active[i];
            if (!entry) {
                view.rowContainer.setVisible(false);
                return;
            }
            view.rowContainer.setVisible(true);

            const complete = entry.collected >= entry.required;
            setCauseText(view.labelText, this._formatLabel(entry));
            view.labelText.setColor(complete ? LABEL_DONE : LABEL_COLOR);
            view.labelText.setFontSize(view.labelBaseSize);
            this._fitLabelWidth(view.labelText, view.labelMaxW);
            this._fitIcon(view.icon, entry.textureKey, view.iconSize);
            this._drawBullet(view, complete);
        });
    }

    _fitLabelWidth (text, maxW) {
        let size = parseInt(text.style.fontSize, 10) || 16;
        while (text.width > maxW && size > 11) {
            size -= 1;
            text.setFontSize(size);
        }
        return text;
    }

    getProgress () {
        const active = this._entries.filter(Boolean);
        const done = active.filter((e) => e.collected >= e.required).length;
        return { done, total: active.length };
    }

    isExpanded () {
        return this._expanded;
    }

    /** Show / hide the full shopping list, emerging from / collapsing into the toggle button. */
    setExpanded (expanded, { animate = true } = {}) {
        if (this._expanded === expanded && this.visible === expanded) return;
        this._expanded = expanded;

        if (this._expandTween) {
            this._expandTween.stop();
            this._expandTween = null;
        }

        // Keep checkout hit area in sync with visibility.
        if (this._checkoutBtn) {
            this._checkoutBtn.list?.forEach((child) => {
                if (child.input) child.input.enabled = expanded;
            });
        }

        if (!animate) {
            this.setVisible(expanded);
            this.setAlpha(expanded ? 1 : 0);
            this.setScale(expanded ? 1 : 0.1);
            this.setPosition(this._restX, this._restY);
            return;
        }

        if (expanded) {
            this.setVisible(true);
            this.setPosition(this._originX, this._originY);
            this.setAlpha(0.4);
            this.setScale(0.08);
            this._expandTween = this.scene.tweens.add({
                targets: this,
                x: this._restX,
                y: this._restY,
                alpha: 1,
                scaleX: 1,
                scaleY: 1,
                duration: 340,
                ease: 'Back.easeOut',
                onComplete: () => { this._expandTween = null; },
            });
        } else {
            this._expandTween = this.scene.tweens.add({
                targets: this,
                x: this._originX,
                y: this._originY,
                alpha: 0,
                scaleX: 0.08,
                scaleY: 0.08,
                duration: 240,
                ease: 'Back.easeIn',
                onComplete: () => {
                    this.setVisible(false);
                    this.setPosition(this._restX, this._restY);
                    this.setScale(1);
                    this.setAlpha(1);
                    this._expandTween = null;
                },
            });
        }
    }

    toggleExpanded (opts) {
        this.setExpanded(!this._expanded, opts);
        return this._expanded;
    }
}
