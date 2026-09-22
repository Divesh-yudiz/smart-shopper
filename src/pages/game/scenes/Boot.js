import Phaser from 'phaser';
import { homeBootAssetPaths } from '../config/homeAssets.js';
import { missionSelectAssetPaths } from '../config/missionSelectAssets.js';
import { missionDescriptionAssetPaths } from '../config/missionDescriptionAssets.js';

class Boot extends Phaser.Scene {
    constructor () {
        super('Boot');
    }

    preload () {
        [...homeBootAssetPaths, ...missionSelectAssetPaths, ...missionDescriptionAssetPaths]
            .forEach(({ key, path }) => {
                this.load.image(key, path);
            });
    }

    create () {
        this.scene.stop('Boot');
        if (sessionStorage.getItem('ss_inGame') === '1') {
            this.scene.start('Preload');
        } else {
            this.scene.start('Home');
        }
    }
}

export default Boot;
