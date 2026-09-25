import Phaser from 'phaser';
import config from '../utils/config.js';
import { addCauseText, wrapCause } from '../utils/gameText.js';

const C_CREAM = 0xfef9e4;
const C_ORANGE = 0xf5a623;
const C_ORANGE_DK = 0xe08912;
const C_WHITE = 0xffffff;
const C_CARD = 0xffffff;
const C_CARD_BD = 0xe8d5a0;
const C_NAVY = 0x1e3a5f;
const C_GREEN = 0x27ae60;
const C_GOLD = 0xf0c14b;
const C_TEAL = 0x2aa9a1;

const T_NAVY = '#1e3a5f';
const T_MUTED = '#7c5a2e';
const T_WHITE = '#ffffff';
const T_ORANGE = '#b06010';

const PW = 1640;
const PH = 860;
const HEADER_H = 92;
const TAB_H = 52;

const TABS = [
    { id: 'play', label: 'How to Play' },
    { id: 'learn', label: "What you'll Learn" },
    { id: 'guide', label: 'Game Guide' },
];

const PLAY_CARDS = [
    { n: '1', title: 'Choose a Mission', body: 'Pick one of your shopping challenges to start the run.' },
    { n: '2', title: 'Follow your List', body: 'Find every product shown on your shopping list.' },
    { n: '3', title: 'Compare and Choose', body: 'Check price, Eco impact, and product info before you add an item.' },
    { n: '4', title: 'Watch your Resources', body: 'Keep an eye on Shop Coins, the Eco Meter, and the timer.' },
    { n: '5', title: 'Review & Checkout', body: 'Check your cart, fix any choices, and checkout before time runs out.' },
    { n: '6', title: 'Controls', keys: [
        { k: '←', v: 'Move left' },
        { k: '→', v: 'Move right' },
        { k: 'TAP', v: 'Inspect product' },
        { k: 'CART', v: 'Open your cart' },
    ] },
];

const LEARN_CARDS = [
    { n: '1', title: 'Needs vs Wants', body: 'Buy what you need before spending on tempting extras.' },
    { n: '2', title: 'Smart Budgeting', body: 'Plan your spending so you do not run out of Shop Coins.' },
    { n: '3', title: 'Eco Thinking', body: 'Shopping choices can help or hurt the planet. Compare Eco impact.' },
    { n: '4', title: 'Smart Decisions', body: 'Cheaper is not always better. Look at price and Eco impact together.' },
    { n: '5', title: 'Sales & Discounts', body: 'A special offer can look exciting. First ask: do I really need it?' },
];

const GUIDE_CARDS = [
    { accent: C_GOLD, title: 'Coins', body: 'Your mission budget. Every product you buy uses Shop Coins.' },
    { accent: C_GREEN, title: 'Eco Meter', body: 'Greener choices use fewer Eco Points. Watch this bar as you shop.' },
    { accent: C_ORANGE, title: 'Timer', body: 'How much time is left to finish your shopping mission.' },
    { accent: C_NAVY, title: 'Cart', body: 'Holds what you pick. Review, remove, or swap items before checkout.' },
    { accent: C_TEAL, title: 'Shopping List', body: 'Shows what you still need and what you have already collected.' },
    { accent: C_ORANGE_DK, title: 'Sale / Extras', body: 'Not everything on the shelves is needed. Extras still cost coins and eco.' },
];

/**
 * About popup — game-styled briefing with How to Play / Learn / Guide tabs.
 */
export default class HomeInfoPopup extends Phaser.GameObjects.Container {
    constructor (scene) {
        super(scene, 0, 0);
        scene.add.existing(this);
        this.setDepth(700);
        this.setVisible(false);
        this._tab = 'play';
    }

    _text (x, y, message, style, wrapW) {
        const msg = wrapW != null ? wrapCause(this.scene, message, wrapW, style) : message;
        return addCauseText(this.scene, x, y, msg, style);
    }

    open () {
        this._tab = 'play';
        this._rebuild();
        this.setVisible(true);
        this.setAlpha(0);
        this.setScale(0.96);
        this.scene.tweens.add({
            targets: this,
            alpha: 1,
            scale: 1,
            duration: 280,
            ease: 'Back.easeOut',
        });
    }

    close () {
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            scale: 0.97,
            duration: 160,
            ease: 'Quad.easeIn',
            onComplete: () => {
                this.setVisible(false);
                this.setScale(1);
            },
        });
    }

    get isOpen () {
        return this.visible;
    }

    _rebuild () {
        this.removeAll(true);

        const ov = this.scene.add.rectangle(
            config.centerX, config.centerY,
            config.width, config.height,
            0x000000, 0.55,
        );
        ov.setInteractive();
        this.add(ov);

        const wash = this.scene.add.rectangle(
            config.centerX, config.centerY,
            config.width, config.height,
            C_CREAM, 1,
        );
        this.add(wash);

        this._drawBack();
        this._drawFrame();
        this._drawTabs();
        this._drawBody();
    }

    _drawBack () {
        this._pill(140, 56, 168, 50, '←  Back', {
            fill: C_WHITE,
            border: C_ORANGE,
            color: T_ORANGE,
            onClick: () => this.close(),
        });
    }

    _drawFrame () {
        const px = (config.width - PW) / 2;
        const py = 118;
        this._px = px;
        this._py = py;

        const g = this.scene.add.graphics();
        g.fillStyle(0x000000, 0.16);
        g.fillRoundedRect(px + 8, py + 10, PW, PH, 26);
        g.fillStyle(C_ORANGE, 1);
        g.fillRoundedRect(px - 5, py - 5, PW + 10, PH + 10, 28);
        g.fillStyle(C_CREAM, 1);
        g.fillRoundedRect(px, py, PW, PH, 24);

        g.fillStyle(C_ORANGE, 1);
        g.fillRoundedRect(px, py, PW, HEADER_H, { tl: 24, tr: 24, bl: 0, br: 0 });
        g.fillStyle(0xffffff, 0.16);
        g.fillRoundedRect(px + 10, py + 6, PW - 20, HEADER_H * 0.42, { tl: 18, tr: 18, bl: 0, br: 0 });
        this.add(g);

        const tab = TABS.find((t) => t.id === this._tab);
        this.add(this._text(config.centerX, py + HEADER_H / 2 - 2, tab.label.toUpperCase(), {
            fontSize: '34px',
            fontStyle: 'bold',
            color: T_WHITE,
            stroke: '#9a3412',
            strokeThickness: 4,
        }).setOrigin(0.5, 0.5));
    }

    _drawTabs () {
        const tabW = 250;
        const gap = 14;
        const total = TABS.length * tabW + (TABS.length - 1) * gap;
        let x = config.centerX - total / 2 + tabW / 2;
        const y = this._py + HEADER_H + TAB_H / 2 + 10;

        TABS.forEach((tab) => {
            const active = tab.id === this._tab;
            this._pill(x, y, tabW, TAB_H, tab.label, {
                fill: active ? C_ORANGE : C_WHITE,
                border: C_ORANGE,
                color: active ? T_WHITE : T_ORANGE,
                fontSize: '20px',
                onClick: () => this._setTab(tab.id),
            });
            x += tabW + gap;
        });
    }

    _setTab (id) {
        if (this._tab === id) return;
        this._tab = id;
        this._rebuild();
    }

    _drawBody () {
        const pad = 36;
        const top = this._py + HEADER_H + TAB_H + 28;
        const box = {
            x: this._px + pad,
            y: top,
            w: PW - pad * 2,
            h: this._py + PH - pad - top,
        };
        if (this._tab === 'play') this._drawPlay(box);
        else if (this._tab === 'learn') this._drawLearn(box);
        else this._drawGuide(box);
    }

    _drawPlay (box) {
        const gapX = 20;
        const gapY = 20;
        const cols = 3;
        const rows = 2;
        const cw = (box.w - gapX * (cols - 1)) / cols;
        const ch = (box.h - gapY * (rows - 1)) / rows;

        PLAY_CARDS.forEach((card, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            this._stepCard(box.x + col * (cw + gapX), box.y + row * (ch + gapY), cw, ch, card);
        });
    }

    _drawLearn (box) {
        const gap = 16;
        const n = LEARN_CARDS.length;
        const cw = (box.w - gap * (n - 1)) / n;
        LEARN_CARDS.forEach((card, i) => {
            this._learnCard(box.x + i * (cw + gap), box.y, cw, box.h, card);
        });
    }

    _drawGuide (box) {
        const gapX = 20;
        const gapY = 20;
        const cols = 3;
        const cw = (box.w - gapX * (cols - 1)) / cols;
        const ch = (box.h - gapY) / 2;
        GUIDE_CARDS.forEach((card, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            this._guideCard(box.x + col * (cw + gapX), box.y + row * (ch + gapY), cw, ch, card);
        });
    }

    _stepCard (x, y, w, h, card) {
        this._shadowCard(x, y, w, h, 18);
        this._accentBar(x, y, w, 8, C_ORANGE, 18);

        this._numberBadge(x + 22, y + 28, card.n);
        this.add(this._text(x + 72, y + 40, card.title, {
            fontSize: '24px',
            fontStyle: 'bold',
            color: T_NAVY,
        }, w - 96).setOrigin(0, 0.5));

        if (card.keys) {
            const kw = (w - 56 - 12) / 2;
            const kh = 48;
            card.keys.forEach((item, i) => {
                const kx = x + 22 + (i % 2) * (kw + 12);
                const ky = y + 86 + Math.floor(i / 2) * (kh + 10);
                this._keyChip(kx, ky, kw, kh, item.k, item.v);
            });
            return;
        }

        this.add(this._text(x + 22, y + 86, card.body, {
            fontSize: '20px',
            color: T_MUTED,
            lineSpacing: 6,
        }, w - 44).setOrigin(0, 0));
    }

    _learnCard (x, y, w, h, card) {
        this._shadowCard(x, y, w, h, 18);
        this._accentBar(x, y, w, 10, C_ORANGE, 18);
        this._numberBadge(x + w / 2 - 22, y + 36, card.n);

        this.add(this._text(x + w / 2, y + 120, card.title, {
            fontSize: '22px',
            fontStyle: 'bold',
            color: T_NAVY,
            align: 'center',
        }, w - 24).setOrigin(0.5, 0));

        this.add(this._text(x + w / 2, y + 200, card.body, {
            fontSize: '18px',
            color: T_MUTED,
            align: 'center',
            lineSpacing: 6,
        }, w - 28).setOrigin(0.5, 0));
    }

    _guideCard (x, y, w, h, card) {
        this._shadowCard(x, y, w, h, 18);

        const rail = this.scene.add.graphics();
        rail.fillStyle(card.accent, 1);
        rail.fillRoundedRect(x, y, 12, h, { tl: 18, bl: 18, tr: 0, br: 0 });
        this.add(rail);

        this.add(this._text(x + 32, y + 28, card.title.toUpperCase(), {
            fontSize: '22px',
            fontStyle: 'bold',
            color: T_NAVY,
        }).setOrigin(0, 0));

        this.add(this._text(x + 32, y + 72, card.body, {
            fontSize: '19px',
            color: T_MUTED,
            lineSpacing: 6,
        }, w - 52).setOrigin(0, 0));
    }

    _keyChip (x, y, w, h, key, label) {
        const g = this.scene.add.graphics();
        g.fillStyle(0xfff1d6, 1);
        g.fillRoundedRect(x, y, w, h, 12);
        g.lineStyle(2, C_ORANGE, 0.45);
        g.strokeRoundedRect(x, y, w, h, 12);
        this.add(g);

        this.add(this._text(x + 14, y + h / 2, key, {
            fontSize: '16px',
            fontStyle: 'bold',
            color: T_ORANGE,
        }).setOrigin(0, 0.5));

        this.add(this._text(x + w - 14, y + h / 2, label, {
            fontSize: '16px',
            fontStyle: 'bold',
            color: T_NAVY,
        }).setOrigin(1, 0.5));
    }

    _numberBadge (x, y, n) {
        const s = 44;
        const g = this.scene.add.graphics();
        g.fillStyle(C_ORANGE, 1);
        g.fillRoundedRect(x, y, s, s, 12);
        this.add(g);
        this.add(this._text(x + s / 2, y + s / 2, n, {
            fontSize: '22px',
            fontStyle: 'bold',
            color: T_WHITE,
        }).setOrigin(0.5, 0.5));
    }

    _accentBar (x, y, w, h, color, r) {
        const g = this.scene.add.graphics();
        g.fillStyle(color, 1);
        g.fillRoundedRect(x, y, w, h + 8, { tl: r, tr: r, bl: 0, br: 0 });
        g.fillStyle(C_CARD, 1);
        g.fillRect(x, y + h, w, 10);
        this.add(g);
    }

    _shadowCard (x, y, w, h, r) {
        const g = this.scene.add.graphics();
        g.fillStyle(0x000000, 0.1);
        g.fillRoundedRect(x + 3, y + 6, w, h, r);
        g.fillStyle(C_CARD, 1);
        g.fillRoundedRect(x, y, w, h, r);
        g.lineStyle(2, C_CARD_BD, 1);
        g.strokeRoundedRect(x, y, w, h, r);
        this.add(g);
    }

    _pill (cx, cy, w, h, label, { fill, border, color, fontSize = '18px', onClick }) {
        const wrap = this.scene.add.container(cx, cy);
        const g = this.scene.add.graphics();
        const r = h / 2;
        const draw = (hover) => {
            g.clear();
            g.fillStyle(0x000000, 0.14);
            g.fillRoundedRect(-w / 2 + 2, -h / 2 + 3, w, h, r);
            const use = hover && fill === C_WHITE ? 0xfff1d6 : fill;
            g.fillStyle(use, 1);
            g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
            if (fill !== C_WHITE) {
                g.fillStyle(0xffffff, 0.16);
                g.fillRoundedRect(-w / 2 + 6, -h / 2 + 3, w - 12, h * 0.4, { tl: r, tr: r, bl: 0, br: 0 });
            }
            if (border) {
                g.lineStyle(3, border, 1);
                g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
            }
        };
        draw(false);
        wrap.add(g);
        wrap.add(this._text(0, 0, label, {
            fontSize,
            fontStyle: 'bold',
            color,
        }).setOrigin(0.5, 0.5));

        const hit = this.scene.add.rectangle(0, 0, w, h, 0, 0);
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => draw(true));
        hit.on('pointerout', () => draw(false));
        hit.on('pointerup', onClick);
        wrap.add(hit);
        this.add(wrap);
    }
}
