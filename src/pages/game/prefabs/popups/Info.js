import Phaser from 'phaser';
import { assets } from '../../utils/assets.js';
import config from '../../utils/config.js';

export default class Info extends Phaser.GameObjects.Container {
    constructor(scene, x = 0, y = 0) {
        super(scene, x, y);
        scene.add.existing(this);
        this.scene = scene;
        this.setScale(0);
        this.setVisible(false);

        this.bg = scene.add.rectangle(0, 0, config.width, config.height, 0x000000, 0.5).setVisible(false);
        this.bg.setInteractive().on('pointerdown', () => { this.close(); });
        this.add(this.bg);

        const popup = scene.add.image(0, 0, assets.popup_bg);
        popup.setInteractive().on('pointerdown', () => { });
        this.add(popup);

        this.title = this.scene.add.text(0, -180, ' How to play? ', {
            fontSize: 44, color: '#51d6ff', align: 'center', fontFamily: config.fonts.text, fontStyle: 'bold'
        }).setOrigin(0.5, 0.5);
        this.add(this.title);

        const info = [
            'Tap a tube to pick the top ball and move.',
            'Tap another tube to move the ball there.',
            'Sort balls so each tube contains only one color.',
            'Keep sorting until all tubes are color-sorted!'
        ]
        info.forEach((text, index) => {
            const style = { fontSize: 34, color: '#ffffff', align: 'left', fontFamily: config.fonts.text, lineSpacing: 8 }
            const bullet = this.scene.add.text(-320, -130 + index * 80, '⦿', { ...style, fontSize: 44, color: '#d86813' }).setOrigin(0, 0.2);
            const message = this.scene.add.text(-280, -130 + index * 80, `${text}`, style).setOrigin(0, 0).setWordWrapWidth(popup.width - 200);
            this.add(bullet);
            this.add(message);
        })
    }
    open() {
        this.setVisible(true);
        this.scene.tweens.add({
            targets: this,
            scaleX: 1,
            scaleY: 1,
            duration: 300,
            ease: 'Elastic.easeOut',
            easeParams: [1.1, 0.9],
            onComplete: () => {
                this.bg.setVisible(true);
            }
        })
    }
    close() {
        this.setVisible(false);
        this.setScale(0);
        this.bg.setVisible(false);
    }
}