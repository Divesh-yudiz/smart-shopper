import Phaser from 'phaser';
import config from '../../utils/config.js';

// ── layout constants ───────────────────────────────────────────────────────────
const PW = 1600;   // panel width
const PAD_X = 50;    // panel left/right inner padding
const PAD_Y = 34;    // panel bottom inner padding
const CR = 24;    // corner radius

const HEADER_BAR_H = 110;   // orange title bar
const SUBTITLE_H = 56;    // subtitle strip beneath the bar, on the cream body

const COLS = 3;
const GAP_X = 30;
const GAP_Y = 30;
const CW = (PW - PAD_X * 2 - GAP_X * (COLS - 1)) / COLS;
const IMG_H = 150;   // image-placeholder box height
const CH = 380;   // card height
const HEADER_H = HEADER_BAR_H + SUBTITLE_H;
const MAX_PANEL_H = 980;    // shrink-to-fit ceiling so tall grids stay on screen

// ── palette — matches the game's orange/cream theme (MissionPopup, Home) ───────
const C_PANEL_BG = 0xfef9e4;   // warm cream body
const C_PANEL_BORDER = 0xf5a623;   // orange outer border
const C_HEADER_BAR = 0xf5a623;   // orange title bar
const C_CARD_BG = 0xffffff;
const C_CARD_BORDER = 0xe8d5a0;   // light tan
const C_IMG_BG = 0xf5eed6;   // cream icon-box fill
const C_IMG_ICON = 0xcaa568;   // tan placeholder icon
const C_BADGE_BG = 0xfff1d6;   // soft orange badge
const C_BADGE_BORDER = 0xf0c987;
const C_DIVIDER = 0xd4b87a;   // tan dashed divider
const C_BTN = 0x27ae60;   // green CTA (matches "Let's Go!")
const C_BTN_HOVER = 0x219a52;

const T_WHITE = '#ffffff';
const T_SUBTITLE = '#7c5a2e';
const T_BADGE = '#b06010';
const T_MISSION_LABEL = '#b06010';
const T_CARD_TITLE = '#1e3a5f';
const T_META = '#5c6f86';
const T_DESC = '#6b5d45';
const T_BTN = '#ffffff';

export default class MissionSelectPopup extends Phaser.GameObjects.Container {
    constructor (scene) {
        super(scene, config.centerX, config.centerY);
        scene.add.existing(this);
        this.setDepth(600);
        this.setVisible(false);
    }

    /**
     * @param {{missions?: Array, loading?: boolean, error?: string, onSelect?: (mission:object)=>void, animate?: boolean}} opts
     */
    open ({ missions = [], loading = false, error = '', onSelect = () => { }, animate = true } = {}) {
        this._onSelect = onSelect;
        this._picked = false;
        this._dismissible = !!error;

        const items = missions.filter(Boolean);
        this._rows = loading || error || !items.length ? 1 : Math.max(1, Math.ceil(items.length / COLS));

        const cardsH = this._rows * CH + Math.max(0, this._rows - 1) * GAP_Y;
        this._PH = HEADER_H + cardsH + PAD_Y;
        this._PT = -this._PH / 2;

        this.removeAll(true);
        this.setScale(1);

        // dim overlay — required step, not dismissible by tapping outside
        const ov = this.scene.add.rectangle(0, 0, config.width, config.height, 0x000000, 0.55);
        ov.setInteractive();
        this.add(ov);

        this._drawPanel();
        this._drawHeader();

        if (loading) {
            this._drawStatus('Loading missions...');
        } else if (error) {
            this._drawStatus(error);
            ov.on('pointerup', () => this.close());
        } else {
            this._drawCards(items);
        }

        const fitScale = Math.min(1, MAX_PANEL_H / this._PH);
        this._fitScale = fitScale;

        this.setVisible(true);
        if (animate) {
            this.setAlpha(0);
            this.setScale(fitScale * 0.9);
            this.scene.tweens.add({
                targets: this, alpha: 1, scale: fitScale,
                duration: 340, ease: 'Back.easeOut',
            });
        } else {
            this.setAlpha(1);
            this.setScale(fitScale);
        }
    }

    _drawStatus (message) {
        const y = this._PT + HEADER_H + CH / 2;
        this.add(this.scene.add.text(0, y, message, {
            fontFamily: config.fonts.text,
            fontSize: '28px',
            fontStyle: 'bold',
            color: T_SUBTITLE,
            align: 'center',
            wordWrap: { width: PW - 120 },
        }).setOrigin(0.5, 0.5));
    }

    // ── panel background ──────────────────────────────────────────────────────

    _drawPanel () {
        const g = this.scene.add.graphics();

        // soft drop shadow
        g.fillStyle(0x000000, 0.20);
        g.fillRoundedRect(-PW / 2 + 6, this._PT + 8, PW, this._PH, CR);

        // orange border (slightly larger rect behind)
        g.fillStyle(C_PANEL_BORDER, 1);
        g.fillRoundedRect(-PW / 2 - 5, this._PT - 5, PW + 10, this._PH + 10, CR + 5);

        // cream body
        g.fillStyle(C_PANEL_BG, 1);
        g.fillRoundedRect(-PW / 2, this._PT, PW, this._PH, CR);

        this.add(g);
    }

    // ── orange header bar + subtitle ─────────────────────────────────────────

    _drawHeader () {
        const PT = this._PT;
        const g = this.scene.add.graphics();

        g.fillStyle(C_HEADER_BAR, 1);
        g.fillRoundedRect(-PW / 2, PT, PW, HEADER_BAR_H, { tl: CR, tr: CR, bl: 0, br: 0 });

        // top shine strip
        g.fillStyle(0xffffff, 0.18);
        g.fillRoundedRect(-PW / 2 + 8, PT + 4, PW - 16, HEADER_BAR_H * 0.43, {
            tl: CR - 2, tr: CR - 2, bl: 0, br: 0,
        });
        this.add(g);

        this.add(this.scene.add.text(0, PT + HEADER_BAR_H / 2, '★  CHOOSE YOUR MISSION  ★', {
            fontFamily: config.fonts.text,
            fontSize: '40px',
            fontStyle: 'bold',
            color: T_WHITE,
            stroke: '#9a3412',
            strokeThickness: 3,
        }).setOrigin(0.5, 0.5));

        this.add(this.scene.add.text(0, PT + HEADER_BAR_H + SUBTITLE_H / 2, 'Pick a shopping challenge and see how smart you can shop!', {
            fontFamily: config.fonts.text,
            fontSize: '23px',
            color: T_SUBTITLE,
        }).setOrigin(0.5, 0.5));
    }

    // ── card grid ─────────────────────────────────────────────────────────────

    _drawCards (items) {
        const gridTop = this._PT + HEADER_H;
        const gridW = COLS * CW + (COLS - 1) * GAP_X;
        const startX = -gridW / 2;

        items.forEach((mission, i) => {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const left = startX + col * (CW + GAP_X);
            const top = gridTop + row * (CH + GAP_Y);
            this._drawCard(left, top, mission);
        });
    }

    _drawCard (left, top, mission) {
        const cx = left + CW / 2;

        const g = this.scene.add.graphics();
        g.fillStyle(0x000000, 0.06);
        g.fillRoundedRect(left + 2, top + 3, CW, CH, 14);
        g.fillStyle(C_CARD_BG, 1);
        g.fillRoundedRect(left, top, CW, CH, 14);
        g.lineStyle(1.5, C_CARD_BORDER, 1);
        g.strokeRoundedRect(left, top, CW, CH, 14);
        this.add(g);

        // ── image placeholder box ────────────────────────────────────────────
        const imgTop = top;
        const ig = this.scene.add.graphics();
        ig.fillStyle(C_IMG_BG, 1);
        ig.fillRoundedRect(left, imgTop, CW, IMG_H, { tl: 14, tr: 14, bl: 0, br: 0 });
        this.add(ig);

        const iconCx = cx;
        const iconCy = imgTop + IMG_H / 2 + 8;
        const icon = this.scene.add.graphics();
        icon.fillStyle(C_IMG_ICON, 0.85);
        icon.fillCircle(iconCx - 26, iconCy - 22, 15);
        icon.fillTriangle(
            iconCx - 55, iconCy + 30,
            iconCx - 5, iconCy - 18,
            iconCx + 45, iconCy + 30,
        );
        icon.fillTriangle(
            iconCx - 10, iconCy + 30,
            iconCx + 30, iconCy - 4,
            iconCx + 65, iconCy + 30,
        );
        this.add(icon);

        this._drawBadge(left + CW - 14, imgTop + 14, mission.eStatus);

        // "Mission N" label, bottom-left of the image box
        this.add(this.scene.add.text(left + 18, imgTop + IMG_H - 16, `Mission ${mission.nOrder ?? ''}`.trim(), {
            fontFamily: config.fonts.text,
            fontSize: '20px',
            fontStyle: 'bold',
            color: T_MISSION_LABEL,
        }).setOrigin(0, 1));

        // ── mission title ─────────────────────────────────────────────────────
        let ty = imgTop + IMG_H + 26;
        this.add(this.scene.add.text(left + 20, ty, mission.sName ?? 'Mission', {
            fontFamily: config.fonts.text,
            fontSize: '26px',
            fontStyle: 'bold',
            color: T_CARD_TITLE,
            wordWrap: { width: CW - 40 },
        }).setOrigin(0, 0));
        ty += 40;

        // items to pick — sum of quantities on the shopping list
        const itemCount = (mission.aShoppingList ?? []).reduce((sum, it) => sum + (it.nQuantity ?? 0), 0);
        this.add(this.scene.add.text(left + 20, ty, `🛍  ${itemCount} item${itemCount === 1 ? '' : 's'} to pick`, {
            fontFamily: config.fonts.text,
            fontSize: '19px',
            color: T_META,
        }).setOrigin(0, 0));
        ty += 34;

        // description
        if (mission.sDescription) {
            this.add(this.scene.add.text(left + 20, ty, mission.sDescription, {
                fontFamily: config.fonts.text,
                fontSize: '17px',
                color: T_DESC,
                wordWrap: { width: CW - 40 },
                lineSpacing: 4,
            }).setOrigin(0, 0));
        }

        // ── footer: dashed divider + budget/time + View Mission button ──────
        const divY = top + CH - 74;
        const dg = this.scene.add.graphics();
        dg.fillStyle(C_DIVIDER, 0.8);
        for (let x = left + 20; x < left + CW - 20; x += 10) {
            dg.fillCircle(x, divY, 1.8);
        }
        this.add(dg);

        const footerY = divY + 34;
        this.add(this.scene.add.text(left + 20, footerY, `💰 AED ${mission.nBudget ?? '-'}   ⏱ ${mission.nTimeLimit ?? '-'}s`, {
            fontFamily: config.fonts.text,
            fontSize: '17px',
            fontStyle: 'bold',
            color: T_CARD_TITLE,
        }).setOrigin(0, 0.5));

        this._drawViewButton(left + CW - 20, footerY, mission);
    }

    _drawBadge (rightX, topY, status) {
        const label = this._statusLabel(status);
        const t = this.scene.add.text(-9999, -9999, label, {
            fontFamily: config.fonts.text, fontSize: '15px', fontStyle: 'bold',
        });
        const padX = 12, h = 30;
        const w = t.width + padX * 2;
        t.destroy();

        const bg = this.scene.add.graphics();
        bg.fillStyle(C_BADGE_BG, 1);
        bg.fillRoundedRect(rightX - w, topY, w, h, h / 2);
        bg.lineStyle(1, C_BADGE_BORDER, 1);
        bg.strokeRoundedRect(rightX - w, topY, w, h, h / 2);
        this.add(bg);

        this.add(this.scene.add.text(rightX - w / 2, topY + h / 2, label, {
            fontFamily: config.fonts.text,
            fontSize: '15px',
            fontStyle: 'bold',
            color: T_BADGE,
        }).setOrigin(0.5, 0.5));
    }

    _statusLabel (status) {
        const key = String(status ?? '').toLowerCase();
        if (key === 'played' || key === 'completed') return 'Played';
        if (key === 'in_progress' || key === 'in-progress') return 'In Progress';
        return 'Not Played';
    }

    _drawViewButton (rightX, cy, mission) {
        const btnW = 190, btnH = 48;
        const x = rightX - btnW;
        const y = cy - btnH / 2;

        const g = this.scene.add.graphics();
        const label = this.scene.add.text(rightX - btnW / 2, cy, 'View Mission', {
            fontFamily: config.fonts.text,
            fontSize: '19px',
            fontStyle: 'bold',
            color: T_BTN,
        }).setOrigin(0.5, 0.5);

        const draw = (hover) => {
            g.clear();
            g.fillStyle(0x000000, 0.15);
            g.fillRoundedRect(x + 2, y + 3, btnW, btnH, btnH / 2);
            g.fillStyle(hover ? C_BTN_HOVER : C_BTN, 1);
            g.fillRoundedRect(x, y, btnW, btnH, btnH / 2);
            g.fillStyle(0xffffff, 0.15);
            g.fillRoundedRect(x + 3, y + 3, btnW - 6, btnH / 2 - 2, {
                tl: btnH / 2, tr: btnH / 2, bl: 0, br: 0,
            });
        };
        draw(false);
        this.add(g);
        this.add(label);

        const hit = this.scene.add.rectangle(rightX - btnW / 2, cy, btnW, btnH, 0, 0);
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => draw(true));
        hit.on('pointerout', () => draw(false));
        hit.on('pointerup', () => this._selectMission(mission));
        this.add(hit);
    }

    // ── selection / close ─────────────────────────────────────────────────────

    _selectMission (mission) {
        if (this._picked) return;
        this._picked = true;
        this._onSelect?.(mission);
    }

    close () {
        this.setVisible(false);
        this.setAlpha(1);
        this.setScale(1);
    }

    get isDismissible () {
        return !!this._dismissible;
    }

    get isOpen () {
        return this.visible;
    }
}
