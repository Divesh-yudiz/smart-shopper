import Phaser from 'phaser';
import { UI_TEXTURE_KEYS } from '../config/componentAssets.js';
import {
    SHOPPING_LIST_ENTRIES,
    SHOPPING_LIST_SLOT_COUNT,
} from '../config/shoppingListConfig.js';
import config from '../utils/config.js';

const PANEL_NATIVE_W = 455;
const PANEL_NATIVE_H = 153;
const PANEL_DISPLAY_W = 415;

const TITLE_COLOR = '#1e4a7a';
const PROGRESS_COLOR = '#1e4a7a';

/**
 * Top-center shopping list HUD (reference layout).
 */
export default class ShoppingListPanel extends Phaser.GameObjects.Container {
    constructor(scene, x, y, { displayWidth = PANEL_DISPLAY_W } = {}) {
        super(scene, x, y);
        scene.add.existing(this);

        this._entries = SHOPPING_LIST_ENTRIES.map((e) =>
            e ? { ...e, collected: e.collected ?? 0 } : null
        );
        this._slotViews = [];

        this.setDepth(300);
        this._displayWidth = displayWidth;
        this._buildPanel();
        this._refresh();
    }

    _buildPanel () {
        const scale = this._displayWidth / PANEL_NATIVE_W;
        this._scale = scale;
        this._panelW = this._displayWidth;
        this._panelH = PANEL_NATIVE_H * scale;

        const panel = this.scene.add.image(0, 0, UI_TEXTURE_KEYS.shoppingListBase);
        panel.setOrigin(0.5, 0);
        panel.setDisplaySize(this._panelW, this._panelH);
        this.add(panel);

        const headerY = 26 * scale;
        const rowY = 78 * scale;

        const clipIcon = this.scene.add.image(-this._panelW / 2 + 36 * scale, headerY - 4 * scale, UI_TEXTURE_KEYS.listIcon);
        clipIcon.setOrigin(0.5, 0.5);
        clipIcon.setDisplaySize(52 * scale, 52 * scale);
        this.add(clipIcon);

        this._titleText = this.scene.add.text(-8 * scale, headerY, 'SHOPPING LIST', {
            fontFamily: config.fonts.text,
            fontSize: `${Math.round(19 * scale)}px`,
            fontStyle: 'bold',
            color: TITLE_COLOR,
            align: 'center',
        });
        this._titleText.setOrigin(0.5, 0.5);
        this.add(this._titleText);

        // Count-Base.png is a horizontal pill — keep wide aspect (not square)
        const badgeH = 28 * scale;
        const badgeW = 80 * scale;
        const badgeX = 168 * scale;
        const badgeY = headerY;
        const badge = this.scene.add.image(badgeX, badgeY, UI_TEXTURE_KEYS.countBase);
        badge.setOrigin(0.5, 0.5);
        badge.setDisplaySize(badgeW, badgeH);
        this.add(badge);

        this._progressBadgeText = this.scene.add.text(badgeX, badgeY, '0/6', {
            fontFamily: config.fonts.text,
            fontSize: `${Math.round(16 * scale)}px`,
            fontStyle: 'bold',
            color: '#ffffff',
            align: 'center',
        });
        this._progressBadgeText.setOrigin(0.5, 0.5);
        this.add(this._progressBadgeText);

        const padX = 36 * scale;
        const slotsWidth = this._panelW - padX * 2;
        const slotGap = 10 * scale;
        const desiredRadius = 30 * scale;
        const maxRadius =
            (slotsWidth - (SHOPPING_LIST_SLOT_COUNT - 1) * slotGap) /
            (2 * SHOPPING_LIST_SLOT_COUNT);
        const slotRadius = Math.min(desiredRadius, maxRadius);
        const slotStep = 2 * slotRadius + slotGap;
        const rowWidth =
            SHOPPING_LIST_SLOT_COUNT * 2 * slotRadius +
            (SHOPPING_LIST_SLOT_COUNT - 1) * slotGap;
        const firstX = -rowWidth / 2 + slotRadius;

        for (let i = 0; i < SHOPPING_LIST_SLOT_COUNT; i++) {
            const sx = firstX + i * slotStep;
            const slotContainer = this.scene.add.container(sx, rowY);
            this.add(slotContainer);

            const circle = this.scene.add.graphics();
            circle.fillStyle(0xd8dce3, 1);
            circle.fillCircle(0, 0, slotRadius);
            circle.lineStyle(2, 0xa8b0bc, 1);
            circle.strokeCircle(0, 0, slotRadius);
            slotContainer.add(circle);

            const productImg = this.scene.add.image(0, 0, UI_TEXTURE_KEYS.listIcon);
            productImg.setOrigin(0.5, 0.5);
            productImg.setVisible(false);
            slotContainer.add(productImg);

            const checkGfx = this.scene.add.graphics();
            checkGfx.setVisible(false);
            slotContainer.add(checkGfx);

            const progressText = this.scene.add.text(0, slotRadius + 8 * scale, '', {
                fontFamily: config.fonts.text,
                fontSize: `${Math.round(16 * scale)}px`,
                fontStyle: 'bold',
                color: PROGRESS_COLOR,
                align: 'center',
            });
            progressText.setOrigin(0.5, 0);
            slotContainer.add(progressText);

            this._slotViews.push({
                slotContainer,
                circle,
                productImg,
                checkGfx,
                progressText,
                slotRadius,
            });
        }
    }

    _drawCheckmark (graphics, radius) {
        graphics.clear();
        graphics.fillStyle(0x2ecc71, 1);
        graphics.fillCircle(radius * 0.55, radius * 0.55, radius * 0.32);
        graphics.lineStyle(Math.max(2, radius * 0.12), 0xffffff, 1);
        graphics.beginPath();
        graphics.moveTo(radius * 0.38, radius * 0.55);
        graphics.lineTo(radius * 0.5, radius * 0.68);
        graphics.lineTo(radius * 0.72, radius * 0.42);
        graphics.strokePath();
    }

    /** Call when player picks a product (e.g. added to cart). */
    onProductCollected (product) {
        const key = product.key ?? product.textureKey;
        let changed = false;

        this._entries.forEach((entry, i) => {
            if (!entry) return;
            const match =
                entry.key === key ||
                entry.textureKey === product.textureKey ||
                entry.key === product.textureKey?.replace(/^product_\w+_/, '');
            if (!match) return;
            if (entry.collected < entry.required) {
                entry.collected += 1;
                changed = true;
            }
        });

        if (changed) this._refresh();
        return changed;
    }

    _countCompleted () {
        return this._entries.filter((e) => e && e.collected >= e.required).length;
    }

    _countActive () {
        return this._entries.filter(Boolean).length;
    }

    _refresh () {
        const done = this._countCompleted();
        const total = this._countActive();
        this._progressBadgeText.setText(`${done}/${SHOPPING_LIST_SLOT_COUNT}`);

        this._slotViews.forEach((view, i) => {
            const entry = this._entries[i];
            if (!entry) {
                view.productImg.setVisible(false);
                view.checkGfx.setVisible(false);
                view.progressText.setText('');
                return;
            }

            const complete = entry.collected >= entry.required;
            view.progressText.setText(`${entry.collected}/${entry.required}`);

            if (entry.textureKey && this.scene.textures.exists(entry.textureKey)) {
                view.productImg.setTexture(entry.textureKey);
                view.productImg.setVisible(true);
                const max = view.slotRadius * 1.35;
                const tex = view.productImg.texture.getSourceImage();
                const tw = tex?.width ?? max;
                const th = tex?.height ?? max;
                const s = Math.min(max / tw, max / th);
                view.productImg.setScale(s);
            } else {
                view.productImg.setVisible(false);
            }

            if (complete) {
                this._drawCheckmark(view.checkGfx, view.slotRadius);
                view.checkGfx.setVisible(true);
            } else {
                view.checkGfx.setVisible(false);
            }
        });
    }
}
