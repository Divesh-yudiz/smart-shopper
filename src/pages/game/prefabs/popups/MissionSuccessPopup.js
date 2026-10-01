import Phaser from 'phaser';
import { addCauseText, wrapCause } from '../../utils/gameText.js';
import { HOME_TEXTURE_KEYS } from '../../config/homeAssets.js';
import { MISSION_SELECT_KEYS as MS } from '../../config/missionSelectAssets.js';
import { MISSION_DESC_KEYS } from '../../config/missionDescriptionAssets.js';
import { CHOOSE_PRODUCT_KEYS as CP } from '../../config/chooseProductAssets.js';
import { MISSION_SUCCESS_KEYS as MSS } from '../../config/missionSuccessAssets.js';

const TYPE = Object.freeze({
    ribbon: 44,
    subtitle: 22,
    starsLabel: 22,
    listTitle: 20,
    item: 26,
    badge: 14,
    scoreLabel: 18,
    scoreValue: 42,
    note: 24,
    statTitle: 26,
    statValue: 44,
    statOutOf: 20,
    statRemain: 22,
    button: 22,
});

const C_WHITE = '#ffffff';
const C_NAVY = '#1A2744';
const C_MUTED = '#6A6258';
const C_NOTE = '#2A241C';
const C_GREEN = '#1F8A3A';
const C_BLUE = '#2F6FE0';
const C_PURPLE = '#7B3CC9';
const C_GOLD = '#C9A012';
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
    Object.freeze({ name: 'Bananas 6 Pieces', done: true, textureKey: MISSION_DESC_KEYS.bananaIcon }),
]);

const DEFAULTS = Object.freeze({
    title: 'Great Shopping!',
    subtitle: 'You completed Family Grocery Basket Mission.',
    missionName: 'Family Grocery Basket',
    stars: 3,
    score: 90,
    scoreMax: 100,
    scoreNote: 'Great job balancing your choices.',
    accuracyMatched: 5,
    accuracyTotal: 5,
    sustainabilityMatched: 4,
    sustainabilityTotal: 5,
    coinsUsed: 54,
    coinsMax: 62,
    ecoUsed: 28,
    ecoMax: 32,
    timeRemaining: 80,
});

function formatClock(value) {
    if (typeof value === 'string') return value;
    const total = Math.max(0, Math.round(Number(value) || 0));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Mission Success — blue panel, stars, shopping list score, metric cards, next actions.
 */
export default class MissionSuccessPopup extends Phaser.GameObjects.Container {
    constructor(scene) {
        super(scene, 0, 0);
        scene.add.existing(this);
        this.setDepth(620);
        this.setVisible(false);
    }

    open({
        title = DEFAULTS.title,
        subtitle = DEFAULTS.subtitle,
        missionName = DEFAULTS.missionName,
        items = DEFAULT_ITEMS,
        stars = DEFAULTS.stars,
        maxStars = 3,
        score = DEFAULTS.score,
        scoreMax = DEFAULTS.scoreMax,
        scoreNote = DEFAULTS.scoreNote,
        accuracyMatched = DEFAULTS.accuracyMatched,
        accuracyTotal = DEFAULTS.accuracyTotal,
        sustainabilityMatched = DEFAULTS.sustainabilityMatched,
        sustainabilityTotal = DEFAULTS.sustainabilityTotal,
        coinsUsed = DEFAULTS.coinsUsed,
        coinsMax = DEFAULTS.coinsMax,
        coinsRemaining,
        ecoUsed = DEFAULTS.ecoUsed,
        ecoMax = DEFAULTS.ecoMax,
        ecoRemaining,
        timeRemaining = DEFAULTS.timeRemaining,
        timeRemainLabel = 'Remaining',
        onDashboard = () => { },
        onNewMission = () => { },
        onPlayAgain = () => { },
        onClose = () => { },
    } = {}) {
        this._onDashboard = onDashboard;
        this._onNewMission = onNewMission;
        this._onPlayAgain = onPlayAgain;
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
            missionName,
            items: Array.isArray(items) ? items : [...DEFAULT_ITEMS],
            stars: Phaser.Math.Clamp(Math.round(stars), 0, Math.max(1, Math.round(maxStars))),
            maxStars: Math.max(1, Math.round(maxStars)),
            score: Math.max(0, Math.round(score)),
            scoreMax: Math.max(1, Math.round(scoreMax)),
            scoreNote,
            accuracyMatched: Math.max(0, Math.round(accuracyMatched)),
            accuracyTotal: Math.max(1, Math.round(accuracyTotal)),
            sustainabilityMatched: Math.max(0, Math.round(sustainabilityMatched)),
            sustainabilityTotal: Math.max(1, Math.round(sustainabilityTotal)),
            coinsUsed: Math.max(0, Math.round(coinsUsed)),
            coinsMax: Math.max(0, Math.round(coinsMax)),
            coinsRemaining: coinsRemaining == null ? null : Math.max(0, Math.round(coinsRemaining)),
            ecoUsed: Math.max(0, Math.round(ecoUsed)),
            ecoMax: Math.max(0, Math.round(ecoMax)),
            ecoRemaining: ecoRemaining == null ? null : Math.max(0, Math.round(ecoRemaining)),
            timeLabel: formatClock(timeRemaining),
            timeRemainLabel,
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
        const panelH = m.H * 0.84;
        const panelY = m.cy + m.H * 0.02;
        const panel = this._slice(m.cx, panelY, MS.pop, panelW, panelH, 90);
        this.add(panel);

        const panelTop = panelY - panelH / 2;
        const panelLeft = m.cx - panelW / 2;
        const padX = panelW * 0.04;
        const innerW = panelW - padX * 2;

        const ribbonW = panelW * 0.42;
        const ribbonBaseY = panelTop + m.H * 0.01;
        const ribbon = this.scene.add.image(m.cx, ribbonBaseY, MS.ribbon);
        this._fitW(ribbon, ribbonW);
        this.add(ribbon);
        this.add(this._text(ribbon.x, ribbon.y - ribbon.displayHeight * 0.04, data.title, {
            fontSize: `${m.fs(TYPE.ribbon)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
        }).setOrigin(0.5, 0.5));

        const closeS = m.H * 0.06;
        const close = this.scene.add.image(
            panelLeft + panelW - closeS * 0.45,
            panelTop + closeS * 0.2,
            MSS.closeIcon,
        );
        close.setDisplaySize(closeS, closeS);
        close.setInteractive({ useHandCursor: true });
        close.on('pointerover', () => close.setDisplaySize(closeS * 1.06, closeS * 1.06));
        close.on('pointerout', () => close.setDisplaySize(closeS, closeS));
        close.on('pointerup', () => this._close());
        this.add(close);

        const subtitleY = ribbon.y + ribbon.displayHeight * 0.62;
        this.add(this._text(m.cx, subtitleY, data.subtitle, {
            fontSize: `${m.fs(TYPE.subtitle)}px`,
            color: C_NAVY,
        }).setOrigin(0.5, 0));

        // Keep stars lower; only the completion text moves up.
        const starsY = ribbon.y + ribbon.displayHeight * 0.72 + m.H * 0.055;
        this._drawStars(m, m.cx, starsY, data.stars, data.maxStars);
        this._drawConfetti(m, m.cx, starsY, panelW * 0.55);

        const starsLabelY = starsY + m.H * 0.052;
        this._drawStarsLabel(m, m.cx, starsLabelY, data.stars);

        const gap = Math.max(8, Math.round(m.H * 0.014));
        const btnH = m.H * 0.072;
        const bottomPad = m.H * 0.042;
        const btnY = panelY + panelH / 2 - bottomPad - btnH / 2;
        const bodyTop = starsLabelY + m.H * 0.024;
        const bodyBottom = btnY - btnH / 2 - gap;
        const contentH = Math.max(m.H * 0.34, bodyBottom - bodyTop);
        const colGap = gap;
        const leftW = innerW * 0.42;
        const rightW = innerW - colGap - leftW;
        const leftX = panelLeft + padX + leftW / 2;
        const rightX = panelLeft + padX + leftW + colGap + rightW / 2;
        const contentCy = bodyTop + contentH / 2;

        this._drawListCard(m, leftX, contentCy, leftW, contentH, data);
        this._drawMetrics(m, rightX, bodyTop, rightW, contentH, data, gap);
        this._drawFooter(m, m.cx, btnY, Math.min(innerW * 0.94, m.W * 0.72), btnH, gap);
    }

    _drawStars(m, cx, cy, count, total = 3) {
        const starS = m.H * 0.07;
        const gap = starS * 1.15;
        const startX = cx - ((total - 1) * gap) / 2;
        for (let i = 0; i < total; i += 1) {
            const key = i < count ? MS.starFilled : MS.starEmpty;
            const star = this.scene.add.image(startX + i * gap, cy, key);
            star.setDisplaySize(starS, starS);
            if (i === 1) star.setDisplaySize(starS * 1.12, starS * 1.12);
            this.add(star);
        }
    }

    _drawStarsLabel(m, cx, y, stars) {
        const label = this._text(cx, y, `${stars} Stars Earned!`, {
            fontSize: `${m.fs(TYPE.starsLabel)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_GOLD,
        }).setOrigin(0.5, 0.5);
        this.add(label);

        const sparkS = m.H * 0.022;
        const sparkL = this.scene.add.image(label.x - label.width / 2 - sparkS * 0.9, y, MS.starFilled);
        sparkL.setDisplaySize(sparkS, sparkS);
        const sparkR = this.scene.add.image(label.x + label.width / 2 + sparkS * 0.9, y, MS.starFilled);
        sparkR.setDisplaySize(sparkS, sparkS);
        this.add(sparkL);
        this.add(sparkR);
    }

    _drawConfetti(m, cx, cy, spreadW) {
        const colors = [0xFF6B9D, 0xFFD54F, 0x66BB6A, 0x42A5F5, 0xAB47BC, 0xFFA726];
        const count = 18;
        for (let i = 0; i < count; i += 1) {
            const g = this.scene.add.graphics();
            const color = colors[i % colors.length];
            g.fillStyle(color, 0.9);
            const w = 6 + (i % 3) * 2;
            const h = 4 + (i % 2) * 2;
            const x = cx + ((i / (count - 1)) - 0.5) * spreadW + ((i % 5) - 2) * m.W * 0.004;
            const y = cy + ((i % 7) - 3) * m.H * 0.012;
            g.fillRoundedRect(-w / 2, -h / 2, w, h, 1);
            g.setPosition(x, y);
            g.setAngle((i * 37) % 360);
            this.add(g);
        }
    }

    _drawListCard(m, cx, cy, w, h, data) {
        this._round(cx, cy, w, h, 0xFFFEFB, Math.min(w, h) * 0.06, 0xC9B8E8, Math.max(2, Math.round(2.5 * m.s)));

        const padX = w * 0.06;
        const padY = h * 0.05;
        const top = cy - h / 2 + padY;
        const bottom = cy + h / 2 - padY;
        const left = cx - w / 2 + padX;
        const innerW = w - padX * 2;

        const tagH = m.H * 0.036;
        const tagW = Math.min(innerW * 0.92, m.W * 0.22);
        const tagY = top + tagH * 0.15;
        this._round(cx, tagY, tagW, tagH, 0x7B3CC9, tagH * 0.45);
        const tag = this._text(cx, tagY, data.missionName, {
            fontSize: `${m.fs(TYPE.listTitle)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_WHITE,
        }).setOrigin(0.5, 0.5);
        this._shrinkToWidth(tag, tagW * 0.9);
        this.add(tag);

        const items = data.items.slice(0, 7);
        const count = Math.max(1, items.length);
        const compact = count >= 6;

        const scoreLabelFs = m.fs(compact ? TYPE.scoreLabel - 2 : TYPE.scoreLabel);
        const scoreValueFs = m.fs(compact ? TYPE.scoreValue - 6 : TYPE.scoreValue);
        const noteFs = m.fs(TYPE.note);
        const evenGap = m.H * (compact ? 0.01 : 0.014);
        const noteStyle = {
            fontSize: `${noteFs}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NOTE,
            lineSpacing: Math.round(noteFs * 0.15),
        };
        const noteStr = this._wrap(data.scoreNote, innerW * 0.96, noteStyle);
        const noteProbe = this._text(0, 0, noteStr, noteStyle).setVisible(false);
        const noteH = Math.max(noteFs, noteProbe.height);
        noteProbe.destroy();
        const valueH = scoreValueFs;
        const labelH = scoreLabelFs;
        const noteY = bottom - noteH / 2;
        const valueY = noteY - noteH / 2 - evenGap - valueH / 2;
        const labelY = valueY - valueH / 2 - evenGap - labelH / 2;
        const scoreTop = labelY - labelH / 2 - evenGap;

        const listTop = tagY + tagH / 2 + m.H * 0.018;
        const listAvail = Math.max(m.H * 0.14, scoreTop - listTop - m.H * 0.008);
        const rowH = Math.min(m.H * (compact ? 0.042 : 0.048), listAvail / count);

        items.forEach((item, i) => {
            const y = listTop + rowH / 2 + i * rowH;
            this._drawListRow(m, left, y, innerW, rowH * 0.88, item, i === 0);
        });

        const g = this.scene.add.graphics();
        g.lineStyle(Math.max(1, 2 * m.s), 0xD4C4EE, 1);
        g.lineBetween(left, scoreTop, left + innerW, scoreTop);
        this.add(g);

        const starS = m.H * 0.028;
        this.add(this._text(cx, labelY, 'Final Score', {
            fontSize: `${scoreLabelFs}px`,
            fontStyle: WEIGHT.heavy,
            color: C_MUTED,
        }).setOrigin(0.5, 0.5));

        const scoreText = this._text(cx, valueY, `${data.score}/${data.scoreMax}`, {
            fontSize: `${scoreValueFs}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NAVY,
        }).setOrigin(0.5, 0.5);
        this.add(scoreText);

        const starL = this.scene.add.image(scoreText.x - scoreText.width / 2 - starS * 0.85, valueY, MS.starFilled);
        starL.setDisplaySize(starS, starS);
        const starR = this.scene.add.image(scoreText.x + scoreText.width / 2 + starS * 0.85, valueY, MS.starFilled);
        starR.setDisplaySize(starS, starS);
        this.add(starL);
        this.add(starR);

        const note = this._text(cx, noteY, noteStr, noteStyle).setOrigin(0.5, 0.5);
        this.add(note);
    }

    _drawListRow(m, left, y, w, h, item, showCompletedBadge) {
        const statusS = h * 0.72;
        const status = this.scene.add.image(left + statusS / 2, y, item.done ? MSS.checkIcon : MS.starEmpty);
        this._fitContain(status, statusS, statusS);
        this.add(status);

        const iconS = h * 0.78;
        const iconKey = this.scene.textures.exists(item.textureKey) ? item.textureKey : MISSION_DESC_KEYS.bowlIcon;
        const icon = this.scene.add.image(status.x + statusS * 0.7 + iconS / 2, y, iconKey);
        this._fitContain(icon, iconS, iconS);
        this.add(icon);

        const nameX = icon.x + icon.displayWidth / 2 + m.W * 0.008;
        const name = this._text(nameX, y, item.name, {
            fontSize: `${m.fs(TYPE.item)}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NAVY,
        }).setOrigin(0, 0.5);
        this.add(name);

        if (item.done && showCompletedBadge) {
            const badgeStyle = {
                fontSize: `${m.fs(TYPE.badge)}px`,
                fontStyle: WEIGHT.heavy,
                color: C_GREEN,
            };
            const label = 'Completed';
            const probe = this._text(0, 0, label, badgeStyle).setVisible(false);
            const bw = probe.width + m.W * 0.014;
            const bh = m.H * 0.022;
            probe.destroy();
            const bx = Math.min(left + w - bw / 2, nameX + name.width + bw / 2 + m.W * 0.01);
            this._round(bx, y, bw, bh, 0xE4F8E8, bh * 0.45);
            this.add(this._text(bx, y, label, badgeStyle).setOrigin(0.5, 0.5));
        }
    }

    _drawMetrics(m, cx, top, w, h, data, gap) {
        // Shrink tiles vs left column; keep block top-aligned in the right column.
        const blockW = w * 0.92;
        const blockH = h * 0.82;
        const blockCx = cx;
        const blockTop = top + (h - blockH) * 0.08;
        const rowGap = Math.max(6, Math.round(gap * 0.7));
        const cardGap = Math.max(6, Math.round(gap * 0.7));
        const rowH = (blockH - rowGap * 2) / 3;

        const row1 = [
            {
                title: 'Accuracy',
                titleColor: '#2A5F9E',
                fill: 0xE8F4FF,
                stroke: 0xADD8FF,
                icon: MSS.accuracyIcon,
                value: `${data.accuracyMatched}/${data.accuracyTotal}`,
                remain: null,
            },
            {
                title: 'Eco',
                titleColor: '#2F6B3A',
                fill: 0xEEF9E8,
                stroke: 0xBCE4A8,
                icon: MSS.ecoIcon,
                value: `${data.ecoUsed} out of ${data.ecoMax}`,
                remain: `Remaining: ${data.ecoRemaining ?? Math.max(0, data.ecoMax - data.ecoUsed)}`,
                remainColor: C_GREEN,
            },
        ];
        const row2 = [
            {
                title: 'Sustainability',
                titleColor: '#3D7A2A',
                fill: 0xF7FBE8,
                stroke: 0xD4E8A8,
                icon: MSS.sustainabilityIcon,
                value: `${data.sustainabilityMatched}/${data.sustainabilityTotal}`,
                remain: null,
            },
            {
                title: 'Time',
                titleColor: '#C45A1A',
                fill: 0xFFF3E8,
                stroke: 0xF0C8A0,
                icon: MSS.timeIcon,
                value: data.timeLabel,
                remain: data.timeRemainLabel || 'Remaining',
                remainColor: C_ORANGE,
            },
        ];
        const coinsCard = {
            title: 'Coins',
            titleColor: '#6B3CC9',
            fill: 0xF4EEFF,
            stroke: 0xD2BFF0,
            icon: MSS.coinsIcon,
            value: `${data.coinsUsed} used out of ${data.coinsMax}`,
            remain: `Remaining: ${data.coinsRemaining ?? Math.max(0, data.coinsMax - data.coinsUsed)}`,
            remainColor: C_PURPLE,
            wide: true,
        };

        this._drawMetricRow(m, blockCx, blockTop + rowH / 2, blockW, rowH, row1, cardGap);
        this._drawMetricRow(m, blockCx, blockTop + rowH + rowGap + rowH / 2, blockW, rowH, row2, cardGap);
        this._metricCard(m, blockCx, blockTop + (rowH + rowGap) * 2 + rowH / 2, blockW, rowH, coinsCard);
    }

    _drawMetricRow(m, cx, y, w, h, cards, gap) {
        const cardW = (w - gap) / cards.length;
        cards.forEach((card, i) => {
            const x = cx - w / 2 + cardW / 2 + i * (cardW + gap);
            this._metricCard(m, x, y, cardW, h, card);
        });
    }

    _metricCard(m, x, y, w, h, card) {
        const r = Math.min(w, h) * 0.16;
        this._round(x, y, w, h, card.fill, r, card.stroke, Math.max(2, Math.round(2 * m.s)));

        const padX = w * 0.055;
        const padY = h * 0.09;
        const left = x - w / 2 + padX;
        const top = y - h / 2 + padY;
        const bottom = y + h / 2 - padY;

        const iconS = Math.min(w * 0.18, h * 0.3);
        const icon = this.scene.add.image(left + iconS / 2, top + iconS / 2, card.icon);
        this._fitContain(icon, iconS, iconS);
        this.add(icon);

        // Cause default tracking is too wide for these compact tiles.
        const tight = { letterSpacing: -1 };

        const titleX = icon.x + iconS / 2 + w * 0.02;
        const title = this._text(titleX, icon.y, card.title, {
            fontSize: `${m.fs(TYPE.statTitle)}px`,
            fontStyle: WEIGHT.heavy,
            color: card.titleColor,
            ...tight,
        }).setOrigin(0, 0.5);
        this._shrinkToWidth(title, w - padX * 2 - iconS - w * 0.04);
        this.add(title);

        const remainFs = m.fs(TYPE.statRemain);
        const valueFs = m.fs(card.wide || card.remain ? TYPE.statValue - 8 : TYPE.statValue);
        const headerBottom = top + iconS + h * 0.01;
        const remainY = card.remain ? bottom - remainFs * 0.55 : null;
        const valueZoneBottom = remainY != null ? remainY - remainFs * 0.7 : bottom;
        const valueY = (headerBottom + valueZoneBottom) / 2 - h * 0.02;

        const value = this._text(x, valueY, card.value, {
            fontSize: `${valueFs}px`,
            fontStyle: WEIGHT.heavy,
            color: C_NAVY,
            ...tight,
        }).setOrigin(0.5, 0.5);
        this._shrinkToWidth(value, w - padX * 2);
        this.add(value);

        if (card.remain && remainY != null) {
            const remain = this._text(x, remainY, card.remain, {
                fontSize: `${remainFs}px`,
                fontStyle: WEIGHT.heavy,
                color: card.remainColor || C_MUTED,
                ...tight,
            }).setOrigin(0.5, 0.5);
            this._shrinkToWidth(remain, w - padX * 2);
            this.add(remain);
        }
    }

    _drawFooter(m, cx, y, w, h, gap) {
        const src = this.scene.textures.get(CP.optionBlue)?.getSourceImage?.();
        const ratio = (src?.width ?? 256) / Math.max(1, src?.height ?? 68);
        const btnH = Math.min(h, m.H * 0.078);
        const btnGap = gap;
        const btnW = Math.min(btnH * ratio, (w - btnGap * 2) / 3, m.W * 0.24);
        const totalW = btnW * 3 + btnGap * 2;
        const specs = [
            {
                label: 'Back to Dashboard',
                fill: 0xFFFFFF,
                stroke: 0x2A3348,
                text: C_PURPLE,
                icon: MSS.menuIcon,
                iconTint: 0x7B3CC9,
                onClick: () => this._close(() => this._onDashboard?.()),
            },
            {
                label: 'New Mission',
                key: CP.optionBlue,
                text: C_WHITE,
                icon: MSS.targetIcon,
                onClick: () => this._close(() => this._onNewMission?.()),
            },
            {
                label: 'Play Again',
                key: CP.optionGreen,
                text: C_WHITE,
                icon: MSS.reloadIcon,
                onClick: () => this._close(() => this._onPlayAgain?.()),
            },
        ];
        specs.forEach((spec, i) => {
            const x = cx - totalW / 2 + btnW / 2 + i * (btnW + btnGap);
            this._drawFooterButton(m, x, y, btnW, btnH, spec);
        });
    }

    _drawFooterButton(m, cx, cy, maxW, maxH, spec) {
        const displayW = maxW;
        const displayH = maxH;
        const btn = this.scene.add.container(cx, cy);
        this.add(btn);

        if (spec.key) {
            const img = this._slice(0, 0, spec.key, displayW, displayH, 28);
            btn.add(img);
        } else {
            const g = this.scene.add.graphics();
            const r = displayH * 0.5;
            g.fillStyle(spec.fill, 1);
            g.fillRoundedRect(-displayW / 2, -displayH / 2, displayW, displayH, r);
            g.lineStyle(Math.max(2, Math.round(3 * m.s)), spec.stroke, 1);
            g.strokeRoundedRect(-displayW / 2, -displayH / 2, displayW, displayH, r);
            btn.add(g);
        }

        const label = this._text(0, 0, spec.label, {
            fontSize: `${m.fs(TYPE.button)}px`,
            fontStyle: WEIGHT.heavy,
            color: spec.text,
        }).setOrigin(0.5, 0.5);

        if (spec.icon && this.scene.textures.exists(spec.icon)) {
            const iconS = displayH * 0.42;
            const icon = this.scene.add.image(0, 0, spec.icon);
            this._fitContain(icon, iconS, iconS);
            if (spec.iconTint != null) icon.setTint(spec.iconTint);
            else if (spec.text === C_WHITE) icon.setTint(0xffffff);
            this._shrinkToWidth(label, displayW * 0.72);
            const iconGap = m.W * 0.006;
            const total = icon.displayWidth + iconGap + label.width;
            icon.x = -total / 2 + icon.displayWidth / 2;
            label.x = icon.x + icon.displayWidth / 2 + iconGap + label.width / 2;
            btn.add(icon);
            btn.add(label);
        } else {
            this._shrinkToWidth(label, displayW * 0.86);
            btn.add(label);
        }

        const hit = this.scene.add.rectangle(0, 0, displayW, displayH, 0, 0);
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => {
            this.scene.tweens.add({
                targets: btn, scaleX: 1.05, scaleY: 1.05, duration: 100, ease: 'Quad.easeOut',
            });
        });
        hit.on('pointerout', () => {
            this.scene.tweens.add({
                targets: btn, scaleX: 1, scaleY: 1, duration: 100, ease: 'Quad.easeOut',
            });
        });
        hit.on('pointerup', spec.onClick);
        btn.add(hit);
    }

    _shrinkToWidth(text, maxW) {
        let size = parseInt(text.style.fontSize, 10) || 16;
        while (text.width > maxW && size > 11) {
            size -= 1;
            text.setFontSize(size);
        }
        let spacing = text.style.letterSpacing ?? 0;
        while (text.width > maxW && spacing > -3) {
            spacing -= 0.5;
            text.setLetterSpacing(spacing);
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
