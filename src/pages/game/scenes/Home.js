import Phaser from 'phaser';
import { HOME_TEXTURE_KEYS } from '../config/homeAssets.js';
import HomeInfoPopup from '../prefabs/HomeInfoPopup.js';
import MissionSelectPopup from '../prefabs/popups/MissionSelectPopup.js';
import MissionPopup from '../prefabs/popups/MissionPopup.js';
import config from '../utils/config.js';
import { fetchMissionBrief, buildGameConfigFromMission } from '../../../utils/gameApi.js';
import { LOCAL_GAME_ID, LOCAL_MISSIONS } from '../config/missionsConfig.js';

const SAVE_KEY = 'ss_gameState';

const T_NAVY = '#1e3a5f';
const T_MUTED = '#4a6280';
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
        sessionStorage.removeItem('ss_inGame');
        sessionStorage.removeItem(SAVE_KEY);

        this._root = this.add.container(0, 0);
        this._paint();

        this._infoPopup = new HomeInfoPopup(this);
        this._missionPopup = new MissionSelectPopup(this);
        this._briefPopup = new MissionPopup(this);
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

    /** Cause's space glyph is near-zero width — use an en-space so words stay readable. */
    _copy(s) {
        return String(s).replace(/ /g, '\u2002');
    }

    _text(x, y, message, style) {
        return this.add.text(x, y, this._copy(message), {
            fontFamily: config.fonts.text,
            letterSpacing: 0.4,
            ...style,
        });
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
        const backH = m.H * 0.078;
        const back = this.add.image(m.x(0.078), m.y(0.058), HOME_TEXTURE_KEYS.backButton);
        this._fitW(back, backH * (back.width / back.height));
        back.setInteractive({ useHandCursor: true });
        back.on('pointerover', () => back.setScale(back.scaleX * 1.04, back.scaleY * 1.04));
        back.on('pointerout', () => this._fitW(back, backH * (back.width / back.height)));
        back.on('pointerup', () => this._leaveToDashboard());
        this._add(back);

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

        this._add(this._text(
            m.cx,
            m.y(0.522),
            'Pick a mission, follow your shopping list and make smart choices along the way.',
            {
                fontSize: `${m.fs(28)}px`,
                color: T_MUTED,
                align: 'center',
                wordWrap: { width: m.W * 0.76 },
            },
        ).setOrigin(0.5, 0.5));

        const btnW = m.W * 0.248;
        const cta = this.add.container(m.cx, m.y(0.600));
        const btn = this.add.image(0, 0, HOME_TEXTURE_KEYS.greenButton);
        this._fitW(btn, btnW);
        btn.setInteractive({ useHandCursor: true });
        cta.add(btn);

        const btnLabel = this._text(0, 0, 'Select Mission', {
            fontSize: `${m.fs(38)}px`,
            fontStyle: 'bold',
            color: T_WHITE,
        }).setOrigin(0.5, 0.5);
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

        this._add(this._text(titleCard.x, cardY, 'How Smart Shopper\nWorks?', {
            fontSize: `${m.fs(36)}px`,
            fontStyle: 'bold',
            color: T_WHITE,
            align: 'center',
            lineSpacing: m.H * 0.01,
            wordWrap: { width: cardW * 0.88 },
        }).setOrigin(0.5, 0.5));

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

        this._add(this._text(cx, top + h * 0.62, step.title, {
            fontSize: `${m.fs(35)}px`,
            fontStyle: 'bold',
            color: T_NAVY,
            align: 'center',
            wordWrap: { width: w * 0.90 },
        }).setOrigin(0.5, 0.5));

        this._add(this._text(cx, top + h * 0.82, step.sub, {
            fontSize: `${m.fs(23)}px`,
            color: T_CARD_SUB,
            align: 'center',
            wordWrap: { width: w * 0.90 },
        }).setOrigin(0.5, 0.5));
    }

    _leaveToDashboard() {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'envhero:back-to-dashboard' }, '*');
        }
        if (window.history.length > 1) window.history.back();
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
        this._challengeLink.setText(this._copy(`Choose from ${n} shopping challenge${n === 1 ? '' : 's'}.`));
    }

    _beginGame() {
        if (this._starting || this._infoPopup?.isOpen || this._missionPopup?.isOpen || this._briefPopup?.isOpen) return;
        this._starting = false;
        sessionStorage.removeItem('ss_inGame');
        sessionStorage.removeItem(SAVE_KEY);
        this._showMissionList({
            gameId: LOCAL_GAME_ID,
            missions: LOCAL_MISSIONS,
        });
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
        const localConfig = buildGameConfigFromMission(
            mission,
            mission.iMiniGameId ?? this._missionsData?.gameId ?? LOCAL_GAME_ID,
        );
        this._openBrief(localConfig);

        try {
            const brief = await fetchMissionBrief(mission._id);
            const gameConfig = buildGameConfigFromMission(
                brief.mission,
                brief.gameId ?? this._missionsData?.gameId ?? LOCAL_GAME_ID,
            );
            if (this._briefPopup?.isOpen) this._openBrief(gameConfig);
        } catch (err) {
            console.error('[Home] Failed to fetch mission brief, using local mission:', err);
        }
    }

    _openBrief(gameConfig) {
        this._briefPopup.open({
            shoppingList: gameConfig.shoppingList ?? [],
            title: gameConfig.category ?? '',
            description: gameConfig.description ?? '',
            missionOrder: gameConfig.missionOrder ?? 0,
            budget: gameConfig.budget ?? 0,
            timeLimit: gameConfig.timeLimit ?? 0,
            ecoLimit: gameConfig.ecoMeterMax ?? 100,
            animate: false,
            onStart: () => {
                this._teardownInput();
                this.scene.start('Preload', { gameConfig });
            },
            onChooseAnother: () => {
                this._briefPopup.close({ restoreHome: false });
                this._showMissionList(this._missionsData ?? {
                    gameId: LOCAL_GAME_ID,
                    missions: LOCAL_MISSIONS,
                });
            },
        });
    }
}
