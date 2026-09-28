import Phaser from 'phaser';
import { UI_TEXTURE_KEYS } from '../config/componentAssets.js';
import { addCauseText, setCauseText } from '../utils/gameText.js';

/** gameplay-title-base.png native size */
const PANEL_NATIVE_W = 501;
const PANEL_NATIVE_H = 150;
const PANEL_DISPLAY_W = 520;

const TITLE_COLOR = '#FFD24A';
const SUBTITLE_COLOR = '#ffffff';
const STROKE_COLOR = '#2a1408';

/**
 * Top-center wooden mission plaque — "Mission N" + mission name.
 */
export default class MissionTitlePanel extends Phaser.GameObjects.Container {
    constructor (scene, x, y, {
        displayWidth = PANEL_DISPLAY_W,
        missionOrder = 1,
        missionName = '',
    } = {}) {
        super(scene, x, y);
        scene.add.existing(this);
        this.setDepth(300);

        const w = displayWidth;
        const h = w * (PANEL_NATIVE_H / PANEL_NATIVE_W);
        this._w = w;
        this._h = h;

        const panel = scene.add.image(0, 0, UI_TEXTURE_KEYS.missionTitleBg);
        panel.setOrigin(0.5, 0);
        panel.setDisplaySize(w, h);
        this.add(panel);

        // Text sits in the inner wood panel (below the arched top, above the leaves).
        const titleY = h * 0.34;
        const subtitleY = h * 0.62;
        const titleSize = Math.max(22, Math.round(h * 0.28));
        const subtitleSize = Math.max(14, Math.round(h * 0.175));
        const strokeW = Math.max(3, Math.round(h * 0.045));

        this._titleText = addCauseText(scene, 0, titleY, '', {
            fontSize: `${titleSize}px`,
            fontStyle: 'bold',
            color: TITLE_COLOR,
            align: 'center',
        }).setOrigin(0.5, 0.5);
        this._titleText.setStroke(STROKE_COLOR, strokeW);
        this._titleText.setShadow(0, 2, '#000000', 4, true, true);
        this.add(this._titleText);

        this._subtitleText = addCauseText(scene, 0, subtitleY, '', {
            fontSize: `${subtitleSize}px`,
            fontStyle: 'bold',
            color: SUBTITLE_COLOR,
            align: 'center',
        }).setOrigin(0.5, 0.5);
        this._subtitleText.setStroke(STROKE_COLOR, Math.max(2, strokeW - 1));
        this.add(this._subtitleText);

        this.setMission(missionOrder, missionName);
    }

    setMission (missionOrder = 1, missionName = '') {
        const order = Math.max(1, Math.round(missionOrder || 1));
        setCauseText(this._titleText, `Mission ${order}`);

        const name = String(missionName || '').trim() || 'Shopping Mission';
        setCauseText(this._subtitleText, name);

        // Keep long names inside the wood inset.
        const maxW = this._w * 0.78;
        this._subtitleText.setScale(1);
        if (this._subtitleText.width > maxW) {
            this._subtitleText.setScale(maxW / this._subtitleText.width);
        }
    }
}
