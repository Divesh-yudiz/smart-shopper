import Phaser from 'phaser';
import { HOME_TEXTURE_KEYS } from '../config/homeAssets.js';
import HomeInfoPopup from '../prefabs/HomeInfoPopup.js';
import MissionSelectPopup from '../prefabs/popups/MissionSelectPopup.js';
import config from '../utils/config.js';
import { fetchMissionBrief, buildGameConfigFromMission } from '../../../utils/gameApi.js';
import { LOCAL_GAME_ID, LOCAL_MISSIONS } from '../config/missionsConfig.js';

const SAVE_KEY = 'ss_gameState';

const C_CREAM = 0xfef9e4;
const C_ORANGE = 0xf5a623;
const C_GREEN = 0x27ae60;
const C_GREEN_H = 0x219a52;
const C_WHITE = 0xffffff;
const C_CARD = 0xffffff;
const C_CARD_BD = 0xe8d5a0;
const C_HOW_BG = 0xfff6df;

const T_NAVY = '#1e3a5f';
const T_MUTED = '#7c5a2e';
const T_WHITE = '#ffffff';
const T_ORANGE = '#b06010';
const T_GREEN = '#1a7a45';

const HOW_STEPS = [
    { n: '1', title: 'Find your items', sub: 'Check the list and hunt them down!' },
    { n: '2', title: 'Pick the smart one', sub: 'Look at the price AND the planet.' },
    { n: '3', title: 'Beat the clock', sub: 'Watch coins, eco, and time!' },
];

/**
 * Start screen — wireframe layout with the Smart Shopper cream/orange theme.
 */
export default class Home extends Phaser.Scene {
    constructor () {
        super({ key: 'Home' });
    }

    create () {
        this._starting = false;
        this._missionsData = null;
        sessionStorage.removeItem('ss_inGame');
        sessionStorage.removeItem(SAVE_KEY);

        const bg = this.add.image(config.centerX, config.centerY, HOME_TEXTURE_KEYS.bgBlur);
        bg.setDisplaySize(config.width, config.height);

        const wash = this.add.rectangle(config.centerX, config.centerY, config.width, config.height, C_CREAM, 0.55);
        wash.setDepth(0);

        this._buildHeader();
        this._buildHero();
        this._buildHowItWorks();

        this._infoPopup = new HomeInfoPopup(this);
        this._missionPopup = new MissionSelectPopup(this);
        this._setupInput();
        this._updateChallengeLink(LOCAL_MISSIONS.length);

        const canvas = this.game.canvas;
        if (canvas) {
            canvas.setAttribute('tabindex', '1');
            canvas.focus();
        }
    }

    _buildHeader () {
        this._pillButton(200, 56, 260, 48, '←  Back to Dashboard', {
            fill: C_WHITE,
            border: C_ORANGE,
            color: T_ORANGE,
            onClick: () => this._leaveToDashboard(),
        });

        const info = this.add.image(config.width - 72, 56, HOME_TEXTURE_KEYS.infoButton);
        info.setDisplaySize(56, 56);
        info.setInteractive({ useHandCursor: true });
        info.on('pointerup', () => this._toggleInfo());
    }

    _buildHero () {
        this._drawSparkles(config.centerX, 300);

        const logo = this.add.image(config.centerX, 318, HOME_TEXTURE_KEYS.logo);
        const logoW = 600;
        const logoScale = logoW / logo.width;
        logo.setDisplaySize(logoW, logo.height * logoScale);
        this.tweens.add({
            targets: logo,
            y: logo.y - 8,
            duration: 1400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        this.add.text(config.centerX, 522, 'Ready to shop like a hero?', {
            fontFamily: config.fonts.text,
            fontSize: '40px',
            fontStyle: 'bold',
            color: T_NAVY,
            stroke: '#ffffff',
            strokeThickness: 5,
        }).setOrigin(0.5, 0.5);

        this.add.text(config.centerX, 568, 'Grab your list, pick the smart stuff, and beat the clock!', {
            fontFamily: config.fonts.text,
            fontSize: '24px',
            fontStyle: 'bold',
            color: T_MUTED,
            align: 'center',
            wordWrap: { width: 1000 },
        }).setOrigin(0.5, 0.5);

        this._selectBtn = this._pillButton(config.centerX, 650, 420, 76, "Let's Go Shopping!  🚀", {
            fill: C_GREEN,
            hoverFill: C_GREEN_H,
            color: T_WHITE,
            fontSize: '28px',
            bounce: true,
            onClick: () => this._beginGame(),
        });

        this._challengeLink = this.add.text(config.centerX, 708, '5 fun missions are waiting for you!', {
            fontFamily: config.fonts.text,
            fontSize: '20px',
            fontStyle: 'bold',
            color: T_GREEN,
        }).setOrigin(0.5, 0);
        this._challengeUnderline = this._underline(this._challengeLink, C_GREEN);
        this._challengeLink.setInteractive({ useHandCursor: true });
        this._challengeLink.on('pointerup', () => this._beginGame());
    }

    _drawSparkles (cx, cy) {
        const spots = [
            [cx - 340, cy - 90], [cx + 350, cy - 70],
            [cx - 300, cy + 80], [cx + 310, cy + 100],
            [cx - 380, cy + 10], [cx + 390, cy - 10],
        ];
        spots.forEach(([x, y], i) => {
            const star = this.add.text(x, y, '✦', {
                fontSize: i % 2 ? '28px' : '22px',
                color: '#f5a623',
            }).setOrigin(0.5, 0.5);
            this.tweens.add({
                targets: star,
                alpha: { from: 0.35, to: 1 },
                scale: { from: 0.85, to: 1.15 },
                duration: 700 + i * 90,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        });
    }

    _buildHowItWorks () {
        const panelW = 1640;
        const panelH = 220;
        const x = (config.width - panelW) / 2;
        const y = 800;

        const g = this.add.graphics();
        g.fillStyle(0x000000, 0.08);
        g.fillRoundedRect(x + 4, y + 6, panelW, panelH, 22);
        g.fillStyle(C_HOW_BG, 1);
        g.fillRoundedRect(x, y, panelW, panelH, 22);
        g.lineStyle(2, C_ORANGE, 0.5);
        g.strokeRoundedRect(x, y, panelW, panelH, 22);

        this.add.text(x + 40, y + panelH / 2 - 22, 'How do', {
            fontFamily: config.fonts.text,
            fontSize: '30px',
            fontStyle: 'bold',
            color: T_NAVY,
        }).setOrigin(0, 0.5);
        this.add.text(x + 40, y + panelH / 2 + 16, 'you win?', {
            fontFamily: config.fonts.text,
            fontSize: '30px',
            fontStyle: 'bold',
            color: T_ORANGE,
        }).setOrigin(0, 0.5);

        const cardsLeft = x + 380;
        const cardW = 380;
        const cardH = 148;
        const gap = 24;
        const cardY = y + (panelH - cardH) / 2;

        HOW_STEPS.forEach((step, i) => {
            this._drawStepCard(cardsLeft + i * (cardW + gap), cardY, cardW, cardH, step);
        });
    }

    _drawStepCard (x, y, w, h, step) {
        const g = this.add.graphics();
        g.fillStyle(0x000000, 0.08);
        g.fillRoundedRect(x + 3, y + 4, w, h, 18);
        g.fillStyle(C_CARD, 1);
        g.fillRoundedRect(x, y, w, h, 18);
        g.lineStyle(3, C_ORANGE, 0.55);
        g.strokeRoundedRect(x, y, w, h, 18);

        g.fillStyle(C_ORANGE, 1);
        g.fillCircle(x + w / 2, y + 36, 22);
        this.add.text(x + w / 2, y + 36, step.n, {
            fontFamily: config.fonts.text,
            fontSize: '22px',
            fontStyle: 'bold',
            color: T_WHITE,
        }).setOrigin(0.5, 0.5);

        this.add.text(x + w / 2, y + 78, step.title, {
            fontFamily: config.fonts.text,
            fontSize: '22px',
            fontStyle: 'bold',
            color: T_NAVY,
            align: 'center',
            wordWrap: { width: w - 20 },
        }).setOrigin(0.5, 0.5);

        this.add.text(x + w / 2, y + 112, step.sub, {
            fontFamily: config.fonts.text,
            fontSize: '16px',
            fontStyle: 'bold',
            color: T_MUTED,
            align: 'center',
            wordWrap: { width: w - 24 },
        }).setOrigin(0.5, 0.5);
    }

    _pillButton (cx, cy, w, h, label, { fill, hoverFill, border, color, fontSize = '18px', bounce = false, onClick }) {
        const wrap = this.add.container(cx, cy);
        const g = this.add.graphics();
        const r = h / 2;
        const draw = (hover) => {
            g.clear();
            g.fillStyle(0x000000, 0.18);
            g.fillRoundedRect(-w / 2 + 3, -h / 2 + 5, w, h, r);
            g.fillStyle(hover && hoverFill ? hoverFill : fill, 1);
            g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
            g.fillStyle(0xffffff, 0.2);
            g.fillRoundedRect(-w / 2 + 8, -h / 2 + 4, w - 16, h * 0.4, { tl: r, tr: r, bl: 0, br: 0 });
            if (border) {
                g.lineStyle(4, border, 1);
                g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
            }
        };
        draw(false);
        wrap.add(g);

        wrap.add(this.add.text(0, 0, label, {
            fontFamily: config.fonts.text,
            fontSize,
            fontStyle: 'bold',
            color,
            stroke: color === T_WHITE ? '#14532d' : undefined,
            strokeThickness: color === T_WHITE ? 3 : 0,
        }).setOrigin(0.5, 0.5));

        const hit = this.add.rectangle(0, 0, w, h, 0, 0);
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => {
            draw(true);
            if (!bounce) wrap.setScale(1.05);
        });
        hit.on('pointerout', () => {
            draw(false);
            if (!bounce) wrap.setScale(1);
        });
        hit.on('pointerup', onClick);
        wrap.add(hit);

        if (bounce) {
            this.tweens.add({
                targets: wrap,
                scaleX: 1.06,
                scaleY: 1.06,
                duration: 800,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        }
        return hit;
    }

    _underline (text, color) {
        const g = this.add.graphics();
        g.lineStyle(2, color, 0.9);
        g.lineBetween(
            text.x - text.width / 2,
            text.y + text.height + 2,
            text.x + text.width / 2,
            text.y + text.height + 2,
        );
        return g;
    }

    _leaveToDashboard () {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'envhero:back-to-dashboard' }, '*');
        }
        if (window.history.length > 1) window.history.back();
    }

    _toggleInfo () {
        if (this._infoPopup.isOpen) {
            this._infoPopup.close();
            return;
        }
        this._infoPopup.open();
    }

    _closeInfo () {
        if (this._infoPopup?.isOpen) this._infoPopup.close();
    }

    _setupInput () {
        this._onSpaceDown = (e) => {
            if (e.code !== 'Space' && e.key !== ' ') return;
            e.preventDefault();

            if (this._infoPopup?.isOpen) {
                this._closeInfo();
                return;
            }
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

    _teardownInput () {
        if (this._onSpaceDown) {
            window.removeEventListener('keydown', this._onSpaceDown);
            this._onSpaceDown = null;
        }
    }

    _updateChallengeLink (count) {
        if (!this._challengeLink) return;
        const n = Math.max(1, count);
        this._challengeLink.setText(`${n} fun mission${n === 1 ? '' : 's'} ${n === 1 ? 'is' : 'are'} waiting for you!`);
        this._challengeUnderline.clear();
        this._challengeUnderline.lineStyle(2, C_GREEN, 0.9);
        this._challengeUnderline.lineBetween(
            this._challengeLink.x - this._challengeLink.width / 2,
            this._challengeLink.y + this._challengeLink.height + 2,
            this._challengeLink.x + this._challengeLink.width / 2,
            this._challengeLink.y + this._challengeLink.height + 2,
        );
    }

    _beginGame () {
        if (this._starting || this._infoPopup?.isOpen || this._missionPopup?.isOpen) return;
        this._starting = false;
        sessionStorage.removeItem('ss_inGame');
        sessionStorage.removeItem(SAVE_KEY);
        this._showMissionList({
            gameId: LOCAL_GAME_ID,
            missions: LOCAL_MISSIONS,
        });
    }

    _showMissionList (missionsData) {
        this._missionsData = missionsData;
        this._missionPopup.open({
            missions: missionsData.missions,
            animate: false,
            onSelect: (mission) => this._viewMission(mission),
        });
    }

    async _viewMission (mission) {
        this._missionPopup.open({ loading: true, animate: false });
        try {
            const brief = await fetchMissionBrief(mission._id);
            const gameConfig = buildGameConfigFromMission(
                brief.mission,
                brief.gameId ?? this._missionsData?.gameId ?? LOCAL_GAME_ID,
            );
            this._teardownInput();
            this.scene.start('Preload', { gameConfig });
        } catch (err) {
            console.error('[Home] Failed to fetch mission brief, using local mission:', err);
            const gameConfig = buildGameConfigFromMission(
                mission,
                mission.iMiniGameId ?? this._missionsData?.gameId ?? LOCAL_GAME_ID,
            );
            this._teardownInput();
            this.scene.start('Preload', { gameConfig });
        }
    }
}
