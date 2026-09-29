import Phaser from 'phaser';
import { UI_TEXTURE_KEYS } from '../config/componentAssets.js';
import { addCauseText, setCauseText } from '../utils/gameText.js';

const PANEL_NATIVE_W = 663;
const PANEL_NATIVE_H = 376;
const DEFAULT_W = 300;

const BAR_NATIVE_W = 236;
const BAR_NATIVE_H = 21;
const SEGMENTS = 6;

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
        this._max = Math.max(1, max);

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

        const textX = iconX + iconSize / 2 + w * 0.028;
        const textRight = halfW - insetX;
        this._statusMaxW = Math.max(80, textRight - textX);

        const titleSize = Math.max(17, Math.round(h * 0.17));
        const bodySize = Math.max(11, Math.round(h * 0.105));

        this.add(addCauseText(scene, textX, topY - bodySize * 0.55, 'Eco Meter', {
            fontSize: `${titleSize}px`,
            fontStyle: 'bold',
            color: C_TITLE,
            align: 'left',
        }).setOrigin(0, 0.5));

        this._statusText = addCauseText(
            scene,
            textX,
            topY + titleSize * 0.48,
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

        // Dim track behind the colorful fill.
        const track = scene.add.graphics();
        const r = barH / 2;
        track.fillStyle(TRACK_FILL, 1);
        track.fillRoundedRect(this._barLeft, barY - barH / 2, barW, barH, r);
        this.add(track);

        this._barImg = scene.add.image(this._barLeft, barY, UI_TEXTURE_KEYS.ecoLoadingBar);
        this._barImg.setOrigin(0, 0.5);
        this.add(this._barImg);

        this._drawBar();
    }

    _statusLabel () {
        const v = Math.round(this._value);
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

    _progressRatio () {
        // Snap to the 6 painted segments so crop lines up with the dividers.
        const lit = Math.max(0, Math.min(
            SEGMENTS,
            Math.ceil((this._value / this._max) * SEGMENTS),
        ));
        return lit / SEGMENTS;
    }

    _drawBar () {
        const ratio = this._progressRatio();
        if (ratio <= 0) {
            this._barImg.setVisible(false);
            return;
        }

        this._barImg.setVisible(true);
        const cropW = Math.max(1, Math.round(BAR_NATIVE_W * ratio));
        this._barImg.setCrop(0, 0, cropW, BAR_NATIVE_H);
        this._barImg.setDisplaySize(
            Math.max(1, this._barW * ratio),
            this._barH,
        );
    }

    setProgress (value, max = this._max) {
        if (max != null) this._max = Math.max(1, max);
        this._value = Phaser.Math.Clamp(value, 0, this._max);
        setCauseText(this._statusText, this._statusLabel());
        this._fitStatusText();
        this._drawBar();
    }

    getValue () { return this._value; }
    getMax () { return this._max; }
}
