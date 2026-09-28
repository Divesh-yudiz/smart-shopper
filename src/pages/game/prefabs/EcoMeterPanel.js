import Phaser from 'phaser';
import { UI_TEXTURE_KEYS } from '../config/componentAssets.js';
import { addCauseText, setCauseText } from '../utils/gameText.js';

const PANEL_NATIVE_W = 663;
const PANEL_NATIVE_H = 376;
const DEFAULT_W = 300;

const C_TITLE = '#1F6B28';
const C_BODY = '#2A7A32';
const SEGMENTS = 6;
const SEGMENT_COLORS = [
    0xF06A8A,
    0xE85A7A,
    0xF0A030,
    0xF0D040,
    0x7ED957,
    0x2FBF4A,
];
const SEGMENT_DIM = 0xD0D0D0;

/**
 * Eco Meter HUD card — cream panel, green coin, remaining text + segmented bar.
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

        const insetX = w * 0.08;
        const iconSize = h * 0.38;
        const iconX = -halfW + insetX + iconSize / 2;
        const topY = -halfH + h * 0.32;
        const textMaxW = halfW - insetX - (iconX + iconSize / 2 + w * 0.03);

        const icon = scene.add.image(iconX, topY, UI_TEXTURE_KEYS.ecoGreenIcon);
        icon.setDisplaySize(iconSize, iconSize);
        this.add(icon);

        const textX = iconX + iconSize / 2 + w * 0.03;
        const titleSize = Math.max(18, Math.round(h * 0.18));
        const bodySize = Math.max(12, Math.round(h * 0.118));

        this.add(addCauseText(scene, textX, topY - bodySize * 0.55, 'Eco Meter', {
            fontSize: `${titleSize}px`,
            fontStyle: 'bold',
            color: C_TITLE,
            align: 'left',
        }).setOrigin(0, 0.5));

        this._statusText = addCauseText(
            scene,
            textX,
            topY + titleSize * 0.52,
            this._statusLabel(),
            {
                fontSize: `${bodySize}px`,
                fontStyle: 'bold',
                color: C_BODY,
                align: 'left',
                wordWrap: { width: Math.max(120, textMaxW) },
            },
        ).setOrigin(0, 0.5);
        this.add(this._statusText);

        const barW = w - insetX * 2;
        const barH = Math.max(20, h * 0.16);
        const barY = halfH - h * 0.20;
        this._barLeft = -barW / 2;
        this._barW = barW;
        this._barH = barH;
        this._barY = barY;

        this._segGfx = scene.add.graphics();
        this.add(this._segGfx);
        this._drawSegments();
    }

    _statusLabel () {
        const v = Math.round(this._value);
        const m = Math.round(this._max);
        return `${v} remaining out of ${m}`;
    }

    _drawSegments () {
        const g = this._segGfx;
        g.clear();

        const gap = Math.max(3, this._barW * 0.018);
        const totalGap = gap * (SEGMENTS - 1);
        const segW = (this._barW - totalGap) / SEGMENTS;
        const r = Math.min(segW, this._barH) * 0.45;
        const lit = Math.max(0, Math.min(SEGMENTS, Math.ceil((this._value / this._max) * SEGMENTS)));
        const top = this._barY - this._barH / 2;

        for (let i = 0; i < SEGMENTS; i += 1) {
            const x = this._barLeft + i * (segW + gap);
            const color = i < lit ? SEGMENT_COLORS[i] : SEGMENT_DIM;
            const radius = {
                tl: i === 0 ? r : 4,
                bl: i === 0 ? r : 4,
                tr: i === SEGMENTS - 1 ? r : 4,
                br: i === SEGMENTS - 1 ? r : 4,
            };
            g.fillStyle(color, 1);
            g.fillRoundedRect(x, top, segW, this._barH, radius);
            if (i < lit) {
                g.fillStyle(0xffffff, 0.22);
                g.fillRoundedRect(x + 1.5, top + 1.5, segW - 3, this._barH * 0.38, {
                    tl: i === 0 ? r - 1 : 3,
                    tr: i === SEGMENTS - 1 ? r - 1 : 3,
                    bl: 0,
                    br: 0,
                });
            }
        }
    }

    setProgress (value, max = this._max) {
        if (max != null) this._max = Math.max(1, max);
        this._value = Phaser.Math.Clamp(value, 0, this._max);
        setCauseText(this._statusText, this._statusLabel());
        this._drawSegments();
    }

    getValue () { return this._value; }
    getMax () { return this._max; }
}
