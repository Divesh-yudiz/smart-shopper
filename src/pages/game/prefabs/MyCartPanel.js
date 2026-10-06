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
    return key.includes('_fruits_') || /api_item_(tomato|potato|carrot|onion|capsicum|qualiflower|cauliflower)/i.test(key);
}

/** Stable Phaser key for a cart-item image URL from aCartItems.sImage. */
function cartApiImageKey(url) {
    let hash = 2166136261;
    const s = String(url);
    for (let i = 0; i < s.length; i += 1) {
        hash ^= s.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return `cart_api_${(hash >>> 0).toString(36)}`;
}

function resolveCartSlotTexture(scene, item) {
    const imageUrl = item?.sImage;
    if (imageUrl) {
        const apiKey = cartApiImageKey(imageUrl);
        if (scene.textures.exists(apiKey)) return apiKey;
    }
    if (item?.textureKey && scene.textures.exists(item.textureKey)) {
        return item.textureKey;
    }
    const sItemKey = item?.sItemKey;
    if (!sItemKey) return null;
    const safe = String(sItemKey).replace(/[^a-zA-Z0-9_-]/g, '_');
    const normal = `api_item_${safe}_normal`;
    if (scene.textures.exists(normal)) return normal;
    const eco = `api_item_${safe}_eco`;
    if (scene.textures.exists(eco)) return eco;
    return null;
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
        this._pendingCartImages = new Map();
        this._cartImageInflight = new Set();
        this._cartImageFailed = new Set();
        this._cartImageGen = 0;
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
        const btnLabel = addCauseText(this.scene, 0, -btnH * 0.08, 'View Cart', {
            fontSize: `${Math.round(17 * scale)}px`,
            fontStyle: 'bold',
            color: '#ffffff',
            align: 'center',
        }).setOrigin(0.5, 0.5).setStroke('#1a6b28', 3);
        // Extra inset so the label sits in the flat middle, not the pill caps.
        const btnSidePad = Math.max(20, btnH * 0.7);
        const btnW = Math.max(132, btnLabel.width + btnSidePad * 2);
        const btnX = this._panelW / 2 - padX - btnW / 2;
        const bodyCenterY = -this._panelH * 0.38;
        this._bodyCenterY = bodyCenterY;

        const btnKey = this.scene.textures.exists(HOME_TEXTURE_KEYS.greenButton)
            ? HOME_TEXTURE_KEYS.greenButton
            : UI_TEXTURE_KEYS.cartBarBase;
        // Scale the container (starts at 1) so hover never fights setDisplaySize.
        const btnWrap = this.scene.add.container(btnX, bodyCenterY);
        this._btnWrap = btnWrap;
        this.add(btnWrap);

        const btnImg = this.scene.add.image(0, 0, btnKey);
        btnImg.setDisplaySize(btnW, btnH);
        btnWrap.add(btnImg);
        btnWrap.add(btnLabel);

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

        // Phaser 3.80+ masks use world space — keep the source OFF this container
        // and sync its rect to the slots strip so products show and clip at View Cart.
        this._slotsMaskPadY = this._slotH * 0.28;
        this._slotsMaskShape = this.scene.make.graphics({ add: false });
        this._slotsLayer.setMask(this._slotsMaskShape.createGeometryMask());
        this._syncSlotsMask();

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

            const cross = this._makeCrossBtn();
            const crossOffset = this._slotSize * 0.40;
            cross.x = crossOffset;
            cross.y = -crossOffset;
            cross.setVisible(false);
            slotContainer.add(cross);
            const slotIdx = i;
            cross.on('pointerdown', () => { this._isDragging = false; });
            cross.on('pointerup', () => this._removeItemAtSlot(slotIdx));

            this._slotViews.push({
                container: slotContainer,
                baseX: sx,
                slotBg,
                productImg,
                crossBtn: cross,
                slotSize: this._slotSize,
            });
        }

        this._refresh();
        // Keep View Cart above the scrollable slots for hit-testing / layering.
        if (this._btnWrap) this.bringToTop(this._btnWrap);
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
        const hitHomeX = hit.x;
        const hitHomeY = hit.y;
        const parkHit = () => {
            hit.x = hitHomeX;
            hit.y = hitHomeY;
        };

        hit.on('pointerdown', (ptr) => {
            this._pressOnCross = this._slotIndexAtCross(ptr.worldX, ptr.worldY) >= 0;
            if (this._pressOnCross) {
                this._isDragging = false;
                return;
            }
            this.scene.tweens.killTweensOf(this._scrollSnapProxy);
            this._isDragging = true;
            this._scrollVelocity = 0;
            this._dragStartScroll = this._scrollOffset;
            this._lastDragTime = this.scene.time.now;
        });

        hit.on('drag', (_ptr, dragX) => {
            if (this._pressOnCross) {
                parkHit();
                return;
            }
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

        hit.on('pointerup', (ptr) => {
            if (this._pressOnCross) {
                this._pressOnCross = false;
                this._isDragging = false;
                parkHit();
                const slotIdx = this._slotIndexAtCross(ptr.worldX, ptr.worldY);
                if (slotIdx >= 0) this._removeItemAtSlot(slotIdx);
                return;
            }
            endDrag();
        });
        hit.on('dragend', () => {
            if (this._pressOnCross) {
                parkHit();
                return;
            }
            endDrag();
        });

        hit.on('wheel', (_ptr, _dx, dy) => {
            this.scene.tweens.killTweensOf(this._scrollSnapProxy);
            this._scrollVelocity = 0;
            this._snapScroll(this._scrollOffset + dy * SCROLL_WHEEL_SPEED);
        });

        this.bringToTop(hit);
        if (this._btnWrap) this.bringToTop(this._btnWrap);
    }

    _setupScrollUpdate() {
        this._onScrollUpdate = (_time, delta) => {
            this._syncSlotsMask();

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

    /** World-space clip rect for the slots strip (mask source must stay outside this container). */
    _syncSlotsMask() {
        if (!this._slotsMaskShape || this._slotsWidth == null) return;
        const padY = this._slotsMaskPadY ?? 0;
        const mx = this.x + this._slotsLeft;
        const my = this.y + this._bodyCenterY - this._slotH / 2 - padY;
        this._slotsMaskShape.clear();
        this._slotsMaskShape.fillStyle(0xffffff, 1);
        this._slotsMaskShape.fillRect(
            mx,
            my,
            this._slotsWidth,
            this._slotH + padY * 2,
        );
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
            // Keep slots in the strip; the geometry mask clips spill past View Cart.
            const active = itemIndex < this._getSlotCount();

            view.container.setVisible(active);
            view.slotBg.setVisible(active);
            if (view.crossBtn) view.crossBtn.setVisible(filled && active);

            if (!filled || !active) {
                view.productImg.setVisible(false);
                return;
            }

            const apiKey = item.sImage ? cartApiImageKey(item.sImage) : null;
            const apiFailed = apiKey ? this._cartImageFailed.has(apiKey) : false;
            if (item.sImage && !apiFailed) this._noteCartImage(item.sImage);
            const texKey = resolveCartSlotTexture(this.scene, item);
            // Wait for aCartItems.sImage instead of flashing a different shelf texture.
            if (apiKey && !apiFailed && texKey !== apiKey) {
                view.productImg.setVisible(false);
                view.productImg.setAlpha(0);
                return;
            }
            if (texKey) {
                view.productImg.setTexture(texKey);
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
    }

    /** Download product art from aCartItems.sImage and paint it into the slots. */
    _noteCartImage(url) {
        if (!url || !this.scene) return;
        const key = cartApiImageKey(url);
        if (this.scene.textures.exists(key) || this._cartImageInflight.has(key)) return;
        this._pendingCartImages.set(key, url);
        if (this._cartImageKick) return;
        this._cartImageKick = true;
        this.scene.time.delayedCall(0, () => {
            this._cartImageKick = false;
            this._flushCartImages();
        });
    }

    _flushCartImages() {
        const scene = this.scene;
        if (!scene || !this.active) return;
        const jobs = this._pendingCartImages;
        this._pendingCartImages = new Map();
        const missing = [...jobs.entries()].filter(([key]) => !scene.textures.exists(key));
        if (!missing.length) {
            this._refreshSlotContents();
            return;
        }

        const start = () => {
            if (!this.scene || !this.active) return;
            const stillMissing = missing.filter(([key]) => !scene.textures.exists(key));
            if (!stillMissing.length) {
                this._refreshSlotContents();
                return;
            }
            const gen = ++this._cartImageGen;
            scene.load.setCORS('anonymous');
            stillMissing.forEach(([key, url]) => {
                if (scene.textures.exists(key)) return;
                this._cartImageInflight.add(key);
                scene.load.image(key, url);
            });
            const onError = (file) => {
                if (stillMissing.some(([key]) => key === file.key)) {
                    this._cartImageFailed.add(file.key);
                }
            };
            if (!scene.load.list.size) {
                stillMissing.forEach(([key]) => this._cartImageInflight.delete(key));
                this._refreshSlotContents();
                return;
            }
            const finish = () => {
                scene.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
                stillMissing.forEach(([key]) => this._cartImageInflight.delete(key));
                if (gen !== this._cartImageGen || !this.scene) return;
                this._refreshSlotContents();
            };
            scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
            scene.load.once(Phaser.Loader.Events.COMPLETE, finish);
            scene.load.start();
        };

        if (scene.load.isLoading()) {
            scene.load.once(Phaser.Loader.Events.COMPLETE, start);
        } else {
            start();
        }
    }

    _refresh() {
        this._clampScroll();
        this._applyScrollVisual();
        this._refreshSlotContents();
    }

    _makeCrossBtn() {
        const r = Math.max(6, this._slotSize * 0.14);
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
        return g;
    }

    _slotIndexAtCross(worldX, worldY) {
        const r = Math.max(6, this._slotSize * 0.14) + 6;
        for (let i = 0; i < this._slotViews.length; i++) {
            const cross = this._slotViews[i].crossBtn;
            if (!cross?.visible) continue;
            const mat = cross.getWorldTransformMatrix();
            const dx = worldX - mat.tx;
            const dy = worldY - mat.ty;
            if (dx * dx + dy * dy <= r * r) return i;
        }
        return -1;
    }

    _removeItemAtSlot(slotIdx) {
        if (this._removePending) return;
        const itemIndex = Math.floor(this._scrollOffset) + slotIdx;
        const product = this._items[itemIndex];
        if (!product) return;
        // Leave the slot filled until the remove API succeeds.
        this._removePending = true;
        Promise.resolve(this._onItemRemoved?.(product))
            .finally(() => {
                this._removePending = false;
            });
    }

    destroy(fromScene) {
        this._cartImageGen += 1;
        this._pendingCartImages?.clear();
        if (this._onScrollUpdate) {
            this.scene.events.off('update', this._onScrollUpdate);
        }
        this.scene.tweens.killTweensOf(this._scrollSnapProxy);
        this._slotsLayer?.clearMask(true);
        this._slotsMaskShape?.destroy();
        this._slotsMaskShape = null;
        this._slotsMaskImage?.destroy();
        this._slotsMaskImage = null;
        super.destroy(fromScene);
    }
}
