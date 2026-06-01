import Phaser from 'phaser';
import config from '../utils/config.js';
import { CHARACTER_FRAME_COUNT } from '../config/characterAssets.js';

// ── tunables ──────────────────────────────────────────────────────────────────
const DISPLAY_H = 400;   // character + embedded trolley height (was 420)
const CART_LAYOUT_BASE_H = 480;
const CART_LAYOUT_SCALE = DISPLAY_H / CART_LAYOUT_BASE_H;
const WALK_SPEED = 280;   // px / second
const ANIM_FPS = 24;
const FLOOR_Y = config.height - 142;
const PX_PER_FRAME = WALK_SPEED / ANIM_FPS;  // ≈ 14.7 px

// Cart basket position relative to character container origin (scales with DISPLAY_H).
const CART_X = 120 * CART_LAYOUT_SCALE;    // px right of character centre (facing right)
const CART_Y = -160 * CART_LAYOUT_SCALE;  // px above floor (basket centre)
const ICON_SIZE = 52;    // base icon display size
const MAX_ICONS = 8;

// Organic pile inside the basket — z = draw order (low = behind)
const CART_PILE_SLOTS = [
    { x: -34, y: -2, s: 1.02, r: -14, z: 0 },
    { x: 10, y: -6, s: 1.00, r: 10, z: 1 },
    { x: 38, y: 0, s: 1.04, r: -8, z: 2 },
    { x: -14, y: 12, s: 1.06, r: 12, z: 3 },
    { x: 20, y: 10, s: 1.08, r: -6, z: 4 },
    { x: -32, y: 22, s: 1.10, r: 8, z: 5 },
    { x: 4, y: 24, s: 1.12, r: -11, z: 6 },
    { x: 34, y: 20, s: 1.08, r: 5, z: 7 },
];

// Order new items land in the pile (centre first, then spread/overlap)
const CART_FILL_ORDER = [4, 2, 6, 1, 5, 0, 3, 7];

function resolveCartTextureKey (scene, item) {
    if (item?.textureKey && scene.textures.exists(item.textureKey)) {
        return item.textureKey;
    }
    const key = item?.key;
    if (!key) return null;
    const guess = `product_${item.rackId ?? ''}_${key}`.replace(/_+/g, '_');
    if (scene.textures.exists(guess)) return guess;
    for (const tex of scene.textures.getTextureKeys()) {
        if (tex.endsWith(`_${key}`)) return tex;
    }
    return null;
}

export default class WalkingCharacter extends Phaser.GameObjects.Container {
    /**
     * @param {Phaser.Scene} scene
     * @param {object|null}  marketView
     * @param {{ startX, marginLeft, marginRight }} opts
     */
    constructor(scene, marketView = null, { startX = 320, marginLeft = 80, marginRight = 1840 } = {}) {
        super(scene, startX, FLOOR_Y);
        scene.add.existing(this);

        this._marketView = marketView;
        this._marginLeft = marginLeft;
        this._marginRight = marginRight;

        this.setDepth(155);

        this._frameIdx = 0;
        this._distAccum = 0;
        this._isMoving = false;
        this._facingRight = true;

        const img = scene.add.image(0, 0, 'char_walk_1');
        img.setOrigin(0.5, 1);
        img.setScale(DISPLAY_H / img.height);
        this._img = img;
        this.add(img);

        this._cartLayer = scene.add.container(CART_X, CART_Y);
        this._cartLayer.setScale(CART_LAYOUT_SCALE);
        this.add(this._cartLayer);

        this._cartFloor = scene.add.graphics();
        this._cartFloor.fillStyle(0x2a2a2a, 0.18);
        this._cartFloor.fillRoundedRect(-46, 4, 92, 28, 10);
        this._cartLayer.add(this._cartFloor);
        this._prevItemCount = 0;

        this._cursors = scene.input.keyboard.createCursorKeys();
        scene.events.on('update', this._onUpdate, this);
    }

    /** Returns the world-space centre of the cart basket. */
    getCartWorldPosition () {
        return {
            x: this.x + (this._facingRight ? CART_X : -CART_X),
            y: this.y + CART_Y,
        };
    }

    /** Call whenever the cart contents change to refresh the trolley visuals. */
    setCartItems (items = []) {
        this._clearCartIcons();

        const total = items.length;
        const visible = items.slice(-MAX_ICONS);
        const isAdding = total > this._prevItemCount;
        this._prevItemCount = total;

        const newestIdx = visible.length - 1;
        const layers = visible
            .map((item, i) => {
                const slot = CART_PILE_SLOTS[CART_FILL_ORDER[i] ?? i] ?? CART_PILE_SLOTS[4];
                const textureKey = resolveCartTextureKey(this.scene, item);
                return textureKey ? { slot, i, textureKey } : null;
            })
            .filter(Boolean)
            .sort((a, b) => a.slot.z - b.slot.z);

        for (const { slot, i, textureKey } of layers) {
            const size = ICON_SIZE * (slot.s ?? 1);
            const icon = this.scene.add.image(slot.x, slot.y, textureKey);
            icon.setDisplaySize(size, size);
            icon.setAngle(slot.r ?? 0);

            if (isAdding && i === newestIdx) {
                const tx = icon.scaleX;
                const ty = icon.scaleY;
                const angle = icon.angle;
                icon.setScale(0);
                icon.setAngle(angle - 18);
                this.scene.tweens.add({
                    targets: icon,
                    scaleX: tx,
                    scaleY: ty,
                    angle,
                    duration: 220,
                    ease: 'Back.easeOut',
                });
            }

            this._cartLayer.add(icon);
        }
    }

    _clearCartIcons () {
        const keep = new Set([this._cartFloor]);
        for (const child of [...this._cartLayer.list]) {
            if (!keep.has(child)) {
                child.destroy();
            }
        }
    }

    _onUpdate (_time, delta) {
        const { left, right } = this._cursors;
        const movingLeft = left.isDown;
        const movingRight = right.isDown;
        const moving = movingLeft || movingRight;

        if (!moving) {
            if (this._isMoving) {
                this._isMoving = false;
                this._distAccum = 0;
                this._frameIdx = 0;
                this._img.setTexture('char_walk_1');
            }
            return;
        }

        this._isMoving = true;

        if (movingRight && !this._facingRight) {
            this._facingRight = true;
            this._img.setFlipX(false);
            this._cartLayer.x = CART_X;
        } else if (movingLeft && this._facingRight) {
            this._facingRight = false;
            this._img.setFlipX(true);
            this._cartLayer.x = -CART_X;
        }

        const dx = (WALK_SPEED / 1000) * delta * (movingRight ? 1 : -1);
        const prevX = this.x;
        this.x = Phaser.Math.Clamp(this.x + dx, this._marginLeft, this._marginRight);
        const overflow = dx - (this.x - prevX);
        this._marketView?.scrollBy(-overflow);

        this._distAccum += Math.abs(dx);
        while (this._distAccum >= PX_PER_FRAME) {
            this._distAccum -= PX_PER_FRAME;
            this._frameIdx = (this._frameIdx + 1) % CHARACTER_FRAME_COUNT;
            this._img.setTexture(`char_walk_${this._frameIdx + 1}`);
        }
    }

    destroy (fromScene) {
        try { this.scene?.events.off('update', this._onUpdate, this); } catch { /* scene gone */ }
        super.destroy(fromScene);
    }
}
