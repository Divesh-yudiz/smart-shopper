import Phaser from "phaser";
import config from "../utils/config.js";
import { HUD_LAYOUT } from "../config/hudLayout.js";
import GameManager from "../scripts/GameManager.js";
import SoundManager from "../scripts/SoundManager.js";
import MarketView from "../prefabs/MarketView.js";
import MyCartPanel from "../prefabs/MyCartPanel.js";
import BudgetPanel from "../prefabs/BudgetPanel.js";
import PauseButton from "../prefabs/PauseButton.js";
import ShoppingListPanel from "../prefabs/ShoppingListPanel.js";
import TimerPanel from "../prefabs/TimerPanel.js";
import { getRackByIndex } from "../utils/rackConfig.js";

class Level extends Phaser.Scene {
    constructor() {
        super({ key: 'Level' });
    }
    editorCreate() {
        const hud = HUD_LAYOUT;

        this.oMarketView = new MarketView(
            this,
            undefined,
            (product, rackId, rackIndex) => this.onProductClick(product, rackId, rackIndex)
        );

        this.oPause = new PauseButton(this, hud.pauseX, hud.rowCenterY);

        this.oBudget = new BudgetPanel(this, hud.budgetX, hud.rowCenterY, {
            amount: hud.budgetAmount,
        });

        this.oShoppingList = new ShoppingListPanel(
            this,
            hud.shoppingListX,
            hud.topY,
            { displayWidth: hud.shoppingListWidth }
        );

        this.oTimer = new TimerPanel(this, hud.timerX, hud.topY, {
            startSeconds: hud.timerStartSeconds,
            displayWidth: hud.timerDisplayW,
        });

        this.oMyCart = new MyCartPanel(this, config.centerX, config.height - 10, {
            panelWidth: hud.cartPanelWidth,
        });
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
        const added = this.oMyCart?.tryAddItem(product);
        if (added) {
            this.oShoppingList?.onProductCollected(product);
        } else {
            console.log(`Cart full — could not add ${product.label ?? product.key}`);
        }
        console.log(`Product clicked — ${rack?.category} (${rackId}):`, product);
    }
}

export default Level;
