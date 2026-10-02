import Phaser from "phaser";
import config from "../utils/config.js";
import { setCauseText } from "../utils/gameText.js";
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
import { patchRacksWithApiPrices, buildShoppingListEntries, buildCartItemsFromApi, buildViewCartRowsFromApi, applyCartCollectedToEntries, addToCart, removeFromCart, fetchCart, resolveItem, resolveItemKeyFromProduct, checkoutGame, setGameId, setSessionId, setMissionId, setItemVariants, getItemVariants, getItemId, fetchItemVariants, startMission, mergeStartSessionIntoConfig, fetchMissionItems, missionIdFromResponse, apiNormalTextureKey, apiEcoTextureKey, cartVariantOf } from "../../../utils/gameApi.js";
import ProductInfoPopup from "../prefabs/popups/ProductInfoPopup.js";
import SalePopup from "../prefabs/popups/SalePopup.js";
import NotEnoughCoinsPopup from "../prefabs/popups/NotEnoughCoinsPopup.js";
import EcoMeterEmptyPopup from "../prefabs/popups/EcoMeterEmptyPopup.js";
import ViewCartPopup from "../prefabs/popups/ViewCartPopup.js";
import TimesUpPopup from "../prefabs/popups/TimesUpPopup.js";
import MissionSuccessPopup from "../prefabs/popups/MissionSuccessPopup.js";
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
        this._ecoValue = savedState?.ecoValue != null
            ? savedState.ecoValue
            : (gameConfig?.ecoMeter ?? this._ecoMax);
        this._budgetRemaining = savedState?.budgetRemaining != null
            ? savedState.budgetRemaining
            : (savedState ? null : (gameConfig?.coinsRemaining ?? null));
        if (gameConfig?.sessionId) setSessionId(gameConfig.sessionId);
        if (gameConfig?.gameId) setGameId(gameConfig.gameId);
        if (gameConfig?.missionId) setMissionId(gameConfig.missionId);

        // Seed variants before patching racks so resolveItem can use API names/images.
        const variantSeed = [
            ...(gameConfig?.items ?? []),
            ...(gameConfig?.shoppingList ?? []).map((it) => ({
                _id: it.iItemId,
                sItemKey: it.sItemKey,
                sName: it.sName,
            })),
            ...(gameConfig?.initialCartItems ?? []).map((it) => ({
                _id: it.iItemId,
                sItemKey: it.sItemKey,
                sName: it.sName,
            })),
        ];
        setItemVariants(variantSeed);

        let racksData = getRacksForView();
        if (gameConfig?.items?.length) {
            racksData = patchRacksWithApiPrices(gameConfig.items, racksData);
        }

        // Use saved entries (with collected counts) on restore, fresh entries otherwise
        let shoppingEntries = savedState?.shoppingEntries
            ?? (gameConfig?.shoppingList ? buildShoppingListEntries(gameConfig.shoppingList) : null);
        if (!savedState && shoppingEntries && gameConfig?.initialCartItems?.length) {
            shoppingEntries = applyCartCollectedToEntries(shoppingEntries, gameConfig.initialCartItems);
        }

        const initialCartItems = savedState?.cartItems
            ?? (gameConfig?.initialCartItems?.length
                ? buildCartItemsFromApi(gameConfig.initialCartItems)
                : []);

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
            onTick: () => {
                if (this._viewCartOpen) this.oViewCart?.setTimerRemaining(this.oTimer.getRemaining());
                if (this.oTimer.getRemaining() % 10 === 0) this._saveState();
            },
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

        // Restore cart items if resuming / hydrating from start session
        this.oMyCart = new MyCartPanel(this, hud.cartX ?? config.centerX, hud.cartY ?? config.height - 10, {
            panelWidth: hud.cartPanelWidth,
            initialItems: initialCartItems,
            onViewCart: () => this._showViewCartPopup(),
            onItemRemoved: (product) => this._removeCartItem(product),
        });

        this.oShoppingListBtn = new ShoppingListButton(
            this,
            hud.shoppingListBtnX,
            hud.shoppingListBtnY,
            {
                size: hud.shoppingListBtnSize,
                expanded: true,
                onToggle: (expanded) => {
                    this.oShoppingList?.setExpanded(expanded);
                    this._syncListWalkBound();
                },
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
        this._syncListWalkBound();

        this.oCheckout = new CheckoutPanel(this);
        this.oMissionSuccess = new MissionSuccessPopup(this);
        this.oProductPopup = new ProductInfoPopup(this);
        this.oSalePopup = new SalePopup(this);
        this.oNotEnoughCoins = new NotEnoughCoinsPopup(this);
        this.oEcoMeterEmpty = new EcoMeterEmptyPopup(this);
        this.oViewCart = new ViewCartPopup(this);
        this.oTimesUp = new TimesUpPopup(this);
        this._checkoutOpen = false;
        this._missionSuccessOpen = false;
        this._saleOpen = false;
        this._coinsOpen = false;
        this._ecoEmptyOpen = false;
        this._viewCartOpen = false;
        this._timesUpOpen = false;

        if (!pauseTimer && (savedState?.timerRemaining ?? timeLimit) <= 0) {
            this.time.delayedCall(200, () => this._showTimesUpPopup());
        }

        this._scheduleSaleReveal();
    }

    _showEcoMeterEmptyPopup () {
        if (this._timesUpOpen || this._viewCartOpen || this._ecoEmptyOpen || this._coinsOpen || this._saleOpen || this._checkoutOpen || this._missionSuccessOpen || this._productPopupOpen) return;
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
        if (this._timesUpOpen || this._viewCartOpen || this._ecoEmptyOpen || this._coinsOpen || this._saleOpen || this._checkoutOpen || this._missionSuccessOpen || this._productPopupOpen) return;
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

    async _showViewCartPopup () {
        if (this._timesUpOpen || this._viewCartOpen || this._ecoEmptyOpen || this._coinsOpen || this._saleOpen || this._checkoutOpen || this._missionSuccessOpen || this._productPopupOpen) return;
        this._viewCartOpen = true;
        this.oCharacter?.setInputEnabled(false);
        const resume = () => {
            this._viewCartOpen = false;
            this.oCharacter?.setInputEnabled(true);
        };

        const requiredKeys = new Set(
            (this.oShoppingList?.getEntries?.() ?? [])
                .filter(Boolean)
                .flatMap((e) => [e.sItemKey, e.key].filter(Boolean)),
        );
        const stillNeeded = this._buildStillNeededItems();
        const { done, total } = this.oShoppingList?.getProgress?.() ?? { done: 0, total: 0 };
        const spent = this.oMyCart?.getTotal() ?? 0;
        let coinsRemaining = this._budgetRemaining ?? Math.max(0, (this._budget ?? 0) - spent);
        let ecoRemaining = this._ecoValue ?? 0;
        let cartItems = this._buildViewCartRowsFromLocal(requiredKeys);

        try {
            const json = await fetchCart(this._gameConfig?.missionId);
            const data = json?.data ?? json ?? {};
            const session = data.session ?? data;
            const payload = {
                data: {
                    ...data,
                    ...session,
                    aCartItems: data.aCartItems ?? session.aCartItems,
                },
            };
            this._applyCartMutationResult(payload);
            const aCartItems = payload.data.aCartItems ?? [];
            if (Array.isArray(aCartItems)) {
                cartItems = buildViewCartRowsFromApi(aCartItems, requiredKeys);
            }
            if (payload.data.nCoinsRemaining != null) {
                coinsRemaining = payload.data.nCoinsRemaining;
                this._budgetRemaining = payload.data.nCoinsRemaining;
            } else if (payload.data.nSessionBudget != null) {
                coinsRemaining = payload.data.nSessionBudget;
                this._budgetRemaining = payload.data.nSessionBudget;
            }
            const ecoLeft = payload.data.nEcoRemaining
                ?? payload.data.nEcoMeter
                ?? payload.data.nCurrentEcoMeter;
            if (ecoLeft != null) {
                ecoRemaining = ecoLeft;
                this.setEcoMeter(
                    ecoLeft,
                    payload.data.nEcoMeterMax ?? payload.data.nMaxEcoMeter ?? this._ecoMax,
                );
            }
            this._updateHudMeters();
        } catch (err) {
            console.error('[View cart]', err);
        }

        if (this._timesUpOpen || !this._viewCartOpen) return;

        this.oViewCart.open({
            itemsFound: `${done}/${Math.max(total, done)}`,
            coinsRemaining,
            ecoRemaining,
            timerRemaining: this.oTimer?.getRemaining() ?? 0,
            cartItems,
            stillNeeded,
            onClose: resume,
            onContinue: () => {},
            onFindRemaining: () => {},
            onCheckout: () => this.openCheckout(),
            onQtyChange: (item, next, _index, delta) => {
                if (delta >= 0) return;
                this._removeCartUnits(item, Math.abs(delta), next);
            },
        });
    }

    async _removeCartItem (product) {
        const sItemKey = resolveItemKeyFromProduct(product);
        const iItemId = product?.iItemId ?? (sItemKey ? getItemId(sItemKey) : null);
        if (!iItemId) return false;
        try {
            const result = await removeFromCart({
                iItemId,
                eVariant: cartVariantOf(product),
            });
            const root = result?.data ?? result ?? {};
            const data = root.session ?? root;
            const aCartItems = data?.aCartItems ?? root.aCartItems;
            this._applyCartMutationResult(result);
            if (!Array.isArray(aCartItems)) {
                const items = this.oMyCart?.getItems() ?? [];
                const index = items.indexOf(product);
                if (index >= 0) {
                    items.splice(index, 1);
                    this.oMyCart?.setItems(items);
                }
                this.oShoppingList?.onProductRemoved(product);
                this.setEcoMeter((this._ecoValue ?? 0) - (product.ecoImpact ?? 0), this._ecoMax);
                this.oCharacter?.setCartItems(this.oMyCart?.getItems() ?? []);
                this._updateHudMeters();
            }
            this._saveState();
            return true;
        } catch (err) {
            console.error('[Cart remove]', err);
            return false;
        }
    }

    async _removeCartUnits (item, count, nextQty) {
        const iItemId = item?.iItemId ?? (item?.sItemKey ? getItemId(item.sItemKey) : null);
        if (!iItemId || count <= 0) return;
        const eVariant = cartVariantOf(item);
        try {
            let result = null;
            for (let i = 0; i < count; i++) {
                result = await removeFromCart({ iItemId, eVariant });
            }
            if (result) this._applyCartMutationResult(result);
            if (nextQty <= 0) {
                this.oMyCart?.setItems(
                    (this.oMyCart?.getItems() ?? []).filter((product) => {
                        const sameItem = (product.iItemId ?? getItemId(product.sItemKey)) === iItemId
                            || product.sItemKey === item.sItemKey;
                        const sameVariant = cartVariantOf(product) === cartVariantOf(item);
                        return !(sameItem && sameVariant);
                    }),
                );
                this.oCharacter?.setCartItems(this.oMyCart?.getItems() ?? []);
            }
        } catch (err) {
            console.error('[Cart remove]', err);
            const restored = (nextQty ?? 0) + count;
            item.qty = restored;
            if (item._label) setCauseText(item._label, `${restored}`);
        }
    }

    _buildStillNeededItems () {
        const entries = this.oShoppingList?.getEntries?.() ?? [];
        return entries.filter(Boolean)
            .filter((e) => (e.collected ?? 0) < (e.required ?? 1))
            .map((e) => {
                const rem = Math.max(1, (e.required ?? 1) - (e.collected ?? 0));
                const label = e.label ?? e.key ?? 'Item';
                return {
                    name: rem > 1 ? `${label} ${rem}` : `${label} 1 Pack`,
                    textureKey: e.textureKey,
                };
            });
    }

    _buildViewCartRowsFromLocal (requiredKeys = null) {
        const grouped = new Map();
        for (const product of this.oMyCart?.getItems() ?? []) {
            const sItemKey = resolveItemKeyFromProduct(product);
            const variant = cartVariantOf(product);
            const mapKey = `${sItemKey ?? product?.key ?? product?.textureKey}|${variant}`;
            const existing = grouped.get(mapKey);
            if (existing) {
                existing.qty += 1;
                continue;
            }
            const required = requiredKeys
                ? (requiredKeys.has(sItemKey) || requiredKeys.has(product?.key))
                : !!(this.oShoppingList?.isProductOnList?.(product));
            grouped.set(mapKey, {
                name: product?.label ?? product?.key ?? 'Item',
                pack: '1 Pack',
                price: product?.price ?? 0,
                eco: product?.ecoImpact ?? 0,
                qty: 1,
                required,
                textureKey: product?.textureKey,
                isEcoVariant: !!product?.isEcoVariant,
                isSaleVariant: variant === 'sale',
                sItemKey,
                iItemId: product?.iItemId ?? (sItemKey ? getItemId(sItemKey) : null),
            });
        }
        return [...grouped.values()];
    }

    _scheduleSaleReveal () {
        this._saleTimer?.remove?.(false);
        this._saleTimer = null;
        const sale = this._gameConfig?.oSale;
        if (!sale?.sItemKey) return;
        if (this._saleRevealed) {
            this.time.delayedCall(300, () => this._highlightSaleOnRacks(sale));
            return;
        }
        const delay = Phaser.Math.Between(30_000, 60_000);
        this._saleTimer = this.time.delayedCall(delay, () => this._tryShowSalePopup());
    }

    _saleBlocked () {
        return !!(
            this._timesUpOpen || this._viewCartOpen || this._ecoEmptyOpen
            || this._saleOpen || this._coinsOpen || this._checkoutOpen
            || this._missionSuccessOpen || this._productPopupOpen
        );
    }

    _tryShowSalePopup () {
        if (this._saleRevealed || this._saleOpening) return;
        if (this._saleBlocked()) {
            this._saleTimer = this.time.delayedCall(2000, () => this._tryShowSalePopup());
            return;
        }
        this._openSaleOffer();
    }

    async _openSaleOffer () {
        const sale = this._gameConfig?.oSale;
        if (!sale?.sItemKey || this._saleRevealed || this._saleOpening) return;
        if (this._saleBlocked()) {
            this._saleTimer = this.time.delayedCall(2000, () => this._tryShowSalePopup());
            return;
        }
        this._saleOpening = true;
        const textureKey = await this._ensureSaleTexture(sale);
        this._saleOpening = false;
        if (this._saleRevealed) return;
        if (this._saleBlocked()) {
            this._saleTimer = this.time.delayedCall(2000, () => this._tryShowSalePopup());
            return;
        }
        this._saleRevealed = true;
        this._saveState();
        this._highlightSaleOnRacks(sale);
        this._showSalePopup(sale, textureKey);
    }

    _highlightSaleOnRacks (sale) {
        const shown = this.oMarketView?.highlightSaleProduct(sale?.sItemKey);
        if (!shown) {
            console.warn('[Level] Sale item is not on a shelf:', sale?.sItemKey);
        }
    }

    _ensureSaleTexture (sale) {
        const key = apiNormalTextureKey(sale?.sItemKey);
        if (!key) return Promise.resolve(null);
        if (this.textures.exists(key)) return Promise.resolve(key);
        const url = sale?.sImage;
        if (!url) return Promise.resolve(null);
        return new Promise((resolve) => {
            const finish = () => resolve(this.textures.exists(key) ? key : null);
            this.load.setCORS('anonymous');
            this.load.image(key, url);
            this.load.once(Phaser.Loader.Events.COMPLETE, finish);
            this.load.start();
        });
    }

    _salePopupCopy (sale) {
        const pitch = String(sale?.sPitch ?? '').trim();
        const bang = pitch.indexOf('!');
        let title = 'Flash Sale';
        let description = pitch || 'A special price, just for this shop.';
        if (bang > 0 && bang < 48) {
            const rest = pitch.slice(bang + 1).trim();
            title = pitch.slice(0, bang + 1).trim();
            description = rest || pitch;
        }
        const question = title.indexOf('?');
        if (question >= 0) {
            const after = title.slice(question + 1).trim();
            if (after) title = after;
        }
        return { title, description };
    }

    _showSalePopup (sale, textureKey) {
        if (!sale?.sItemKey) return;
        if (this._saleBlocked()) return;
        this._saleOpen = true;
        this.oTimer?.pause();
        this.oCharacter?.setInputEnabled(false);
        const spent = this.oMyCart?.getTotal() ?? 0;
        const copy = this._salePopupCopy(sale);
        const resume = () => {
            this._saleOpen = false;
            this.oTimer?.resume();
            this.oCharacter?.setInputEnabled(true);
        };
        this.oSalePopup.open({
            title: copy.title,
            name: sale.sDisplayName || sale.sName || 'Sale item',
            salePrice: sale.nSalePrice ?? sale.nCoins ?? 0,
            originalPrice: sale.nOriginalPrice ?? sale.nSalePrice ?? sale.nCoins ?? 0,
            ecoImpact: sale.nEcoPoints ?? 0,
            description: copy.description,
            textureKey: textureKey || apiNormalTextureKey(sale.sItemKey),
            coinsRemaining: this._budgetRemaining ?? Math.max(0, (this._budget ?? 0) - spent),
            ecoRemaining: this._ecoValue ?? 0,
            onClose: resume,
            onSkip: () => {},
            onBuy: ({ qty }) => this._buySaleOffer(sale, qty),
        });
    }

    async _buySaleOffer (sale, qty) {
        const units = Math.max(1, qty ?? 1);
        const iItemId = sale?.iItemId ?? getItemId(sale?.sItemKey);
        if (!iItemId) return;
        const textureKey = apiNormalTextureKey(sale.sItemKey);
        const product = {
            key: sale.sItemKey,
            sItemKey: sale.sItemKey,
            iItemId,
            textureKey,
            label: sale.sDisplayName || sale.sName || sale.sItemKey,
            price: sale.nSalePrice ?? sale.nCoins ?? 0,
            ecoImpact: sale.nEcoPoints ?? 0,
            isSaleVariant: true,
            isEcoVariant: false,
        };
        let added = 0;
        for (let i = 0; i < units; i++) {
            try {
                const result = await addToCart({ iItemId, eVariant: 'sale' });
                this._applyCartMutationResult(result);
                added += 1;
            } catch (err) {
                console.error('[Cart add sale]', err);
                this._handleCartAddRejected(err);
                break;
            }
        }
        if (!added) return;
        const shelfPos = this.oMarketView?.getProductWorldPosition(product);
        this._flyToCart(
            product,
            shelfPos?.x ?? config.centerX,
            shelfPos?.y ?? config.centerY,
        );
        this._saveState();
        this._updateHudMeters();
    }

    async _showTimesUpPopup () {
        if (this._viewCartOpen) {
            this._viewCartOpen = false;
            this.oViewCart?.dismiss();
            this.oCharacter?.setInputEnabled(false);
        }
        if (this._timesUpOpen || this._ecoEmptyOpen || this._coinsOpen || this._saleOpen || this._checkoutOpen || this._missionSuccessOpen || this._productPopupOpen) return;
        this._timesUpOpen = true;
        this.oTimer?.pause();
        this.oCharacter?.setInputEnabled(false);
        this._clearSavedState();
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
        const popupPayload = {
            items: listItems.length ? listItems : undefined,
            score: 0,
            scoreMax: 100,
            coinsUsed: spent,
            coinsMax: budget,
            ecoUsed: Math.max(0, ecoMax - ecoLeft),
            ecoMax,
            onClose: () => {
                this._timesUpOpen = false;
            },
            onDashboard: () => {
                this._timesUpOpen = false;
                this._leaveToDashboard();
            },
            onNewMission: () => {
                this._timesUpOpen = false;
                this._chooseAnotherMission();
            },
            onRetry: () => {
                this._timesUpOpen = false;
                this._restartMission();
            },
        };
        this.oTimesUp.open(popupPayload);

        try {
            const json = await checkoutGame({
                nTimeRemaining: this.oTimer?.getRemaining() ?? 0,
            });
            this._rememberCheckoutMissionId(json);
            if (!this._timesUpOpen) return;
            const fromApi = this._successPayloadFromCheckout(json);
            const score = fromApi.score ?? 0;
            if (score === 0 && fromApi.scoreMax == null && !fromApi.scoreNote) return;
            this.oTimesUp.open({
                ...popupPayload,
                score,
                scoreMax: fromApi.scoreMax ?? 100,
                ...(fromApi.scoreNote ? { scoreNote: fromApi.scoreNote } : {}),
            });
        } catch (err) {
            console.error('[Times Up] Checkout API error:', err);
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
        if (this._productPopupOpen || this._timesUpOpen || this._viewCartOpen || this._ecoEmptyOpen || this._coinsOpen || this._saleOpen || this._checkoutOpen || this._missionSuccessOpen) return;
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
        const batches = [];
        for (const { product, qty } of selections) {
            if (!product || qty <= 0) continue;
            batches.push({
                product,
                qty,
                onList: this.oShoppingList?.isProductOnList(product) ?? false,
            });
        }
        if (!batches.length) return;

        // POST /cart/add decides whether the item can be added. Do not block on local budget or list checks.
        const iItemId = sItemKey ? getItemId(sItemKey) : null;
        let syncedFromApi = false;
        const accepted = [];
        if (iItemId) {
            let rejected = false;
            for (const batch of batches) {
                if (rejected) break;
                const eVariant = batch.product?.isEcoVariant ? 'eco' : 'normal';
                let added = 0;
                for (let i = 0; i < batch.qty; i++) {
                    try {
                        const result = await addToCart({ iItemId, eVariant });
                        this._applyCartMutationResult(result);
                        syncedFromApi = true;
                        added += 1;
                    } catch (err) {
                        console.error('[Cart add]', err);
                        this._handleCartAddRejected(err);
                        rejected = true;
                        break;
                    }
                }
                if (added > 0) accepted.push({ ...batch, qty: added });
            }
        } else {
            accepted.push(...batches);
            for (const { product, qty } of accepted) {
                for (let i = 0; i < qty; i++) this.oMyCart?.tryAddItem(product);
            }
            const ecoDelta = accepted.reduce((sum, b) => sum + (b.product.ecoImpact ?? 0) * b.qty, 0);
            this.setEcoMeter((this._ecoValue ?? 0) + ecoDelta, this._ecoMax);
            this.oCharacter?.setCartItems(this.oMyCart?.getItems() ?? []);
        }

        if (!accepted.length) return;

        const ptr = this.input.activePointer;
        for (const { product, qty, onList } of accepted) {
            if (onList && !syncedFromApi) {
                for (let i = 0; i < qty; i++) this.oShoppingList?.onProductCollected(product);
            }
            const shelfPos = this.oMarketView?.getProductWorldPosition(product);
            const fromX = shelfPos?.x ?? ptr.worldX;
            const fromY = shelfPos?.y ?? ptr.worldY;
            this._flyToCart(product, fromX, fromY);
        }

        this._saveState();
        this._updateHudMeters();
        this._syncShoppingListButton();
    }

    _handleCartAddRejected (err) {
        const msg = String(err?.payload?.message || err?.payload?.data?.sMessage || err?.message || '').toLowerCase();
        if (/eco/.test(msg)) {
            this._showEcoMeterEmptyPopup();
            return;
        }
        if (/coin|budget|afford|price|balance|insufficient/.test(msg)) {
            this._showNotEnoughCoinsPopup();
        }
    }

    create({ isMusic, isSound, gameConfig = null } = {}) {
        this._restartingMission = false;
        this.oSoundManager = new SoundManager(this);
        this.oGameManager = new GameManager(this);
        this.oSoundManager.isMusic = isMusic;
        this.oSoundManager.isSound = isSound;

        const saved = this._loadSavedState();
        const resuming = sessionStorage.getItem('ss_inGame') === '1' && !!saved?.gameConfig;

        // Preload always downloads mission items + product textures before starting Level.
        // Prefer that fresh `items` payload so racks never build from shopping-list stubs.
        const mergedConfig = gameConfig?.items?.length
            ? { ...(saved?.gameConfig ?? {}), ...gameConfig, items: gameConfig.items }
            : (gameConfig ?? saved?.gameConfig ?? null);

        if (!mergedConfig?.items?.length) {
            console.error('[Level] No mission items ready — returning to Preload');
            this.scene.start('Preload', { gameConfig: mergedConfig });
            return;
        }

        const missingTextures = this._missingProductTextures(mergedConfig.items);
        if (missingTextures.length) {
            console.error('[Level] Product textures not ready:', missingTextures);
            this.scene.start('Preload', { gameConfig: mergedConfig });
            return;
        }

        this._saleRevealed = !!(resuming && saved?.saleRevealed);
        this._saleOpening = false;

        if (resuming) {
            setGameId(mergedConfig.gameId ?? saved.gameConfig.gameId);
            if (mergedConfig.sessionId ?? saved.gameConfig.sessionId) {
                setSessionId(mergedConfig.sessionId ?? saved.gameConfig.sessionId);
            }
            if (mergedConfig.missionId ?? saved.gameConfig.missionId) {
                setMissionId(mergedConfig.missionId ?? saved.gameConfig.missionId);
            }
            this.editorCreate(mergedConfig, saved);
            const canvas = this.game.canvas;
            canvas.setAttribute('tabindex', '1');
            canvas.focus();
        } else {
            if (saved) this._clearSavedState();
            this.editorCreate(mergedConfig, null);
            if (mergedConfig?.gameId) setGameId(mergedConfig.gameId);
            if (mergedConfig?.missionId) setMissionId(mergedConfig.missionId);
        }
    }

    /** Keys that must exist before racks are built (normal shelf art from oNormal.sImage). */
    _missingProductTextures (items) {
        const missing = [];
        for (const item of items ?? []) {
            const key = item?.sItemKey;
            if (!key) continue;
            const url = item.oNormal?.sImage || item.sImage;
            if (!url) continue;
            const texKey = `api_item_${String(key).replace(/[^a-zA-Z0-9_-]/g, '_')}_normal`;
            if (!this.textures.exists(texKey)) missing.push(texKey);
        }
        return missing;
    }

    _chooseAnotherMission() {
        this._clearSavedState();
        this.scene.start('Home');
    }

    /** Exit the mini-game to the host dashboard (or Home when running standalone). */
    _leaveToDashboard () {
        this._clearSavedState();
        if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'envhero:back-to-dashboard' }, '*');
        }
        this.scene.start('Home');
    }

    _rememberCheckoutMissionId (json) {
        const id = missionIdFromResponse(json);
        if (!id) return;
        this._checkoutMissionId = id;
        setMissionId(id);
        if (this._gameConfig) {
            this._gameConfig = { ...this._gameConfig, missionId: id };
        }
    }

    async _restartMission () {
        if (this._restartingMission) return;
        this._clearSavedState();
        const pending = this._gameConfig;
        const missionId = this._checkoutMissionId ?? pending?.missionId;
        if (!missionId) {
            console.error('[Level] Missing missionId — cannot restart mission');
            return;
        }

        this._restartingMission = true;
        try {
            if (pending?.gameId) setGameId(pending.gameId);
            setMissionId(missionId);
            const startJson = await startMission(missionId);
            const started = mergeStartSessionIntoConfig({ ...pending, missionId }, startJson);
            const nextMissionId = started.missionId ?? missionIdFromResponse(startJson) ?? missionId;
            setMissionId(nextMissionId);

            let items = [];
            try {
                items = await fetchMissionItems(nextMissionId);
            } catch (itemErr) {
                console.error('[Level] Failed to fetch mission items:', itemErr);
            }

            const gameConfig = {
                ...started,
                missionId: nextMissionId,
                items: items.length ? items : (started.items ?? pending?.items ?? []),
            };

            if (!items.length || this._missingProductTextures(items).length) {
                this.scene.start('Preload', { gameConfig });
                return;
            }

            this.scene.restart({ isMusic: true, isSound: true, gameConfig });
        } catch (err) {
            console.error('[Level] Mission start API failed:', err);
            this._restartingMission = false;
        }
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
                ecoValue: this._ecoValue ?? this._gameConfig?.ecoMeter ?? 0,
                budgetRemaining: this._budgetRemaining
                    ?? Math.max(0, (this._budget ?? 0) - (this.oMyCart?.getTotal() ?? 0)),
                saleRevealed: !!this._saleRevealed,
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

    /** Keep the player from walking under the expanded shopping-list notepad. */
    _syncListWalkBound () {
        const list = this.oShoppingList;
        if (!this.oCharacter) return;
        if (!list?.isExpanded?.()) {
            this.oCharacter.setRightLimit(null);
            return;
        }
        // Character origin is chest-center; trolley sits ~160px to the right when facing right.
        const clearance = 168;
        this.oCharacter.setRightLimit(list.getBlockingLeft() - clearance);
    }

    /** Reconciles cart / shopping list / eco / coins from a cart add/remove API response. */
    _applyCartMutationResult (result) {
        const root = result?.data ?? result ?? {};
        // Newer APIs nest session fields under data.session; older ones put them on data.
        const data = root.session ?? root;
        if (!data || typeof data !== 'object') return;

        const aCartItems = data.aCartItems ?? root.aCartItems;
        if (Array.isArray(aCartItems)) {
            this.oMyCart?.setItems(buildCartItemsFromApi(aCartItems));
            this.oCharacter?.setCartItems(this.oMyCart?.getItems() ?? []);
            this.oShoppingList?.syncCollectedFromCart(aCartItems, applyCartCollectedToEntries);
            this._syncShoppingListButton();
        }

        const ecoMax = data.nEcoLimit
            ?? data.nEcoMeterMax
            ?? data.nMaxEcoMeter
            ?? this._ecoMax;
        const ecoRemaining = data.nEcoRemaining
            ?? data.nEcoMeter
            ?? data.nCurrentEcoMeter;
        if (ecoRemaining != null) {
            // HUD eco panel treats value as remaining budget (same as start session).
            this.setEcoMeter(ecoRemaining, ecoMax);
        } else if (data.nEcoSpent != null && ecoMax != null) {
            this.setEcoMeter(Math.max(0, ecoMax - data.nEcoSpent), ecoMax);
        }

        const remainingBudget = data.nCoinsRemaining
            ?? data.nSessionBudget
            ?? data.nRemainingBudget
            ?? data.nBudgetRemaining;
        if (remainingBudget != null) {
            this._budgetRemaining = remainingBudget;
        }
        if (data.nCoinsBudget != null) {
            this._budget = data.nCoinsBudget;
            this._budgetMax = data.nCoinsBudget;
        }

        this._updateHudMeters();
    }

    setEcoMeter (value, max) {
        if (max != null) this._ecoMax = Math.max(1, max);
        this._ecoValue = Phaser.Math.Clamp(value, 0, this._ecoMax);
        this._updateHudMeters();
    }

    _checkoutItemTexture (item) {
        const key = item?.sItemKey;
        const entries = this.oShoppingList?.getEntries?.() ?? [];
        const match = entries.find((entry) => entry?.sItemKey === key || entry?.key === key);
        const candidates = [
            key ? apiEcoTextureKey(key) : null,
            key ? apiNormalTextureKey(key) : null,
            match?.textureKey,
        ];
        return candidates.find((textureKey) => textureKey && this.textures.exists(textureKey)) ?? null;
    }

    _successPayloadFromCheckout (json) {
        const data = json?.data ?? {};
        const factors = data.oFactors ?? {};
        const accuracy = factors.oAccuracy ?? {};
        const sustainability = factors.oSustainability ?? {};
        const coins = factors.oCoins ?? {};
        const eco = factors.oEco ?? {};
        const time = factors.oTime ?? {};
        const list = Array.isArray(data.aShoppingList) ? data.aShoppingList : [];
        const items = list.map((item) => {
            const qty = item.nQuantity ?? 1;
            const label = item.sName || item.sItemKey || 'Item';
            return {
                name: qty > 1 ? `${label} ${qty}` : `${label} 1 Pack`,
                done: item.bMatched === true,
                textureKey: this._checkoutItemTexture(item),
            };
        });
        const finalScore = Number(data.nFinalScore);
        return {
            title: data.sTitle,
            subtitle: data.sSubtitle,
            missionName: data.sMissionName,
            items: items.length ? items : undefined,
            stars: data.nStars,
            maxStars: data.nMaxStars,
            score: Number.isFinite(finalScore) ? finalScore : 0,
            scoreMax: data.nMaxScore,
            scoreNote: data.sFeedback,
            accuracyMatched: accuracy.nValue,
            accuracyTotal: accuracy.nMax,
            sustainabilityMatched: sustainability.nValue,
            sustainabilityTotal: sustainability.nMax,
            coinsUsed: coins.nUsed,
            coinsMax: coins.nBudget,
            coinsRemaining: coins.nRemaining,
            ecoUsed: eco.nUsed,
            ecoMax: eco.nLimit,
            ecoRemaining: eco.nRemaining,
            timeRemaining: time.sTimeRemaining ?? time.nRemaining,
            timeRemainLabel: time.sLabel,
        };
    }

    async openCheckout() {
        if (this._checkoutOpen || this._missionSuccessOpen || this._timesUpOpen || this._viewCartOpen || this._ecoEmptyOpen || this._coinsOpen || this._saleOpen) return;
        this._missionSuccessOpen = true;
        this.oTimer?.pause();
        this.oCharacter?.setInputEnabled(false);
        this._clearSavedState();

        const spent = this.oMyCart?.getTotal() ?? 0;
        const budget = this._budget ?? 0;
        const ecoMax = this._ecoMax ?? 32;
        const ecoLeft = this._ecoValue ?? 0;
        const ecoUsed = Math.max(0, ecoMax - ecoLeft);
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
        const matched = listItems.filter((item) => item.done).length;
        const total = Math.max(1, listItems.length);
        const overBudget = budget > 0 && spent > budget;
        const pct = matched / total;
        const stars = (pct >= 1 && !overBudget) ? 3 : (pct >= 1 ? 2 : (pct >= 0.5 ? 1 : 0));
        const sustainability = Math.max(0, Math.min(total, Math.round((1 - ecoUsed / Math.max(1, ecoMax)) * total)));
        const missionName = this._gameConfig?.category || this._gameConfig?.sName || 'Family Grocery Basket';

        let payload = {
            subtitle: `You completed ${missionName} Mission.`,
            missionName,
            items: listItems.length ? listItems : undefined,
            stars,
            score: 0,
            scoreMax: 100,
            accuracyMatched: matched,
            accuracyTotal: total,
            sustainabilityMatched: sustainability,
            sustainabilityTotal: total,
            coinsUsed: spent,
            coinsMax: budget,
            ecoUsed,
            ecoMax,
            timeRemaining: this.oTimer?.getRemaining() ?? 0,
        };

        try {
            const json = await checkoutGame({
                nTimeRemaining: this.oTimer?.getRemaining() ?? 0,
            });
            this._rememberCheckoutMissionId(json);
            const fromApi = this._successPayloadFromCheckout(json);
            payload = {
                ...payload,
                ...Object.fromEntries(
                    Object.entries(fromApi).filter(([, value]) => value != null),
                ),
            };
        } catch (err) {
            console.error('[Checkout] API error, using local values:', err);
        }

        this.oMissionSuccess?.open({
            ...payload,
            onClose: () => {
                this._missionSuccessOpen = false;
                this._clearSavedState();
            },
            onDashboard: () => {
                this._missionSuccessOpen = false;
                this._clearSavedState();
                this.scene.start('Home');
            },
            onNewMission: () => {
                this._missionSuccessOpen = false;
                this._chooseAnotherMission();
            },
            onPlayAgain: () => {
                this._missionSuccessOpen = false;
                this._restartMission();
            },
        });
    }

    _isSaleShelfProduct (sItemKey, product) {
        const sale = this._gameConfig?.oSale;
        if (!sale?.sItemKey) return false;
        if (sItemKey === sale.sItemKey || product?.sItemKey === sale.sItemKey || product?.key === sale.sItemKey) {
            return true;
        }
        const saleId = sale.iItemId ?? getItemId(sale.sItemKey);
        const productId = product?.iItemId ?? (sItemKey ? getItemId(sItemKey) : null);
        return !!(saleId && productId && String(saleId) === String(productId));
    }

    async _openSaleFromShelf () {
        const sale = this._gameConfig?.oSale;
        if (!sale?.sItemKey || this._saleOpening || this._saleBlocked()) return;
        this._saleTimer?.remove?.(false);
        this._saleTimer = null;
        if (!this._saleRevealed) {
            await this._openSaleOffer();
            return;
        }
        const textureKey = await this._ensureSaleTexture(sale);
        if (this._saleBlocked() || this._saleOpening) return;
        this._showSalePopup(sale, textureKey);
    }

    onProductClick(product, rackId, rackIndex) {
        if (this._productPopupOpen || this._checkoutOpen || this._missionSuccessOpen || this._timesUpOpen || this._viewCartOpen || this._ecoEmptyOpen || this._coinsOpen || this._saleOpen) return;

        const rack = getRackByIndex(rackIndex);
        const sItemKey = resolveItemKeyFromProduct(product) ?? product?.sItemKey ?? null;
        if (this._isSaleShelfProduct(sItemKey, product)) {
            this._openSaleFromShelf();
            return;
        }
        // Keep API shelf texture (api_item_*_normal); do not swap to removed local PNGs.
        const cartProduct = sItemKey
            ? { ...product, sItemKey, textureKey: product.textureKey ?? resolveItem(sItemKey)?.textureKey }
            : product;

        this._showProductPopup(cartProduct, sItemKey);
        console.log(`Product clicked — ${rack?.category} (${rackId}):`, product);
    }

    _flyToCart(product, fromX, fromY) {
        if (!product?.textureKey || !this.textures.exists(product.textureKey)) {
            this.oCharacter?.setCartItems(this.oMyCart?.getItems() ?? []);
            return;
        }

        const dest = this.oCharacter?.getCartWorldPosition() ?? { x: config.centerX, y: 400 };
        const charDepth = this.oCharacter?.depth ?? 155;

        const flyImg = this.add.image(fromX, fromY, product.textureKey);
        flyImg.setDisplaySize(120, 120);
        const sx = flyImg.scaleX;
        const sy = flyImg.scaleY;
        // Start above shelves / HUD so the flight is visible, then dive behind the
        // character so the item reads as landing inside the trolley.
        flyImg.setDepth(Math.max(charDepth + 20, 180));

        this.tweens.add({
            targets: flyImg,
            x: dest.x,
            y: dest.y,
            scaleX: sx * 0.35,
            scaleY: sy * 0.35,
            duration: 750,
            ease: 'Cubic.easeInOut',
            onUpdate: (tween) => {
                if (tween.progress >= 0.72) {
                    flyImg.setDepth(charDepth - 1);
                }
            },
            onComplete: () => {
                flyImg.destroy();
                this.oCharacter?.setCartItems(this.oMyCart?.getItems() ?? []);
            },
        });
    }
}

export default Level;
