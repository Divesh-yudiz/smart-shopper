import Phaser from 'phaser';
import { addCauseText, wrapCause } from '../../utils/gameText.js';
import { HOME_TEXTURE_KEYS } from '../../config/homeAssets.js';
import { MISSION_SELECT_KEYS as MS } from '../../config/missionSelectAssets.js';
import { MISSION_DESC_KEYS } from '../../config/missionDescriptionAssets.js';
import { NOT_ENOUGH_COIN_KEYS as NEC } from '../../config/notEnoughCoinAssets.js';
import { CHOOSE_PRODUCT_KEYS as CP } from '../../config/chooseProductAssets.js';
import { TIMES_UP_KEYS as TU } from '../../config/timesUpAssets.js';

const TYPE = Object.freeze({
    ribbon: 44,
    subtitle: 20,
    headline: 34,
    listTitle: 24,
    item: 20,
    badge: 14,
    scoreLabel: 18,
    scoreValue: 48,
    note: 20,
    statTitle: 24,
    statValue: 44,
    statOutOf: 20,
    statRemain: 22,
    alertTitle: 34,
    alertBody: 22,
    button: 32,
});

const C_WHITE = '#ffffff';
const C_NAVY = '#1A2744';
const C_MUTED = '#6A6258';
const C_RED = '#D63439';
const C_RED_DARK = '#B51E28';
const C_GREEN = '#1F8A3A';
const C_BLUE = '#2F6FE0';
const C_COIN = '#C47A12';
const C_ORANGE = '#E07020';

const WEIGHT = Object.freeze({
    heavy: '800',
    bold: '700',
});

const DEFAULT_ITEMS = Object.freeze([
    Object.freeze({ name: 'Rice 1 Pack', done: true, textureKey: CP.riceLocal }),
    Object.freeze({ name: 'Bread 1 Pack', done: true, textureKey: MISSION_DESC_KEYS.breadIcon }),
    Object.freeze({ name: 'Eggs 1 Pack', done: true, textureKey: MISSION_DESC_KEYS.eggIcon }),
    Object.freeze({ name: 'Milk 1 Pack', done: true, textureKey: MISSION_DESC_KEYS.milkIcon }),
    Object.freeze({ name: 'Bananas 6 Pieces', done: false, textureKey: MISSION_DESC_KEYS.bananaIcon }),
]);

const DEFAULTS = Object.freeze({
    title: "Time's Up!",
    subtitle: 'You ran out of time.',
    headline: 'MISSION NOT COMPLETED',
    missionName: 'Family Grocery Basket',
    score: 40,
    scoreMax: 100,
    scoreNote: 'Great job balancing your choices.',
    coinsUsed: 48,
    coinsMax: 62,
    ecoUsed: 25,
    ecoMax: 32,
    alertTitle: 'SO CLOSE!',
    alertBody: 'You found 4 out of 5 items. Next time, check your list often and plan your route to reach checkout in time.',
});

/**
 * Time's Up — red panel, shopping list score, resource cards, retry actions.
 */
export default class TimesUpPopup extends Phaser.GameObjects.Container {
    constructor(scene) {
        super(scene, 0, 0);
        scene.add.existing(this);
        this.setDepth(620);
        this.setVisible(false);
    }

    open({
        title = DEFAULTS.title,
        subtitle = DEFAULTS.subtitle,
        headline = DEFAULTS.headline,
        missionName = DEFAULTS.missionName,
        items = DEFAULT_ITEMS,
        score = DEFAULTS.score,
        scoreMax = DEFAULTS.scoreMax,
        scoreNote = DEFAULTS.scoreNote,
        coinsUsed = DEFAULTS.coinsUsed,
        coinsMax = DEFAULTS.coinsMax,
        ecoUsed = DEFAULTS.ecoUsed,
        ecoMax = DEFAULTS.ecoMax,
        alertTitle = DEFAULTS.alertTitle,
        alertBody = DEFAULTS.alertBody,
        onDashboard = () => { },
        onNewMission = () => { },
        onRetry = () => { },
        onClose = () => { },
    } = {}) {
        this._onDashboard = onDashboard;
        this._onNewMission = onNewMission;
        this._onRetry = onRetry;
        this._onClose = onClose;

        this.removeAll(true);
        this.setScale(1);

        const m = this._m();
        const bg = this.scene.add.image(m.cx, m.cy, HOME_TEXTURE_KEYS.bgBlur);
        bg.setDisplaySize(m.W, m.H);
        this.add(bg);

        const ov = this.scene.add.rectangle(m.cx, m.cy, m.W, m.H, 0x000000, 0.18);
        ov.setInteractive();
        this.add(ov);

        this._drawChrome(m);
        this._drawPanel(m, {
            title,
            subtitle,
            headline,
            missionName,
            items: Array.isArray(items) ? items : [...DEFAULT_ITEMS],
            score: Math.max(0, Math.round(score)),
            scoreMax: Math.max(1, Math.round(scoreMax)),
            scoreNote,
            coinsUsed: Math.max(0, Math.round(coinsUsed)),
            coinsMax: Math.max(0, Math.round(coinsMax)),
            ecoUsed: Math.max(0, Math.round(ecoUsed)),
            ecoMax: Math.max(0, Math.round(ecoMax)),
            alertTitle,
            alertBody,
        });

        this.setVisible(true);
        this.setAlpha(0);
        this.scene.tweens.add({
            targets: this, alpha: 1, duration: 220, ease: 'Quad.easeOut',
        });
    }

    _m() {
        const W = this.scene.scale.width;
        const H = this.scene.scale.height;
        const s = Math.min(W / 1920, H / 1080);
        return {
            W, H, s,
            cx: W * 0.5,
            cy: H * 0.5,
            x: (pct) => W * pct,
            y: (pct) => H * pct,
            fs: (px) => Math.round(px * s),
        };
    }

    _text(x, y, message, style) {
        return addCauseText(this.scene, x, y, message, { fontStyle: WEIGHT.bold, ...style });
    }

    _wrap(str, maxWidth, style) {
        return wrapCause(this.scene, str, maxWidth, style);
    }

    _fitW(img, displayW) {
        img.setDisplaySize(displayW, displayW * (img.height / img.width));
        return img;
    }

    _fitContain(img, maxW, maxH) {
        const s = Math.min(maxW / img.width, maxH / img.height);
        img.setDisplaySize(img.width * s, img.height * s);
        return img;
    }

    _fitButton(img, maxW, maxH) {
        const ratio = img.width / Math.max(1, img.height);
        let w = maxW;
        let h = w / ratio;
        if (h > maxH) {
            h = maxH;
            w = h * ratio;
        }
        img.setDisplaySize(w, h);
        return { w, h };
    }

    _slice(x, y, key, w, h, preferredCap = 64) {
        const src = this.scene.textures.get(key)?.getSourceImage?.();
        const tw = src?.width ?? 256;
        const th = src?.height ?? 256;
        const maxCap = Math.min(Math.floor(tw / 2) - 1, Math.floor(th / 2) - 1);
        const cap = Math.max(8, Math.min(
            preferredCap,
            maxCap,
            Math.floor(w / 2) - 2,
            Math.floor(h / 2) - 2,
        ));
        return this.scene.add.nineslice(x, y, key, undefined, w, h, cap, cap, cap, cap);
    }

    /** Stretch a pill button horizontally without distorting the round ends. */
    _pillSlice(x, y, key, w, h) {
        const src = this.scene.textures.get(key)?.getSourceImage?.();
        const tw = Math.max(1, src?.width ?? 512);
        const th = Math.max(1, src?.height ?? 148);
        const side = Math.max(8, Math.min(Math.floor(th * 0.48), Math.floor(tw / 2) - 1));
        const srcW = Math.max(side * 2 + 8, Math.round(w * (th / Math.max(1, h))));
        const img = this.scene.add.nineslice(x, y, key, undefined, srcW, th, side, side, 0, 0);
        img.setDisplaySize(w, h);
        return img;
    }

    _round(x, y, w, h, color, radius, stroke = null, strokeW = 2) {
        const g = this.scene.add.graphics();
        const r = radius ?? Math.min(w, h) * 0.18;
        g.fillStyle(color, 1);
        g.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
        if (stroke != null) {
            g.lineStyle(strokeW, stroke, 1);
            g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);
        }
        this.add(g);
        return g;
    }

    _drawChrome(m) {
        const backH = m.H * 0.078;
        const back = this.scene.add.image(m.x(0.078), m.y(0.058), HOME_TEXTURE_KEYS.backButton);
        this._fitW(back, backH * (back.width / back.height));
        back.setInteractive({ useHandCursor: true });
        back.on('pointerover', () => back.setScale(back.scaleX * 1.04, back.scaleY * 1.04));
        back.on('pointerout', () => this._fitW(back, backH * (back.width / back.height)));
        back.on('pointerup', () => this._close(() => this._onDashboard?.()));
        this.add(back);

    }

    _drawPanel(m, data) {
        const panelW = m.W * 0.78;
        const panelH = m.H * 0.82;
        const panelY = m.cy + m.H * 0.02;
        const panel = this._slice(m.cx, panelY, TU.redPop, panelW, panelH, 90);
        this.add(panel);

        const panelTop = panelY - panelH / 2;
        const panelLeft = m.cx - panelW / 2;
        const padX = panelW * 0.04;
        const innerW = panelW - padX * 2;

        const ribbonW = panelW * 0.42;
        const ribbonLift = m.H * 0.000;
        const ribbonBaseY = panelTop + m.H * 0.01;
        const ribbon = this.scene.add.image(m.cx, ribbonBaseY - ribbonLift, NEC.ribbon);
        this._fitW(ribbon, ribbonW);
        this.add(ribbon);
        this.add(this._text(ribbon.x, ribbon.y - ribbon.displayHeight * 0.1, data.title, {
            fontSize: `${m.fs(TYPE.ribbon)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
        }).setOrigin(0.5, 0.5));

        // Lift subtitle + headline with the ribbon; keep body containers on the old baseline.
        const subtitleY = ribbon.y + ribbon.displayHeight * 0.3;
        this.add(this._text(m.cx, subtitleY, data.subtitle, {
            fontSize: `${m.fs(TYPE.subtitle)}px`,
            color: C_MUTED,
        }).setOrigin(0.5, 0));

        const headY = subtitleY + m.H * 0.03;
        this.add(this._text(m.cx, headY, data.headline, {
            fontSize: `${m.fs(TYPE.headline)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_RED_DARK,
        }).setOrigin(0.5, 0));

        const gap = Math.max(8, Math.round(m.H * 0.016));
        const btnH = m.H * 0.074;
        const bottomPad = m.H * 0.048;
        const btnY = panelY + panelH / 2 - bottomPad - btnH / 2;
        // Same body start as before the header uplift, so list/stat tiles stay put.
        const bodyTop = ribbonBaseY + ribbon.displayHeight * 0.48 + m.H * 0.062;
        const bodyBottom = btnY - btnH / 2 - gap;
        // Grow tiles to fill body space; footer button size stays fixed above.
        const contentH = Math.max(m.H * 0.34, bodyBottom - bodyTop);
        const colGap = gap;
        const leftW = innerW * 0.42;
        const rightW = innerW - colGap - leftW;
        const leftX = panelLeft + padX + leftW / 2;
        const rightX = panelLeft + padX + leftW + colGap + rightW / 2;
        const contentCy = bodyTop + contentH / 2;

        this._drawListCard(m, leftX, contentCy, leftW, contentH, data);
        this._drawRightColumn(m, rightX, bodyTop, rightW, contentH, data, gap);
        this._drawFooter(m, m.cx, btnY, Math.min(innerW * 0.94, m.W * 0.72), btnH, gap);
    }

    _drawListCard(m, cx, cy, w, h, data) {
        this._round(cx, cy, w, h, 0xFFFEFB, Math.min(w, h) * 0.06, 0xE8D8C8, Math.max(2, Math.round(2 * m.s)));

        const padX = w * 0.06;
        const padY = h * 0.045;
        const top = cy - h / 2 + padY;
        const bottom = cy + h / 2 - padY;
        const left = cx - w / 2 + padX;
        const innerW = w - padX * 2;

        this.add(this._text(left, top, data.missionName, {
            fontSize: `${m.fs(TYPE.listTitle)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NAVY,
        }).setOrigin(0, 0));

        const items = data.items.slice(0, 7);
        const count = Math.max(1, items.length);
        const compact = count >= 6;

        const scoreLabelFs = m.fs(compact ? TYPE.scoreLabel - 2 : TYPE.scoreLabel);
        const scoreValueFs = m.fs(compact ? TYPE.scoreValue - 8 : TYPE.scoreValue);
        const noteFs = m.fs(TYPE.note);
        const noteStyle = {
            fontSize: `${noteFs}px`,
            color: C_MUTED,
        };
        const noteStr = this._wrap(data.scoreNote, innerW * 0.82, noteStyle);
        const noteProbe = this._text(0, 0, noteStr, noteStyle).setVisible(false);
        const noteH = Math.max(noteFs, noteProbe.height);
        noteProbe.destroy();
        const barH = m.H * (compact ? 0.014 : 0.018);
        const barBlockH = barH * 1.4;
        const evenGap = m.H * (compact ? 0.012 : 0.016);

        // Pin score block to bottom with equal gaps between each piece.
        const valueH = scoreValueFs;
        const labelH = scoreLabelFs;
        const noteY = bottom - noteH / 2;
        const barY = noteY - noteH / 2 - evenGap - barBlockH / 2 - m.H * 0.012;
        const valueY = barY - barBlockH / 2 - evenGap - valueH / 2;
        const labelY = valueY - valueH / 2 - evenGap - labelH / 2;
        const scoreTop = labelY - labelH / 2 - evenGap;

        const titleH = m.H * 0.038;
        const listTop = top + titleH;
        const listAvail = Math.max(m.H * 0.14, scoreTop - listTop - m.H * 0.008);
        const rowH = Math.min(m.H * (compact ? 0.042 : 0.05), listAvail / count);

        items.forEach((item, i) => {
            const y = listTop + rowH / 2 + i * rowH;
            this._drawListRow(m, left, y, innerW, rowH * 0.88, item);
        });

        const g = this.scene.add.graphics();
        g.lineStyle(Math.max(1, 2 * m.s), 0xE8D8C8, 1);
        g.lineBetween(left, scoreTop, left + innerW, scoreTop);
        this.add(g);

        this.add(this._text(cx, labelY, 'Final Score', {
            fontSize: `${scoreLabelFs}px`,
            fontStyle: WEIGHT.heavy,
            color: C_MUTED,
        }).setOrigin(0.5, 0.5));

        this.add(this._text(cx, valueY, `${data.score}/${data.scoreMax}`, {
            fontSize: `${scoreValueFs}px`,
            fontStyle: WEIGHT.heavy,
            color: C_RED,
        }).setOrigin(0.5, 0.5));

        const barW = w * 0.72;
        const track = this.scene.add.image(cx, barY, TU.loadingBase);
        this._fitContain(track, barW, barBlockH);
        this.add(track);
        const pct = Phaser.Math.Clamp(data.score / Math.max(1, data.scoreMax), 0, 1);
        if (pct > 0.02) {
            const fill = this.scene.add.image(cx - barW / 2, barY, TU.loadingRed);
            fill.setOrigin(0, 0.5);
            const fillH = Math.min(barH, track.displayHeight * 0.7);
            fill.setDisplaySize(Math.max(fillH, barW * pct), fillH);
            this.add(fill);
        }

        const starS = m.H * (compact ? 0.02 : 0.024);
        const note = this._text(cx, noteY, noteStr, noteStyle).setOrigin(0.5, 0.5);
        this.add(note);
        const starL = this.scene.add.image(note.x - note.width / 2 - starS * 0.7, noteY, MS.starFilled);
        starL.setDisplaySize(starS, starS);
        const starR = this.scene.add.image(note.x + note.width / 2 + starS * 0.7, noteY, MS.starFilled);
        starR.setDisplaySize(starS, starS);
        this.add(starL);
        this.add(starR);
    }

    _drawListRow(m, left, y, w, h, item) {
        const statusS = h * 0.72;
        const statusKey = item.done ? TU.check : TU.redCircle;
        const status = this.scene.add.image(left + statusS / 2, y, statusKey);
        this._fitContain(status, statusS, statusS);
        this.add(status);

        const iconS = h * 0.78;
        const iconKey = this.scene.textures.exists(item.textureKey) ? item.textureKey : MISSION_DESC_KEYS.bowlIcon;
        const icon = this.scene.add.image(status.x + statusS * 0.7 + iconS / 2, y, iconKey);
        this._fitContain(icon, iconS, iconS);
        this.add(icon);

        const nameX = icon.x + icon.displayWidth / 2 + m.W * 0.008;
        const nameStyle = {
            fontSize: `${m.fs(TYPE.item)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NAVY,
        };
        const name = this._text(nameX, y, item.name, nameStyle).setOrigin(0, 0.5);
        this.add(name);

        if (!item.done) {
            const badgeStyle = {
                fontSize: `${m.fs(TYPE.badge)}px`,
                fontStyle: WEIGHT.heavy,
                color: C_RED,
            };
            const label = 'Not Completed';
            const probe = this._text(0, 0, label, badgeStyle).setVisible(false);
            const bw = probe.width + m.W * 0.014;
            const bh = m.H * 0.022;
            probe.destroy();
            const bx = Math.min(left + w - bw / 2, nameX + name.width + bw / 2 + m.W * 0.01);
            this._round(bx, y, bw, bh, 0xFDE4E6, bh * 0.45);
            this.add(this._text(bx, y, label, badgeStyle).setOrigin(0.5, 0.5));
        }
    }

    _drawRightColumn(m, cx, top, w, h, data, gap) {
        const tileGap = gap;
        const statH = (h - tileGap) * 0.4;
        const alertH = h - tileGap - statH;
        this._drawStatRow(m, cx, top + statH / 2, w, statH, data, tileGap);
        this._drawAlert(m, cx, top + statH + tileGap + alertH / 2, w, alertH, data);
    }

    _drawStatRow(m, cx, y, w, h, data, gap) {
        const cards = [
            {
                title: 'COINS',
                titleColor: '#8B5A2B',
                fill: 0xFFF9E6,
                stroke: 0xE8C89A,
                icon: MISSION_DESC_KEYS.coinIcon,
                used: String(data.coinsUsed),
                outOf: `out of ${data.coinsMax}`,
                remain: `Remaining - ${Math.max(0, data.coinsMax - data.coinsUsed)}`,
                remainColor: C_ORANGE,
            },
            {
                title: 'ECO',
                titleColor: '#2F6B3A',
                fill: 0xEEF9E8,
                stroke: 0xBCE4A8,
                icon: CP.leaf,
                used: String(data.ecoUsed),
                outOf: `out of ${data.ecoMax}`,
                remain: `Remaining - ${Math.max(0, data.ecoMax - data.ecoUsed)}`,
                remainColor: C_GREEN,
            },
            {
                title: 'TIME',
                titleColor: '#2A5F9E',
                fill: 0xE8F4FF,
                stroke: 0xADD8FF,
                icon: MISSION_DESC_KEYS.timerIcon,
                used: '00:00',
                outOf: '',
                remain: 'Expired',
                remainColor: C_BLUE,
            },
        ];
        const cardGap = gap;
        const cardW = (w - cardGap * (cards.length - 1)) / cards.length;
        cards.forEach((card, i) => {
            const x = cx - w / 2 + cardW / 2 + i * (cardW + cardGap);
            this._statCard(m, x, y, cardW, h, card);
        });
    }

    _statCard(m, x, y, w, h, card) {
        const r = Math.min(w, h) * 0.16;
        this._round(x, y, w, h, card.fill, r, card.stroke, Math.max(2, Math.round(2 * m.s)));

        const padX = w * 0.1;
        const padY = h * 0.08;
        const left = x - w / 2 + padX;
        const top = y - h / 2 + padY;

        const iconS = Math.min(w * 0.32, h * 0.26);
        const icon = this.scene.add.image(left + iconS / 2, top + iconS / 2, card.icon);
        this._fitContain(icon, iconS, iconS);
        this.add(icon);

        const title = this._text(icon.x + iconS / 2 + w * 0.04, icon.y, card.title, {
            fontSize: `${m.fs(TYPE.statTitle)}px`,
            fontStyle: WEIGHT.heavy,
            color: card.titleColor,
        }).setOrigin(0, 0.5);
        this._shrinkToWidth(title, w - padX * 2 - iconS - w * 0.06);
        this.add(title);

        const valueY = y - h * 0.02;
        this.add(this._text(x, valueY, card.used, {
            fontSize: `${m.fs(TYPE.statValue)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NAVY,
        }).setOrigin(0.5, 0.5));

        if (card.outOf) {
            this.add(this._text(x, valueY + h * 0.18, card.outOf, {
                fontSize: `${m.fs(TYPE.statOutOf)}px`,
                fontStyle: WEIGHT.bold,
                color: C_MUTED,
            }).setOrigin(0.5, 0.5));
        }

        const lineY = y + h * 0.28;
        const g = this.scene.add.graphics();
        g.lineStyle(Math.max(1, Math.round(1.5 * m.s)), card.stroke, 0.9);
        g.lineBetween(x - w / 2 + padX, lineY, x + w / 2 - padX, lineY);
        this.add(g);

        const remain = this._text(x, y + h / 2 - padY - h * 0.02, card.remain, {
            fontSize: `${m.fs(TYPE.statRemain)}px`,
            fontStyle: WEIGHT.heavy,
            color: card.remainColor,
        }).setOrigin(0.5, 0.5);
        this._shrinkToWidth(remain, w - padX * 2);
        this.add(remain);
    }

    _drawAlert(m, cx, cy, w, h, data) {
        this._round(cx, cy, w, h, 0xFFF0E6, Math.min(w, h) * 0.12, 0xF0C8B0, Math.max(2, Math.round(2 * m.s)));

        const pad = Math.max(8, h * 0.1);
        const sideMaxW = w * 0.22;
        const sideMaxH = h - pad * 2;

        const mike = this.scene.add.image(0, cy, TU.mike);
        this._fitContain(mike, sideMaxW, sideMaxH * 0.65);
        mike.x = cx - w / 2 + pad + mike.displayWidth / 2;
        this.add(mike);

        const art = this.scene.add.image(0, cy, TU.basket);
        this._fitContain(art, sideMaxW, sideMaxH);
        art.x = cx + w / 2 - pad - art.displayWidth / 2;
        this.add(art);

        const textLeft = mike.x + mike.displayWidth / 2 + pad * 0.6;
        const textRight = art.x - art.displayWidth / 2 - pad * 0.6;
        const textW = Math.max(40, textRight - textLeft);
        const title = this._text(textLeft, cy - h * 0.2, data.alertTitle, {
            fontSize: `${m.fs(TYPE.alertTitle)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_RED,
        }).setOrigin(0, 0.5);
        const body = this._text(textLeft, cy + h * 0.12, this._wrap(data.alertBody, textW, {
            fontSize: `${m.fs(TYPE.alertBody)}px`,
            color: C_MUTED,
            lineSpacing: m.fs(3),
        }), {
            fontSize: `${m.fs(TYPE.alertBody)}px`,
            color: C_MUTED,
            lineSpacing: m.fs(3),
        }).setOrigin(0, 0.5);
        this.add(title);
        this.add(body);
    }

    _drawFooter(m, cx, y, w, h, gap) {
        const btnH = Math.min(h, m.H * 0.078);
        const btnGap = gap;
        const specs = [
            {
                label: 'Back to Dashboard',
                fill: 0xFFFFFF,
                stroke: 0x2A3348,
                text: C_NAVY,
                icon: TU.homeBtn,
                onClick: () => this._close(() => this._onDashboard?.()),
            },
            {
                label: 'New Mission',
                key: MISSION_DESC_KEYS.blueButton,
                text: C_WHITE,
                icon: HOME_TEXTURE_KEYS.trackIcon,
                onClick: () => this._close(() => this._onNewMission?.()),
            },
            {
                label: 'Retry Mission',
                key: HOME_TEXTURE_KEYS.greenButton,
                text: C_WHITE,
                icon: TU.restartBtn,
                onClick: () => this._close(() => this._onRetry?.()),
            },
        ];
        const n = specs.length;
        const src = this.scene.textures.get(MISSION_DESC_KEYS.blueButton)?.getSourceImage?.();
        const ratio = (src?.width ?? 512) / Math.max(1, src?.height ?? 148);
        const fontSize = m.fs(TYPE.button);
        const iconS = btnH * 0.42;
        const iconGap = Math.max(6, m.W * 0.005);
        const padX = btnH * 0.36;
        let labelW = 0;
        specs.forEach((spec) => {
            const probe = this._text(0, 0, spec.label, {
                fontSize: `${fontSize}px`,
                fontStyle: WEIGHT.heavy,
                color: C_WHITE,
            });
            labelW = Math.max(labelW, probe.width);
            probe.destroy();
        });
        const needed = padX * 2 + iconS + iconGap + labelW;
        let bw = Math.max(btnH * ratio, needed);
        let bh = btnH;
        let totalW = bw * n + btnGap * (n - 1);
        if (totalW > w) {
            const scale = w / totalW;
            bw *= scale;
            bh *= scale;
            totalW = w;
        }
        const fit = bh / btnH;
        const textMax = Math.max(24, bw - padX * 2 * fit - iconS * fit - iconGap);
        const drawFont = this._sharedButtonFontSize(
            specs.map((spec) => spec.label),
            fontSize,
            textMax,
        );
        let x = cx - totalW / 2;
        specs.forEach((spec) => {
            this._drawFooterButton(m, x + bw / 2, y, bw, bh, { ...spec, fontSize: drawFont });
            x += bw + btnGap;
        });
    }

    _drawFooterButton(m, cx, cy, maxW, maxH, spec) {
        const displayW = maxW;
        const displayH = maxH;
        const btn = this.scene.add.container(cx, cy);
        this.add(btn);

        if (spec.key) {
            btn.add(this._pillSlice(0, 0, spec.key, displayW, displayH));
        } else {
            const g = this.scene.add.graphics();
            const r = displayH * 0.5;
            const strokeW = Math.max(2, Math.round(3 * m.s));
            g.fillStyle(spec.fill, 1);
            g.fillRoundedRect(-displayW / 2, -displayH / 2, displayW, displayH, r);
            g.lineStyle(strokeW, spec.stroke, 1);
            g.strokeRoundedRect(-displayW / 2, -displayH / 2, displayW, displayH, r);
            btn.add(g);
        }

        const label = this._text(0, 0, spec.label, {
            fontSize: `${spec.fontSize ?? m.fs(TYPE.button)}px`,
            fontStyle: WEIGHT.heavy,
            color: spec.text,
        }).setOrigin(0.5, 0.5);

        if (spec.icon && this.scene.textures.exists(spec.icon)) {
            const iconS = displayH * 0.42;
            const icon = this.scene.add.image(0, 0, spec.icon);
            this._fitContain(icon, iconS, iconS);
            if (spec.text === C_WHITE) icon.setTint(0xffffff);
            const iconGap = Math.max(6, m.W * 0.005);
            const total = icon.displayWidth + iconGap + label.width;
            icon.x = -total / 2 + icon.displayWidth / 2;
            label.x = icon.x + icon.displayWidth / 2 + iconGap + label.width / 2;
            btn.add(icon);
            btn.add(label);
        } else {
            btn.add(label);
        }

        const hit = this.scene.add.rectangle(0, 0, displayW, displayH, 0, 0);
        hit.setInteractive({ useHandCursor: true });
        const hover = (scale) => {
            this.scene.tweens.add({
                targets: btn,
                scaleX: scale,
                scaleY: scale,
                duration: 100,
                ease: 'Quad.easeOut',
            });
        };
        hit.on('pointerover', () => hover(1.05));
        hit.on('pointerout', () => hover(1));
        hit.on('pointerup', spec.onClick);
        btn.add(hit);
    }

    _sharedButtonFontSize(labels, startSize, maxW) {
        let size = startSize;
        labels.forEach((label) => {
            const probe = this._text(0, 0, label, {
                fontSize: `${startSize}px`,
                fontStyle: WEIGHT.heavy,
                color: C_WHITE,
            });
            this._shrinkToWidth(probe, maxW);
            size = Math.min(size, parseInt(probe.style.fontSize, 10) || size);
            probe.destroy();
        });
        return size;
    }

    _shrinkToWidth(text, maxW) {
        let size = parseInt(text.style.fontSize, 10) || 16;
        while (text.width > maxW && size > 11) {
            size -= 1;
            text.setFontSize(size);
        }
        return text;
    }

    _close(afterClose = null) {
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: 160,
            ease: 'Quad.easeIn',
            onComplete: () => {
                this.setVisible(false);
                this.setAlpha(1);
                this._onClose?.();
                afterClose?.();
            },
        });
    }
}
