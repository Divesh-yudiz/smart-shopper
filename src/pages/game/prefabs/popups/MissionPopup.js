import Phaser from 'phaser';
import config from '../../utils/config.js';
import { resolveItem } from '../../../../utils/gameApi.js';
import { UI_TEXTURE_KEYS } from '../../config/componentAssets.js';
import { HOME_TEXTURE_KEYS } from '../../config/homeAssets.js';
import HomeInfoPopup from '../HomeInfoPopup.js';

const PW = 1640;
const PH = 780;
const CR = 24;
const PAD = 28;
const COL_GAP = 24;
const LEFT_W = 320;
const RIGHT_W = PW - PAD * 2 - LEFT_W - COL_GAP;

const C_CREAM = 0xfef9e4;
const C_ORANGE = 0xf5a623;
const C_GREEN = 0x27ae60;
const C_GREEN_H = 0x219a52;
const C_WHITE = 0xffffff;
const C_CARD = 0xffffff;
const C_CARD_BD = 0xe8d5a0;
const C_IMG_BG = 0xf5eed6;
const C_IMG_ICON = 0xcaa568;
const C_TIPS_BG = 0xfff6df;

const T_NAVY = '#1e3a5f';
const T_MUTED = '#7c5a2e';
const T_WHITE = '#ffffff';
const T_ORANGE = '#b06010';
const T_GREEN = '#1a7a45';

function formatName (key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()
        .replace(/\b\w/g, c => c.toUpperCase());
}

function formatTime (seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export default class MissionPopup extends Phaser.GameObjects.Container {
    constructor(scene) {
        super(scene, config.centerX, config.centerY);
        scene.add.existing(this);
        this.setDepth(550);
        this.setVisible(false);
    }

    open ({
        shoppingList = [],
        title = '',
        description = '',
        missionOrder = 0,
        budget = 0,
        timeLimit = 0,
        ecoLimit = 100,
        onStart = () => { },
        onChooseAnother = null,
    } = {}) {
        this._onStart = onStart;
        this._onChooseAnother = onChooseAnother;
        this._PT = -PH / 2;
        this._PL = -PW / 2;

        this.removeAll(true);

        const ov = this.scene.add.rectangle(0, 0, config.width, config.height, 0x000000, 0.45);
        ov.setInteractive();
        this.add(ov);

        const wash = this.scene.add.rectangle(0, 0, config.width, config.height, C_CREAM, 0.88);
        this.add(wash);

        this._drawChrome();
        this._drawPanel();

        const leftX = this._PL + PAD;
        const rightX = leftX + LEFT_W + COL_GAP;
        const topY = this._PT + PAD;

        this._drawLeftColumn(leftX, topY, title, missionOrder);
        this._drawRightColumn(rightX, topY, {
            description,
            budget,
            ecoLimit,
            timeLimit,
            items: shoppingList.filter(Boolean),
        });

        this.setVisible(true);
        this.setAlpha(0);
        this.setScale(0.97);
        this.scene.tweens.add({
            targets: this, alpha: 1, scale: 1,
            duration: 320, ease: 'Back.easeOut',
        });
    }

    _drawChrome () {
        const top = -config.height / 2;
        const headerY = top + 56;

        this._pillButton(-config.width / 2 + 110, headerY, 150, 48, '←  Back', {
            fill: C_WHITE,
            border: C_ORANGE,
            color: T_ORANGE,
            onClick: () => this._close(() => this._onChooseAnother?.()),
        });

        this.add(this.scene.add.text(0, headerY - 10, 'Smart Shopper', {
            fontFamily: config.fonts.text,
            fontSize: '42px',
            fontStyle: 'bold',
            color: T_NAVY,
        }).setOrigin(0.5, 0.5));

        this.add(this.scene.add.text(0, headerY + 28, 'Shop Smart. Choose Wisely.', {
            fontFamily: config.fonts.text,
            fontSize: '20px',
            color: T_MUTED,
        }).setOrigin(0.5, 0.5));

        const aboutX = config.width / 2 - 90;
        if (this.scene.textures.exists(HOME_TEXTURE_KEYS.infoButton)) {
            const info = this.scene.add.image(aboutX, headerY - 8, HOME_TEXTURE_KEYS.infoButton);
            info.setDisplaySize(52, 52);
            info.setInteractive({ useHandCursor: true });
            info.on('pointerup', () => this._openAbout());
            this.add(info);
        } else {
            const g = this.scene.add.graphics();
            g.fillStyle(C_ORANGE, 1);
            g.fillCircle(aboutX, headerY - 8, 22);
            g.fillStyle(C_WHITE, 1);
            this.add(g);
            const hit = this.scene.add.circle(aboutX, headerY - 8, 26, 0, 0);
            hit.setInteractive({ useHandCursor: true });
            hit.on('pointerup', () => this._openAbout());
            this.add(hit);
            this.add(this.scene.add.text(aboutX, headerY - 8, 'i', {
                fontFamily: config.fonts.text, fontSize: '24px', fontStyle: 'bold', color: T_WHITE,
            }).setOrigin(0.5, 0.5));
        }

        this.add(this.scene.add.text(aboutX, headerY + 30, 'About Game', {
            fontFamily: config.fonts.text,
            fontSize: '16px',
            fontStyle: 'bold',
            color: T_NAVY,
        }).setOrigin(0.5, 0));
    }

    _openAbout () {
        if (!this._infoPopup) {
            this._infoPopup = new HomeInfoPopup(this.scene);
            this._infoPopup.setDepth(700);
        }
        this._infoPopup.open();
    }

    _drawPanel () {
        const g = this.scene.add.graphics();
        g.fillStyle(0x000000, 0.12);
        g.fillRoundedRect(this._PL + 6, this._PT + 8, PW, PH, CR);
        g.fillStyle(C_ORANGE, 1);
        g.fillRoundedRect(this._PL - 4, this._PT - 4, PW + 8, PH + 8, CR + 4);
        g.fillStyle(C_CREAM, 1);
        g.fillRoundedRect(this._PL, this._PT, PW, PH, CR);
        this.add(g);
    }

    _drawLeftColumn (x, y, title, order) {
        const titleH = 100;
        this._shadowCard(x, y, LEFT_W, titleH, 16);

        this.add(this.scene.add.text(x + LEFT_W / 2, y + 28, `Mission ${order || ''}`.trim(), {
            fontFamily: config.fonts.text,
            fontSize: '18px',
            fontStyle: 'bold',
            color: T_ORANGE,
        }).setOrigin(0.5, 0.5));

        this.add(this.scene.add.text(x + LEFT_W / 2, y + 64, title || 'Mission', {
            fontFamily: config.fonts.text,
            fontSize: '24px',
            fontStyle: 'bold',
            color: T_NAVY,
            align: 'center',
            wordWrap: { width: LEFT_W - 24 },
        }).setOrigin(0.5, 0.5));

        const imgTop = y + titleH + 14;
        const imgH = this._PT + PH - PAD - imgTop;
        this._shadowCard(x, imgTop, LEFT_W, imgH, 18, C_IMG_BG);

        const cx = x + LEFT_W / 2;
        const cy = imgTop + imgH / 2 + 8;
        const icon = this.scene.add.graphics();
        icon.fillStyle(C_IMG_ICON, 0.95);
        icon.fillCircle(cx - 26, cy - 26, 16);
        icon.fillTriangle(cx - 68, cy + 46, cx - 6, cy - 18, cx + 46, cy + 46);
        icon.fillTriangle(cx - 10, cy + 46, cx + 34, cy - 4, cx + 78, cy + 46);
        this.add(icon);
    }

    _drawRightColumn (x, y, { description, budget, ecoLimit, timeLimit, items }) {
        let cy = y;

        this.add(this.scene.add.text(x, cy, 'Description', {
            fontFamily: config.fonts.text,
            fontSize: '26px',
            fontStyle: 'bold',
            color: T_NAVY,
        }).setOrigin(0, 0));
        cy += 38;

        const desc = description?.trim()
            || 'Find everything on your list and make smart choices before time runs out!';
        const descText = this.scene.add.text(x, cy, desc, {
            fontFamily: config.fonts.text,
            fontSize: '18px',
            color: T_MUTED,
            wordWrap: { width: RIGHT_W },
            lineSpacing: 5,
        }).setOrigin(0, 0);
        this.add(descText);
        cy += descText.height + 18;

        const statGap = 14;
        const statW = (RIGHT_W - statGap * 2) / 3;
        const statH = 132;
        this._drawStatCard(x, cy, statW, statH, {
            iconKey: UI_TEXTURE_KEYS.coinIcon,
            label: 'BUDGET',
            value: `AED ${budget || '-'}`,
            sub: 'Shopping Budget',
        });
        this._drawStatCard(x + statW + statGap, cy, statW, statH, {
            iconKey: UI_TEXTURE_KEYS.ecoIcon,
            label: 'ECO LIMIT',
            value: `${Math.round(ecoLimit)}`,
            sub: 'Eco Impact',
        });
        this._drawStatCard(x + (statW + statGap) * 2, cy, statW, statH, {
            icon: '⏱',
            label: 'TIMER',
            value: formatTime(timeLimit),
            sub: 'Complete before time ends.',
        });
        cy += statH + 18;

        this.add(this.scene.add.text(x, cy, 'Shopping List', {
            fontFamily: config.fonts.text,
            fontSize: '26px',
            fontStyle: 'bold',
            color: T_NAVY,
        }).setOrigin(0, 0));
        cy += 40;

        const listGap = 12;
        const maxItemW = 196;
        const cols = Math.min(5, Math.max(1, items.length));
        const itemW = Math.min(maxItemW, (RIGHT_W - listGap * (cols - 1)) / cols);
        const itemH = 108;
        items.slice(0, 5).forEach((item, i) => {
            this._drawListItem(x + i * (itemW + listGap), cy, itemW, itemH, item);
        });
        cy += itemH + 16;

        this._drawTips(x, cy, RIGHT_W);
        this._drawActions(x + RIGHT_W, this._PT + PH - PAD - 26);
    }

    _drawStatCard (x, y, w, h, { iconKey, icon, label, value, sub }) {
        this._shadowCard(x, y, w, h, 16);

        if (iconKey && this.scene.textures.exists(iconKey)) {
            const img = this.scene.add.image(x + 26, y + 24, iconKey);
            img.setDisplaySize(26, 26);
            this.add(img);
            this.add(this.scene.add.text(x + 46, y + 24, label, {
                fontFamily: config.fonts.text,
                fontSize: '15px',
                fontStyle: 'bold',
                color: T_ORANGE,
            }).setOrigin(0, 0.5));
        } else {
            this.add(this.scene.add.text(x + 18, y + 24, `${icon ?? ''}  ${label}`, {
                fontFamily: config.fonts.text,
                fontSize: '15px',
                fontStyle: 'bold',
                color: T_ORANGE,
            }).setOrigin(0, 0.5));
        }

        this.add(this.scene.add.text(x + w / 2, y + 68, value, {
            fontFamily: config.fonts.text,
            fontSize: '32px',
            fontStyle: 'bold',
            color: T_NAVY,
        }).setOrigin(0.5, 0.5));

        this.add(this.scene.add.text(x + w / 2, y + 104, sub, {
            fontFamily: config.fonts.text,
            fontSize: '14px',
            color: T_MUTED,
            align: 'center',
            wordWrap: { width: w - 16 },
        }).setOrigin(0.5, 0.5));
    }

    _drawListItem (x, y, w, h, item) {
        this._shadowCard(x, y, w, h, 14);

        const resolved = resolveItem(item.sItemKey);
        const name = item.sName
            || resolved?.label
            || (resolved?.key ? formatName(resolved.key) : formatName(item.sItemKey ?? 'Item'));

        this.add(this.scene.add.text(x + w / 2, y + 14, name, {
            fontFamily: config.fonts.text,
            fontSize: '16px',
            fontStyle: 'bold',
            color: T_NAVY,
            align: 'center',
            wordWrap: { width: w - 14 },
        }).setOrigin(0.5, 0));

        const iconX = x + 26;
        const iconY = y + h - 34;
        const ig = this.scene.add.graphics();
        ig.fillStyle(C_IMG_BG, 1);
        ig.fillRoundedRect(iconX - 16, iconY - 16, 32, 32, 8);
        this.add(ig);

        if (resolved?.textureKey && this.scene.textures.exists(resolved.textureKey)) {
            const img = this.scene.add.image(iconX, iconY, resolved.textureKey);
            img.setDisplaySize(28, 28);
            this.add(img);
        }

        const qty = item.nQuantity ?? 1;
        this.add(this.scene.add.text(iconX + 24, iconY, `×${qty}`, {
            fontFamily: config.fonts.text,
            fontSize: '18px',
            fontStyle: 'bold',
            color: T_ORANGE,
        }).setOrigin(0, 0.5));
    }

    _drawTips (x, y, w) {
        const h = 72;
        const g = this.scene.add.graphics();
        g.fillStyle(C_TIPS_BG, 1);
        g.fillRoundedRect(x, y, w, h, 12);
        g.lineStyle(2, C_ORANGE, 0.45);
        g.strokeRoundedRect(x, y, w, h, 12);
        this.add(g);

        this.add(this.scene.add.text(x + 16, y + 16, '💡   Tips', {
            fontFamily: config.fonts.text,
            fontSize: '18px',
            fontStyle: 'bold',
            color: T_NAVY,
        }).setOrigin(0, 0.5));

        this.add(this.scene.add.text(x + 16, y + 46, 'Check both price and Eco impact. The cheapest choice may not always be the smartest choice!', {
            fontFamily: config.fonts.text,
            fontSize: '15px',
            color: T_MUTED,
            wordWrap: { width: w - 32 },
        }).setOrigin(0, 0.5));
    }

    _drawActions (right, cy) {
        const btnH = 50;
        const gap = 14;
        const startW = 220;
        const otherW = 268;
        const startX = right - startW;
        const otherX = startX - gap - otherW;

        this._pillButton(otherX + otherW / 2, cy, otherW, btnH, 'Choose Another Mission', {
            fill: C_WHITE,
            border: C_ORANGE,
            color: T_ORANGE,
            onClick: () => this._close(() => this._onChooseAnother?.()),
        });
        this._pillButton(startX + startW / 2, cy, startW, btnH, 'Start Shopping', {
            fill: C_GREEN,
            hoverFill: C_GREEN_H,
            color: T_WHITE,
            onClick: () => this._close(() => this._onStart?.()),
        });

        const link = this.scene.add.text(startX + startW / 2, cy + 30, 'Enter Supermarket', {
            fontFamily: config.fonts.text,
            fontSize: '16px',
            fontStyle: 'bold',
            color: T_GREEN,
        }).setOrigin(0.5, 0);
        const underline = this.scene.add.graphics();
        underline.lineStyle(2, C_GREEN, 0.9);
        underline.lineBetween(link.x - link.width / 2, link.y + link.height + 1, link.x + link.width / 2, link.y + link.height + 1);
        this.add(underline);
        this.add(link);
        link.setInteractive({ useHandCursor: true });
        link.on('pointerup', () => this._close(() => this._onStart?.()));
    }

    _pillButton (cx, cy, w, h, label, { fill, hoverFill, border, color, onClick }) {
        const x = cx - w / 2;
        const y = cy - h / 2;
        const g = this.scene.add.graphics();
        const draw = (hover) => {
            g.clear();
            g.fillStyle(0x000000, 0.12);
            g.fillRoundedRect(x + 2, y + 3, w, h, h / 2);
            g.fillStyle(hover && hoverFill ? hoverFill : fill, 1);
            g.fillRoundedRect(x, y, w, h, h / 2);
            if (border) {
                g.lineStyle(3, border, 1);
                g.strokeRoundedRect(x, y, w, h, h / 2);
            }
        };
        draw(false);
        this.add(g);

        this.add(this.scene.add.text(cx, cy, label, {
            fontFamily: config.fonts.text,
            fontSize: '18px',
            fontStyle: 'bold',
            color,
        }).setOrigin(0.5, 0.5));

        const hit = this.scene.add.rectangle(cx, cy, w, h, 0, 0);
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => draw(true));
        hit.on('pointerout', () => draw(false));
        hit.on('pointerup', onClick);
        this.add(hit);
    }

    _shadowCard (x, y, w, h, r, fill = C_CARD) {
        const g = this.scene.add.graphics();
        g.fillStyle(0x000000, 0.08);
        g.fillRoundedRect(x + 3, y + 5, w, h, r);
        g.fillStyle(fill, 1);
        g.fillRoundedRect(x, y, w, h, r);
        g.lineStyle(1.5, C_CARD_BD, 1);
        g.strokeRoundedRect(x, y, w, h, r);
        this.add(g);
        return g;
    }

    _close (afterClose = null) {
        this.scene.tweens.add({
            targets: this, alpha: 0, scale: 0.97,
            duration: 180, ease: 'Quad.easeIn',
            onComplete: () => {
                this.setVisible(false);
                (afterClose ?? this._onStart)?.();
            },
        });
    }
}
