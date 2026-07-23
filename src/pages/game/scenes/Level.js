import Phaser from "phaser";
import config from "../utils/config.js";
import { HUD_LAYOUT } from "../config/hudLayout.js";
import GameManager from "../scripts/GameManager.js";
import SoundManager from "../scripts/SoundManager.js";
import MarketView from "../prefabs/MarketView.js";
import MyCartPanel from "../prefabs/MyCartPanel.js";
import HudProgressBar, { hudMeterRowHeight } from "../prefabs/HudProgressBar.js";
import ShoppingListPanel from "../prefabs/ShoppingListPanel.js";
import TimerPanel from "../prefabs/TimerPanel.js";
import CheckoutPanel from "../prefabs/popups/CheckoutPanel.js";
import { getRackByIndex, getRacksForView, getRackPlacements } from "../utils/rackConfig.js";
import { UI_TEXTURE_KEYS } from "../config/componentAssets.js";
import { patchRacksWithApiPrices, buildShoppingListEntries, addToCart, removeFromCart, resolveItem, resolveItemKeyFromProduct, checkoutGame, setGameId } from "../../../utils/gameApi.js";
import MissionPopup from "../prefabs/popups/MissionPopup.js";
import ProductInfoPopup from "../prefabs/popups/ProductInfoPopup.js";
import WalkingCharacter from "../prefabs/WalkingCharacter.js";

const SAVE_KEY = 'ss_gameState';

class Level extends Phaser.Scene {
    constructor() {
        super({ key: 'Level' });
    }

    editorCreate(gameConfig = null, savedState = null, { pauseTimer = false } = {}) {
        const hud = HUD_LAYOUT;

        this._gameConfig = gameConfig;
        const budget = gameConfig?.budget ?? hud.budgetAmount;
        const timeLimit = gameConfig?.timeLimit ?? hud.timerStartSeconds;
        this._budget = budget;
        this._ecoMax = Math.max(1, gameConfig?.ecoMeterMax ?? 100);
        this._ecoValue = gameConfig?.ecoMeter ?? 0;

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
            startPaused: pauseTimer,
            onComplete: () => this.openCheckout(),
            onTick: () => { if (this.oTimer.getRemaining() % 10 === 0) this._saveState(); },
        });

        // Restore cart items if resuming
        this.oMyCart = new MyCartPanel(this, config.centerX, config.height - 10, {
            panelWidth: hud.cartPanelWidth,
            initialItems: savedState?.cartItems ?? [],
            onItemRemoved: (product) => {
                this.oShoppingList?.onProductRemoved(product);
                const sItemKey = resolveItemKeyFromProduct(product);
                if (sItemKey) removeFromCart(sItemKey).catch(err => console.error('[Cart remove]', err));
                this._saveState();
                this.oCharacter?.setCartItems(this.oMyCart?.getItems() ?? []);
                this._updateHudMeters();
            },
        });

        this._createEcoMeter({ budgetMax: budget });

        sessionStorage.setItem('ss_inGame', '1');
        this._saveState();

        // Derive character margins from rack placements
        const rackIds = racksData.map(r => r.id);
        const { placements, scrollWidth } = getRackPlacements(rackIds);
        const secondRack = placements[1];                      // fruits (index 1)

        // Normal walking margins — trolley gets extra room only when the background
        // has no more scroll left (handled inside WalkingCharacter)
        const marginLeft = Math.round(secondRack.centerX - secondRack.sectionWidth / 2);
        const marginRight = Math.round(config.width / 2);

        this.oMarketView.scrollTo(0);
        this.oCharacter = new WalkingCharacter(this, this.oMarketView, {
            startX: marginLeft,
            marginLeft,
            marginRight,
        });
        // Seed trolley visuals from any restored cart items
        this.oCharacter.setCartItems(this.oMyCart?.getItems() ?? []);

        this.oCheckout = new CheckoutPanel(this);
        this.oProductPopup = new ProductInfoPopup(this);
        this._checkoutOpen = false;
        this._buildCheckoutButton();

        if (!pauseTimer && (savedState?.timerRemaining ?? timeLimit) <= 0) {
            this.time.delayedCall(200, () => this.openCheckout());
        }
    }

    _canAfford (product) {
        const price = product.price ?? 0;
        if (!this._budget || this._budget <= 0) return true;
        return (this.oMyCart?.getTotal() ?? 0) + price <= this._budget;
    }

    _maxAffordableQuantity (price) {
        const budget = this._budget ?? 0;
        if (!budget || budget <= 0) return 99;
        const spent = this.oMyCart?.getTotal() ?? 0;
        const left = budget - spent;
        if (price <= 0) return 99;
        return Math.max(0, Math.floor(left / price));
    }

    _getMaxAddQuantity (cartProduct, price) {
        const budgetMax = this._maxAffordableQuantity(price);
        const listRemaining = this.oShoppingList?.getRemainingForProduct(cartProduct);
        if (listRemaining !== null) return Math.min(listRemaining, budgetMax);
        return budgetMax;
    }

    _buildProductPopupMeta (cartProduct, price) {
        const listRemaining = this.oShoppingList?.getRemainingForProduct(cartProduct);
        const maxQuantity = this._getMaxAddQuantity(cartProduct, price);

        if (maxQuantity <= 0) {
            if (listRemaining === 0) {
                return { infoLine: 'You already have enough of this item on your list', infoColor: '#e67e22', maxQuantity: 0 };
            }
            return { infoLine: 'Not enough budget left to add this item', infoColor: '#c0392b', maxQuantity: 0 };
        }

        if (listRemaining !== null) {
            return {
                infoLine: `On your shopping list — need ${listRemaining} more`,
                infoColor: '#27ae60',
                maxQuantity,
            };
        }

        return {
            infoLine: 'This item is not on your shopping list',
            infoColor: '#e67e22',
            maxQuantity,
        };
    }

    _formatProductName (cartProduct, sItemKey) {
        const resolved = sItemKey ? resolveItem(sItemKey) : null;
        if (resolved?.label) return resolved.label;
        const key = cartProduct?.key ?? '';
        return key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) || 'Product';
    }

    _showProductPopup (cartProduct, sItemKey) {
        if (this._productPopupOpen) return;
        this._productPopupOpen = true;
        this.oTimer?.pause();
        this.oCharacter?.setInputEnabled(false);

        const price = cartProduct.price ?? 0;
        const meta = this._buildProductPopupMeta(cartProduct, price);

        const onClose = () => {
            this._productPopupOpen = false;
            this.oTimer?.resume();
            this.oCharacter?.setInputEnabled(true);
        };

        this.oProductPopup.open({
            product: cartProduct,
            displayName: this._formatProductName(cartProduct, sItemKey),
            price,
            infoLine: meta.infoLine,
            infoColor: meta.infoColor,
            maxQuantity: meta.maxQuantity,
            onClose,
            onConfirm: (qty) => this._addProductToCart(cartProduct, sItemKey, qty),
        });
    }

    _addProductToCart (cartProduct, sItemKey, quantity) {
        const onList = this.oShoppingList?.isProductOnList(cartProduct) ?? false;
        let added = 0;

        for (let i = 0; i < quantity; i++) {
            if (!this._canAfford(cartProduct)) break;
            if (onList && !this.oShoppingList?.isProductNeeded(cartProduct)) break;
            if (!this.oMyCart?.tryAddItem(cartProduct)) break;

            if (onList) this.oShoppingList?.onProductCollected(cartProduct);
            if (sItemKey) addToCart(sItemKey).catch(err => console.error('[Cart add]', err));
            added += 1;
        }

        if (added > 0) {
            this._saveState();
            this._updateHudMeters();
            const ptr = this.input.activePointer;
            this._flyToCart(cartProduct, ptr.worldX, ptr.worldY);
            this.oCharacter?.setCartItems(this.oMyCart?.getItems() ?? []);
        }
    }

    _buildCheckoutButton() {
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

    create({ isMusic, isSound, gameConfig = null } = {}) {
        this.oSoundManager = new SoundManager(this);
        this.oGameManager = new GameManager(this);
        this.oSoundManager.isMusic = isMusic;
        this.oSoundManager.isSound = isSound;

        const saved = this._loadSavedState();
        const resuming = sessionStorage.getItem('ss_inGame') === '1' && !!saved?.gameConfig;
        if (resuming) {
            setGameId(saved.gameConfig.gameId);
            this.editorCreate(saved.gameConfig, saved);
            // On refresh the canvas has no keyboard focus (user never clicked it).
            // Grab focus so arrow keys work immediately without a manual click.
            const canvas = this.game.canvas;
            canvas.setAttribute('tabindex', '1');
            canvas.focus();
        } else {
            // Saved state had no valid gameConfig (API had failed) — discard and use Preload result.
            if (saved) this._clearSavedState();

            this.editorCreate(gameConfig, null, { pauseTimer: !!gameConfig });
            if (gameConfig?.shoppingList?.length) this._showMissionPopup(gameConfig);
        }
    }

    _showMissionPopup(gameConfig) {
        this.oMissionPopup = new MissionPopup(this);
        this.oMissionPopup.open({
            shoppingList: gameConfig.shoppingList ?? [],
            category: gameConfig.category ?? '',
            shoppingTotal: gameConfig.shoppingListTotal ?? 0,
            budget: gameConfig.budget ?? 0,
            onStart: () => this.oTimer?.resume(),
        });
    }

    _loadSavedState() {
        try {
            const raw = sessionStorage.getItem(SAVE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    _saveState() {
        try {
            const state = {
                gameConfig: this._gameConfig,
                cartItems: this.oMyCart?.getItems() ?? [],
                timerRemaining: this.oTimer?.getRemaining() ?? 0,
                shoppingEntries: this.oShoppingList?.getEntries() ?? [],
            };
            sessionStorage.setItem(SAVE_KEY, JSON.stringify(state));
        } catch { /* storage full or unavailable */ }
    }

    _clearSavedState() {
        sessionStorage.removeItem(SAVE_KEY);
        sessionStorage.removeItem('ss_inGame');
    }

    _createEcoMeter ({ budgetMax = 150 } = {}) {
        const hud = HUD_LAYOUT;
        const panelW = 300;
        const coinColW = 50;
        const padRight = 16;
        const barH = 22;
        const rowH = hudMeterRowHeight(barH);
        const rowGap = 14;
        const padY = 18;
        const panelH = padY * 2 + rowH * 2 + rowGap;
        const barW = panelW - coinColW - padRight - 10;
        const barLeft = -panelW / 2 + coinColW + 10;

        this._budgetMax = budgetMax;
        this.oEcoMeter = this.add.container(hud.budgetX, hud.topY + panelH / 2 + 4).setDepth(300);

        const panel = this.add.image(0, 0, UI_TEXTURE_KEYS.timerCoinBase);
        panel.setDisplaySize(panelW, panelH);
        this.oEcoMeter.add(panel);

        const coinSize = 34;
        const coinX = -panelW / 2 + coinColW / 2 + 4;
        const barCenterOffset = 12 + 6 + barH / 2;

        const ecoY = -panelH / 2 + padY;
        const budgetY = ecoY + rowH + rowGap;

        const ecoIcon = this.add.image(coinX, ecoY + barCenterOffset, UI_TEXTURE_KEYS.ecoIcon);
        ecoIcon.setDisplaySize(coinSize, coinSize);
        this.oEcoMeter.add(ecoIcon);

        const coin = this.add.image(coinX, budgetY + barCenterOffset, UI_TEXTURE_KEYS.coinIcon);
        coin.setDisplaySize(coinSize, coinSize);
        this.oEcoMeter.add(coin);

        this.oEcoBar = new HudProgressBar(this, barLeft, ecoY, {
            width: barW,
            height: barH,
            label: 'ECO METER',
            max: this._ecoMax,
            value: this._ecoValue,
            fillColor: 0x3ddc84,
            formatText: (v, max) => `${Math.round(v)} / ${Math.round(max)}`,
        });
        this.oEcoMeter.add(this.oEcoBar);

        const spent = this.oMyCart?.getTotal() ?? 0;
        this.oBudgetBar = new HudProgressBar(this, barLeft, budgetY, {
            width: barW,
            height: barH,
            label: 'BUDGET',
            max: budgetMax,
            value: Math.max(0, budgetMax - spent),
            fillColor: 0x2ecc71,
            formatText: (remaining, max) => `AED ${Math.round(remaining)} / ${Math.round(max)}`,
        });
        this.oEcoMeter.add(this.oBudgetBar);

        this._updateHudMeters();
    }

    _updateHudMeters () {
        const spent = this.oMyCart?.getTotal() ?? 0;
        const budgetMax = Math.max(1, this._budgetMax ?? 1);
        const remaining = Math.max(0, budgetMax - spent);

        this.oBudgetBar?.setProgress(remaining, budgetMax);

        const budgetRatio = remaining / budgetMax;
        const budgetFill = budgetRatio <= 0.2 ? 0xe74c3c : (budgetRatio <= 0.45 ? 0xf39c12 : 0x27ae60);
        this.oBudgetBar?.setFillColor(budgetFill);

        this.oEcoBar?.setProgress(this._ecoValue ?? 0, this._ecoMax ?? 1);
    }

    setEcoMeter (value, max) {
        if (max != null) this._ecoMax = Math.max(1, max);
        this._ecoValue = Phaser.Math.Clamp(value, 0, this._ecoMax);
        this._updateHudMeters();
    }

    async openCheckout() {
        if (this._checkoutOpen) return;
        this._checkoutOpen = true;
        this.oTimer?.pause();
        this.oCharacter?.setInputEnabled(false);

        let cartTotal = this.oMyCart?.getTotal() ?? 0;
        let budget = this._budget ?? 0;

        this.oCheckout?.open({
            entries: this.oShoppingList?.getEntries() ?? [],
            cartTotal,
            budget,
            onClose: () => {
                this._checkoutOpen = false;
                this._clearSavedState();
            },
        });

        try {
            const result = await checkoutGame();
            cartTotal = result.data?.nCartTotal ?? cartTotal;
            budget = result.data?.nSessionBudget ?? budget;
        } catch (err) {
            console.error('[Checkout] API error, using local values:', err);
        }
    }

    onProductClick(product, rackId, rackIndex) {
        if (this._productPopupOpen || this._checkoutOpen) return;

        const rack = getRackByIndex(rackIndex);
        const sItemKey = resolveItemKeyFromProduct(product);
        const iconInfo = sItemKey ? resolveItem(sItemKey) : null;
        const cartProduct = iconInfo ? { ...product, textureKey: iconInfo.textureKey } : product;

        this._showProductPopup(cartProduct, sItemKey);
        console.log(`Product clicked — ${rack?.category} (${rackId}):`, product);
    }

    _flyToCart(product, fromX, fromY) {
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
            targets: flyImg,
            x: dest.x,
            y: dest.y,
            scaleX: sx * 0.5,
            scaleY: sy * 0.5,
            duration: 900,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                flyImg.destroy();
                this.oCharacter?.setCartItems(this.oMyCart?.getItems() ?? []);
            },
        });
    }
}

export default Level;
