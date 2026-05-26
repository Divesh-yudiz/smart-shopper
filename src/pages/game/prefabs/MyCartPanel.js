import Phaser from 'phaser';
import { UI_TEXTURE_KEYS } from '../config/componentAssets.js';
import config from '../utils/config.js';

const SLOT_COUNT = 6;
const PANEL_DISPLAY_W = 680;
/** Native Iteam-in-Cart-Base.png size */
const PANEL_NATIVE_W = 860;
const PANEL_NATIVE_H = 178;
/** My-Cart-Iteams-Count-Base.png */
const COUNT_BADGE_NATIVE_W = 455;
const COUNT_BADGE_NATIVE_H = 153;

const TEXT_STYLE = {
    fontFamily: config.fonts.text,
    color: '#ffffff',
    align: 'center',
};

/**
 * Bottom "MY CART" bar — uses Components/ art (panel, slots, price tags, total).
 */
export default class MyCartPanel extends Phaser.GameObjects.Container {
    constructor(scene, x, y, { maxSlots = SLOT_COUNT, panelWidth = PANEL_DISPLAY_W } = {}) {
        super(scene, x, y);
        scene.add.existing(this);

        this._maxSlots = maxSlots;
        /** @type {Array<object|null>} */
        this._items = Array.from({ length: maxSlots }, () => null);
        this._slotViews = [];

        this.setDepth(300);
        this._panelWidth = panelWidth;
        this._buildPanel();
    }

    _buildPanel () {
        const panel = this.scene.add.image(0, 0, UI_TEXTURE_KEYS.cartPanelBg);
        panel.setOrigin(0.5, 1);
        const scale = this._panelWidth / PANEL_NATIVE_W;
        panel.setDisplaySize(this._panelWidth, PANEL_NATIVE_H * scale);
        this.add(panel);

        this._panelScale = scale;
        this._panelH = PANEL_NATIVE_H * scale;
        this._panelW = this._panelWidth;

        const headerH = this._panelH * 0.24;
        const headerY = -this._panelH + headerH / 2;
        const bodyTop = -this._panelH + headerH;
        const bodyH = this._panelH - headerH;
        const bodyCenterY = bodyTop + bodyH * 0.52;

        const pad = 14 * scale;
        const headerPadX = 28 * scale;

        const totalW = 110 * scale;
        const totalH = 102 * scale;
        const totalX = this._panelW / 2 - pad - totalW / 2;

        const slotsRight = totalX - totalW / 2 - 12 * scale;
        const slotsLeft = -this._panelW / 2 + pad;
        const slotsWidth = slotsRight - slotsLeft;
        const slotSize = Math.min(82 * scale, slotsWidth / this._maxSlots - 8 * scale);
        const slotStep = slotsWidth / this._maxSlots;

        this._titleText = this.scene.add.text(
            -this._panelW / 2 + headerPadX,
            headerY + 4 * scale,
            'MY CART',
            {
                ...TEXT_STYLE,
                fontSize: `${Math.round(18 * scale)}px`,
                fontStyle: 'bold',
                align: 'left',
            }
        );
        this._titleText.setOrigin(0, 0.5);
        this.add(this._titleText);

        // My-Cart-Iteams-Count-Base.png — gray items-count pill, top-right of header
        const countBadgeH = headerH * 0.80;
        const countBadgeW = countBadgeH * (COUNT_BADGE_NATIVE_W / COUNT_BADGE_NATIVE_H);
        const countBadgeX = this._panelW / 2 - 6 * scale;
        const countBadge = this.scene.add.image(
            countBadgeX,
            headerY + 2 * scale,
            UI_TEXTURE_KEYS.cartCountBadge
        );
        countBadge.setOrigin(1, 0.5);
        countBadge.setDisplaySize(countBadgeW, countBadgeH);
        this.add(countBadge);

        this._countBadgeCenterX = countBadgeX - countBadgeW / 2;
        this._countText = this.scene.add.text(this._countBadgeCenterX, headerY, '0 ITEMS', {
            ...TEXT_STYLE,
            fontSize: `${Math.round(16 * scale)}px`,
            fontStyle: 'bold',
        });
        this._countText.setOrigin(0.5, 0.5);
        this.add(this._countText);

        const priceTagW = 76 * scale;
        const priceTagH = 32 * scale;
        const priceFontSize = Math.round(14 * scale);

        for (let i = 0; i < this._maxSlots; i++) {
            const sx = slotsLeft + slotStep * (i + 0.5);
            const slotContainer = this.scene.add.container(sx, bodyCenterY);
            this.add(slotContainer);

            const slotBg = this.scene.add.image(0, 0, UI_TEXTURE_KEYS.cartProductSlot);
            slotBg.setOrigin(0.5, 0.5);
            slotBg.setDisplaySize(slotSize, slotSize);
            slotContainer.add(slotBg);

            const productImg = this.scene.add.image(0, -6 * scale, UI_TEXTURE_KEYS.cartProductSlot);
            productImg.setOrigin(0.5, 0.5);
            productImg.setVisible(false);
            productImg.setAlpha(0);
            slotContainer.add(productImg);

            const lockImg = this.scene.add.image(0, 0, UI_TEXTURE_KEYS.cartLockIcon);
            lockImg.setOrigin(0.5, 0.5);
            lockImg.setDisplaySize(slotSize * 0.42, slotSize * 0.42);
            lockImg.setVisible(true);
            slotContainer.add(lockImg);

            const tagY = slotSize * 0.44;
            const priceTag = this.scene.add.image(0, tagY, UI_TEXTURE_KEYS.countBase);
            priceTag.setOrigin(0.5, 0.5);
            priceTag.setDisplaySize(priceTagW, priceTagH);
            priceTag.setVisible(false);
            slotContainer.add(priceTag);

            const priceText = this.scene.add.text(0, tagY, '', {
                ...TEXT_STYLE,
                fontSize: `${priceFontSize}px`,
                fontStyle: 'bold',
            });
            priceText.setOrigin(0.5, 0.5);
            priceText.setVisible(false);
            slotContainer.add(priceText);

            this._slotViews.push({
                container: slotContainer,
                slotBg,
                productImg,
                lockImg,
                priceTag,
                priceText,
                slotSize,
            });
        }

        const totalBtn = this.scene.add.image(totalX, bodyCenterY, UI_TEXTURE_KEYS.cartTotalBtn);
        totalBtn.setOrigin(0.5, 0.5);
        totalBtn.setDisplaySize(totalW, totalH);
        this.add(totalBtn);

        // Total-Amount-Base.png includes "TOTAL" — AED sits in the dark pill below
        this._totalAmount = this.scene.add.text(
            totalX,
            bodyCenterY + totalH * 0.22,
            'AED 0',
            {
                ...TEXT_STYLE,
                fontSize: `${Math.round(20 * scale)}px`,
                fontStyle: 'bold',
            }
        );
        this._totalAmount.setOrigin(0.5, 0.5);
        this.add(this._totalAmount);

        this._refresh();
    }

    /** @param {object} product — from ProductRack click */
    tryAddItem (product) {
        const emptyIndex = this._items.findIndex((item) => item == null);
        if (emptyIndex < 0) return false;

        const price = product.price ?? this._defaultPrice(product);
        this._items[emptyIndex] = { ...product, price };
        this._refresh();
        return true;
    }

    _defaultPrice (product) {
        const base = 4 + (product.id ?? 0) % 7;
        return Number(base.toFixed(0));
    }

    getItemCount () {
        return this._items.filter(Boolean).length;
    }

    getTotal () {
        return this._items.reduce((sum, item) => sum + (item?.price ?? 0), 0);
    }

    _refresh () {
        const count = this.getItemCount();
        this._countText.setText(`${count} ITEM${count === 1 ? '' : 'S'}`);

        this._slotViews.forEach((view, i) => {
            const item = this._items[i];
            const filled = item != null;

            view.lockImg.setVisible(!filled);
            view.priceTag.setVisible(filled);
            view.priceText.setVisible(filled);

            if (!filled) {
                view.productImg.setVisible(false);
                return;
            }

            view.priceText.setText(`AED ${item.price}`);

            if (item.textureKey && this.scene.textures.exists(item.textureKey)) {
                view.productImg.setTexture(item.textureKey);
                view.productImg.setAlpha(1);
                view.productImg.setVisible(true);
                const max = view.slotSize * 0.68;
                const tex = view.productImg.texture.getSourceImage();
                const tw = tex?.width ?? max;
                const th = tex?.height ?? max;
                const s = Math.min(max / tw, max / th);
                view.productImg.setScale(s);
            } else {
                view.productImg.setVisible(false);
                view.productImg.setAlpha(0);
            }
        });

        this._totalAmount.setText(`AED ${this.getTotal()}`);
    }
}
