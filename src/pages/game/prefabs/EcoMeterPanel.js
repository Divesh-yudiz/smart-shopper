import Phaser from 'phaser';
import { UI_TEXTURE_KEYS } from '../config/componentAssets.js';
import { addCauseText, setCauseText } from '../utils/gameText.js';

const PANEL_NATIVE_W = 663;
const PANEL_NATIVE_H = 376;
const DEFAULT_W = 300;

const BAR_CHUNK_KEYS = [
    UI_TEXTURE_KEYS.ecoBar1,
    UI_TEXTURE_KEYS.ecoBar2,
    UI_TEXTURE_KEYS.ecoBar3,
    UI_TEXTURE_KEYS.ecoBar4,
    UI_TEXTURE_KEYS.ecoBar5,
    UI_TEXTURE_KEYS.ecoBar6,
];
/** Native widths so the six chunks keep their art proportions when tiled. */
const BAR_CHUNK_WIDTHS = [36, 36, 37, 35, 42, 49];
const BAR_CHUNK_TOTAL_W = BAR_CHUNK_WIDTHS.reduce((sum, w) => sum + w, 0);

const C_TITLE = '#1F6B28';
const C_BODY = '#2A7A32';
const TRACK_FILL = 0xD8D8D8;

/**
 * Eco Meter HUD card — cream panel, green E icon, remaining text + loading-bar fill.
 */
export default class EcoMeterPanel extends Phaser.GameObjects.Container {
    constructor (scene, x, y, {
        value = 0,
        max = 100,
        displayWidth = DEFAULT_W,
    } = {}) {
        super(scene, x, y);
        scene.add.existing(this);
        this.setDepth(300);

        this._value = Math.max(0, value);
        this._displayValue = this._value;
        this._max = Math.max(1, max);
        this._roll = { value: this._displayValue };
        this._rollToken = 0;
        this._flashToken = 0;
        this._shownLit = null;

        const w = displayWidth;
        const h = w * (PANEL_NATIVE_H / PANEL_NATIVE_W);
        this._w = w;
        this._h = h;
        const halfW = w / 2;
        const halfH = h / 2;

        const panel = scene.add.image(0, 0, UI_TEXTURE_KEYS.timerBg);
        panel.setOrigin(0.5, 0.5);
        panel.setDisplaySize(w, h);
        this.add(panel);

        const insetX = w * 0.10;
        const iconSize = h * 0.36;
        const iconX = -halfW + insetX + iconSize / 2;
        const topY = -halfH + h * 0.38;

        const icon = scene.add.image(iconX, topY, UI_TEXTURE_KEYS.ecoGreenIcon);
        icon.setDisplaySize(iconSize, iconSize);
        this.add(icon);
        this._icon = icon;

        const textX = iconX + iconSize / 2 + w * 0.028;
        const textRight = halfW - insetX;
        this._statusMaxW = Math.max(80, textRight - textX);

        const titleSize = Math.max(17, Math.round(h * 0.17));
        const bodySize = Math.max(14, Math.round(h * 0.145));
        this._bodySize = bodySize;

        this.add(addCauseText(scene, textX, topY - h * 0.06, 'Eco Meter', {
            fontSize: `${titleSize}px`,
            fontStyle: 'bold',
            color: C_TITLE,
            align: 'left',
        }).setOrigin(0, 0.5));

        this._statusText = addCauseText(
            scene,
            textX,
            topY + h * 0.11,
            this._statusLabel(),
            {
                fontSize: `${bodySize}px`,
                fontStyle: 'bold',
                color: C_BODY,
                align: 'left',
            },
        ).setOrigin(0, 0.5);
        this.add(this._statusText);
        this._fitStatusText();

        const barW = w - insetX * 2;
        const barH = Math.max(18, h * 0.155);
        const barY = halfH - h * 0.30;
        this._barLeft = -barW / 2;
        this._barW = barW;
        this._barH = barH;
        this._barY = barY;

        // Dim track behind the chunked fill.
        const track = scene.add.graphics();
        const r = barH / 2;
        track.fillStyle(TRACK_FILL, 1);
        track.fillRoundedRect(this._barLeft, barY - barH / 2, barW, barH, r);
        this.add(track);

        this._barChunks = [];
        let chunkX = this._barLeft;
        BAR_CHUNK_KEYS.forEach((key, index) => {
            const chunkW = barW * (BAR_CHUNK_WIDTHS[index] / BAR_CHUNK_TOTAL_W);
            const chunk = scene.add.image(chunkX, barY, key);
            chunk.setOrigin(0, 0.5);
            chunk.setDisplaySize(chunkW, barH);
            this.add(chunk);
            this._barChunks.push(chunk);
            chunkX += chunkW;
        });

        this._drawBar();
    }

    _statusLabel () {
        const v = Math.round(this._displayValue);
        const m = Math.round(this._max);
        return `${v} remaining out of ${m}`;
    }

    _fitStatusText () {
        if (!this._statusText || !this._statusMaxW) return;
        this._statusText.setScale(1);
        const tw = this._statusText.width;
        if (tw > this._statusMaxW) {
            this._statusText.setScale(this._statusMaxW / tw);
        }
    }

    _litSegments () {
        if (this._displayValue <= 0) return 0;
        const parts = BAR_CHUNK_KEYS.length;
        return Phaser.Math.Clamp(
            Math.ceil((this._displayValue / this._max) * parts),
            0,
            parts,
        );
    }

    _drawBar () {
        this._syncChunks(false);
    }

    _syncChunks (animate) {
        const lit = this._litSegments();
        if (this._shownLit === lit) return;
        const prev = this._shownLit ?? lit;
        this._shownLit = lit;

        this._barChunks.forEach((chunk, index) => {
            const show = index < lit;
            this.scene.tweens.killTweensOf(chunk);
            if (!animate) {
                chunk.setVisible(show);
                chunk.setAlpha(1);
                return;
            }
            if (show && index >= prev) {
                chunk.setVisible(true);
                chunk.setAlpha(0.25);
                this.scene.tweens.add({
                    targets: chunk,
                    alpha: 1,
                    duration: 200,
                    ease: 'Quad.easeOut',
                });
                return;
            }
            if (!show && index < prev) {
                chunk.setVisible(true);
                this.scene.tweens.add({
                    targets: chunk,
                    alpha: 0,
                    duration: 160,
                    ease: 'Quad.easeIn',
                    onComplete: () => {
                        if (index >= this._litSegments()) {
                            chunk.setVisible(false);
                            chunk.setAlpha(1);
                        }
                    },
                });
                return;
            }
            chunk.setVisible(show);
            chunk.setAlpha(1);
        });
    }

    setProgress (value, max = this._max) {
        const nextMax = max != null ? Math.max(1, max) : this._max;
        const next = Phaser.Math.Clamp(value, 0, nextMax);
        const maxChanged = nextMax !== this._max;
        this._max = nextMax;

        if (Math.abs(next - this._value) < 0.001) {
            if (maxChanged) {
                this._shownLit = null;
                this._publishStatus();
                this._drawBar();
            }
            return;
        }

        const delta = Math.round(next) - Math.round(this._value);
        this._value = next;
        this._rollTo(next);
        if (delta !== 0) {
            this._flashStatus(delta);
            this._pulse(this._icon);
            this._floatDelta(delta);
        }
    }

    _publishStatus () {
        setCauseText(this._statusText, this._statusLabel());
        this._fitStatusText();
    }

    _rollTo (target) {
        const token = ++this._rollToken;
        this.scene.tweens.killTweensOf(this._roll);
        this._roll.value = this._displayValue;
        const distance = Math.abs(target - this._displayValue);
        this.scene.tweens.add({
            targets: this._roll,
            value: target,
            duration: Phaser.Math.Clamp(240 + distance * 16, 320, 900),
            ease: 'Cubic.easeOut',
            onUpdate: () => {
                if (!this.active || token !== this._rollToken) return;
                this._displayValue = this._roll.value;
                this._publishStatus();
                this._syncChunks(true);
            },
            onComplete: () => {
                if (!this.active || token !== this._rollToken) return;
                this._displayValue = target;
                this._publishStatus();
                this._syncChunks(true);
            },
        });
    }

    _flashStatus (delta) {
        const token = ++this._flashToken;
        this._statusText.setColor(delta < 0 ? '#E04545' : '#1B8C34');
        this.scene.time.delayedCall(340, () => {
            if (this.active && token === this._flashToken) this._statusText.setColor(C_BODY);
        });
    }

    _pulse (obj) {
        if (!obj?.active) return;
        const baseX = obj._pulseBaseX ?? obj.scaleX;
        const baseY = obj._pulseBaseY ?? obj.scaleY;
        obj._pulseBaseX = baseX;
        obj._pulseBaseY = baseY;
        this.scene.tweens.killTweensOf(obj);
        obj.setScale(baseX, baseY);
        this.scene.tweens.add({
            targets: obj,
            scaleX: baseX * 1.16,
            scaleY: baseY * 1.16,
            duration: 140,
            yoyo: true,
            ease: 'Quad.easeOut',
            onComplete: () => {
                if (obj.active) obj.setScale(baseX, baseY);
            },
        });
    }

    _floatDelta (delta) {
        const label = delta > 0 ? `+${delta}` : `${delta}`;
        const floater = addCauseText(
            this.scene,
            this._icon.x,
            this._icon.y - this._icon.displayHeight * 0.42,
            label,
            {
                fontSize: `${Math.max(14, Math.round(this._bodySize * 0.95))}px`,
                fontStyle: 'bold',
                color: delta > 0 ? '#1B8C34' : '#E04545',
            },
        ).setOrigin(0.5, 1);
        this.add(floater);
        this.scene.tweens.add({
            targets: floater,
            y: floater.y - 22,
            alpha: 0,
            duration: 700,
            ease: 'Cubic.easeOut',
            onComplete: () => floater.destroy(),
        });
    }

    getValue () { return this._value; }
    getMax () { return this._max; }
}
