import Phaser from 'phaser';
import { UI_TEXTURE_KEYS } from '../config/componentAssets.js';
import { HOME_TEXTURE_KEYS } from '../config/homeAssets.js';
import { addCauseText, causeStyle } from '../utils/gameText.js';

const VISIBLE_SLOTS = 5;
/** Base.png native size */
const PANEL_NATIVE_W = 414;
const PANEL_NATIVE_H = 136;
const PANEL_DISPLAY_W = 540;
/** Squash vertical display vs native aspect (less empty padding). */
const PANEL_HEIGHT_SCALE = 0.76;
/** Fill-Box.png native size */
const SLOT_NATIVE_W = 57;
const SLOT_NATIVE_H = 62;

const SCROLL_FRICTION = 0.90;
const SCROLL_WHEEL_SPEED = 0.35;
const SCROLL_DRAG_SPEED = 1.0;
const SCROLL_SNAP_DURATION = 300;

const CART_ICON_SLOT_FILL = 0.72;
const FRUIT_CART_ICON_SLOT_FILL = 0.88;

function isFruitCartItem(item) {
    if (item?.rackId === 'fruits') return true;
    const key = item?.textureKey ?? '';
    return key.startsWith('product_fruits_');
}

const TITLE_STYLE = causeStyle({
    color: '#1A1A1A',
    align: 'left',
});

/**
 * Bottom "My Cart" bar — cream Base, Fill-Box slots, View Cart button.
 */
export default class MyCartPanel extends Phaser.GameObjects.Container {
    constructor(scene, x, y, {
        panelWidth = PANEL_DISPLAY_W,
        onItemRemoved = () => { },
        onViewCart = () => { },
        initialItems = [],
    } = {}) {
        super(scene, x, y);
        scene.add.existing(this);

        /** @type {Array<object>} */
        this._items = [...initialItems];
        /** @type {Array<object>} */
        this._slotViews = [];
        this._scrollIndex = 0;
        this._scrollOffset = 0;
        this._scrollVelocity = 0;
        this._dragStartScroll = 0;
        this._lastDragTime = 0;
        this._isDragging = false;
        this._scrollSnapProxy = { value: 0 };

        this._onItemRemoved = onItemRemoved;
        this._onViewCart = onViewCart;
        this.setDepth(300);
        this._panelWidth = panelWidth;
        this._buildPanel();
        this._setupScrollInput();
        this._setupScrollUpdate();
    }

    _buildPanel() {
        const scale = this._panelWidth / PANEL_NATIVE_W;
        this._panelScale = scale;
        this._panelH = PANEL_NATIVE_H * scale * PANEL_HEIGHT_SCALE;
        this._panelW = this._panelWidth;

        const panel = this.scene.add.image(0, 0, UI_TEXTURE_KEYS.cartBase);
        panel.setOrigin(0.5, 1);
        panel.setDisplaySize(this._panelW, this._panelH);
        this.add(panel);

        const padX = this._panelW * 0.04;
        const padTop = this._panelH * 0.06;
        const headerH = this._panelH * 0.24;
        const headerY = -this._panelH + padTop + headerH / 2;

        const cartIconSize = headerH * 0.95;
        const cartIcon = this.scene.add.image(
            -this._panelW / 2 + padX + cartIconSize / 2,
            headerY,
            UI_TEXTURE_KEYS.cartIcon,
        );
        cartIcon.setDisplaySize(cartIconSize, cartIconSize);
        this.add(cartIcon);

        this.add(addCauseText(
            this.scene,
            cartIcon.x + cartIconSize / 2 + this._panelW * 0.012,
            headerY,
            'My Cart',
            {
                ...TITLE_STYLE,
                fontSize: `${Math.round(18 * scale)}px`,
                fontStyle: 'bold',
            },
        ).setOrigin(0, 0.5));

        // View Cart button on the right — use Green-Button asset (no arrow).
        const btnH = Math.max(28, this._panelH * 0.36);
        const btnW = Math.max(132, this._panelW * 0.26);
        const btnX = this._panelW / 2 - padX - btnW / 2;
        const bodyCenterY = -this._panelH * 0.38;
        this._bodyCenterY = bodyCenterY;

        const btnKey = this.scene.textures.exists(HOME_TEXTURE_KEYS.greenButton)
            ? HOME_TEXTURE_KEYS.greenButton
            : UI_TEXTURE_KEYS.cartBarBase;
        // Scale the container (starts at 1) so hover never fights setDisplaySize.
        const btnWrap = this.scene.add.container(btnX, bodyCenterY);
        this.add(btnWrap);

        const btnImg = this.scene.add.image(0, 0, btnKey);
        btnImg.setDisplaySize(btnW, btnH);
        btnWrap.add(btnImg);

        btnWrap.add(addCauseText(this.scene, 0, 0, 'View Cart', {
            fontSize: `${Math.round(17 * scale)}px`,
            fontStyle: 'bold',
            color: '#ffffff',
            align: 'center',
        }).setOrigin(0.5, 0.5).setStroke('#1a6b28', 3));

        const btnHit = this.scene.add.rectangle(0, 0, btnW, btnH, 0, 0);
        btnHit.setInteractive({ useHandCursor: true });
        btnHit.on('pointerover', () => {
            this.scene.tweens.killTweensOf(btnWrap);
            this.scene.tweens.add({
                targets: btnWrap,
                scaleX: 1.04,
                scaleY: 1.04,
                duration: 80,
            });
        });
        btnHit.on('pointerout', () => {
            this.scene.tweens.killTweensOf(btnWrap);
            this.scene.tweens.add({
                targets: btnWrap,
                scaleX: 1,
                scaleY: 1,
                duration: 80,
            });
        });
        btnHit.on('pointerup', () => this._onViewCart?.());
        btnWrap.add(btnHit);

        // Item slots between header/left and View Cart button.
        const slotsLeft = -this._panelW / 2 + padX;
        const slotsRight = btnX - btnW / 2 - this._panelW * 0.02;
        const slotsWidth = slotsRight - slotsLeft;
        const slotAspect = SLOT_NATIVE_H / SLOT_NATIVE_W;
        this._slotSize = Math.min(
            this._panelH * 0.52,
            slotsWidth / VISIBLE_SLOTS - 8 * scale,
        );
        this._slotH = this._slotSize * slotAspect;
        this._slotStep = slotsWidth / VISIBLE_SLOTS;
        this._slotsLeft = slotsLeft;
        this._slotsWidth = slotsWidth;

        this._slotsLayer = this.scene.add.container(slotsLeft, bodyCenterY);
        this.add(this._slotsLayer);

        for (let i = 0; i < VISIBLE_SLOTS + 1; i++) {
            const sx = this._slotStep * (i + 0.5);
            const slotContainer = this.scene.add.container(sx, 0);
            this._slotsLayer.add(slotContainer);

            const slotBg = this.scene.add.image(0, 0, UI_TEXTURE_KEYS.cartFillBox);
            slotBg.setOrigin(0.5, 0.5);
            slotBg.setDisplaySize(this._slotSize, this._slotH);
            slotContainer.add(slotBg);

            const productImg = this.scene.add.image(0, 0, UI_TEXTURE_KEYS.cartFillBox);
            productImg.setOrigin(0.5, 0.5);
            productImg.setVisible(false);
            productImg.setAlpha(0);
            slotContainer.add(productImg);

            this._slotViews.push({
                container: slotContainer,
                baseX: sx,
                slotBg,
                productImg,
                slotSize: this._slotSize,
            });
        }

        this._buildCrossBtns();
        this._refresh();
    }

    _getMaxScrollIndex() {
        return Math.max(0, this._getSlotCount() - VISIBLE_SLOTS);
    }

    _getSlotCount() {
        return Math.max(VISIBLE_SLOTS, this._items.length);
    }

    _clampScroll() {
        const max = this._getMaxScrollIndex();
        this._scrollOffset = Phaser.Math.Clamp(this._scrollOffset, 0, max);
        this._scrollIndex = Math.round(this._scrollOffset);
    }

    _isExitingLeft(view) {
        const leftEdge = view.container.x - this._slotStep * 0.48;
        return leftEdge < 0;
    }

    _applyScrollVisual() {
        const frac = this._scrollOffset - Math.floor(this._scrollOffset);
        const slidePx = frac * this._slotStep;

        this._slotViews.forEach((view) => {
            view.container.x = view.baseX - slidePx;
        });
    }

    _snapScroll(targetOffset = null) {
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

    _setupScrollInput() {
        const hitH = this._slotH * 1.35;
        const hit = this.scene.add.rectangle(
            this._slotsLeft + this._slotsWidth / 2,
            this._bodyCenterY,
            this._slotsWidth,
            hitH,
            0,
            0,
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
                this._getMaxScrollIndex(),
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
            this._snapScroll(this._scrollOffset + dy * SCROLL_WHEEL_SPEED);
        });

        this.bringToTop(hit);
        this._crossBtns.forEach((c) => this.bringToTop(c));
    }

    _setupScrollUpdate() {
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

    _scrollToEnd(smooth = true) {
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

    tryAddItem(product) {
        const price = product.price ?? this._defaultPrice(product);
        this._items.push({ ...product, price });
        this._refresh();
        this._scrollToEnd(true);
        return true;
    }

    _defaultPrice(product) {
        const base = 4 + (product.id ?? 0) % 7;
        return Number(base.toFixed(0));
    }

    getItems() {
        return [...this._items];
    }

    setItems(items) {
        this._items = [...items];
        this._refresh();
        this._scrollToEnd(true);
    }

    getItemCount() {
        return this._items.length;
    }

    getTotal() {
        return this._items.reduce((sum, item) => sum + (item?.price ?? 0), 0);
    }

    _refreshSlotContents() {
        const firstIndex = Math.floor(this._scrollOffset);

        this._slotViews.forEach((view, slotIdx) => {
            const itemIndex = firstIndex + slotIdx;
            const item = itemIndex < this._items.length ? this._items[itemIndex] : null;
            const filled = item != null;
            const active = itemIndex < this._getSlotCount() && !this._isExitingLeft(view);

            view.container.setVisible(active);
            view.slotBg.setVisible(active);

            if (!filled || !active) {
                view.productImg.setVisible(false);
                return;
            }

            if (item.textureKey && this.scene.textures.exists(item.textureKey)) {
                view.productImg.setTexture(item.textureKey);
                view.productImg.setAlpha(1);
                view.productImg.setVisible(true);
                const fill = isFruitCartItem(item) ? FRUIT_CART_ICON_SLOT_FILL : CART_ICON_SLOT_FILL;
                const max = Math.min(view.slotSize, this._slotH) * fill;
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

    _refresh() {
        this._clampScroll();
        this._applyScrollVisual();
        this._refreshSlotContents();
    }

    _buildCrossBtns() {
        const r = Math.max(6, this._slotSize * 0.14);
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
                Phaser.Geom.Circle.Contains,
            );
            const idx = i;
            g.on('pointerdown', () => { this._isDragging = false; });
            g.on('pointerup', () => this._removeItemAtSlot(idx));
            g.setVisible(false);
            this._crossBtns.push(g);
            this.add(g);
        }
    }

    _removeItemAtSlot(slotIdx) {
        const itemIndex = Math.floor(this._scrollOffset) + slotIdx;
        if (itemIndex < 0 || itemIndex >= this._items.length) return;
        const [removed] = this._items.splice(itemIndex, 1);
        this._refresh();
        this._onItemRemoved(removed);
    }

    _updateCrossBtns() {
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

    destroy(fromScene) {
        if (this._onScrollUpdate) {
            this.scene.events.off('update', this._onScrollUpdate);
        }
        this.scene.tweens.killTweensOf(this._scrollSnapProxy);
        super.destroy(fromScene);
    }
}
