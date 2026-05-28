import Phaser from "phaser";
import config from "../utils/config.js";
import { HUD_LAYOUT } from "../config/hudLayout.js";
import GameManager from "../scripts/GameManager.js";
import SoundManager from "../scripts/SoundManager.js";
import MarketView from "../prefabs/MarketView.js";
import MyCartPanel from "../prefabs/MyCartPanel.js";
import BudgetPanel from "../prefabs/BudgetPanel.js";
import ShoppingListPanel from "../prefabs/ShoppingListPanel.js";
import TimerPanel from "../prefabs/TimerPanel.js";
import CheckoutPanel from "../prefabs/popups/CheckoutPanel.js";
import { getRackByIndex, getRacksForView } from "../utils/rackConfig.js";
import { fetchGameConfig, patchRacksWithApiPrices, buildShoppingListEntries, addToCart, removeFromCart, resolveItemKeyFromProduct, checkoutGame } from "../../../utils/gameApi.js";

class Level extends Phaser.Scene {
    constructor() {
        super({ key: 'Level' });
    }

    editorCreate (gameConfig = null) {
        const hud = HUD_LAYOUT;

        const budget    = gameConfig?.budget    ?? hud.budgetAmount;
        const timeLimit = gameConfig?.timeLimit  ?? hud.timerStartSeconds;
        this._budget = budget;

        let racksData = getRacksForView();
        if (gameConfig?.items?.length) {
            racksData = patchRacksWithApiPrices(gameConfig.items, racksData);
        }

        const shoppingEntries = gameConfig?.shoppingList
            ? buildShoppingListEntries(gameConfig.shoppingList)
            : null;

        this.oMarketView = new MarketView(
            this,
            racksData,
            (product, rackId, rackIndex) => this.onProductClick(product, rackId, rackIndex)
        );

        this.oBudget = new BudgetPanel(this, hud.budgetX, hud.rowCenterY, {
            amount: budget,
        });

        this.oShoppingList = new ShoppingListPanel(
            this,
            hud.shoppingListX,
            hud.topY,
            {
                displayWidth: hud.shoppingListWidth,
                ...(shoppingEntries ? { entries: shoppingEntries } : {}),
            }
        );

        this.oTimer = new TimerPanel(this, hud.timerX, hud.topY, {
            startSeconds: timeLimit,
            displayWidth: hud.timerDisplayW,
            onComplete: () => this.openCheckout(),
        });

        this.oMyCart = new MyCartPanel(this, config.centerX, config.height - 10, {
            panelWidth: hud.cartPanelWidth,
            onItemRemoved: (product) => {
                this.oShoppingList?.onProductRemoved(product);
                const sItemKey = resolveItemKeyFromProduct(product);
                if (sItemKey) removeFromCart(sItemKey).catch(err => console.error('[Cart remove]', err));
            },
        });

        this.oCheckout = new CheckoutPanel(this);
        this._buildCheckoutButton();
    }

    _buildCheckoutButton () {
        const btnW = 210;
        const btnH = 62;
        const btnX = config.width - 56 - btnW / 2;
        const btnY = config.height - 56;

        // Container is the single scale target — everything inside is drawn at (0,0)
        const btn = this.add.container(btnX, btnY).setDepth(310);

        const draw = (hover) => {
            gfx.clear();
            gfx.fillStyle(0x000000, 0.3);
            gfx.fillRoundedRect(-btnW / 2 + 4, -btnH / 2 + 5, btnW, btnH, btnH / 2);
            gfx.fillStyle(hover ? 0x28b864 : 0x1a9450, 1);
            gfx.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, btnH / 2);
            gfx.fillStyle(0xffffff, 0.12);
            gfx.fillRoundedRect(-btnW / 2 + 4, -btnH / 2 + 3, btnW - 8, btnH / 2 - 3,
                { tl: btnH / 2, tr: btnH / 2, bl: 0, br: 0 });
            gfx.lineStyle(2, hover ? 0x80ffb8 : 0x50d88a, 0.9);
            gfx.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, btnH / 2);
        };

        const gfx = this.add.graphics();
        draw(false);
        btn.add(gfx);

        const cartIcon = this.add.text(-btnW / 2 + 30, 0, '🛒', { fontSize: '26px' })
            .setOrigin(0.5, 0.5);
        btn.add(cartIcon);

        const label = this.add.text(10, 0, 'CHECKOUT', {
            fontFamily: config.fonts.text,
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#ffffff',
        }).setOrigin(0.5, 0.5);
        btn.add(label);

        const hit = this.add.rectangle(0, 0, btnW, btnH, 0, 0);
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => {
            draw(true);
            this.tweens.add({ targets: btn, scaleX: 1.05, scaleY: 1.05, duration: 80, ease: 'Quad.easeOut' });
        });
        hit.on('pointerout', () => {
            draw(false);
            this.tweens.add({ targets: btn, scaleX: 1, scaleY: 1, duration: 80, ease: 'Quad.easeOut' });
        });
        hit.on('pointerup', () => this.openCheckout());
        btn.add(hit);
    }

    async create ({ isMusic, isSound } = {}) {
        this.oSoundManager = new SoundManager(this);
        this.oGameManager  = new GameManager(this);
        this.oSoundManager.isMusic = isMusic;
        this.oSoundManager.isSound = isSound;

        let gameConfig = null;
        try {
            gameConfig = await fetchGameConfig();
        } catch (err) {
            console.error('[Level] Failed to fetch game config, using defaults:', err);
        }

        this.editorCreate(gameConfig);
    }

    async openCheckout () {
        let cartTotal = this.oMyCart?.getTotal() ?? 0;
        let budget    = this._budget ?? 0;

        try {
            const result = await checkoutGame();
            cartTotal = result.data?.nCartTotal    ?? cartTotal;
            budget    = result.data?.nSessionBudget ?? budget;
        } catch (err) {
            console.error('[Checkout] API error, using local values:', err);
        }

        this.oCheckout?.open({
            entries:   this.oShoppingList?.getEntries() ?? [],
            cartTotal,
            budget,
        });
    }

    onProductClick (product, rackId, rackIndex) {
        const rack = getRackByIndex(rackIndex);
        if (this.oMyCart?.tryAddItem(product)) {
            this.oShoppingList?.onProductCollected(product);
            const sItemKey = resolveItemKeyFromProduct(product);
            if (sItemKey) addToCart(sItemKey).catch(err => console.error('[Cart add]', err));
        }
        console.log(`Product clicked — ${rack?.category} (${rackId}):`, product);
    }
}

export default Level;
