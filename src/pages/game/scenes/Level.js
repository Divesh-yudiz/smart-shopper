import Phaser from "phaser";
import config from "../utils/config.js";
import GameManager from "../scripts/GameManager.js";
import SoundManager from "../scripts/SoundManager.js";
import MarketView from "../prefabs/MarketView.js";
import { getRackByIndex } from "../utils/rackConfig.js";

class Level extends Phaser.Scene {
    constructor() {
        super({ key: 'Level' });
    }
    editorCreate() {
        this.oMarketView = new MarketView(
            this,
            undefined,
            (product, rackId, rackIndex) => this.onProductClick(product, rackId, rackIndex)
        );
    }
    async create({ isMusic, isSound } = {}) {
        this.oSoundManager = new SoundManager(this);
        this.oGameManager = new GameManager(this);
        this.oSoundManager.isMusic = isMusic;
        this.oSoundManager.isSound = isSound;
        // isMusic && this.oSoundManager.playMusic(this.oSoundManager.bg, true);
        this.editorCreate();
    }
    onProductClick(product, rackId, rackIndex) {
        const rack = getRackByIndex(rackIndex);
        console.log(`Product clicked — ${rack?.category} (${rackId}):`, product);
    }
}

export default Level;
