import Phaser from 'phaser';
import { UI_TEXTURE_KEYS } from '../config/componentAssets.js';
import { addCauseText, setCauseText } from '../utils/gameText.js';

const PANEL_NATIVE_W = 663;
const PANEL_NATIVE_H = 376;
const DEFAULT_W = 300;

const C_VALUE = '#1A1A1A';
const C_REMAINING = '#5A5A5A';
const C_BAR = 0x1F6B28;
const C_BAR_TEXT = '#ffffff';

/**
 * Shopping budget / coins HUD card — cream panel, gold coin, remaining + green bar.
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
        this._max = Math.max(1, Math.round(max));

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
        const topY = -halfH + h * 0.34;

        const coin = scene.add.image(iconX, topY, UI_TEXTURE_KEYS.ecoGoldIcon);
        coin.setDisplaySize(iconSize, iconSize);
        this.add(coin);

        const textX = iconX + iconSize / 2 + w * 0.035;
        const valueSize = Math.max(28, Math.round(h * 0.28));
        const labelSize = Math.max(13, Math.round(h * 0.13));

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

        const barW = w - insetX * 2;
        const barH = Math.max(26, h * 0.20);
        const barY = halfH - h * 0.20;
        const barLeft = -barW / 2;
        const barRight = barW / 2;
        const r = barH / 2;

        const barGfx = scene.add.graphics();
        barGfx.fillStyle(C_BAR, 1);
        barGfx.fillRoundedRect(barLeft, barY - barH / 2, barW, barH, r);
        barGfx.fillStyle(0xffffff, 0.12);
        barGfx.fillRoundedRect(barLeft + 2, barY - barH / 2 + 2, barW - 4, barH * 0.4, {
            tl: r - 1, tr: r - 1, bl: 0, br: 0,
        });
        this.add(barGfx);

        const barPad = Math.max(10, barH * 0.35);
        const barLabelSize = Math.max(12, Math.round(barH * 0.42));
        this.add(addCauseText(scene, barLeft + barPad, barY, 'Shopping Budget', {
            fontSize: `${barLabelSize}px`,
            fontStyle: 'bold',
            color: C_BAR_TEXT,
        }).setOrigin(0, 0.5));

        const miniSize = barH * 0.68;
        const amountSize = Math.max(13, Math.round(barH * 0.48));
        this._barAmountText = addCauseText(scene, barRight - barPad, barY, `${this._amount}`, {
            fontSize: `${amountSize}px`,
            fontStyle: 'bold',
            color: C_BAR_TEXT,
        }).setOrigin(1, 0.5);
        this.add(this._barAmountText);

        // Measure amount width after create for stable mini-coin placement.
        const amountW = Math.max(28, this._barAmountText.width);
        const mini = scene.add.image(barRight - barPad - amountW - 6 - miniSize / 2, barY, UI_TEXTURE_KEYS.ecoGoldIcon);
        mini.setDisplaySize(miniSize, miniSize);
        this.add(mini);
        this._miniCoin = mini;
        this._barRight = barRight;
        this._barPad = barPad;
        this._miniSize = miniSize;
    }

    setAmount (amount, max = this._max) {
        this._amount = Math.max(0, Math.round(amount));
        if (max != null) this._max = Math.max(1, Math.round(max));
        setCauseText(this._valueText, `${this._amount}`);
        setCauseText(this._barAmountText, `${this._amount}`);
        if (this._miniCoin) {
            const amountW = Math.max(28, this._barAmountText.width);
            this._miniCoin.x = this._barRight - this._barPad - amountW - 6 - this._miniSize / 2;
        }
    }

    getAmount () {
        return this._amount;
    }
}
