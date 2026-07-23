import Phaser from 'phaser';
import config from '../utils/config.js';

const TRACK_BG = 0x152a42;
const TRACK_BORDER = 0x5a7a9a;
const DEFAULT_FILL = 0x27ae60;
const LABEL_COLOR = '#c8dce8';
const VALUE_COLOR = '#ffffff';
const LABEL_SIZE = 12;
const LABEL_GAP = 6;

/** Total vertical space one meter row occupies (label + gap + bar). */
export function hudMeterRowHeight (barH = 22) {
    return LABEL_SIZE + LABEL_GAP + barH;
}

/**
 * Horizontal HUD progress bar — label above bar, value centered on fill.
 */
export default class HudProgressBar extends Phaser.GameObjects.Container {
    constructor(scene, x, y, {
        width = 200,
        height = 22,
        label = '',
        max = 100,
        value = 0,
        fillColor = DEFAULT_FILL,
        bgColor = TRACK_BG,
        borderColor = TRACK_BORDER,
        formatText = null,
    } = {}) {
        super(scene, x, y);
        scene.add.existing(this);

        this._barW = width;
        this._barH = height;
        this._max = Math.max(1, max);
        this._value = value;
        this._fillColor = fillColor;
        this._bgColor = bgColor;
        this._borderColor = borderColor;
        this._formatText = formatText ?? ((v) => `${Math.round(v)}`);

        const barY = LABEL_SIZE + LABEL_GAP + height / 2;

        this._labelText = scene.add.text(0, 0, label, {
            fontFamily: config.fonts.text,
            fontSize: `${LABEL_SIZE}px`,
            fontStyle: 'bold',
            color: LABEL_COLOR,
            letterSpacing: 1,
        }).setOrigin(0, 0);
        this.add(this._labelText);

        this._bgGfx = scene.add.graphics();
        this.add(this._bgGfx);

        this._fillGfx = scene.add.graphics();
        this.add(this._fillGfx);

        this._valueText = scene.add.text(width / 2, barY, '', {
            fontFamily: config.fonts.text,
            fontSize: '14px',
            fontStyle: 'bold',
            color: VALUE_COLOR,
            stroke: '#0a1520',
            strokeThickness: 4,
        }).setOrigin(0.5, 0.5);
        this.add(this._valueText);

        this._barY = barY;
        this.setProgress(value, max);
    }

    setProgress (value, max = this._max) {
        this._max = Math.max(1, max);
        this._value = Phaser.Math.Clamp(value, 0, this._max);
        this._redraw();
    }

    setFillColor (color) {
        this._fillColor = color;
        this._redraw();
    }

    _redraw () {
        const ratio = this._value / this._max;
        const r = this._barH / 2;
        const left = 0;
        const top = this._barY - this._barH / 2;

        this._bgGfx.clear();
        this._bgGfx.fillStyle(this._bgColor, 1);
        this._bgGfx.fillRoundedRect(left, top, this._barW, this._barH, r);
        this._bgGfx.lineStyle(1.5, this._borderColor, 1);
        this._bgGfx.strokeRoundedRect(left, top, this._barW, this._barH, r);

        this._fillGfx.clear();
        if (ratio > 0) {
            const fillW = Math.max(r * 2, this._barW * ratio);
            this._fillGfx.fillStyle(this._fillColor, 1);
            this._fillGfx.fillRoundedRect(left, top, fillW, this._barH, r);
            this._fillGfx.fillStyle(0xffffff, 0.14);
            this._fillGfx.fillRoundedRect(left + 2, top + 2, Math.max(0, fillW - 4), this._barH * 0.42, {
                tl: r - 1,
                tr: r - 1,
                bl: 0,
                br: 0,
            });
        }

        this._valueText.setText(this._formatText(this._value, this._max));
        this._valueText.setY(this._barY);
    }

    getValue () { return this._value; }
    getMax () { return this._max; }
}
