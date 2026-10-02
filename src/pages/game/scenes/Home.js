import Phaser from 'phaser';
import { HOME_TEXTURE_KEYS } from '../config/homeAssets.js';
import HomeInfoPopup from '../prefabs/HomeInfoPopup.js';
import MissionSelectPopup from '../prefabs/popups/MissionSelectPopup.js';
import MissionPopup from '../prefabs/popups/MissionPopup.js';
import WelcomeBackPopup from '../prefabs/popups/WelcomeBackPopup.js';
import config from '../utils/config.js';
import { addCauseText, setCauseText, wrapCause } from '../utils/gameText.js';
import { fetchMissions, fetchMissionBrief, buildGameConfigFromMission, startMission, setGameId, setMissionId, mergeStartSessionIntoConfig, checkoutGame, fetchCart, applyCartCollectedToEntries, buildCartItemsFromApi, buildShoppingListEntries } from '../../../utils/gameApi.js';
import { LOCAL_GAME_ID, LOCAL_MISSIONS } from '../config/missionsConfig.js';

const SAVE_KEY = 'ss_gameState';

const T_NAVY = '#1e3a5f';
const T_MUTED = '#243B58';
const T_WHITE = '#ffffff';
const T_CARD_SUB = '#1e3a5f';

const HOW_STEPS = [
    {
        panel: 'p2',
        dot: 'greenDot',
        icon: 'followListIcon',
        n: '1',
        title: 'Follow List!',
        sub: 'Find everything you need.',
    },
    {
        panel: 'p3',
        dot: 'bDot',
        icon: 'productIcon',
        n: '2',
        title: 'Compare Products',
        sub: 'Check price and Eco Impact.',
    },
    {
        panel: 'p4',
        dot: 'pDot',
        icon: 'trackIcon',
        n: '3',
        title: 'Stay on Track',
        sub: 'Balance Coin, Eco and Time.',
    },
];

/**
 * Start screen — Artboard home layout. All x / y / sizes are fractions of
 * the current game width and height so the screen stays responsive.
 */
export default class Home extends Phaser.Scene {
    constructor() {
        super({ key: 'Home' });
    }

    create() {
        this._starting = false;
        this._missionsData = null;

        const saved = this._loadSavedState();
        const resuming = sessionStorage.getItem('ss_inGame') === '1' && !!saved?.gameConfig;
        if (!resuming) {
            sessionStorage.removeItem('ss_inGame');
            sessionStorage.removeItem(SAVE_KEY);
        }

        this._root = this.add.container(0, 0);
        this._paint();

        this._infoPopup = new HomeInfoPopup(this);
        this._missionPopup = new MissionSelectPopup(this);
        this._briefPopup = new MissionPopup(this);
        this._welcomeBack = new WelcomeBackPopup(this);
        this._setupInput();
        this._updateChallengeLink(LOCAL_MISSIONS.length);

        this.scale.on('resize', this._onResize, this);
        this.events.once('shutdown', this._teardownResize, this);
        this.events.once('destroy', this._teardownResize, this);

        const canvas = this.game.canvas;
        if (canvas) {
            canvas.setAttribute('tabindex', '1');
            canvas.focus();
        }

        if (resuming) {
            this._showWelcomeBack(saved);
        }
    }

    _loadSavedState () {
        try {
            const raw = sessionStorage.getItem(SAVE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    async _showWelcomeBack (saved) {
        const missionId = saved?.gameConfig?.missionId ?? saved?.gameConfig?._id ?? null;
        if (missionId) {
            try {
                if (saved?.gameConfig?.gameId) setGameId(saved.gameConfig.gameId);
                setMissionId(missionId);
                const json = await fetchCart(missionId);
                if (!this.sys?.isActive()) return;
                this._applyCartToSaved(saved, json?.data ?? json ?? {});
            } catch (err) {
                console.error('[Home] Welcome back cart fetch failed:', err);
            }
        }
        if (!this.sys?.isActive()) return;
        this._welcomeBack.open(this._welcomeBackView(saved));
    }

    /**
     * Overlay GET /cart onto the unfinished session.
     * Coins, eco, and found items come from the server. The timer stays local.
     */
    _applyCartToSaved (saved, data) {
        const session = data?.session ?? data ?? {};
        const aCartItems = data?.aCartItems ?? session.aCartItems;
        const cfg = saved.gameConfig ?? (saved.gameConfig = {});

        if (session.nCoinsBudget != null) cfg.budget = session.nCoinsBudget;
        if (session.nCoinsRemaining != null) {
            cfg.coinsRemaining = session.nCoinsRemaining;
            saved.budgetRemaining = session.nCoinsRemaining;
        }
        if (session.nEcoLimit != null) cfg.ecoMeterMax = session.nEcoLimit;
        const ecoLeft = session.nEcoRemaining ?? session.nEcoMeter ?? session.nCurrentEcoMeter;
        if (ecoLeft != null) {
            cfg.ecoMeter = ecoLeft;
            saved.ecoValue = ecoLeft;
        }

        const apiList = data?.oMission?.aShoppingList
            ?? session?.oMission?.aShoppingList
            ?? null;
        if (Array.isArray(apiList) && apiList.length) {
            const byKey = new Map(
                apiList.filter((it) => it?.sItemKey).map((it) => [it.sItemKey, it]),
            );
            if (Array.isArray(cfg.shoppingList) && cfg.shoppingList.length) {
                cfg.shoppingList = cfg.shoppingList.map((it) => {
                    const api = byKey.get(it?.sItemKey);
                    if (!api) return it;
                    return {
                        ...it,
                        sImage: api.sImage || it.sImage || null,
                        sName: api.sName || it.sName,
                    };
                });
            } else {
                cfg.shoppingList = apiList;
            }
        }

        if (Array.isArray(aCartItems) || (Array.isArray(apiList) && apiList.length)) {
            if (Array.isArray(aCartItems)) cfg.initialCartItems = aCartItems;
            const baseEntries = saved.shoppingEntries?.length
                ? saved.shoppingEntries
                : (cfg.shoppingList?.length ? buildShoppingListEntries(cfg.shoppingList) : null);
            if (baseEntries) {
                let entries = Array.isArray(aCartItems)
                    ? applyCartCollectedToEntries(baseEntries, aCartItems)
                    : baseEntries;
                if (Array.isArray(apiList) && apiList.length) {
                    const byKey = new Map(
                        apiList.filter((it) => it?.sItemKey).map((it) => [it.sItemKey, it]),
                    );
                    entries = entries.map((entry) => {
                        if (!entry) return entry;
                        const api = byKey.get(entry.sItemKey) ?? byKey.get(entry.key);
                        if (!api) return entry;
                        return {
                            ...entry,
                            sImage: api.sImage || entry.sImage || null,
                            label: api.sName || entry.label,
                        };
                    });
                }
                saved.shoppingEntries = entries;
            }
            if (Array.isArray(aCartItems)) {
                saved.cartItems = buildCartItemsFromApi(aCartItems);
            }
        }

        try {
            const stored = this._loadSavedState() ?? {};
            sessionStorage.setItem(SAVE_KEY, JSON.stringify({
                ...stored,
                ...saved,
                timerRemaining: stored.timerRemaining ?? saved.timerRemaining,
            }));
        } catch { /* storage full or unavailable */ }
    }

    _welcomeBackView (saved) {
        const cfg = saved?.gameConfig ?? {};
        const entries = (saved?.shoppingEntries ?? []).filter(Boolean);
        const itemsFound = entries.filter((e) => (e.collected ?? 0) >= (e.required ?? 1)).length;
        const itemsTotal = Math.max(1, entries.length);
        const cartItems = saved?.cartItems ?? [];
        const spent = cartItems.reduce((sum, it) => sum + (it?.price ?? 0), 0);
        const coinsMax = cfg.budget ?? 62;
        const coinsLeft = saved?.budgetRemaining
            ?? cfg.coinsRemaining
            ?? Math.max(0, coinsMax - spent);
        const ecoMax = cfg.ecoMeterMax ?? 32;
        const ecoLeft = saved?.ecoValue ?? cfg.ecoMeter ?? ecoMax;
        const timeMax = cfg.timeLimit ?? 240;
        const timeLeft = saved?.timerRemaining ?? timeMax;

        const items = entries.length
            ? entries.map((e) => ({
                name: e.label ?? e.key ?? 'Item',
                done: (e.collected ?? 0) >= (e.required ?? 1),
                textureKey: e.textureKey,
                sItemKey: e.sItemKey,
                sImage: e.sImage || null,
            }))
            : undefined;

        return {
            missionOrder: cfg.missionOrder ?? 1,
            missionName: cfg.category || cfg.sName || 'Family Grocery Basket',
            missionDescription: cfg.description
                || 'Buy the everyday groceries on your shopping list while staying within your Shop Coin and Eco limits.',
            items,
            itemsFound,
            itemsTotal,
            timeLeft,
            timeMax,
            coinsLeft,
            coinsMax,
            ecoLeft,
            ecoMax,
            onResume: () => this._resumeMission(saved),
            onNewMission: () => this._startNewMission(saved),
            onClose: () => {},
        };
    }

    /**
     * Abandon the unfinished session: checkout the current mission, clear save,
     * then open the mission list so the player can pick a new one.
     */
    async _startNewMission (saved) {
        if (this._startingNew) return;
        this._startingNew = true;
        try {
            const cfg = saved?.gameConfig ?? {};
            const missionId = cfg.missionId ?? cfg._id ?? null;
            const miniGameId = cfg.gameId ?? LOCAL_GAME_ID;
            const timeLeft = saved?.timerRemaining ?? cfg.timeLimit ?? 0;
            if (missionId) {
                try {
                    await checkoutGame({
                        iMissionId: missionId,
                        iMiniGameId: miniGameId,
                        nTimeRemaining: timeLeft,
                    });
                } catch (err) {
                    console.error('[Home] Checkout before new mission failed:', err);
                }
            }
            sessionStorage.removeItem('ss_inGame');
            sessionStorage.removeItem(SAVE_KEY);
            await this._beginGame();
        } finally {
            this._startingNew = false;
        }
    }

    _resumeMission (saved) {
        const gameConfig = saved?.gameConfig;
        if (!gameConfig) {
            sessionStorage.removeItem('ss_inGame');
            sessionStorage.removeItem(SAVE_KEY);
            return;
        }
        // Keep ss_inGame so Level restores cart/timer from sessionStorage.
        this.scene.start('Preload', { gameConfig });
    }

    _onResize() {
        if (!this._root) return;
        this.tweens.killTweensOf(this._root.list);
        this._root.removeAll(true);
        this._paint();
        this._updateChallengeLink(LOCAL_MISSIONS.length);
    }

    _teardownResize() {
        this.scale.off('resize', this._onResize, this);
    }

    /** Positions and sizes as fractions of the live game width / height. */
    _m() {
        const W = this.scale.width;
        const H = this.scale.height;
        const s = Math.min(W / 1920, H / 1080);
        return {
            W,
            H,
            s,
            cx: W * 0.5,
            cy: H * 0.5,
            x: (pct) => W * pct,
            y: (pct) => H * pct,
            fs: (px) => Math.round(px * s),
        };
    }

    _fitW(img, displayW) {
        img.setDisplaySize(displayW, displayW * (img.height / img.width));
        return img;
    }

    _wrap(str, maxWidth, style) {
        return wrapCause(this, str, maxWidth, style);
    }

    _text(x, y, message, style) {
        return addCauseText(this, x, y, message, style);
    }

    _add(go) {
        this._root.add(go);
        return go;
    }

    _paint() {
        const m = this._m();

        const bg = this.add.image(m.cx, m.cy, HOME_TEXTURE_KEYS.bgBlur);
        bg.setDisplaySize(m.W, m.H);
        this._add(bg);

        const glow = this.add.image(m.cx, m.cy, HOME_TEXTURE_KEYS.glow);
        glow.setDisplaySize(m.W, m.H);
        glow.setBlendMode(Phaser.BlendModes.ADD);
        glow.setAlpha(0.6);
        this._add(glow);

        this._buildHeader(m);
        this._buildHero(m);
        this._buildHowItWorks(m);
    }

    _buildHeader(m) {
        const infoS = m.H * 0.074;
        const info = this.add.image(m.x(0.948), m.y(0.058), HOME_TEXTURE_KEYS.infoButton);
        info.setDisplaySize(infoS, infoS);
        info.setInteractive({ useHandCursor: true });
        info.on('pointerover', () => info.setDisplaySize(infoS * 1.06, infoS * 1.06));
        info.on('pointerout', () => info.setDisplaySize(infoS, infoS));
        info.on('pointerup', () => this._toggleInfo());
        this._add(info);
    }

    _buildHero(m) {
        const logoWrap = this.add.container(m.cx, m.y(0.268));
        const logo = this.add.image(0, 0, HOME_TEXTURE_KEYS.logo);
        this._fitW(logo, m.W * 0.30);
        logoWrap.add(logo);
        this._add(logoWrap);

        this.tweens.add({
            targets: logoWrap,
            y: logoWrap.y - m.H * 0.008,
            duration: 1400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        this._add(this._text(m.cx, m.y(0.468), 'Ready to Shop Smart?', {
            fontSize: `${m.fs(50)}px`,
            fontStyle: 'bold',
            color: T_NAVY,
        }).setOrigin(0.5, 0.5));

        const taglineStyle = { fontSize: `${m.fs(28)}px`, fontStyle: '500', color: T_MUTED, align: 'center' };
        this._add(this._text(
            m.cx,
            m.y(0.522),
            this._wrap('Pick a mission, follow your shopping list and make smart choices along the way.', m.W * 0.76, taglineStyle),
            taglineStyle,
        ).setOrigin(0.5, 0.5));

        const btnLabel = this._text(0, 0, 'Select Mission', {
            fontSize: `${m.fs(44)}px`,
            fontStyle: 'bold',
            color: T_WHITE,
            align: 'center',
        });
        btnLabel.setOrigin(0.5, 0.5);

        const src = this.textures.get(HOME_TEXTURE_KEYS.greenButton)?.getSourceImage?.();
        const tw = Math.max(1, src?.width ?? 512);
        const th = Math.max(1, src?.height ?? 148);
        const side = Math.max(8, Math.min(Math.floor(th * 0.48), Math.floor(tw / 2) - 1));
        const btnH = m.W * 0.20 * (th / tw);
        const sidePad = Math.max(m.W * 0.028, btnH * 0.55);
        const btnW = Math.max(m.W * 0.26, btnLabel.width + sidePad * 2);
        const srcW = Math.max(side * 2 + 8, Math.round(btnW * (th / btnH)));

        const cta = this.add.container(m.cx, m.y(0.600));
        const btn = this.add.nineslice(0, 0, HOME_TEXTURE_KEYS.greenButton, undefined, srcW, th, side, side, 0, 0);
        btn.setDisplaySize(btnW, btnH);
        btn.setInteractive({ useHandCursor: true });
        cta.add(btn);

        // Cause's glyph box sits below its visual center; a small downward
        // nudge keeps the letters optically centered on the button.
        btnLabel.setPosition(0, btnH * 0.01);
        cta.add(btnLabel);

        btn.on('pointerover', () => cta.setScale(1.05));
        btn.on('pointerout', () => cta.setScale(1));
        btn.on('pointerup', () => this._beginGame());
        this._add(cta);

        this.tweens.add({
            targets: cta,
            scaleX: 1.045,
            scaleY: 1.045,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        this._challengeLink = this._text(m.cx, m.y(0.668), 'Choose from 5 shopping challenges.', {
            fontSize: `${m.fs(24)}px`,
            fontStyle: '500',
            color: T_MUTED,
        }).setOrigin(0.5, 0.5);
        this._challengeLink.setInteractive({ useHandCursor: true });
        this._challengeLink.on('pointerup', () => this._beginGame());
        this._add(this._challengeLink);
    }

    _buildHowItWorks(m) {
        const panelW = m.W * 0.951;
        const panel = this.add.image(m.cx, m.y(0.848), HOME_TEXTURE_KEYS.uiBase);
        this._fitW(panel, panelW);
        this._add(panel);

        const panelH = panel.displayHeight;
        const panelX = m.cx - panelW / 2;
        const panelY = panel.y - panelH / 2;

        const padX = panelW * 0.018;
        const padY = panelH * 0.13;
        const gap = panelW * 0.012;
        const innerW = panelW - padX * 2;
        const cardW = (innerW - gap * 3) / 4;
        const cardH = panelH - padY * 2;
        const cardY = panelY + padY + cardH / 2;

        const titleCard = this.add.image(panelX + padX + cardW / 2, cardY, HOME_TEXTURE_KEYS.p1);
        titleCard.setDisplaySize(cardW, cardH);
        this._add(titleCard);

        const howStyle = {
            fontSize: `${m.fs(36)}px`,
            fontStyle: 'bold',
            color: T_WHITE,
            align: 'center',
            lineSpacing: m.H * 0.01,
        };
        this._add(this._text(
            titleCard.x,
            cardY,
            this._wrap('How Smart Shopper Works?', cardW * 0.88, howStyle),
            howStyle,
        ).setOrigin(0.5, 0.5));

        HOW_STEPS.forEach((step, i) => {
            const cx = panelX + padX + (i + 1) * (cardW + gap) + cardW / 2;
            this._drawStepCard(m, cx, cardY, cardW, cardH, step);
        });
    }

    _drawStepCard(m, cx, cy, w, h, step) {
        const card = this.add.image(cx, cy, HOME_TEXTURE_KEYS[step.panel]);
        card.setDisplaySize(w, h);
        this._add(card);

        const left = cx - w / 2;
        const top = cy - h / 2;
        const dotS = h * 0.20;
        const dot = this.add.image(left + w * 0.12, top + h * 0.18, HOME_TEXTURE_KEYS[step.dot]);
        dot.setDisplaySize(dotS, dotS);
        this._add(dot);

        this._add(this._text(dot.x, dot.y, step.n, {
            fontSize: `${m.fs(22)}px`,
            fontStyle: 'bold',
            color: T_WHITE,
        }).setOrigin(0.5, 0.5));

        const iconS = h * 0.40;
        const icon = this.add.image(cx, top + h * 0.30, HOME_TEXTURE_KEYS[step.icon]);
        icon.setDisplaySize(iconS, iconS);
        this._add(icon);

        const stepTitleStyle = {
            fontSize: `${m.fs(35)}px`,
            fontStyle: 'bold',
            color: T_NAVY,
            align: 'center',
        };
        this._add(this._text(cx, top + h * 0.62, this._wrap(step.title, w * 0.90, stepTitleStyle), stepTitleStyle).setOrigin(0.5, 0.5));

        const stepSubStyle = {
            fontSize: `${m.fs(23)}px`,
            color: T_CARD_SUB,
            align: 'center',
        };
        this._add(this._text(cx, top + h * 0.82, this._wrap(step.sub, w * 0.90, stepSubStyle), stepSubStyle).setOrigin(0.5, 0.5));
    }

    _toggleInfo() {
        if (this._infoPopup.isOpen) {
            this._infoPopup.close();
            return;
        }
        this._infoPopup.open();
    }

    _closeInfo() {
        if (this._infoPopup?.isOpen) this._infoPopup.close();
    }

    _setupInput() {
        this._onSpaceDown = (e) => {
            if (e.code !== 'Space' && e.key !== ' ') return;
            e.preventDefault();

            if (this._welcomeBack?.isOpen) return;
            if (this._infoPopup?.isOpen) {
                this._closeInfo();
                return;
            }
            if (this._briefPopup?.isOpen) return;
            if (this._missionPopup?.isOpen) {
                if (this._missionPopup.isDismissible) this._missionPopup.close();
                return;
            }
            this._beginGame();
        };

        window.addEventListener('keydown', this._onSpaceDown);
        this.events.once('shutdown', this._teardownInput, this);
        this.events.once('destroy', this._teardownInput, this);
    }

    _teardownInput() {
        if (this._onSpaceDown) {
            window.removeEventListener('keydown', this._onSpaceDown);
            this._onSpaceDown = null;
        }
    }

    _updateChallengeLink(count) {
        if (!this._challengeLink) return;
        const n = Math.max(1, count);
        setCauseText(this._challengeLink, `Choose from ${n} shopping challenge${n === 1 ? '' : 's'}.`);
    }

    async _beginGame() {
        if (
            this._starting
            || this._welcomeBack?.isOpen
            || this._infoPopup?.isOpen
            || this._missionPopup?.isOpen
            || this._briefPopup?.isOpen
        ) return;
        this._starting = true;
        sessionStorage.removeItem('ss_inGame');
        sessionStorage.removeItem(SAVE_KEY);

        this._missionPopup.open({
            loading: true,
            animate: false,
            onSelect: () => {},
        });

        try {
            const missionsData = await fetchMissions();
            this._updateChallengeLink(missionsData.missions?.length ?? 0);
            this._showMissionList(missionsData);
        } catch (err) {
            console.error('[Home] Failed to fetch missions, using local list:', err);
            this._showMissionList({
                gameId: LOCAL_GAME_ID,
                missions: LOCAL_MISSIONS,
            });
        } finally {
            this._starting = false;
        }
    }

    _showMissionList(missionsData) {
        this._missionsData = missionsData;
        this._missionPopup.open({
            missions: missionsData.missions,
            animate: false,
            onSelect: (mission) => this._viewMission(mission),
        });
    }

    async _viewMission(mission) {
        this._missionPopup.close({ restoreHome: false });
        const missionId = mission?._id ?? mission?.iMissionId ?? mission?.id ?? null;
        const localConfig = buildGameConfigFromMission(
            { ...mission, _id: missionId },
            mission.iMiniGameId ?? this._missionsData?.gameId ?? LOCAL_GAME_ID,
        );
        // Open brief without list first — list animates in after a successful fetch.
        this._openBrief(localConfig, { deferShoppingList: true });

        try {
            const brief = await fetchMissionBrief(missionId);
            const gameConfig = buildGameConfigFromMission(
                {
                    ...brief.mission,
                    _id: brief.mission?._id ?? missionId,
                },
                brief.gameId ?? this._missionsData?.gameId ?? LOCAL_GAME_ID,
            );
            if (!this._briefPopup?.isOpen) return;
            this._pendingGameConfig = gameConfig;
            this._briefPopup.revealShoppingList(gameConfig.shoppingList ?? [], { animate: true });
        } catch (err) {
            console.error('[Home] Failed to fetch mission brief, using local mission:', err);
            if (!this._briefPopup?.isOpen) return;
            this._briefPopup.revealShoppingList(localConfig.shoppingList ?? [], { animate: true });
        }
    }

    _openBrief(gameConfig, { deferShoppingList = false } = {}) {
        this._pendingGameConfig = gameConfig;
        this._briefPopup.open({
            shoppingList: gameConfig.shoppingList ?? [],
            title: gameConfig.category ?? '',
            description: gameConfig.description ?? '',
            missionOrder: gameConfig.missionOrder ?? 0,
            missionLabel: gameConfig.missionLabel ?? null,
            budget: gameConfig.budget ?? 0,
            timeLimit: gameConfig.timeLimit ?? 0,
            ecoLimit: gameConfig.ecoMeterMax ?? 100,
            animate: false,
            deferShoppingList,
            onStart: () => this._startShopping(),
            onChooseAnother: () => {
                this._briefPopup.close({ restoreHome: false });
                this._showMissionList(this._missionsData ?? {
                    gameId: LOCAL_GAME_ID,
                    missions: LOCAL_MISSIONS,
                });
            },
        });
    }

    async _startShopping () {
        if (this._startingMission) return;
        const pending = this._pendingGameConfig;
        const missionId = pending?.missionId;
        if (!missionId) {
            console.error('[Home] Missing missionId — cannot call start API');
            return;
        }

        this._startingMission = true;
        try {
            if (pending?.gameId) setGameId(pending.gameId);
            const startJson = await startMission(missionId);
            const gameConfig = mergeStartSessionIntoConfig(pending, startJson);
            this._pendingGameConfig = gameConfig;
            this._teardownInput();
            this._briefPopup?.close({ restoreHome: false });
            this.scene.start('Preload', { gameConfig });
        } catch (err) {
            console.error('[Home] Mission start API failed:', err);
        } finally {
            this._startingMission = false;
        }
    }
}
