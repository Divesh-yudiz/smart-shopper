import Phaser from 'phaser';

const SIZE = 42;

/** Top-left pause control. */
export default class PauseButton extends Phaser.GameObjects.Container {
    constructor (scene, x, y) {
        super(scene, x, y);
        scene.add.existing(this);
        this.setDepth(300);

        const bg = scene.add.graphics();
        bg.fillStyle(0x4a6fa8, 1);
        bg.fillRoundedRect(-SIZE / 2, -SIZE / 2, SIZE, SIZE, 12);
        bg.lineStyle(3, 0xffffff, 0.35);
        bg.strokeRoundedRect(-SIZE / 2, -SIZE / 2, SIZE, SIZE, 12);
        bg.lineStyle(2, 0x1a2d4a, 1);
        bg.strokeRoundedRect(-SIZE / 2, -SIZE / 2, SIZE, SIZE, 10);
        this.add(bg);

        const barW = 7;
        const barH = 18;
        const bars = scene.add.graphics();
        bars.fillStyle(0xffffff, 1);
        bars.fillRect(-12, -barH / 2, barW, barH);
        bars.fillRect(5, -barH / 2, barW, barH);
        this.add(bars);

        const hit = scene.add.rectangle(0, 0, SIZE, SIZE, 0, 0);
        hit.setInteractive({ useHandCursor: true });
        this.add(hit);
        hit.on('pointerup', () => this.scene.scene.pause());
    }
}
