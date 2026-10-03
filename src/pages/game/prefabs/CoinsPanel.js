import Phaser from 'phaser';
import { UI_TEXTURE_KEYS } from '../config/componentAssets.js';
import { addCauseText, setCauseText } from '../utils/gameText.js';

const PANEL_NATIVE_W = 663;
const PANEL_NATIVE_H = 376;
const DEFAULT_W = 300;

const C_VALUE = '#1A1A1A';
const C_REMAINING = '#5A5A5A';
const C_BAR = 0x1F6B28;
const C_TRACK = 0xD8D8D8;

/**
 * Shopping budget / coins HUD card — cream panel, gold coin, remaining + green bar tip.
 */
export default class CoinsPanel extends Phaser.GameObjects.Container {
    constructor (scene, x, y, {
        amount = 0,
        max = amount,
        displayWidth = DEFAULT_W,
    } = {}) {
        super(scene, x, y);
        scene.add.existing(this);
        this.setDepth(300);

        this._amount = Math.max(0, Math.round(amount));
        this._displayAmount = this._amount;
        this._max = Math.max(1, Math.round(max));
        this._roll = { value: this._displayAmount };
        this._rollToken = 0;
        this._flashToken = 0;

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

        // Keep content inside the cream inset (bg art has transparent padding).
        const insetX = w * 0.08;
        const iconSize = h * 0.38;
        const iconX = -halfW + insetX + iconSize / 2;
        const topY = -halfH + h * 0.38;

        const coin = scene.add.image(iconX, topY, UI_TEXTURE_KEYS.ecoGoldIcon);
        coin.setDisplaySize(iconSize, iconSize);
        this.add(coin);
        this._coin = coin;

        const textX = iconX + iconSize / 2 + w * 0.035;
        const valueSize = Math.max(28, Math.round(h * 0.28));
        const labelSize = Math.max(13, Math.round(h * 0.13));
        this._valueSize = valueSize;

        this._valueText = addCauseText(scene, textX, topY - labelSize * 0.55, `${this._amount}`, {
            fontSize: `${valueSize}px`,
            fontStyle: 'bold',
            color: C_VALUE,
            align: 'left',
        }).setOrigin(0, 0.5);
        this.add(this._valueText);

        this._remainingLabel = addCauseText(scene, textX, topY + valueSize * 0.38, 'Remaining', {
            fontSize: `${labelSize}px`,
            fontStyle: 'bold',
            color: C_REMAINING,
            align: 'left',
        }).setOrigin(0, 0.5);
        this.add(this._remainingLabel);

        const tipSize = Math.max(18, Math.max(14, h * 0.11) * 1.55);
        const rightPad = Math.max(14, tipSize * 0.55);
        const barW = w - insetX * 2 - rightPad;
        const barH = Math.max(14, h * 0.11);
        const barY = halfH - h * 0.30;
        this._barLeft = -halfW + insetX;
        this._barW = barW;
        this._barH = barH;
        this._barY = barY;
        this._barR = barH / 2;

        this._trackGfx = scene.add.graphics();
        this.add(this._trackGfx);
        this._fillGfx = scene.add.graphics();
        this.add(this._fillGfx);

        this._tipCoin = scene.add.image(this._barLeft, barY, UI_TEXTURE_KEYS.ecoGoldIcon);
        this._tipCoin.setDisplaySize(tipSize, tipSize);
        this.add(this._tipCoin);
        this._tipSize = tipSize;

        this._drawBar();
    }

    _ratio () {
        return Phaser.Math.Clamp(this._displayAmount / this._max, 0, 1);
    }

    _drawBar () {
        const ratio = this._ratio();
        const { _barLeft: left, _barW: barW, _barH: barH, _barY: barY, _barR: r } = this;
        const top = barY - barH / 2;
        const fillW = Math.max(ratio > 0 ? r * 2 : 0, barW * ratio);

        this._trackGfx.clear();
        this._trackGfx.fillStyle(C_TRACK, 1);
        this._trackGfx.fillRoundedRect(left, top, barW, barH, r);

        this._fillGfx.clear();
        if (fillW > 0) {
            this._fillGfx.fillStyle(C_BAR, 1);
            this._fillGfx.fillRoundedRect(left, top, fillW, barH, r);
            this._fillGfx.fillStyle(0xffffff, 0.14);
            this._fillGfx.fillRoundedRect(left + 2, top + 2, Math.max(0, fillW - 4), barH * 0.4, {
                tl: r - 1, tr: r - 1, bl: 0, br: 0,
            });
        }

        // Coin sits on the leading tip of the fill.
        const tipX = left + fillW;
        this._tipCoin.setPosition(tipX, barY);
        this._tipCoin.setVisible(ratio > 0.001);
    }

    setAmount (amount, max = this._max) {
        const nextMax = max != null ? Math.max(1, Math.round(max)) : this._max;
        const next = Math.max(0, Math.round(amount));
        const maxChanged = nextMax !== this._max;
        this._max = nextMax;

        if (next === this._amount) {
            if (maxChanged) this._drawBar();
            return;
        }

        const delta = next - this._amount;
        this._amount = next;
        this._rollTo(next);
        this._flashValue(delta);
        this._pulse(this._coin);
        this._pulse(this._valueText);
        this._pulse(this._tipCoin);
        this._floatDelta(delta);
    }

    _rollTo (target) {
        const token = ++this._rollToken;
        this.scene.tweens.killTweensOf(this._roll);
        this._roll.value = this._displayAmount;
        const distance = Math.abs(target - this._displayAmount);
        this.scene.tweens.add({
            targets: this._roll,
            value: target,
            duration: Phaser.Math.Clamp(240 + distance * 16, 320, 900),
            ease: 'Cubic.easeOut',
            onUpdate: () => {
                if (!this.active || token !== this._rollToken) return;
                this._displayAmount = this._roll.value;
                setCauseText(this._valueText, `${Math.round(this._displayAmount)}`);
                this._drawBar();
            },
            onComplete: () => {
                if (!this.active || token !== this._rollToken) return;
                this._displayAmount = target;
                setCauseText(this._valueText, `${Math.round(target)}`);
                this._drawBar();
            },
        });
    }

    _flashValue (delta) {
        const token = ++this._flashToken;
        this._valueText.setColor(delta < 0 ? '#E04545' : '#1B8C34');
        this.scene.time.delayedCall(340, () => {
            if (this.active && token === this._flashToken) this._valueText.setColor(C_VALUE);
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
        if (!delta) return;
        const label = delta > 0 ? `+${delta}` : `${delta}`;
        const floater = addCauseText(this.scene, this._valueText.x + this._valueText.width + 8, this._valueText.y, label, {
            fontSize: `${Math.max(16, Math.round(this._valueSize * 0.55))}px`,
            fontStyle: 'bold',
            color: delta > 0 ? '#1B8C34' : '#E04545',
        }).setOrigin(0, 0.5);
        this.add(floater);
        this.scene.tweens.add({
            targets: floater,
            y: floater.y - 26,
            alpha: 0,
            duration: 700,
            ease: 'Cubic.easeOut',
            onComplete: () => floater.destroy(),
        });
    }

    getAmount () {
        return this._amount;
    }
}
