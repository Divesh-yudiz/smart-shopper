import Phaser from "phaser";
import { assets, assetPaths } from "../utils/assets";
import config from "../utils/config";

class Preload extends Phaser.Scene {
    constructor() {
        super("Preload");
    }
    editorPreload() {
        assetPaths.images.forEach(({ key, path }) => {
            this.load.image(key, path);
        });
        assetPaths.sounds.forEach(({ key, path }) => {
            this.load.audio(key, path);
        });
    }
    editorCreate() {
        this.add.image(config.centerX, config.centerY, assets.home_bg);
        this.add.image(config.centerX, config.centerY, assets.logo);
        this.txt_progress = this.add.text(config.centerX, config.centerY + 600, "0%",
            { fontFamily: config.fonts.text, fontSize: '44px', color: '#ffffff', align: 'center', });
        this.txt_progress.setOrigin(0.5, 0.5);
    }
    preload() {
        this.editorCreate();
        this.editorPreload();

        this.load.on(Phaser.Loader.Events.PROGRESS, (progress) => {
            const currentProgress = progress;
            this.txt_progress.setText(`${(currentProgress * 100).toFixed(0)}%`);
        });
        this.load.on(Phaser.Loader.Events.COMPLETE, () => {
            this.scene.stop('Preload');
            this.scene.start('Level', { isMusic: true, isSound: true });
        });
    }
}

export default Preload;