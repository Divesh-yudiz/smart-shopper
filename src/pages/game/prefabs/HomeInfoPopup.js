import Phaser from 'phaser';
import { addCauseText, wrapCause } from '../utils/gameText.js';
import { HOME_TEXTURE_KEYS } from '../config/homeAssets.js';
import { HOW_TO_PLAY_KEYS as HTP } from '../config/howToPlayAssets.js';
import { WHAT_LEARN_KEYS as WL } from '../config/whatLearnAssets.js';

const TYPE = Object.freeze({
    title: 28,
    tab: 20,
    stepTitle: 28,
    stepBody: 20,
    control: 17,
    learnTitle: 20,
    learnBody: 15,
    guideTitle: 22,
    guideBody: 17,
    badge: 20,
});

const WEIGHT = Object.freeze({
    heavy: '800',
    bold: '700',
    black: '900',
});

const C_WHITE = '#ffffff';
const C_NAVY = '#1A2744';
const C_MUTED = '#3F3A34';
const C_TAB_IDLE = '#8B5A2B';

const TABS = Object.freeze([
    Object.freeze({ id: 'play', label: 'How to Play', icon: HTP.tabPlay, active: 0x7B3FE4 }),
    Object.freeze({ id: 'learn', label: "What you'll Learn", icon: HTP.tabLearn, active: 0xE07020 }),
    Object.freeze({ id: 'guide', label: 'Game Guide', icon: HTP.tabGuide, active: 0x2F6FE0 }),
]);

const PLAY_CARDS = Object.freeze([
    Object.freeze({
        n: '1',
        title: 'Choose a Mission',
        body: 'Pick one of your available shopping challenges.',
        icon: HTP.step1,
        fill: 0xF6EEFF,
        stroke: 0xC9A8F5,
        titleColor: '#5A24C4',
        badge: 0x7B3FE4,
    }),
    Object.freeze({
        n: '2',
        title: 'Follow your List',
        body: 'Find the products shown on your shopping list.',
        icon: HTP.step2,
        fill: 0xEAF4FF,
        stroke: 0x9BC4F5,
        titleColor: '#1A4FB8',
        badge: 0x2F6FE0,
    }),
    Object.freeze({
        n: '3',
        title: 'Compare and Choose',
        body: 'Compare price, Eco impact, and product information before adding an item.',
        icon: HTP.step3,
        fill: 0xEEF9E8,
        stroke: 0x9DD89A,
        titleColor: '#146B2C',
        badge: 0x1F8A3A,
    }),
    Object.freeze({
        n: '4',
        title: 'Watch your Resources',
        body: 'Keep an eye on your Shop Coins, Eco Meter, and timer while you shop.',
        icon: HTP.step4,
        fill: 0xFFF3E6,
        stroke: 0xF0B878,
        titleColor: '#B84F10',
        badge: 0xE07020,
    }),
    Object.freeze({
        n: '5',
        title: 'Review & Checkout',
        body: 'Check your cart, fix any choices if needed, and complete checkout before time runs out.',
        icon: HTP.step5,
        fill: 0xFFECEF,
        stroke: 0xF0A0B0,
        titleColor: '#A81E28',
        badge: 0xD63439,
    }),
    Object.freeze({
        n: '6',
        title: 'Controls',
        icon: HTP.step6,
        fill: 0xEEE8FF,
        stroke: 0xB8A8E8,
        titleColor: '#24185A',
        badge: 0x5B3FC9,
        controls: Object.freeze([
            Object.freeze({ kind: 'arrows', label: 'Move Left / Move Right' }),
            Object.freeze({ kind: 'hand', label: 'Select / Inspect Product' }),
            Object.freeze({ kind: 'cart', label: 'Open Cart' }),
        ]),
    }),
]);

const LEARN_CARDS = Object.freeze([
    Object.freeze({
        n: '1',
        title: 'NEEDS VS WANTS',
        body: 'Buy what you need before spending on tempting extras.',
        icon: WL.icon1,
        footer: WL.footer1,
        fill: 0xF6EEFF,
        stroke: 0xC9A8F5,
        titleColor: '#5A24C4',
        bodyColor: '#3A2A7A',
        badge: 0x7B3FE4,
    }),
    Object.freeze({
        n: '2',
        title: 'SMART BUDGETING',
        body: 'Plan your spending and avoid running out of Shop Coins.',
        icon: WL.icon2,
        footer: WL.footer2,
        fill: 0xEEF9E8,
        stroke: 0x9DD89A,
        titleColor: '#146B2C',
        bodyColor: '#1A5A30',
        badge: 0x1F8A3A,
    }),
    Object.freeze({
        n: '3',
        title: 'ECO-FRIENDLY THINKING',
        body: 'Compare products and understand how shopping choices can have different environmental impacts.',
        icon: WL.icon3,
        footer: WL.footer3,
        fill: 0xEAF4FF,
        stroke: 0x9BC4F5,
        titleColor: '#1A4FB8',
        bodyColor: '#1A3F7A',
        badge: 0x2F6FE0,
    }),
    Object.freeze({
        n: '4',
        title: 'SMART DECISIONS',
        body: 'A cheaper product is not always the best choice. Look at price and Eco impact together.',
        icon: WL.icon4,
        footer: WL.footer4,
        fill: 0xFFF3E6,
        stroke: 0xF0B878,
        titleColor: '#B84F10',
        bodyColor: '#7A3A10',
        badge: 0xE07020,
    }),
    Object.freeze({
        n: '5',
        title: 'SALES & DISCOUNTS',
        body: 'A special offer can look exciting—but first ask: "Do I really need it?"',
        icon: WL.icon5,
        footer: WL.footer5,
        fill: 0xFFECEF,
        stroke: 0xF0A0B0,
        titleColor: '#A81E28',
        bodyColor: '#7A1A28',
        badge: 0xD63439,
    }),
]);

const GUIDE_CARDS = Object.freeze([
    Object.freeze({ title: 'Coins', body: 'Your mission budget. Every product you buy uses Shop Coins.', fill: 0xFFF9E6, stroke: 0xFCDA8B, accent: 0xC47A12 }),
    Object.freeze({ title: 'Eco Meter', body: 'Greener choices use fewer Eco Points. Watch this bar as you shop.', fill: 0xEEF9E8, stroke: 0xBCE4A8, accent: 0x1F8A3A }),
    Object.freeze({ title: 'Timer', body: 'How much time is left to finish your shopping mission.', fill: 0xFFF3E6, stroke: 0xF0B878, accent: 0xE07020 }),
    Object.freeze({ title: 'Cart', body: 'Holds what you pick. Review, remove, or swap items before checkout.', fill: 0xEAF4FF, stroke: 0x9BC4F5, accent: 0x2F6FE0 }),
    Object.freeze({ title: 'Shopping List', body: 'Shows what you still need and what you have already collected.', fill: 0xEEF9E8, stroke: 0x9DD89A, accent: 0x2AA9A1 }),
    Object.freeze({ title: 'Sale / Extras', body: 'Not everything on the shelves is needed. Extras still cost coins and eco.', fill: 0xFFECEF, stroke: 0xF0A0B0, accent: 0xD63439 }),
]);

/**
 * How to Play / Learn / Guide popup — Artboard 12 layout.
 */
export default class HomeInfoPopup extends Phaser.GameObjects.Container {
    constructor (scene) {
        super(scene, 0, 0);
        scene.add.existing(this);
        this.setDepth(700);
        this.setVisible(false);
        this._tab = 'play';
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

    _m () {
        const W = this.scene.scale.width;
        const H = this.scene.scale.height;
        const s = Math.min(W / 1920, H / 1080);
        return {
            W,
            H,
            s,
            cx: W / 2,
            cy: H / 2,
            x: (f) => W * f,
            y: (f) => H * f,
            fs: (px) => Math.max(11, Math.round(px * s)),
        };
    }

    _text (x, y, message, style, wrapW) {
        const msg = wrapW != null ? wrapCause(this.scene, message, wrapW, style) : message;
        return addCauseText(this.scene, x, y, msg, style);
    }

    _fitContain (img, maxW, maxH) {
        const s = Math.min(maxW / img.width, maxH / img.height);
        img.setDisplaySize(img.width * s, img.height * s);
        return img;
    }

    _fitW (img, displayW) {
        img.setDisplaySize(displayW, displayW * (img.height / img.width));
        return img;
    }

    _round (x, y, w, h, fill, radius, stroke = null, strokeW = 2) {
        const g = this.scene.add.graphics();
        const r = radius ?? Math.min(w, h) * 0.12;
        g.fillStyle(fill, 1);
        g.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
        if (stroke != null) {
            g.lineStyle(strokeW, stroke, 1);
            g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);
        }
        this.add(g);
        return g;
    }

    _rebuild () {
        this.removeAll(true);
        const m = this._m();

        const bg = this.scene.add.image(m.cx, m.cy, HOME_TEXTURE_KEYS.bgBlur);
        bg.setDisplaySize(m.W, m.H);
        this.add(bg);

        const dim = this.scene.add.rectangle(m.cx, m.cy, m.W, m.H, 0x000000, 0.28);
        dim.setInteractive();
        this.add(dim);

        this._drawChrome(m);
        this._drawPanel(m);
    }

    _drawChrome (m) {
        const backH = m.H * 0.078;
        const back = this.scene.add.image(m.x(0.078), m.y(0.058), HOME_TEXTURE_KEYS.backButton);
        this._fitW(back, backH * (back.width / back.height));
        back.setInteractive({ useHandCursor: true });
        back.on('pointerover', () => back.setScale(back.scaleX * 1.04, back.scaleY * 1.04));
        back.on('pointerout', () => this._fitW(back, backH * (back.width / back.height)));
        back.on('pointerup', () => this.close());
        this.add(back);

        const infoS = m.H * 0.074;
        const info = this.scene.add.image(m.x(0.948), m.y(0.058), HOME_TEXTURE_KEYS.infoButton);
        info.setDisplaySize(infoS, infoS);
        this.add(info);
    }

    _drawPanel (m) {
        const panelW = m.W * 0.78;
        const panelH = m.H * 0.84;
        const panelY = m.cy + m.H * 0.02;
        this._panel = { w: panelW, h: panelH, y: panelY, x: m.cx };
        this._round(m.cx, panelY, panelW, panelH, 0xFFFEFB, Math.min(panelW, panelH) * 0.035, 0x3B7DE8, Math.max(8, Math.round(10 * m.s)));

        const panelTop = panelY - panelH / 2;
        this.add(this._text(m.cx, panelTop + m.H * 0.042, 'Find what you need, compare your choices and shop wisely.', {
            fontSize: `${m.fs(TYPE.title)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NAVY,
            align: 'center',
        }, panelW * 0.82).setOrigin(0.5, 0.5));

        const tabY = panelTop + m.H * 0.1;
        this._drawTabs(m, tabY);

        const bodyTop = tabY + m.H * 0.065;
        const bodyBottom = panelY + panelH / 2 - m.H * 0.032;
        const padX = panelW * 0.028;
        const box = {
            x: m.cx - panelW / 2 + padX,
            y: bodyTop,
            w: panelW - padX * 2,
            h: bodyBottom - bodyTop,
        };

        if (this._tab === 'play') this._drawPlay(m, box);
        else if (this._tab === 'learn') this._drawLearn(m, box);
        else this._drawGuide(m, box);
    }

    _drawTabs (m, y) {
        const tabW = m.W * 0.2;
        const tabH = m.H * 0.055;
        const gap = m.W * 0.014;
        const total = TABS.length * tabW + (TABS.length - 1) * gap;
        let x = m.cx - total / 2 + tabW / 2;

        TABS.forEach((tab) => {
            const active = tab.id === this._tab;
            this._round(
                x, y, tabW, tabH,
                active ? tab.active : 0xFFF6E8,
                tabH * 0.45,
                active ? tab.active : 0xE8D0B0,
                Math.max(2, Math.round(2 * m.s)),
            );

            const iconS = tabH * 0.48;
            const icon = this.scene.add.image(x - tabW * 0.32, y, tab.icon);
            this._fitContain(icon, iconS, iconS);
            icon.setTint(active ? 0xffffff : 0x8B5A2B);
            this.add(icon);

            const label = this._text(x + tabW * 0.04, y, tab.label, {
                fontSize: `${m.fs(TYPE.tab)}px`,
                fontStyle: WEIGHT.heavy,
                color: active ? C_WHITE : C_TAB_IDLE,
            }).setOrigin(0.5, 0.5);
            this._shrinkToWidth(label, tabW * 0.58);
            this.add(label);

            const hit = this.scene.add.rectangle(x, y, tabW, tabH, 0, 0);
            hit.setInteractive({ useHandCursor: true });
            hit.on('pointerup', () => this._setTab(tab.id));
            this.add(hit);

            x += tabW + gap;
        });
    }

    _setTab (id) {
        if (this._tab === id) return;
        this._tab = id;
        this._rebuild();
    }

    _drawPlay (m, box) {
        const gapX = box.w * 0.01;
        const gapY = box.h * 0.022;
        const cols = 3;
        const rows = 2;
        const cw = (box.w - gapX * (cols - 1)) / cols;
        const ch = (box.h - gapY * (rows - 1)) / rows;

        PLAY_CARDS.forEach((card, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const cx = box.x + cw / 2 + col * (cw + gapX);
            const cy = box.y + ch / 2 + row * (ch + gapY);
            this._stepCard(m, cx, cy, cw, ch, card);
        });
    }

    _stepCard (m, cx, cy, w, h, card) {
        this._round(cx, cy, w, h, card.fill, Math.min(w, h) * 0.1, card.stroke, Math.max(2, Math.round(2.5 * m.s)));

        const left = cx - w / 2;
        const top = cy - h / 2;
        const badgeS = Math.min(w, h) * 0.14;
        this._round(left + badgeS * 0.55, top + badgeS * 0.55, badgeS, badgeS, card.badge, badgeS * 0.5);
        this.add(this._text(left + badgeS * 0.55, top + badgeS * 0.55, card.n, {
            fontSize: `${m.fs(TYPE.badge)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
        }).setOrigin(0.5, 0.5));

        const padY = h * 0.04;
        const gap = h * 0.024;
        const textW = w * 0.9;

        if (card.controls) {
            const title = this._text(0, 0, card.title, {
                fontSize: `${m.fs(TYPE.stepTitle)}px`,
                fontStyle: WEIGHT.black,
                color: card.titleColor,
            }).setOrigin(0.5, 0);
            const titleH = title.height;
            const rows = card.controls.length;
            const rowH = Math.min(h * 0.115, (h - padY * 2 - titleH - gap * 2) * 0.2);
            const listH = rows * rowH;
            const iconMax = h - padY * 2 - titleH - gap * 2 - listH;
            const iconS = Math.min(w * 0.58, Math.max(h * 0.28, iconMax * 0.95));
            const blockH = iconS + gap + titleH + gap + listH;
            let y = cy - blockH / 2;

            const icon = this.scene.add.image(cx, y + iconS / 2, card.icon);
            this._fitContain(icon, iconS, iconS);
            this.add(icon);
            y += iconS + gap;

            title.setPosition(cx, y);
            this.add(title);
            y += titleH + gap;

            card.controls.forEach((row, i) => {
                this._controlRow(m, cx, y + rowH / 2 + i * rowH, w * 0.9, rowH * 0.88, row);
            });
            return;
        }

        const titleStyle = {
            fontSize: `${m.fs(TYPE.stepTitle)}px`,
            fontStyle: WEIGHT.black,
            color: card.titleColor,
            align: 'center',
        };
        const bodyStyle = {
            fontSize: `${m.fs(TYPE.stepBody)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_MUTED,
            align: 'center',
            lineSpacing: m.fs(2),
        };
        const title = this._text(0, 0, this._wrap(card.title, textW, titleStyle), titleStyle).setOrigin(0.5, 0);
        const body = this._text(0, 0, this._wrap(card.body, textW, bodyStyle), bodyStyle).setOrigin(0.5, 0);
        const titleH = title.height;
        const bodyH = body.height;
        const hrH = Math.max(2, Math.round(1.5 * m.s));

        const footerH = titleH + gap + hrH + gap + bodyH;
        const iconMax = h - padY * 2 - footerH - gap;
        const iconS = Math.min(w * 0.74, Math.max(h * 0.36, iconMax * 0.98));
        const blockH = iconS + gap + footerH;
        let y = cy - blockH / 2;

        const icon = this.scene.add.image(cx, y + iconS / 2, card.icon);
        this._fitContain(icon, iconS, iconS);
        this.add(icon);
        y += iconS + gap;

        title.setPosition(cx, y);
        this.add(title);
        y += titleH + gap;

        const hr = this.scene.add.graphics();
        hr.lineStyle(hrH, card.badge, 0.55);
        hr.lineBetween(cx - w * 0.34, y + hrH / 2, cx + w * 0.34, y + hrH / 2);
        this.add(hr);
        y += hrH + gap;

        body.setPosition(cx, y);
        this.add(body);
    }

    _controlRow (m, cx, y, w, h, row) {
        const iconW = h * 1.4;
        const iconX = cx - w / 2 + iconW / 2;
        this._drawControlIcon(m, iconX, y, h, row.kind);
        this.add(this._text(iconX + iconW * 0.7, y, row.label, {
            fontSize: `${m.fs(TYPE.control)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NAVY,
        }).setOrigin(0, 0.5));
    }

    _drawControlIcon (m, x, y, size, kind) {
        const g = this.scene.add.graphics();
        const s = size * 0.9;
        if (kind === 'arrows') {
            g.fillStyle(0x5B3FC9, 1);
            g.fillTriangle(x - s * 0.42, y, x - s * 0.08, y - s * 0.28, x - s * 0.08, y + s * 0.28);
            g.fillTriangle(x + s * 0.42, y, x + s * 0.08, y - s * 0.28, x + s * 0.08, y + s * 0.28);
        } else if (kind === 'hand') {
            g.fillStyle(0xF0C14B, 1);
            g.fillRoundedRect(x - s * 0.18, y - s * 0.35, s * 0.36, s * 0.7, s * 0.12);
            g.fillCircle(x, y - s * 0.28, s * 0.2);
        } else {
            g.fillStyle(0x2F6FE0, 1);
            g.fillRoundedRect(x - s * 0.32, y - s * 0.18, s * 0.64, s * 0.42, s * 0.08);
            g.fillStyle(0x1A2744, 1);
            g.fillCircle(x - s * 0.16, y + s * 0.28, s * 0.1);
            g.fillCircle(x + s * 0.16, y + s * 0.28, s * 0.1);
        }
        this.add(g);
    }

    _drawLearn (m, box) {
        const gap = box.w * 0.012;
        const n = LEARN_CARDS.length;
        const cw = (box.w - gap * (n - 1)) / n;
        LEARN_CARDS.forEach((card, i) => {
            const cx = box.x + cw / 2 + i * (cw + gap);
            const cy = box.y + box.h / 2;
            this._learnCard(m, cx, cy, cw, box.h, card);
        });
    }

    _learnCard (m, cx, cy, w, h, card) {
        this._round(cx, cy, w, h, card.fill, Math.min(w, h) * 0.08, card.stroke, Math.max(2, Math.round(2.5 * m.s)));

        const top = cy - h / 2;
        const badgeS = Math.min(w, h) * 0.12;
        this._round(cx, top + badgeS * 0.75, badgeS, badgeS, card.badge, badgeS * 0.5);
        this.add(this._text(cx, top + badgeS * 0.75, card.n, {
            fontSize: `${m.fs(TYPE.badge)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
        }).setOrigin(0.5, 0.5));

        const padY = h * 0.04;
        const gap = h * 0.02;
        const textW = w * 0.88;

        const titleStyle = {
            fontSize: `${m.fs(TYPE.learnTitle)}px`,
            fontStyle: WEIGHT.black,
            color: card.titleColor,
            align: 'center',
        };
        const bodyStyle = {
            fontSize: `${m.fs(TYPE.learnBody)}px`,
            fontStyle: WEIGHT.heavy,
            color: card.bodyColor,
            align: 'center',
            lineSpacing: m.fs(2),
        };
        const title = this._text(0, 0, this._wrap(card.title, textW, titleStyle), titleStyle).setOrigin(0.5, 0);
        const body = this._text(0, 0, this._wrap(card.body, textW, bodyStyle), bodyStyle).setOrigin(0.5, 0);
        const titleH = title.height;
        const bodyH = body.height;

        const footerMax = h * 0.2;
        const iconMax = h - padY * 2 - badgeS - gap * 4 - titleH - bodyH - footerMax;
        const iconS = Math.min(w * 0.72, Math.max(h * 0.22, iconMax));
        const footerS = Math.min(w * 0.55, footerMax);
        const blockH = badgeS + gap + iconS + gap + titleH + gap + bodyH + gap + footerS;
        let y = Math.max(top + padY, cy - blockH / 2);

        // Keep badge above the stacked block.
        y = top + badgeS * 1.35 + gap;

        const icon = this.scene.add.image(cx, y + iconS / 2, card.icon);
        this._fitContain(icon, iconS, iconS);
        this.add(icon);
        y += iconS + gap;

        title.setPosition(cx, y);
        this.add(title);
        y += titleH + gap;

        body.setPosition(cx, y);
        this.add(body);
        y += bodyH + gap;

        const footer = this.scene.add.image(cx, Math.min(y + footerS / 2, cy + h / 2 - padY - footerS / 2), card.footer);
        this._fitContain(footer, footerS, footerS);
        this.add(footer);
    }

    _drawGuide (m, box) {
        const gapX = box.w * 0.01;
        const gapY = box.h * 0.022;
        const cols = 3;
        const cw = (box.w - gapX * (cols - 1)) / cols;
        const ch = (box.h - gapY) / 2;

        GUIDE_CARDS.forEach((card, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const cx = box.x + cw / 2 + col * (cw + gapX);
            const cy = box.y + ch / 2 + row * (ch + gapY);
            this._round(cx, cy, cw, ch, card.fill, Math.min(cw, ch) * 0.1, card.stroke, Math.max(2, Math.round(2.5 * m.s)));

            const left = cx - cw / 2;
            const rail = this.scene.add.graphics();
            rail.fillStyle(card.accent, 1);
            rail.fillRoundedRect(left, cy - ch / 2, Math.max(8, cw * 0.03), ch, {
                tl: Math.min(cw, ch) * 0.1,
                bl: Math.min(cw, ch) * 0.1,
                tr: 0,
                br: 0,
            });
            this.add(rail);

            this.add(this._text(cx, cy - ch * 0.22, card.title.toUpperCase(), {
                fontSize: `${m.fs(TYPE.guideTitle)}px`,
                fontStyle: WEIGHT.heavy,
                color: C_NAVY,
            }).setOrigin(0.5, 0.5));

            this.add(this._text(cx, cy + ch * 0.08, this._wrap(card.body, cw * 0.78, {
                fontSize: `${m.fs(TYPE.guideBody)}px`,
                color: C_MUTED,
                align: 'center',
                lineSpacing: m.fs(3),
            }), {
                fontSize: `${m.fs(TYPE.guideBody)}px`,
                color: C_MUTED,
                align: 'center',
                lineSpacing: m.fs(3),
            }).setOrigin(0.5, 0.5));
        });
    }

    _wrap (str, maxWidth, style) {
        return wrapCause(this.scene, str, maxWidth, style);
    }

    _shrinkToWidth (text, maxW) {
        let size = parseInt(text.style.fontSize, 10) || 16;
        while (text.width > maxW && size > 11) {
            size -= 1;
            text.setFontSize(size);
        }
        return text;
    }
}
