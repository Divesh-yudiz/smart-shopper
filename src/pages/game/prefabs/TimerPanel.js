import Phaser from 'phaser';
import { UI_TEXTURE_KEYS } from '../config/componentAssets.js';
import { addCauseText, setCauseText } from '../utils/gameText.js';

/** timer-bg.png native size */
const PANEL_NATIVE_W = 663;
const PANEL_NATIVE_H = 376;
const PANEL_DISPLAY_W = 240;

/** timer-base-icon.png native size */
const ICON_NATIVE_W = 98;
const ICON_NATIVE_H = 120;

const C_TIME = '#1A1A1A';
const C_LABEL = '#2F8A3A';

function formatTime (totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/**
 * Top-right countdown timer — cream pill + stopwatch icon + time / Remaining.
 */
export default class TimerPanel extends Phaser.GameObjects.Container {
    constructor (scene, x, y, {
        startSeconds = 165,
        displayWidth = PANEL_DISPLAY_W,
        startPaused = false,
        onComplete = null,
        onTick = null,
    } = {}) {
        super(scene, x, y);
        scene.add.existing(this);
        this.setDepth(300);

        this._remaining = Math.max(0, startSeconds);
        this._onComplete = onComplete;
        this._onTick = onTick;
        this._completed = false;

        const displayW = displayWidth;
        this._panelH = displayW * (PANEL_NATIVE_H / PANEL_NATIVE_W);

        const panel = scene.add.image(0, 0, UI_TEXTURE_KEYS.timerBg);
        panel.setOrigin(0.5, 0);
        panel.setDisplaySize(displayW, this._panelH);
        this.add(panel);

        const halfW = displayW / 2;
        const padX = displayW * 0.10;
        const contentY = this._panelH * 0.50;

        // Icon on the left — leave clear room for the text block.
        const iconH = this._panelH * 0.48;
        const iconW = iconH * (ICON_NATIVE_W / ICON_NATIVE_H);
        const iconX = -halfW + padX + iconW / 2;

        const icon = scene.add.image(iconX, contentY - this._panelH * 0.04, UI_TEXTURE_KEYS.timerBaseIcon);
        icon.setOrigin(0.5, 0.5);
        icon.setDisplaySize(iconW, iconH);
        this.add(icon);

        // Text stack centered in the space to the right of the icon.
        const textLeft = iconX + iconW / 2 + displayW * 0.04;
        const textRight = halfW - padX;
        const textX = (textLeft + textRight) / 2;
        const timeSize = Math.max(22, Math.round(this._panelH * 0.30));
        const labelSize = Math.max(13, Math.round(this._panelH * 0.155));

        this._timeText = addCauseText(scene, textX, contentY - labelSize * 0.62, formatTime(this._remaining), {
            fontSize: `${timeSize}px`,
            fontStyle: 'bold',
            color: C_TIME,
            align: 'center',
        });
        this._timeText.setOrigin(0.5, 0.5);
        this.add(this._timeText);

        this._labelText = addCauseText(scene, textX, contentY + timeSize * 0.38, 'Remaining', {
            fontSize: `${labelSize}px`,
            fontStyle: 'bold',
            color: C_LABEL,
            align: 'center',
        });
        this._labelText.setOrigin(0.5, 0.5);
        this.add(this._labelText);

        this._tickEvent = scene.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => this._tick(),
        });
        if (startPaused) {
            this._tickEvent.paused = true;
        } else if (this._remaining <= 0) {
            this._tickEvent.remove();
            scene.time.delayedCall(0, () => this._fireComplete());
        }
    }

    _fireComplete () {
        if (this._completed) return;
        this._completed = true;
        this._tickEvent?.remove();
        this._remaining = 0;
        if (this._timeText) setCauseText(this._timeText, formatTime(0));
        this._onComplete?.();
    }

    resume () {
        if (this._tickEvent) this._tickEvent.paused = false;
    }

    pause () {
        if (this._tickEvent) this._tickEvent.paused = true;
    }

    _tick () {
        if (this._remaining <= 0) {
            this._fireComplete();
            return;
        }
        this._remaining -= 1;
        setCauseText(this._timeText, formatTime(this._remaining));
        this._onTick?.();

        if (this._remaining <= 0) {
            this._fireComplete();
        }
    }

    getRemaining () {
        return this._remaining;
    }

    destroy (fromScene) {
        this._tickEvent?.remove();
        super.destroy(fromScene);
    }
}
