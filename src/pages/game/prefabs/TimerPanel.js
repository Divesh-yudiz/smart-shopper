import Phaser from 'phaser';
import { UI_TEXTURE_KEYS } from '../config/componentAssets.js';
import config from '../utils/config.js';

/** Timer-and-Coin-Base.png */
const PANEL_NATIVE_W = 268;
const PANEL_NATIVE_H = 110;
const PANEL_DISPLAY_W = 155;

function formatTime (totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function addStopwatchIcon (scene, x, y, size) {
    const g = scene.add.graphics();
    const r = size * 0.42;
    const knobW = size * 0.14;
    const knobH = size * 0.1;

    g.fillStyle(0xff8c1a, 1);
    g.fillRoundedRect(x - knobW / 2, y - r - knobH - 2, knobW, knobH, 3);
    g.fillCircle(x, y, r);
    g.fillStyle(0xf5f5f5, 1);
    g.fillCircle(x, y, r * 0.78);
    g.lineStyle(Math.max(2, size * 0.05), 0x2a2a2a, 1);
    g.lineBetween(x, y, x + r * 0.08, y - r * 0.55);
    g.lineBetween(x, y, x + r * 0.42, y + r * 0.12);
    g.fillStyle(0x2a2a2a, 1);
    g.fillCircle(x, y, size * 0.05);
    return g;
}

/** Top-right countdown timer (02:45 style). */
export default class TimerPanel extends Phaser.GameObjects.Container {
    constructor(scene, x, y, { startSeconds = 165, displayWidth = PANEL_DISPLAY_W } = {}) {
        super(scene, x, y);
        scene.add.existing(this);
        this.setDepth(300);

        this._remaining = startSeconds;
        const displayW = displayWidth;
        const scale = displayW / PANEL_NATIVE_W;
        this._panelH = PANEL_NATIVE_H * scale;

        const panel = scene.add.image(0, 0, UI_TEXTURE_KEYS.timerCoinBase);
        panel.setOrigin(0.5, 0);
        panel.setDisplaySize(displayW, this._panelH);
        this.add(panel);

        const centerY = this._panelH * 0.52;
        const iconSize = this._panelH * 0.65;
        const fontSize = Math.round(40 * scale);
        const gap = 8 * scale;
        const textHalfW = fontSize * 1.35;
        const iconHalf = iconSize * 0.5;
        const contentHalfW = iconHalf + gap + textHalfW;

        const iconX = -contentHalfW + iconHalf;
        const textX = iconX + iconHalf + gap + textHalfW;

        const stopwatch = addStopwatchIcon(scene, iconX, centerY, iconSize);
        this.add(stopwatch);

        this._timeText = scene.add.text(textX, centerY, formatTime(this._remaining), {
            fontFamily: config.fonts.text,
            fontSize: `${fontSize}px`,
            fontStyle: 'bold',
            color: '#ffffff',
            align: 'center',
            stroke: '#1a2d4a',
            strokeThickness: 3,
        });
        this._timeText.setOrigin(0.5, 0.5);
        this.add(this._timeText);

        this._tickEvent = scene.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => this._tick(),
        });
    }

    _tick () {
        if (this._remaining <= 0) {
            this._tickEvent?.remove();
            return;
        }
        this._remaining -= 1;
        this._timeText.setText(formatTime(this._remaining));
    }

    getRemaining () {
        return this._remaining;
    }

    destroy (fromScene) {
        this._tickEvent?.remove();
        super.destroy(fromScene);
    }
}
