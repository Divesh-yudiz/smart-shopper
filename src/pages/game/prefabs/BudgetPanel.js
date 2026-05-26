import Phaser from 'phaser';
import { UI_TEXTURE_KEYS } from '../config/componentAssets.js';
import config from '../utils/config.js';

const PANEL_NATIVE_W = 350;
const PANEL_NATIVE_H = 135;
const PANEL_DISPLAY_W = 228;

const GREEN_NATIVE_W = 145;
const GREEN_NATIVE_H = 41;

export default class BudgetPanel extends Phaser.GameObjects.Container {
    constructor(scene, x, y, { amount = 150, displayWidth = PANEL_DISPLAY_W } = {}) {
        super(scene, x, y);
        scene.add.existing(this);
        this.setDepth(300);

        const scale = displayWidth / PANEL_NATIVE_W;
        const panelH = PANEL_NATIVE_H * scale;
        const halfW = displayWidth / 2;

        const panel = scene.add.image(0, 0, UI_TEXTURE_KEYS.timerCoinBase);
        panel.setOrigin(0.5, 0.5);
        panel.setDisplaySize(displayWidth, panelH);
        this.add(panel);

        const coinSize = panelH * 0.52;
        const coinX = -halfW + coinSize * 0.5 + 24 * scale;
        const coin = scene.add.image(coinX, 0, UI_TEXTURE_KEYS.coinIcon);
        coin.setOrigin(0.5, 0.5);
        coin.setDisplaySize(coinSize, coinSize);
        this.add(coin);

        const textLeft = coinX + coinSize * 0.5 + 24 * scale;
        const labelY = -panelH * 0.24;

        this._label = scene.add.text(textLeft, labelY, 'BUDGET', {
            fontFamily: config.fonts.text,
            fontSize: `${Math.round(26 * scale)}px`,
            fontStyle: 'bold',
            color: '#a8d4f0',
            align: 'left',
        });
        this._label.setOrigin(0, 0.5);
        this.add(this._label);

        const greenH = panelH * 0.42;
        const greenW = greenH * (GREEN_NATIVE_W / GREEN_NATIVE_H);
        const greenY = panelH * 0.14;
        const green = scene.add.image(textLeft, greenY, UI_TEXTURE_KEYS.budgetGreenBase);
        green.setOrigin(0, 0.5);
        green.setDisplaySize(greenW, greenH);
        this.add(green);

        const amountX = textLeft + greenW / 2;
        this._amountText = scene.add.text(amountX, greenY, `AED ${amount}`, {
            fontFamily: config.fonts.text,
            fontSize: `${Math.round(30 * scale)}px`,
            fontStyle: 'bold',
            color: '#ffffff',
            align: 'center',
        });
        this._amountText.setOrigin(0.5, 0.5);
        this.add(this._amountText);
    }

    setAmount (amount) {
        this._amountText.setText(`AED ${amount}`);
    }
}
