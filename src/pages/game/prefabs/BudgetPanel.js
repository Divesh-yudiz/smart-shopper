import Phaser from 'phaser';
import { UI_TEXTURE_KEYS } from '../config/componentAssets.js';
import config from '../utils/config.js';

const PANEL_W = 182;
const PANEL_H = 54;

/** Budget display — pause button sits to the left. */
export default class BudgetPanel extends Phaser.GameObjects.Container {
    constructor (scene, x, y, { amount = 150 } = {}) {
        super(scene, x, y);
        scene.add.existing(this);
        this.setDepth(300);

        const bg = scene.add.graphics();
        bg.fillStyle(0x2a3d5c, 1);
        bg.fillRoundedRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, PANEL_H, 12);
        bg.lineStyle(2, 0x151f30, 1);
        bg.strokeRoundedRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, PANEL_H, 12);
        this.add(bg);

        const coin = scene.add.image(-PANEL_W / 2 + 28, 0, UI_TEXTURE_KEYS.coinIcon);
        coin.setOrigin(0.5, 0.5);
        coin.setDisplaySize(34, 34);
        this.add(coin);

        this._label = scene.add.text(-PANEL_W / 2 + 62, -8, 'BUDGET', {
            fontFamily: config.fonts.text,
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#a8c8e8',
            align: 'left',
        });
        this._label.setOrigin(0, 0.5);
        this.add(this._label);

        const green = scene.add.image(-PANEL_W / 2 + 94, 10, UI_TEXTURE_KEYS.budgetGreenBase);
        green.setOrigin(0, 0.5);
        green.setDisplaySize(86, 26);
        this.add(green);

        this._amountText = scene.add.text(-PANEL_W / 2 + 137, 10, `AED ${amount}`, {
            fontFamily: config.fonts.text,
            fontSize: '16px',
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
