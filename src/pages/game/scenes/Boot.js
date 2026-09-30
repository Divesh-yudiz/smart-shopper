import Phaser from 'phaser';
import { homeBootAssetPaths } from '../config/homeAssets.js';
import { missionSelectAssetPaths } from '../config/missionSelectAssets.js';
import { missionDescriptionAssetPaths } from '../config/missionDescriptionAssets.js';
import { howToPlayAssetPaths } from '../config/howToPlayAssets.js';
import { whatLearnAssetPaths } from '../config/whatLearnAssets.js';
import { gameGuideAssetPaths } from '../config/gameGuideAssets.js';
import { welcomeBackAssetPaths } from '../config/welcomeBackAssets.js';

class Boot extends Phaser.Scene {
    constructor () {
        super('Boot');
    }

    preload () {
        [
            ...homeBootAssetPaths,
            ...missionSelectAssetPaths,
            ...missionDescriptionAssetPaths,
            ...howToPlayAssetPaths,
            ...whatLearnAssetPaths,
            ...gameGuideAssetPaths,
            ...welcomeBackAssetPaths,
        ].forEach(({ key, path }) => {
            this.load.image(key, path);
        });
    }

    create () {
        this.scene.stop('Boot');
        this.scene.start('Home');
    }
}

export default Boot;
