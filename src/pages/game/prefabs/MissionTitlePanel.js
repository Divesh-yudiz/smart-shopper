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
/** Keep title and mission name inset from the plaque edges and corner leaves. */
const TEXT_SIDE_PAD_RATIO = 0.17;

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
        const titleStrokeW = Math.max(2, Math.round(h * 0.022));
        const subtitleStrokeW = Math.max(2, Math.round(h * 0.045) - 1);

        this._titleText = addCauseText(scene, 0, titleY, '', {
            fontSize: `${titleSize}px`,
            fontStyle: 'bold',
            color: TITLE_COLOR,
            align: 'center',
        }).setOrigin(0.5, 0.5);
        this._titleText.setStroke(STROKE_COLOR, titleStrokeW);
        this._titleText.setShadow(0, 1, '#000000', 2, true, true);
        this.add(this._titleText);

        this._subtitleText = addCauseText(scene, 0, subtitleY, '', {
            fontSize: `${subtitleSize}px`,
            fontStyle: 'bold',
            color: SUBTITLE_COLOR,
            align: 'center',
        }).setOrigin(0.5, 0.5);
        this._subtitleText.setStroke(STROKE_COLOR, subtitleStrokeW);
        this.add(this._subtitleText);

        this.setMission(missionOrder, missionName);
    }

    setMission (missionOrder = 1, missionName = '') {
        const order = Math.max(1, Math.round(missionOrder || 1));
        setCauseText(this._titleText, `Mission ${order}`);

        const name = String(missionName || '').trim() || 'Shopping Mission';
        setCauseText(this._subtitleText, name);

        const maxW = this._w * (1 - TEXT_SIDE_PAD_RATIO * 2);
        this._fitToWidth(this._titleText, maxW);
        this._fitToWidth(this._subtitleText, maxW);
    }

    _fitToWidth (text, maxW) {
        text.setScale(1);
        if (text.width > maxW) {
            text.setScale(maxW / text.width);
        }
    }
}
