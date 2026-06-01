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
import { getRackByIndex, getRacksForView, getRackPlacements } from "../utils/rackConfig.js";
import { fetchGameConfig, patchRacksWithApiPrices, buildShoppingListEntries, addToCart, removeFromCart, resolveItemKeyFromProduct, checkoutGame, setGameId } from "../../../utils/gameApi.js";
import MissionPopup from "../prefabs/popups/MissionPopup.js";
import WalkingCharacter from "../prefabs/WalkingCharacter.js";

const SAVE_KEY = 'ss_gameState';

class Level extends Phaser.Scene {
    constructor() {
        super({ key: 'Level' });
    }

    editorCreate (gameConfig = null, savedState = null, { pauseTimer = false } = {}) {
        const hud = HUD_LAYOUT;

        this._gameConfig = gameConfig;
        const budget    = gameConfig?.budget    ?? hud.budgetAmount;
        const timeLimit = gameConfig?.timeLimit  ?? hud.timerStartSeconds;
        this._budget = budget;

        let racksData = getRacksForView();
        if (gameConfig?.items?.length) {
            racksData = patchRacksWithApiPrices(gameConfig.items, racksData);
        }

        // Use saved entries (with collected counts) on restore, fresh entries otherwise
        const shoppingEntries = savedState?.shoppingEntries
            ?? (gameConfig?.shoppingList ? buildShoppingListEntries(gameConfig.shoppingList) : null);

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

        // Resume from saved time, or start fresh
        this.oTimer = new TimerPanel(this, hud.timerX, hud.topY, {
            startSeconds: savedState?.timerRemaining ?? timeLimit,
            displayWidth: hud.timerDisplayW,
            startPaused:  pauseTimer,
            onComplete:   () => this.openCheckout(),
            onTick:       () => { if (this.oTimer.getRemaining() % 10 === 0) this._saveState(); },
        });

        // Restore cart items if resuming
        this.oMyCart = new MyCartPanel(this, config.centerX, config.height - 10, {
            panelWidth:   hud.cartPanelWidth,
            initialItems: savedState?.cartItems ?? [],
            onItemRemoved: (product) => {
                this.oShoppingList?.onProductRemoved(product);
                const sItemKey = resolveItemKeyFromProduct(product);
                if (sItemKey) removeFromCart(sItemKey).catch(err => console.error('[Cart remove]', err));
                this._saveState();
                this.oCharacter?.setCartItems(this.oMyCart?.getItems() ?? []);
            },
        });

        sessionStorage.setItem('ss_inGame', '1');
        this._saveState();

        // Derive character margins from rack placements
        const rackIds = racksData.map(r => r.id);
        const { placements, scrollWidth } = getRackPlacements(rackIds);
        const secondRack   = placements[1];                      // fruits (index 1)
        const secondLast   = placements[placements.length - 2];  // electronics

        const marginLeft      = Math.round(secondRack.centerX - secondRack.sectionWidth / 2);
        const minScroll       = -(scrollWidth - config.width);
        const secondLastEndWX = secondLast.centerX + secondLast.sectionWidth / 2;
        const marginRight     = Math.round(secondLastEndWX + minScroll);

        this.oMarketView.scrollTo(0);
        this.oCharacter = new WalkingCharacter(this, this.oMarketView, {
            startX:      marginLeft,
            marginLeft,
            marginRight,
        });
        // Seed trolley visuals from any restored cart items
        this.oCharacter.setCartItems(this.oMyCart?.getItems() ?? []);

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

        const saved = this._loadSavedState();
        if (saved) {
            setGameId(saved.gameConfig.gameId);
            this.editorCreate(saved.gameConfig, saved);
        } else {
            let gameConfig = null;
            try {
                gameConfig = await fetchGameConfig();
            } catch (err) {
                console.error('[Level] Failed to fetch game config, using defaults:', err);
            }
            this.editorCreate(gameConfig, null, { pauseTimer: !!gameConfig });
            if (gameConfig) this._showMissionPopup(gameConfig);
        }
    }

    _showMissionPopup (gameConfig) {
        this.oMissionPopup = new MissionPopup(this);
        this.oMissionPopup.open({
            shoppingList:  gameConfig.shoppingList  ?? [],
            category:      gameConfig.category      ?? '',
            shoppingTotal: gameConfig.shoppingListTotal ?? 0,
            budget:        gameConfig.budget        ?? 0,
            onStart: () => this.oTimer?.resume(),
        });
    }

    _loadSavedState () {
        try {
            const raw = sessionStorage.getItem(SAVE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    _saveState () {
        try {
            const state = {
                gameConfig:       this._gameConfig,
                cartItems:        this.oMyCart?.getItems()      ?? [],
                timerRemaining:   this.oTimer?.getRemaining()   ?? 0,
                shoppingEntries:  this.oShoppingList?.getEntries() ?? [],
            };
            sessionStorage.setItem(SAVE_KEY, JSON.stringify(state));
        } catch { /* storage full or unavailable */ }
    }

    _clearSavedState () {
        sessionStorage.removeItem(SAVE_KEY);
        sessionStorage.removeItem('ss_inGame');
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
            onClose:   () => {
                this._clearSavedState();
                this.scene.start('Home');
            },
        });
    }

    onProductClick (product, rackId, rackIndex) {
        const rack = getRackByIndex(rackIndex);
        if (this.oMyCart?.tryAddItem(product)) {
            this.oShoppingList?.onProductCollected(product);
            this._saveState();
            const sItemKey = resolveItemKeyFromProduct(product);
            if (sItemKey) addToCart(sItemKey).catch(err => console.error('[Cart add]', err));
            // fly animation → trolley update on arrival
            const ptr = this.input.activePointer;
            this._flyToCart(product, ptr.worldX, ptr.worldY);
        }
        console.log(`Product clicked — ${rack?.category} (${rackId}):`, product);
    }

    _flyToCart (product, fromX, fromY) {
        if (!product?.textureKey || !this.textures.exists(product.textureKey)) {
            this.oCharacter?.setCartItems(this.oMyCart?.getItems() ?? []);
            return;
        }

        const dest = this.oCharacter?.getCartWorldPosition() ?? { x: config.centerX, y: 400 };

        const flyImg = this.add.image(fromX, fromY, product.textureKey);
        flyImg.setDisplaySize(140, 140);
        const sx = flyImg.scaleX;
        const sy = flyImg.scaleY;
        flyImg.setDepth(500);

        this.tweens.add({
            targets:  flyImg,
            x:        dest.x,
            y:        dest.y,
            scaleX:   sx * 0.5,
            scaleY:   sy * 0.5,
            duration: 900,
            ease:     'Sine.easeInOut',
            onComplete: () => {
                flyImg.destroy();
                this.oCharacter?.setCartItems(this.oMyCart?.getItems() ?? []);
            },
        });
    }
}

export default Level;
