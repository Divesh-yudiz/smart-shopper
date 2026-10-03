import Phaser from 'phaser';
import config from '../utils/config.js';
import { HUD_LAYOUT } from '../config/hudLayout.js';
import { UI_TEXTURE_KEYS } from '../config/componentAssets.js';

const BTN_SIZE = 118;
const GAP = 16;

/**
 * Phones and tablets have no arrow keys. A coarse pointer plus a short
 * viewport is a phone or tablet; a very short window gets the buttons too.
 */
export function isSmallPlayDevice () {
    if (typeof window === 'undefined') return false;
    const shortSide = Math.min(window.innerWidth, window.innerHeight);
    const coarse = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
    if (coarse) return shortSide <= 1300;
    return shortSide <= 700;
}

/**
 * Bottom-right hold buttons that walk the player left or right.
 * Hidden on desktop, where the arrow keys already move the character.
 */
export default class WalkControls extends Phaser.GameObjects.Container {
    constructor (scene, { onHold = () => { } } = {}) {
        const size = BTN_SIZE;
        const rightX = config.width - 32 - size / 2;
        const leftX = rightX - size - GAP;
        const y = HUD_LAYOUT.shoppingListBtnY;
        super(scene, (leftX + rightX) / 2, y);
        scene.add.existing(this);

        this._onHold = onHold;
        this._playable = true;
        this._held = { left: false, right: false };
        this.setDepth(330);

        const offset = (size + GAP) / 2;
        this._leftHit = this._addButton(-offset, UI_TEXTURE_KEYS.leftArrow, 'left');
        this._rightHit = this._addButton(offset, UI_TEXTURE_KEYS.rightArrow, 'right');
        this.syncVisibility();
    }

    syncVisibility () {
        const show = isSmallPlayDevice();
        this.setVisible(show);
        if (!show) this.release();
        this._applyInteractive();
    }

    setPlayable (enabled) {
        this._playable = enabled !== false;
        if (!this._playable) this.release();
        this._applyInteractive();
    }

    release () {
        if (this._held.left) this._setHeld('left', false);
        if (this._held.right) this._setHeld('right', false);
    }

    _addButton (x, key, direction) {
        const img = this.scene.add.image(x, 0, key);
        img.setDisplaySize(BTN_SIZE, BTN_SIZE);
        this.add(img);

        const hit = this.scene.add.circle(x, 0, BTN_SIZE * 0.42, 0, 0);
        this.add(hit);
        hit.on('pointerdown', () => this._setHeld(direction, true));
        hit.on('pointerup', () => this._setHeld(direction, false));
        hit.on('pointerupoutside', () => this._setHeld(direction, false));
        hit.setData('button', img);
        return hit;
    }

    _setHeld (direction, held) {
        if (held && (!this._playable || !this.visible)) return;
        if (this._held[direction] === held) return;
        this._held[direction] = held;
        const hit = direction === 'left' ? this._leftHit : this._rightHit;
        const img = hit?.getData('button');
        if (img) {
            const base = BTN_SIZE / img.width;
            img.setScale(held ? base * 0.94 : base);
        }
        this._onHold(direction, held);
    }

    _applyInteractive () {
        const on = this.visible && this._playable;
        for (const hit of [this._leftHit, this._rightHit]) {
            if (!hit) continue;
            if (on) hit.setInteractive({ useHandCursor: false });
            else if (hit.input) hit.disableInteractive();
        }
    }
}
