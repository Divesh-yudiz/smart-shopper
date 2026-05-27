import Phaser from 'phaser';
import { HOME_TEXTURE_KEYS } from '../config/homeAssets.js';
import { assetPaths } from '../utils/assets.js';
import config from '../utils/config.js';

class Preload extends Phaser.Scene {
    constructor () {
        super('Preload');
    }

    preload () {
        const bg = this.add.image(config.centerX, config.centerY, HOME_TEXTURE_KEYS.bgBlur);
        bg.setDisplaySize(config.width, config.height);

        this.txt_progress = this.add.text(config.centerX, config.height - 120, '0%', {
            fontFamily: config.fonts.text,
            fontSize: '40px',
            color: '#ffffff',
            align: 'center',
            fontStyle: 'bold',
        });
        this.txt_progress.setOrigin(0.5, 0.5);
        this.txt_progress.setStroke('#4a2d7a', 6);

        assetPaths.images.forEach(({ key, path }) => {
            this.load.image(key, path);
        });
        assetPaths.sounds.forEach(({ key, path }) => {
            this.load.audio(key, path);
        });

        this.load.on(Phaser.Loader.Events.PROGRESS, (progress) => {
            this.txt_progress.setText(`${(progress * 100).toFixed(0)}%`);
        });

        this.load.on(Phaser.Loader.Events.COMPLETE, () => {
            this.scene.start('Level', { isMusic: true, isSound: true });
        });
    }
}

export default Preload;
