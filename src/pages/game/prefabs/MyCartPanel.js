import Phaser from 'phaser';
import { UI_TEXTURE_KEYS } from '../config/componentAssets.js';
import config from '../utils/config.js';

const VISIBLE_SLOTS = 6;
const PANEL_DISPLAY_W = 680;
const PANEL_NATIVE_W = 860;
const PANEL_NATIVE_H = 178;
const COUNT_BADGE_NATIVE_W = 455;
const COUNT_BADGE_NATIVE_H = 153;

const SCROLL_FRICTION = 0.90;
const SCROLL_WHEEL_SPEED = 0.35;
const SCROLL_DRAG_SPEED = 1.0;
const SCROLL_SNAP_DURATION = 300;

const TEXT_STYLE = {
    fontFamily: config.fonts.text,
    color: '#ffffff',
    align: 'center',
};

/**
 * Bottom "MY CART" bar — unlimited items; 6 visible at a time with smooth horizontal scroll.
 */
export default class MyCartPanel extends Phaser.GameObjects.Container {
    constructor(scene, x, y, { panelWidth = PANEL_DISPLAY_W, onItemRemoved = () => {}, initialItems = [] } = {}) {
        super(scene, x, y);
        scene.add.existing(this);

        /** @type {Array<object>} */
        this._items = [...initialItems];
        /** @type {Array<object>} */
        this._slotViews = [];
        /** First item index shown in the left-most visible slot */
        this._scrollIndex = 0;
        /** Fractional scroll offset used while dragging (snaps to integer index) */
        this._scrollOffset = 0;
        this._scrollVelocity = 0;
        this._dragStartScroll = 0;
        this._lastDragTime = 0;
        this._isDragging = false;
        this._scrollSnapProxy = { value: 0 };

        this._onItemRemoved = onItemRemoved;
        this.setDepth(300);
        this._panelWidth = panelWidth;
        this._buildPanel();
        this._setupScrollInput();
        this._setupScrollUpdate();
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
        const bodyCenterY = bodyTop + bodyH * 0.44;

        const pad = 14 * scale;
        const headerPadX = 28 * scale;

        const totalW = 110 * scale;
        const totalH = 102 * scale;
        const totalX = this._panelW / 2 - pad - totalW / 2;

        const slotsRight = totalX - totalW / 2 - 12 * scale;
        const slotsLeft = -this._panelW / 2 + pad;
        const slotsWidth = slotsRight - slotsLeft;
        this._slotSize = Math.min(96 * scale, slotsWidth / VISIBLE_SLOTS - 8 * scale);
        this._slotStep = slotsWidth / VISIBLE_SLOTS;
        this._slotsLeft = slotsLeft;
        this._slotsWidth = slotsWidth;
        this._bodyCenterY = bodyCenterY;

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

        this._slotsLayer = this.scene.add.container(slotsLeft, bodyCenterY);
        this.add(this._slotsLayer);

        for (let i = 0; i < VISIBLE_SLOTS + 1; i++) {
            const sx = this._slotStep * (i + 0.5);
            const slotContainer = this.scene.add.container(sx, 0);
            this._slotsLayer.add(slotContainer);

            const slotBg = this.scene.add.image(0, 0, UI_TEXTURE_KEYS.cartProductSlot);
            slotBg.setOrigin(0.5, 0.5);
            slotBg.setDisplaySize(this._slotSize, this._slotSize);
            slotContainer.add(slotBg);

            const productImg = this.scene.add.image(0, -6 * scale, UI_TEXTURE_KEYS.cartProductSlot);
            productImg.setOrigin(0.5, 0.5);
            productImg.setVisible(false);
            productImg.setAlpha(0);
            slotContainer.add(productImg);

            const lockImg = this.scene.add.image(0, 0, UI_TEXTURE_KEYS.cartLockIcon);
            lockImg.setOrigin(0.5, 0.5);
            lockImg.setDisplaySize(this._slotSize * 0.42, this._slotSize * 0.42);
            lockImg.setVisible(true);
            slotContainer.add(lockImg);

            const tagY = this._slotSize * 0.44;
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
                baseX: sx,
                slotBg,
                productImg,
                lockImg,
                priceTag,
                priceText,
                slotSize: this._slotSize,
            });
        }

        const totalBtn = this.scene.add.image(totalX, bodyCenterY, UI_TEXTURE_KEYS.cartTotalBtn);
        totalBtn.setOrigin(0.5, 0.5);
        totalBtn.setDisplaySize(totalW, totalH);
        this.add(totalBtn);

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

        this._buildCrossBtns();
        this._refresh();
    }

    _getMaxScrollIndex () {
        return Math.max(0, this._getSlotCount() - VISIBLE_SLOTS);
    }

    /** Total slot positions in the virtual row (items + empty locks up to 6). */
    _getSlotCount () {
        return Math.max(VISIBLE_SLOTS, this._items.length);
    }

    _clampScroll () {
        const max = this._getMaxScrollIndex();
        this._scrollOffset = Phaser.Math.Clamp(this._scrollOffset, 0, max);
        this._scrollIndex = Math.round(this._scrollOffset);
    }

    /** Hide only while a slot is sliding out past the left edge of the strip. */
    _isExitingLeft (view) {
        const leftEdge = view.container.x - this._slotStep * 0.48;
        return leftEdge < 0;
    }

    _applyScrollVisual () {
        const frac = this._scrollOffset - Math.floor(this._scrollOffset);
        const slidePx = frac * this._slotStep;

        this._slotViews.forEach((view) => {
            view.container.x = view.baseX - slidePx;
        });
    }

    _snapScroll (targetOffset = null) {
        const max = this._getMaxScrollIndex();
        const offset = targetOffset != null
            ? Phaser.Math.Clamp(targetOffset, 0, max)
            : Phaser.Math.Clamp(this._scrollOffset, 0, max);

        this.scene.tweens.killTweensOf(this._scrollSnapProxy);
        this._scrollSnapProxy = { value: this._scrollOffset };
        this.scene.tweens.add({
            targets: this._scrollSnapProxy,
            value: offset,
            duration: SCROLL_SNAP_DURATION,
            ease: 'Cubic.easeOut',
            onUpdate: () => {
                this._scrollOffset = this._scrollSnapProxy.value;
                this._scrollIndex = Math.round(this._scrollOffset);
                this._applyScrollVisual();
                this._refreshSlotContents();
            },
            onComplete: () => {
                this._scrollOffset = offset;
                this._scrollIndex = Math.round(offset);
                this._scrollVelocity = 0;
                this._applyScrollVisual();
                this._refreshSlotContents();
            },
        });
    }

    _setupScrollInput () {
        const hitH = this._slotSize * 1.4;
        const hit = this.scene.add.rectangle(
            this._slotsLeft + this._slotsWidth / 2,
            this._bodyCenterY,
            this._slotsWidth,
            hitH,
            0,
            0
        );
        hit.setInteractive({ useHandCursor: true });
        this.scene.input.setDraggable(hit);
        this.add(hit);

        hit.on('pointerdown', () => {
            this.scene.tweens.killTweensOf(this._scrollSnapProxy);
            this._isDragging = true;
            this._scrollVelocity = 0;
            this._dragStartScroll = this._scrollOffset;
            this._lastDragTime = this.scene.time.now;
        });

        hit.on('drag', (_ptr, dragX) => {
            if (!this._isDragging) return;
            const now = this.scene.time.now;
            const dt = (now - this._lastDragTime) / 1000;
            const newOffset = Phaser.Math.Clamp(
                this._dragStartScroll - (dragX / this._slotStep) * SCROLL_DRAG_SPEED,
                0,
                this._getMaxScrollIndex()
            );
            if (dt > 0) {
                this._scrollVelocity = (newOffset - this._scrollOffset) / dt;
            }
            this._scrollOffset = newOffset;
            this._scrollIndex = Math.round(this._scrollOffset);
            this._lastDragTime = now;
            this._applyScrollVisual();
            this._refreshSlotContents();
        });

        const endDrag = () => {
            if (!this._isDragging) return;
            this._isDragging = false;
            if (Math.abs(this._scrollVelocity) < 0.4) {
                this._snapScroll();
            }
        };

        hit.on('pointerup', endDrag);
        hit.on('dragend', endDrag);

        hit.on('wheel', (_ptr, _dx, dy) => {
            this.scene.tweens.killTweensOf(this._scrollSnapProxy);
            this._scrollVelocity = 0;
            const next = this._scrollOffset + dy * SCROLL_WHEEL_SPEED;
            this._snapScroll(next);
        });

        this.bringToTop(hit);
        this._crossBtns.forEach(c => this.bringToTop(c));
    }

    _setupScrollUpdate () {
        this._onScrollUpdate = (_time, delta) => {
            if (this._isDragging || Math.abs(this._scrollVelocity) < 0.05) return;

            const dt = delta / 1000;
            this._scrollOffset += this._scrollVelocity * dt;
            this._scrollVelocity *= Math.pow(SCROLL_FRICTION, delta / 16);

            const max = this._getMaxScrollIndex();
            if (this._scrollOffset <= 0 || this._scrollOffset >= max) {
                this._scrollOffset = Phaser.Math.Clamp(this._scrollOffset, 0, max);
                this._scrollVelocity = 0;
                this._snapScroll(this._scrollOffset);
                return;
            }

            this._scrollIndex = Math.round(this._scrollOffset);
            this._applyScrollVisual();
            this._refreshSlotContents();

            if (Math.abs(this._scrollVelocity) < 0.05) {
                this._scrollVelocity = 0;
                this._snapScroll();
            }
        };
        this.scene.events.on('update', this._onScrollUpdate);
    }

    _scrollToEnd (smooth = true) {
        const target = this._getMaxScrollIndex();
        if (smooth) {
            this._snapScroll(target);
        } else {
            this._scrollOffset = target;
            this._scrollIndex = target;
            this._applyScrollVisual();
            this._refreshSlotContents();
        }
    }

    /** @param {object} product — from ProductRack click */
    tryAddItem (product) {
        const price = product.price ?? this._defaultPrice(product);

        this._items.push({ ...product, price });
        this._refresh();
        this._scrollToEnd(true);

        return true;
    }

    _defaultPrice (product) {
        const base = 4 + (product.id ?? 0) % 7;
        return Number(base.toFixed(0));
    }

    getItems () {
        return [...this._items];
    }

    getItemCount () {
        return this._items.length;
    }

    getTotal () {
        return this._items.reduce((sum, item) => sum + (item?.price ?? 0), 0);
    }

    _refreshSlotContents () {
        const firstIndex = Math.floor(this._scrollOffset);

        this._slotViews.forEach((view, slotIdx) => {
            const itemIndex = firstIndex + slotIdx;
            const item = itemIndex < this._items.length ? this._items[itemIndex] : null;
            const showLock = item == null && itemIndex < this._getSlotCount();
            const filled = item != null;

            const active = itemIndex < this._getSlotCount() && !this._isExitingLeft(view);
            view.container.setVisible(active);
            view.lockImg.setVisible(active && showLock && !filled);
            view.priceTag.setVisible(active && filled);
            view.priceText.setVisible(active && filled);
            view.slotBg.setVisible(active && (filled || showLock));

            if (!filled || !active) {
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
        this._updateCrossBtns();
    }

    _refresh () {
        const count = this.getItemCount();
        this._countText.setText(`${count} ITEM${count === 1 ? '' : 'S'}`);

        this._clampScroll();
        this._applyScrollVisual();
        this._refreshSlotContents();

        this._totalAmount.setText(`AED ${this.getTotal()}`);
    }

    _buildCrossBtns () {
        const r = Math.max(6, this._slotSize * 0.13);
        this._crossBtnR = r;
        this._crossBtns = [];
        for (let i = 0; i <= VISIBLE_SLOTS; i++) {
            const g = this.scene.add.graphics();
            g.fillStyle(0x555555, 0.85);
            g.fillCircle(0, 0, r);
            const arm = r * 0.50;
            const lw = Math.max(2, r * 0.28);
            g.lineStyle(lw, 0xffffff, 1);
            g.lineBetween(-arm, -arm, arm, arm);
            g.lineBetween(arm, -arm, -arm, arm);
            g.setInteractive(
                new Phaser.Geom.Circle(0, 0, r + 6),
                Phaser.Geom.Circle.Contains
            );
            const idx = i;
            g.on('pointerdown', () => { this._isDragging = false; });
            g.on('pointerup', () => this._removeItemAtSlot(idx));
            g.setVisible(false);
            this._crossBtns.push(g);
            this.add(g);
        }
    }

    _removeItemAtSlot (slotIdx) {
        const itemIndex = Math.floor(this._scrollOffset) + slotIdx;
        if (itemIndex < 0 || itemIndex >= this._items.length) return;
        const [removed] = this._items.splice(itemIndex, 1);
        this._refresh();
        this._onItemRemoved(removed);
    }

    _updateCrossBtns () {
        if (!this._crossBtns) return;
        const firstIndex = Math.floor(this._scrollOffset);
        const offset = this._slotSize * 0.40;
        const slotsRight = this._slotsLeft + this._slotsWidth;
        this._slotViews.forEach((view, slotIdx) => {
            const btn = this._crossBtns[slotIdx];
            if (!btn) return;
            const itemIndex = firstIndex + slotIdx;
            const hasItem = itemIndex < this._items.length;
            const btnX = this._slotsLeft + view.container.x + offset;
            const withinBounds = (btnX + this._crossBtnR) <= slotsRight;
            const active = hasItem && view.container.visible && withinBounds;
            btn.setVisible(active);
            if (active) {
                btn.x = btnX;
                btn.y = this._bodyCenterY - offset;
            }
        });
    }

    destroy (fromScene) {
        if (this._onScrollUpdate) {
            this.scene.events.off('update', this._onScrollUpdate);
        }
        this.scene.tweens.killTweensOf(this._scrollSnapProxy);
        super.destroy(fromScene);
    }
}
