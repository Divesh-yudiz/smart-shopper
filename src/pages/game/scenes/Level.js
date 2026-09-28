import Phaser from "phaser";
import config from "../utils/config.js";
import { HUD_LAYOUT } from "../config/hudLayout.js";
import GameManager from "../scripts/GameManager.js";
import SoundManager from "../scripts/SoundManager.js";
import MarketView from "../prefabs/MarketView.js";
import MyCartPanel from "../prefabs/MyCartPanel.js";
import ShoppingListPanel from "../prefabs/ShoppingListPanel.js";
import ShoppingListButton from "../prefabs/ShoppingListButton.js";
import TimerPanel from "../prefabs/TimerPanel.js";
import MissionTitlePanel from "../prefabs/MissionTitlePanel.js";
import CoinsPanel from "../prefabs/CoinsPanel.js";
import EcoMeterPanel from "../prefabs/EcoMeterPanel.js";
import CheckoutPanel from "../prefabs/popups/CheckoutPanel.js";
import { getRackByIndex, getRacksForView, getRackPlacements } from "../utils/rackConfig.js";
import { patchRacksWithApiPrices, buildShoppingListEntries, buildCartItemsFromApi, addToCart, removeFromCart, resolveItem, resolveItemKeyFromProduct, checkoutGame, setGameId, setItemVariants, getItemVariants, getItemId, fetchItemVariants } from "../../../utils/gameApi.js";
import ProductInfoPopup from "../prefabs/popups/ProductInfoPopup.js";
import SalePopup from "../prefabs/popups/SalePopup.js";
import NotEnoughCoinsPopup from "../prefabs/popups/NotEnoughCoinsPopup.js";
import EcoMeterEmptyPopup from "../prefabs/popups/EcoMeterEmptyPopup.js";
import ViewCartPopup from "../prefabs/popups/ViewCartPopup.js";
import TimesUpPopup from "../prefabs/popups/TimesUpPopup.js";
import WalkingCharacter from "../prefabs/WalkingCharacter.js";
import { buildEcoVariantPair } from "../config/ecoConfig.js";

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
        this._ecoValue = gameConfig?.ecoMeter ?? this._ecoMax;
        this._budgetRemaining = null;

        let racksData = getRacksForView();
        if (gameConfig?.items?.length) {
            racksData = patchRacksWithApiPrices(gameConfig.items, racksData);
        }
        // Rebuilt every time (not just on fresh load) — a page-refresh resume starts
        // from an empty module-level cache in gameApi.js, so this must run unconditionally.
        setItemVariants(gameConfig?.items ?? []);

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
            hud.shoppingListY,
            {
                displayWidth: hud.shoppingListWidth,
                onCheckout: () => this.openCheckout(),
                ...(shoppingEntries ? { entries: shoppingEntries } : {}),
            }
        );

        // Resume from saved time, or start fresh
        this.oTimer = new TimerPanel(this, hud.timerX, hud.topY, {
            startSeconds: savedState?.timerRemaining ?? timeLimit,
            displayWidth: hud.timerDisplayW,
            startPaused: pauseTimer,
            onComplete: () => this._showTimesUpPopup(),
            onTick: () => { if (this.oTimer.getRemaining() % 10 === 0) this._saveState(); },
        });

        this.oMissionTitle = new MissionTitlePanel(
            this,
            hud.missionTitleX,
            hud.missionTitleY,
            {
                displayWidth: hud.missionTitleWidth,
                missionOrder: gameConfig?.missionOrder ?? 1,
                missionName: gameConfig?.category ?? '',
            }
        );

        // Restore cart items if resuming
        this.oMyCart = new MyCartPanel(this, config.centerX, hud.cartY ?? config.height - 10, {
            panelWidth: hud.cartPanelWidth,
            initialItems: savedState?.cartItems ?? [],
            onItemRemoved: (product) => {
                this.oShoppingList?.onProductRemoved(product);
                this._syncShoppingListButton();
                const sItemKey = resolveItemKeyFromProduct(product);
                if (sItemKey) {
                    removeFromCart(sItemKey)
                        .then((result) => this._applyCartMutationResult(result))
                        .catch(err => console.error('[Cart remove]', err));
                }
                this.setEcoMeter((this._ecoValue ?? 0) - (product.ecoImpact ?? 0), this._ecoMax);
                this._saveState();
                this.oCharacter?.setCartItems(this.oMyCart?.getItems() ?? []);
                this._updateHudMeters();
            },
        });

        this.oShoppingListBtn = new ShoppingListButton(
            this,
            hud.shoppingListBtnX,
            hud.shoppingListBtnY,
            {
                size: hud.shoppingListBtnSize,
                expanded: true,
                onToggle: (expanded) => this.oShoppingList?.setExpanded(expanded),
            }
        );
        this.oShoppingList?.setExpandOrigin(hud.shoppingListBtnX, hud.shoppingListBtnY);
        this._syncShoppingListButton();

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
        this.oSalePopup = new SalePopup(this);
        this.oNotEnoughCoins = new NotEnoughCoinsPopup(this);
        this.oEcoMeterEmpty = new EcoMeterEmptyPopup(this);
        this.oViewCart = new ViewCartPopup(this);
        this.oTimesUp = new TimesUpPopup(this);
        this._checkoutOpen = false;
        this._saleOpen = false;
        this._coinsOpen = false;
        this._ecoEmptyOpen = false;
        this._viewCartOpen = false;
        this._timesUpOpen = false;

        if (!pauseTimer && (savedState?.timerRemaining ?? timeLimit) <= 0) {
            this.time.delayedCall(200, () => this._showTimesUpPopup());
        } else if (!pauseTimer) {
            this.time.delayedCall(700, () => this._showTimesUpPopup());
        }
    }

    _showEcoMeterEmptyPopup () {
        if (this._timesUpOpen || this._viewCartOpen || this._ecoEmptyOpen || this._coinsOpen || this._saleOpen || this._checkoutOpen || this._productPopupOpen) return;
        this._ecoEmptyOpen = true;
        this.oTimer?.pause();
        this.oCharacter?.setInputEnabled(false);
        const resume = () => {
            this._ecoEmptyOpen = false;
            this.oTimer?.resume();
            this.oCharacter?.setInputEnabled(true);
        };
        this.oEcoMeterEmpty.open({
            onClose: resume,
            onViewCart: () => this._showViewCartPopup(),
        });
    }

    _showNotEnoughCoinsPopup () {
        if (this._timesUpOpen || this._viewCartOpen || this._ecoEmptyOpen || this._coinsOpen || this._saleOpen || this._checkoutOpen || this._productPopupOpen) return;
        this._coinsOpen = true;
        this.oTimer?.pause();
        this.oCharacter?.setInputEnabled(false);
        const resume = () => {
            this._coinsOpen = false;
            this.oTimer?.resume();
            this.oCharacter?.setInputEnabled(true);
        };
        this.oNotEnoughCoins.open({
            onClose: resume,
            onViewCart: () => this._showViewCartPopup(),
        });
    }

    _showViewCartPopup () {
        if (this._timesUpOpen || this._viewCartOpen || this._ecoEmptyOpen || this._coinsOpen || this._saleOpen || this._checkoutOpen || this._productPopupOpen) return;
        this._viewCartOpen = true;
        this.oTimer?.pause();
        this.oCharacter?.setInputEnabled(false);
        const resume = () => {
            this._viewCartOpen = false;
            this.oTimer?.resume();
            this.oCharacter?.setInputEnabled(true);
        };
        this.oViewCart.open({
            onClose: resume,
            onContinue: () => {},
            onFindRemaining: () => {},
            onCheckout: () => this.openCheckout(),
        });
    }

    _showSalePopup () {
        if (this._timesUpOpen || this._viewCartOpen || this._ecoEmptyOpen || this._saleOpen || this._coinsOpen || this._checkoutOpen || this._productPopupOpen) return;
        this._saleOpen = true;
        this.oTimer?.pause();
        this.oCharacter?.setInputEnabled(false);
        const spent = this.oMyCart?.getTotal() ?? 0;
        const resume = () => {
            this._saleOpen = false;
            this.oTimer?.resume();
            this.oCharacter?.setInputEnabled(true);
        };
        this.oSalePopup.open({
            coinsRemaining: this._budgetRemaining ?? Math.max(0, (this._budget ?? 0) - spent),
            ecoRemaining: this._ecoValue ?? 0,
            onClose: resume,
            onSkip: () => {},
            onBuy: () => {},
        });
    }

    _showTimesUpPopup () {
        if (this._timesUpOpen || this._viewCartOpen || this._ecoEmptyOpen || this._coinsOpen || this._saleOpen || this._checkoutOpen || this._productPopupOpen) return;
        this._timesUpOpen = true;
        this.oTimer?.pause();
        this.oCharacter?.setInputEnabled(false);
        const spent = this.oMyCart?.getTotal() ?? 0;
        const budget = this._budget ?? 62;
        const ecoMax = this._ecoMax ?? 32;
        const ecoLeft = this._ecoValue ?? 0;
        const entries = this.oShoppingList?.getEntries?.() ?? [];
        const listItems = entries.filter(Boolean).map((entry) => {
            const qty = entry.required ?? 1;
            const label = entry.label ?? entry.key ?? 'Item';
            return {
                name: qty > 1 ? `${label} ${qty}` : `${label} 1 Pack`,
                done: (entry.collected ?? 0) >= qty,
                textureKey: entry.textureKey,
            };
        });
        this.oTimesUp.open({
            items: listItems.length ? listItems : undefined,
            coinsUsed: spent,
            coinsMax: budget,
            ecoUsed: Math.max(0, ecoMax - ecoLeft),
            ecoMax,
            onClose: () => {
                this._timesUpOpen = false;
            },
            onDashboard: () => {
                this._timesUpOpen = false;
                this._clearSavedState();
                this.scene.start('Home');
            },
            onNewMission: () => {
                this._timesUpOpen = false;
                this._chooseAnotherMission();
            },
            onRetry: () => {
                this._timesUpOpen = false;
                this._clearSavedState();
                this.scene.restart({ isMusic: true, isSound: true, gameConfig: this._gameConfig });
            },
        });
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

    _buildProductPopupMeta (cartProduct, price) {
        const listRemaining = this.oShoppingList?.getRemainingForProduct(cartProduct);
        const budgetMax = this._maxAffordableQuantity(price);
        const maxQuantity = listRemaining !== null ? Math.min(listRemaining, budgetMax) : budgetMax;

        if (maxQuantity <= 0) {
            if (listRemaining === 0) {
                return { infoLine: 'You already have enough of this item on your list', infoColor: '#e67e22', maxQuantity: 0, listRemaining, budgetMax };
            }
            return { infoLine: 'Not enough budget left to add this item', infoColor: '#c0392b', maxQuantity: 0, listRemaining, budgetMax };
        }

        if (listRemaining !== null) {
            return {
                infoLine: `On your shopping list — need ${listRemaining} more`,
                infoColor: '#27ae60',
                maxQuantity,
                listRemaining,
                budgetMax,
            };
        }

        return {
            infoLine: 'This item is not on your shopping list',
            infoColor: '#e67e22',
            maxQuantity,
            listRemaining,
            budgetMax,
        };
    }

    _formatProductName (cartProduct, sItemKey) {
        const apiName = sItemKey ? getItemVariants(sItemKey)?.sName : null;
        if (apiName) return apiName;
        const resolved = sItemKey ? resolveItem(sItemKey) : null;
        if (resolved?.label) return resolved.label;
        const key = cartProduct?.key ?? '';
        return key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) || 'Product';
    }

    async _showProductPopup (cartProduct, sItemKey) {
        if (this._productPopupOpen || this._timesUpOpen || this._viewCartOpen || this._ecoEmptyOpen || this._coinsOpen || this._saleOpen) return;
        this._productPopupOpen = true;
        this.oTimer?.pause();
        this.oCharacter?.setInputEnabled(false);

        let apiVariants = sItemKey ? getItemVariants(sItemKey) : null;
        const itemId = sItemKey ? getItemId(sItemKey) : null;
        if (itemId) {
            try {
                apiVariants = await fetchItemVariants(itemId);
            } catch (err) {
                console.error('[Item details]', err);
            }
        }

        const pair = buildEcoVariantPair(cartProduct, apiVariants);
        const variants = ['standard', 'eco'].map((key) => {
            const product = pair[key];
            const meta = this._buildProductPopupMeta(product, product.price);
            return {
                key,
                product,
                price: product.price,
                isEcoVariant: product.isEcoVariant,
                infoLine: meta.infoLine,
                infoColor: meta.infoColor,
                listRemaining: meta.listRemaining,
                budgetMax: meta.budgetMax,
            };
        });

        const onClose = () => {
            this._productPopupOpen = false;
            this.oTimer?.resume();
            this.oCharacter?.setInputEnabled(true);
        };

        const displayName = this._formatProductName(cartProduct, sItemKey);
        const spent = this.oMyCart?.getTotal() ?? 0;
        const coinsRemaining = this._budgetRemaining ?? Math.max(0, (this._budget ?? 0) - spent);
        const listRemaining = variants.find((v) => v.listRemaining != null)?.listRemaining;
        this.oProductPopup.open({
            displayName,
            variants,
            coinsRemaining,
            ecoRemaining: this._ecoValue ?? 0,
            requirementQty: listRemaining ?? 1,
            onClose,
            onConfirm: (selections) => this._addProductToCart(selections, sItemKey),
        });
    }

    /**
     * @param {Array<{product:object, qty:number}>} selections — one entry per variant (standard/eco),
     *   each with the quantity chosen independently in the popup.
     * @param {string} sItemKey
     */
    async _addProductToCart (selections, sItemKey) {
        const budget = this._budget ?? 0;
        let spent = this.oMyCart?.getTotal() ?? 0;
        const collectedDelta = {};
        const itemKey = (p) => p.key ?? p.textureKey;

        // Clamp each variant's requested quantity against budget/shopping-list limits,
        // accounting for the combined effect of both variants in this same batch.
        const batches = [];
        for (const { product, qty } of selections) {
            if (!product || qty <= 0) continue;
            const onList = this.oShoppingList?.isProductOnList(product) ?? false;
            const price = product.price ?? 0;
            let added = 0;

            for (let i = 0; i < qty; i++) {
                if (budget > 0 && spent + price > budget) break;
                if (onList) {
                    const remaining = (this.oShoppingList?.getRemainingForProduct(product) ?? Infinity)
                        - (collectedDelta[itemKey(product)] ?? 0);
                    if (remaining <= 0) break;
                }
                spent += price;
                collectedDelta[itemKey(product)] = (collectedDelta[itemKey(product)] ?? 0) + 1;
                added += 1;
            }

            if (added > 0) batches.push({ product, qty: added, onList });
        }

        if (!batches.length) return;

        // Both variants (standard/eco) resolve to the same sItemKey server-side, so a
        // single call carrying their combined quantity is all the API needs — never one
        // call per variant. The cart/add response's aCartItems is the sole source of
        // truth for what ends up in the cart.
        const totalQty = batches.reduce((sum, b) => sum + b.qty, 0);

        if (sItemKey) {
            try {
                const result = await addToCart(sItemKey, totalQty);
                this._applyCartMutationResult(result);
            } catch (err) {
                console.error('[Cart add]', err);
                return;
            }
        } else {
            for (const { product, qty } of batches) {
                for (let i = 0; i < qty; i++) this.oMyCart?.tryAddItem(product);
            }
            const ecoDelta = batches.reduce((sum, b) => sum + (b.product.ecoImpact ?? 0) * b.qty, 0);
            this.setEcoMeter((this._ecoValue ?? 0) + ecoDelta, this._ecoMax);
            this.oCharacter?.setCartItems(this.oMyCart?.getItems() ?? []);
        }

        const ptr = this.input.activePointer;
        for (const { product, qty, onList } of batches) {
            if (onList) {
                for (let i = 0; i < qty; i++) this.oShoppingList?.onProductCollected(product);
            }
            this._flyToCart(product, ptr.worldX, ptr.worldY);
        }

        this._saveState();
        this._updateHudMeters();
        this._syncShoppingListButton();
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

            this.editorCreate(gameConfig, null);
        }
    }

    _chooseAnotherMission() {
        this._clearSavedState();
        this.scene.start('Home');
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
        const cardW = hud.meterCardW;
        const cardH = cardW * (376 / 663);
        const cy = hud.topY + cardH / 2;

        this._budgetMax = budgetMax;
        const spent = this.oMyCart?.getTotal() ?? 0;
        const remaining = this._budgetRemaining ?? Math.max(0, budgetMax - spent);

        this.oCoinsPanel = new CoinsPanel(this, hud.coinsX, cy, {
            amount: remaining,
            max: budgetMax,
            displayWidth: cardW,
        });

        this.oEcoPanel = new EcoMeterPanel(this, hud.ecoX, cy, {
            value: this._ecoValue,
            max: this._ecoMax,
            displayWidth: cardW,
        });

        // Keep legacy refs pointed at the new panels for any callers.
        this.oEcoMeter = this.oEcoPanel;
        this.oBudgetBar = this.oCoinsPanel;
        this.oEcoBar = this.oEcoPanel;

        this._updateHudMeters();
    }

    _updateHudMeters () {
        const spent = this.oMyCart?.getTotal() ?? 0;
        const budgetMax = Math.max(1, this._budgetMax ?? 1);
        const remaining = this._budgetRemaining ?? Math.max(0, budgetMax - spent);

        this.oCoinsPanel?.setAmount(remaining, budgetMax);
        this.oEcoPanel?.setProgress(this._ecoValue ?? 0, this._ecoMax ?? 1);
        this._syncShoppingListButton();
    }

    _syncShoppingListButton () {
        const { done, total } = this.oShoppingList?.getProgress?.() ?? { done: 0, total: 0 };
        this.oShoppingListBtn?.setProgress(done, total);
    }

    /** Reconciles the cart contents / eco meter / remaining budget with the authoritative values from a cart add/remove API response. */
    _applyCartMutationResult (result) {
        const data = result?.data;
        if (!data) return;

        if (data.aCartItems) {
            this.oMyCart?.setItems(buildCartItemsFromApi(data.aCartItems));
            this.oCharacter?.setCartItems(this.oMyCart?.getItems() ?? []);
        }

        const ecoValue = data.nEcoMeter ?? data.nCurrentEcoMeter ?? data.nEcoPoints;
        const ecoMax = data.nEcoMeterMax ?? data.nMaxEcoMeter ?? this._ecoMax;
        if (ecoValue != null) this.setEcoMeter(ecoValue, ecoMax);

        const remainingBudget = data.nSessionBudget ?? data.nRemainingBudget ?? data.nBudgetRemaining;
        if (remainingBudget != null) {
            this._budgetRemaining = remainingBudget;
            this._updateHudMeters();
        }
    }

    setEcoMeter (value, max) {
        if (max != null) this._ecoMax = Math.max(1, max);
        this._ecoValue = Phaser.Math.Clamp(value, 0, this._ecoMax);
        this._updateHudMeters();
    }

    async openCheckout() {
        if (this._checkoutOpen || this._timesUpOpen || this._viewCartOpen || this._ecoEmptyOpen || this._coinsOpen || this._saleOpen) return;
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
        if (this._productPopupOpen || this._checkoutOpen || this._timesUpOpen || this._viewCartOpen || this._ecoEmptyOpen || this._coinsOpen || this._saleOpen) return;

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
