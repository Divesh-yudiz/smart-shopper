import Phaser from 'phaser';
import config from '../utils/config.js';
import {
    characterAssetPaths,
    ensureCharacterWalkAnim,
    IDLE_TEXTURE_KEY,
    WALK_ANIM_KEY,
} from '../config/characterAssets.js';

// ── tunables ──────────────────────────────────────────────────────────────────
const DISPLAY_H = 400;
const CART_LAYOUT_BASE_H = 480;
const CART_LAYOUT_SCALE = DISPLAY_H / CART_LAYOUT_BASE_H;
const WALK_SPEED = 260;   // px / second
const WALK_ANIM_FPS = 26;
const FLOOR_Y = config.height - 142;

const CART_X = 120 * CART_LAYOUT_SCALE;
const SPRITE_HALF_W = Math.round(DISPLAY_H / 2);
const CART_Y = -160 * CART_LAYOUT_SCALE;
const ICON_SIZE = 52;
const MAX_ICONS = 8;

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

const CART_FILL_ORDER = [4, 2, 6, 1, 5, 0, 3, 7];

/** Native arrow-key state — reliable after page refresh (Phaser keyboard can stall). */
function attachArrowKeyListeners (host) {
    host._keys = { left: false, right: false };

    host._onKeyDown = (e) => {
        if (e.code === 'ArrowLeft') {
            host._keys.left = true;
            e.preventDefault();
        } else if (e.code === 'ArrowRight') {
            host._keys.right = true;
            e.preventDefault();
        }
    };

    host._onKeyUp = (e) => {
        if (e.code === 'ArrowLeft') host._keys.left = false;
        else if (e.code === 'ArrowRight') host._keys.right = false;
    };

    host._clearKeys = () => {
        host._keys.left = false;
        host._keys.right = false;
    };

    window.addEventListener('keydown', host._onKeyDown);
    window.addEventListener('keyup', host._onKeyUp);
    window.addEventListener('blur', host._clearKeys);
    document.addEventListener('visibilitychange', host._onVisibilityChange = () => {
        if (document.visibilityState === 'hidden') host._clearKeys();
    });
}

function detachArrowKeyListeners (host) {
    if (host._onKeyDown) window.removeEventListener('keydown', host._onKeyDown);
    if (host._onKeyUp) window.removeEventListener('keyup', host._onKeyUp);
    if (host._clearKeys) window.removeEventListener('blur', host._clearKeys);
    if (host._onVisibilityChange) {
        document.removeEventListener('visibilitychange', host._onVisibilityChange);
    }
}

function resolveCartTextureKey (scene, item) {
    if (item?.textureKey && scene.textures.exists(item.textureKey)) {
        return item.textureKey;
    }
    const sItemKey = item?.sItemKey;
    if (sItemKey) {
        const normal = `api_item_${String(sItemKey).replace(/[^a-zA-Z0-9_-]/g, '_')}_normal`;
        if (scene.textures.exists(normal)) return normal;
        const eco = `api_item_${String(sItemKey).replace(/[^a-zA-Z0-9_-]/g, '_')}_eco`;
        if (scene.textures.exists(eco)) return eco;
    }
    return null;
}

export default class WalkingCharacter extends Phaser.GameObjects.Container {
    constructor(scene, marketView = null, { startX = 320, marginLeft = 80, marginRight = 1840 } = {}) {
        super(scene, startX, FLOOR_Y);
        scene.add.existing(this);

        this._marketView = marketView;
        this._marginLeft = marginLeft;
        this._marginRight = marginRight;
        this._rightLimit = null;

        this.setDepth(155);

        this._isMoving = false;
        this._facingRight = true;
        this._inputEnabled = true;
        this._hold = { left: false, right: false };

        ensureCharacterWalkAnim(scene, WALK_ANIM_FPS);

        // Cart pile sits BEHIND the character sprites so items read as inside the trolley
        // mesh (which is painted into the character frames).
        this._cartLayer = scene.add.container(CART_X, CART_Y);
        this._cartLayer.setScale(CART_LAYOUT_SCALE);
        this.add(this._cartLayer);
        this.sendToBack(this._cartLayer);

        this._cartFloor = scene.add.graphics();
        this._cartFloor.fillStyle(0x2a2a2a, 0.18);
        this._cartFloor.fillRoundedRect(-46, 4, 92, 28, 10);
        this._cartLayer.add(this._cartFloor);
        this._prevItemCount = 0;

        // Character body / cart mesh drawn on top of trolley items.
        const idleKey = this._idleTextureKey();
        const firstWalkKey = characterAssetPaths.find(({ key }) => key !== idleKey)?.key ?? 'char_walk_1';

        this._idleImg = scene.add.image(0, 0, idleKey);
        this._idleImg.setOrigin(0.5, 1);
        this._idleImg.setScale(DISPLAY_H / this._idleImg.height);
        this.add(this._idleImg);

        this._walkSpr = scene.add.sprite(0, 0, firstWalkKey);
        this._walkSpr.setOrigin(0.5, 1);
        this._walkSpr.setScale(DISPLAY_H / this._walkSpr.height);
        this._walkSpr.setVisible(false);
        this.add(this._walkSpr);

        attachArrowKeyListeners(this);
        this._setWalkPlaying(false);

        // Register on the scene event bus — works in every scene-start path,
        // unlike preUpdate which is skipped for Containers in some Phaser versions.
        scene.events.on('update', this._onUpdate, this);
    }

    _syncFacingFlip () {
        const flip = !this._facingRight;
        this._idleImg.setFlipX(flip);
        this._walkSpr.setFlipX(flip);
    }

    getCartWorldPosition () {
        // Aim toward the basket bowl (slightly below the cart-layer origin).
        return {
            x: this.x + (this._facingRight ? CART_X : -CART_X),
            y: this.y + CART_Y + 18 * CART_LAYOUT_SCALE,
        };
    }

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

    _idleTextureKey () {
        return this.scene.textures.exists(IDLE_TEXTURE_KEY) ? IDLE_TEXTURE_KEY : 'char_walk_1';
    }

    _clearCartIcons () {
        const keep = new Set([this._cartFloor]);
        for (const child of [...this._cartLayer.list]) {
            if (!keep.has(child)) {
                child.destroy();
            }
        }
    }

    _setWalkPlaying (playing) {
        if (!this._idleImg || !this._walkSpr) return;

        if (playing) {
            this._idleImg.setVisible(false);
            this._walkSpr.setVisible(true);
            if (!this._walkSpr.anims.isPlaying || this._walkSpr.anims.currentAnim?.key !== WALK_ANIM_KEY) {
                this._walkSpr.play(WALK_ANIM_KEY, true);
            }
            return;
        }

        if (this._walkSpr.anims.isPlaying) {
            this._walkSpr.anims.stop();
        }
        this._walkSpr.setVisible(false);
        this._idleImg.setVisible(true);
    }

    /**
     * Extra right wall in world X (character origin). Used so the player
     * cannot walk under the expanded shopping-list panel. Pass null to clear.
     */
    setRightLimit (x) {
        this._rightLimit = Number.isFinite(x) ? x : null;
        if (this._rightLimit != null && this.x > this._rightLimit) {
            this.x = this._rightLimit;
        }
    }

    /** On-screen arrow buttons. Kept separate from the keyboard so releasing one does not cancel the other. */
    setMoveHold (direction, held) {
        if (!this._hold) this._hold = { left: false, right: false };
        if (direction !== 'left' && direction !== 'right') return;
        if (held && !this._inputEnabled) return;
        this._hold[direction] = !!held;
    }

    setInputEnabled (enabled) {
        this._inputEnabled = enabled !== false;
        if (!this._inputEnabled) {
            this._clearKeys?.();
            if (this._hold) {
                this._hold.left = false;
                this._hold.right = false;
            }
            if (this._isMoving) {
                this._isMoving = false;
                this._setWalkPlaying(false);
            }
        }
        this.emit('inputenabled', this._inputEnabled);
    }

    _onUpdate (_time, delta) {
        if (!this._inputEnabled) {
            if (this._isMoving) {
                this._isMoving = false;
                this._setWalkPlaying(false);
            }
            return;
        }

        const movingLeft = !!(this._keys?.left || this._hold?.left);
        const movingRight = !!(this._keys?.right || this._hold?.right);
        const moving = movingLeft || movingRight;

        if (!moving) {
            if (this._isMoving) {
                this._isMoving = false;
                this._setWalkPlaying(false);
            }
            return;
        }

        if (!this._isMoving) {
            this._isMoving = true;
            this._setWalkPlaying(true);
        }

        if (movingRight && !this._facingRight) {
            this._facingRight = true;
            this._syncFacingFlip();
            this._cartLayer.x = CART_X;
        } else if (movingLeft && this._facingRight) {
            this._facingRight = false;
            this._syncFacingFlip();
            this._cartLayer.x = -CART_X;
        }

        const dx = (WALK_SPEED / 1000) * delta * (movingRight ? 1 : -1);
        const prevX = this.x;

        const mv = this._marketView;
        // Use a 1px tolerance so floating-point scroll values that are just
        // barely off the limit (e.g. -0.0003 instead of 0) still trigger the wall.
        const atLeftWall = !mv || mv.scrollX >= mv.scrollMaxX - 1;
        const atRightWall = !mv || mv.scrollX <= mv.scrollMinX + 1;
        const effectiveLeft = atLeftWall ? SPRITE_HALF_W : this._marginLeft;
        let effectiveRight = atRightWall ? config.width - SPRITE_HALF_W : this._marginRight;
        if (this._rightLimit != null) {
            effectiveRight = Math.min(effectiveRight, this._rightLimit);
        }

        this.x = Phaser.Math.Clamp(this.x + dx, effectiveLeft, effectiveRight);
        const overflow = dx - (this.x - prevX);
        this._marketView?.scrollBy(-overflow);
    }

    destroy (fromScene) {
        detachArrowKeyListeners(this);
        try { this.scene?.events.off('update', this._onUpdate, this); } catch { /* scene gone */ }
        this._setWalkPlaying(false);
        super.destroy(fromScene);
    }
}
