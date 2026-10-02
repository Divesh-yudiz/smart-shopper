import Phaser from 'phaser';
import { HOME_TEXTURE_KEYS } from '../../config/homeAssets.js';
import { copyCause, addCauseText, wrapCause } from '../../utils/gameText.js';
import { MISSION_SELECT_KEYS as K } from '../../config/missionSelectAssets.js';

const COLS = 3;

/** Artboard 2 type scale at 1920×1080. */
const TYPE = Object.freeze({
    ribbon: 40,
    missionTag: 18,
    notPlayed: 14,
    title: 26,
    stats: 17,
    desc: 17,
    rating: 16,
    view: 17,
    score: 15,
});

const C_WHITE = '#ffffff';
const C_BODY = '#1A1A1A';
const C_STATS = '#1F2933';
const C_RATING = '#2D3748';

const TITLE_MAX_LINES = 2;
const DESC_MAX_LINES = 3;

const THEMES = [
    {
        card: K.greenCard,
        notPlayed: K.notPlayedGreen,
        art: K.basketArt,
        title: '#246612',
        tag: '#1E5A10',
        view: '#246612',
        btn: 0x4c9a28,
        btnHover: 0x348818,
    },
    {
        card: K.blueCard,
        notPlayed: K.notPlayedBlue,
        art: K.lunchArt,
        title: '#0050B8',
        tag: '#0050B8',
        view: '#0050B8',
        btn: 0x4aa8f8,
        btnHover: 0x0070e0,
    },
    {
        card: K.purpleCard,
        notPlayed: K.notPlayedPurple,
        art: K.packArt,
        title: '#9B00B0',
        tag: '#7A0090',
        view: '#3D5CE0',
        btn: 0x7890f8,
        btnHover: 0x5b7cfa,
    },
];

/**
 * Choose Your Mission — Artboard 2 layout.
 * Positions and sizes are fractions of the live game width / height.
 */
export default class MissionSelectPopup extends Phaser.GameObjects.Container {
    constructor(scene) {
        super(scene, 0, 0);
        scene.add.existing(this);
        this.setDepth(600);
        this.setVisible(false);
    }

    open({ missions = [], loading = false, error = '', onSelect = () => { }, animate = true } = {}) {
        this._onSelect = onSelect;
        this._picked = false;
        this._dismissible = !!error;

        const items = missions.filter(Boolean);
        this.removeAll(true);
        this.setScale(1);

        const m = this._m();

        if (this.scene._root) this.scene._root.setVisible(false);

        const bg = this.scene.add.image(m.cx, m.cy, HOME_TEXTURE_KEYS.bgBlur);
        bg.setDisplaySize(m.W, m.H);
        this.add(bg);

        const ov = this.scene.add.rectangle(m.cx, m.cy, m.W, m.H, 0x000000, 0.12);
        ov.setInteractive();
        this.add(ov);

        this._drawChrome(m);

        if (loading) {
            this._drawPanel(m, []);
            this._drawStatus(m, 'Loading missions...');
        } else if (error) {
            this._drawPanel(m, []);
            this._drawStatus(m, error);
            ov.on('pointerup', () => this.close());
        } else {
            this._drawPanel(m, items);
        }

        this.setVisible(true);
        if (animate) {
            this.setAlpha(0);
            this.scene.tweens.add({
                targets: this, alpha: 1, duration: 220, ease: 'Quad.easeOut',
            });
        } else {
            this.setAlpha(1);
        }
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

    _copy(s) {
        return copyCause(s);
    }

    _wrap(str, maxWidth, style) {
        return wrapCause(this.scene, str, maxWidth, style);
    }

    _text(x, y, message, style) {
        return addCauseText(this.scene, x, y, message, style);
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

    /** Scale a rounded-rect sprite without stretching its corners or border. */
    _slice(x, y, key, w, h, preferredCap = 110) {
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

    _drawChrome(m) {
        const backH = m.H * 0.078;
        const back = this.scene.add.image(m.x(0.078), m.y(0.058), HOME_TEXTURE_KEYS.backButton);
        this._fitW(back, backH * (back.width / back.height));
        back.setInteractive({ useHandCursor: true });
        back.on('pointerover', () => back.setScale(back.scaleX * 1.04, back.scaleY * 1.04));
        back.on('pointerout', () => this._fitW(back, backH * (back.width / back.height)));
        back.on('pointerup', () => this.close());
        this.add(back);

    }

    _drawPanel(m, items) {
        const panelW = m.W * 0.78;
        const panelH = m.H * 0.82;
        const panelY = m.y(0.54);

        const panel = this._slice(m.cx, panelY, K.pop, panelW, panelH, 110);
        this.add(panel);

        const ribbonW = m.W * 0.42;
        const ribbon = this.scene.add.image(m.cx, panelY - panelH / 2 + m.H * 0.01, K.ribbon);
        this._fitW(ribbon, ribbonW);
        this.add(ribbon);

        this.add(this._text(m.cx, ribbon.y - ribbon.displayHeight * 0.05, 'CHOOSE YOUR MISSION', {
            fontSize: `${m.fs(TYPE.ribbon)}px`,
            fontStyle: 'bold',
            color: C_WHITE,
        }).setOrigin(0.5, 0.5));

        if (!items.length) return;

        const rows = Math.max(1, Math.ceil(items.length / COLS));
        const padX = panelW * 0.036;
        const padTop = panelH * 0.11;
        const padBot = panelH * 0.05;
        const gapX = panelW * 0.018;
        const gapY = panelH * 0.022;
        const innerW = panelW - padX * 2;
        const innerH = panelH - padTop - padBot;

        // One shared card size for every mission — width from 3-col grid,
        // height capped so portrait art still fills without clipping the footer.
        const cardW = (innerW - gapX * (COLS - 1)) / COLS;
        const maxCardH = (innerH - gapY * (rows - 1)) / rows;
        const cardH = Math.min(maxCardH, cardW * 1.42);

        const gridW = COLS * cardW + (COLS - 1) * gapX;
        const gridH = rows * cardH + (rows - 1) * gapY;
        const gridLeft = m.cx - gridW / 2;
        const gridTop = panelY - panelH / 2 + padTop + (innerH - gridH) / 2;

        items.forEach((mission, i) => {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const countInRow = Math.min(COLS, items.length - row * COLS);
            const rowOffset = ((COLS - countInRow) * (cardW + gapX)) / 2;
            const cx = gridLeft + rowOffset + col * (cardW + gapX) + cardW / 2;
            const cy = gridTop + row * (cardH + gapY) + cardH / 2;
            this._drawCard(m, cx, cy, cardW, cardH, mission, THEMES[i % THEMES.length]);
        });
    }

    _clampLines(str, maxWidth, style, maxLines) {
        const wrapped = this._wrap(str, maxWidth, style);
        const lines = wrapped.split('\n').filter(Boolean);
        if (lines.length <= maxLines) return wrapped;
        const kept = lines.slice(0, maxLines);
        const last = kept[maxLines - 1].replace(/[.…]+$/, '');
        kept[maxLines - 1] = `${last}…`;
        return kept.join('\n');
    }

    _missionStatsLabel(mission) {
        const count = mission.nShoppingListCount
            ?? (mission.aShoppingList ?? []).reduce((sum, it) => sum + (it.nQuantity ?? 0), 0);
        if (!count) return '';
        return `${count} item${count === 1 ? '' : 's'}`;
    }

    _drawCard(m, cx, cy, w, h, mission, theme) {
        const wrap = this.scene.add.container(cx, cy);
        const left = -w / 2;
        const top = -h / 2;
        const padX = w * 0.085;
        const padY = h * 0.055;
        const innerW = w - padX * 2;
        const gapSm = h * 0.012;
        const gapMd = h * 0.018;

        // Nineslice so every card shares one size without stretching the corners.
        const card = this._slice(0, 0, theme.card, w, h, 56);
        wrap.add(card);

        // Match the nineslice cap so the mask does not clip the rounded frame.
        const corner = 56;
        const maskG = this.scene.add.graphics();
        maskG.fillStyle(0xffffff, 1);
        maskG.fillRoundedRect(cx + left, cy + top, w, h, corner);
        maskG.setVisible(false);
        wrap.setMask(maskG.createGeometryMask());
        this.add(maskG);

        // Build footer from the bottom so rating + score + button always sit inside.
        const status = this._statusLabel(mission);
        const score = mission.nScore;
        const showScore = score != null && status !== 'Not Played';
        const scoreFs = m.fs(TYPE.score);
        const btnH = Math.max(m.fs(32), h * 0.098);
        const btnW = Math.min(w * 0.34, innerW * 0.42);
        const starS = Math.max(m.fs(16), h * 0.048);
        const footerPad = padY;
        const contentBottom = top + h - footerPad;
        const scoreGap = gapSm * 0.75;
        // Always reserve the score row so rating, stars, and the button line up
        // on cards that have not been played yet.
        const scoreBlockH = scoreFs + scoreGap;
        // Stars + button share a row above the score; keep button vertically centered on that row.
        const starCy = contentBottom - scoreBlockH - Math.max(starS, btnH) / 2;
        const btnCy = starCy;
        const ratingLabelY = starCy - starS / 2 - gapSm - m.fs(TYPE.rating);
        const footerTop = ratingLabelY - gapMd;
        const bodyBottom = footerTop - gapSm;

        let y = top + padY;

        const tag = this.scene.add.image(left + padX, y, K.missionTag);
        this._fitW(tag, w * 0.34);
        tag.setOrigin(0, 0);
        wrap.add(tag);
        wrap.add(this._text(
            tag.x + tag.displayWidth / 2,
            tag.y + tag.displayHeight / 2,
            mission.sMissionLabel || `Mission ${mission.nOrder ?? ''}`.trim(),
            {
                fontSize: `${m.fs(TYPE.missionTag)}px`,
                fontStyle: 'bold',
                color: C_WHITE,
            },
        ).setOrigin(0.5, 0.5));

        const np = this.scene.add.image(left + w - padX, y, theme.notPlayed);
        this._fitW(np, w * 0.30);
        np.setOrigin(1, 0);
        wrap.add(np);
        wrap.add(this._text(np.x - np.displayWidth / 2, np.y + np.displayHeight / 2, status, {
            fontSize: `${m.fs(TYPE.notPlayed)}px`,
            fontStyle: 'bold',
            color: theme.tag,
        }).setOrigin(0.5, 0.5));

        y += Math.max(tag.displayHeight, np.displayHeight) + gapMd;

        const artBudget = Math.min(h * 0.15, Math.max(0, bodyBottom - y - h * 0.38));
        if (artBudget > h * 0.07) {
            const art = this.scene.add.image(0, y, theme.art);
            this._fitContain(art, innerW * 0.52, artBudget);
            art.setOrigin(0.5, 0);
            wrap.add(art);
            y += art.displayHeight + gapMd;
        }

        const titleStyle = { fontSize: `${m.fs(TYPE.title)}px`, fontStyle: 'bold' };
        const title = this._text(
            left + padX,
            y,
            this._clampLines(mission.sName ?? 'Mission', innerW, titleStyle, TITLE_MAX_LINES),
            { ...titleStyle, color: theme.title },
        ).setOrigin(0, 0);
        wrap.add(title);
        y += title.height + gapSm;

        const statsLabel = this._missionStatsLabel(mission);
        if (statsLabel) {
            const statsStyle = { fontSize: `${m.fs(TYPE.stats)}px`, fontStyle: 'bold' };
            const statsTxt = this._text(
                left + padX,
                y,
                this._clampLines(statsLabel, innerW, statsStyle, 2),
                { ...statsStyle, color: C_STATS },
            ).setOrigin(0, 0);
            wrap.add(statsTxt);
            y += statsTxt.height + gapSm;
        }

        if (mission.sDescription && y < bodyBottom) {
            const descStyle = { fontSize: `${m.fs(TYPE.desc)}px` };
            const lineH = m.fs(TYPE.desc) * 1.26;
            const availH = Math.max(lineH, bodyBottom - y);
            const maxLines = Math.max(1, Math.min(DESC_MAX_LINES, Math.floor(availH / lineH)));
            wrap.add(this._text(
                left + padX,
                y,
                this._clampLines(mission.sDescription, innerW, descStyle, maxLines),
                {
                    ...descStyle,
                    color: C_BODY,
                    lineSpacing: m.fs(TYPE.desc) * 0.16,
                },
            ).setOrigin(0, 0));
        }

        const div = this.scene.add.graphics();
        div.lineStyle(2, 0xc8d0c8, 0.75);
        div.lineBetween(left + padX, footerTop, left + w - padX, footerTop);
        wrap.add(div);

        wrap.add(this._text(left + padX, ratingLabelY, 'Mission Rating', {
            fontSize: `${m.fs(TYPE.rating)}px`,
            color: C_RATING,
        }).setOrigin(0, 0));

        const rating = Math.max(0, Math.min(3, Number(mission.nRating) || 0));
        for (let i = 0; i < 3; i += 1) {
            const star = this.scene.add.image(
                left + padX + starS * 0.5 + i * (starS + w * 0.02),
                starCy,
                i < rating ? K.starFilled : K.starEmpty,
            );
            star.setDisplaySize(starS, starS);
            wrap.add(star);
        }

        wrap.add(this._drawViewButton(
            m,
            left + w - padX - btnW / 2,
            btnCy,
            btnW,
            btnH,
            theme,
            mission,
        ));

        if (showScore) {
            const scoreLift = m.fs(8);
            wrap.add(this._text(
                left + padX,
                contentBottom - scoreFs - scoreLift,
                this._clampLines(`Score: ${score}/100`, innerW * 0.5, { fontSize: `${scoreFs}px` }, 1),
                { fontSize: `${scoreFs}px`, color: C_RATING },
            ).setOrigin(0, 0));
        }

        this.add(wrap);
        return wrap;
    }

    _drawViewButton(m, cx, cy, w, h, theme, mission) {
        const wrap = this.scene.add.container(cx, cy);
        const g = this.scene.add.graphics();
        const r = h / 2;
        const draw = (hover) => {
            g.clear();
            g.fillStyle(0xffffff, 1);
            g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
            g.lineStyle(3, hover ? theme.btnHover : theme.btn, 1);
            g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
        };
        draw(false);
        wrap.add(g);

        wrap.add(this._text(0, 0, 'View Mission', {
            fontSize: `${m.fs(TYPE.view)}px`,
            fontStyle: 'bold',
            color: theme.view,
        }).setOrigin(0.5, 0.5));

        const hit = this.scene.add.rectangle(0, 0, w, h, 0, 0);
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => {
            draw(true);
            wrap.setScale(1.05);
        });
        hit.on('pointerout', () => {
            draw(false);
            wrap.setScale(1);
        });
        hit.on('pointerup', () => this._selectMission(mission));
        wrap.add(hit);
        return wrap;
    }

    _drawStatus(m, message) {
        const style = {
            fontSize: `${m.fs(28)}px`,
            fontStyle: 'bold',
            color: '#7c5a2e',
            align: 'center',
        };
        this.add(this._text(m.cx, m.y(0.55), this._wrap(message, m.W * 0.7, style), style).setOrigin(0.5, 0.5));
    }

    _statusLabel(mission) {
        if (mission?.bPlayed === true || mission?.bPlayed === 'true') return 'Played';
        const key = String(mission?.eStatus ?? mission ?? '').toLowerCase();
        if (key === 'played' || key === 'completed') return 'Played';
        if (key === 'in_progress' || key === 'in-progress') return 'In Progress';
        return 'Not Played';
    }

    _selectMission(mission) {
        if (this._picked) return;
        this._picked = true;
        this._onSelect?.(mission);
    }

    close({ restoreHome = true } = {}) {
        if (restoreHome && this.scene._root) this.scene._root.setVisible(true);
        this.setVisible(false);
        this.setAlpha(1);
        this.setScale(1);
    }

    get isDismissible() {
        return !!this._dismissible;
    }

    get isOpen() {
        return this.visible;
    }
}
