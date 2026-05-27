import Phaser from 'phaser';
import { homeBootAssetPaths } from '../config/homeAssets.js';

class Boot extends Phaser.Scene {
    constructor () {
        super('Boot');
    }

    preload () {
        homeBootAssetPaths.forEach(({ key, path }) => {
            this.load.image(key, path);
        });
    }

    create () {
        this.scene.stop('Boot');
        this.scene.start('Home');
    }
}

export default Boot;
