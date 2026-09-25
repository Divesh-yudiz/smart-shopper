import Phaser from 'phaser';
import { HOME_TEXTURE_KEYS } from '../../config/homeAssets.js';
import { copyCause, addCauseText, wrapCause } from '../../utils/gameText.js';
import { MISSION_SELECT_KEYS as K } from '../../config/missionSelectAssets.js';

const COLS = 3;

/** Artboard 2 type scale at 1920×1080. */
const TYPE = Object.freeze({
    ribbon: 40,
    missionTag: 18,
    notPlayed: 13,
    title: 28,
    items: 18,
    desc: 17,
    rating: 16,
    view: 16,
    score: 15,
});

const C_WHITE = '#ffffff';
const C_BODY = '#1A1A1A';
const C_ITEMS = '#1F2933';
const C_RATING = '#2D3748';

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
    constructor (scene) {
        super(scene, 0, 0);
        scene.add.existing(this);
        this.setDepth(600);
        this.setVisible(false);
    }

    open ({ missions = [], loading = false, error = '', onSelect = () => { }, animate = true } = {}) {
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

    _m () {
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

    _copy (s) {
        return copyCause(s);
    }

    _wrap (str, maxWidth, style) {
        return wrapCause(this.scene, str, maxWidth, style);
    }

    _text (x, y, message, style) {
        return addCauseText(this.scene, x, y, message, style);
    }

    _fitW (img, displayW) {
        img.setDisplaySize(displayW, displayW * (img.height / img.width));
        return img;
    }

    _fitContain (img, maxW, maxH) {
        const s = Math.min(maxW / img.width, maxH / img.height);
        img.setDisplaySize(img.width * s, img.height * s);
        return img;
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
        info.setInteractive({ useHandCursor: true });
        info.on('pointerover', () => info.setDisplaySize(infoS * 1.06, infoS * 1.06));
        info.on('pointerout', () => info.setDisplaySize(infoS, infoS));
        info.on('pointerup', () => this.scene._toggleInfo?.());
        this.add(info);
    }

    _drawPanel (m, items) {
        const panelW = m.W * 0.78;
        const panelH = m.H * 0.82;
        const panelY = m.y(0.54);

        const panel = this.scene.add.image(m.cx, panelY, K.pop);
        panel.setDisplaySize(panelW, panelH);
        this.add(panel);

        const ribbonW = m.W * 0.42;
        const ribbon = this.scene.add.image(m.cx, panelY - panelH / 2 + m.H * 0.01, K.ribbon);
        this._fitW(ribbon, ribbonW);
        this.add(ribbon);

        this.add(this._text(m.cx, ribbon.y, 'CHOOSE YOUR MISSION', {
            fontSize: `${m.fs(TYPE.ribbon)}px`,
            fontStyle: 'bold',
            color: C_WHITE,
        }).setOrigin(0.5, 0.5));

        if (!items.length) return;

        const rows = Math.max(1, Math.ceil(items.length / COLS));
        const padX = panelW * 0.032;
        const padTop = panelH * 0.10;
        const padBot = panelH * 0.045;
        const gapX = panelW * 0.012;
        const gapY = panelH * 0.016;
        const innerW = panelW - padX * 2;
        const innerH = panelH - padTop - padBot;
        const cellW = (innerW - gapX * (COLS - 1)) / COLS;
        const cellH = (innerH - gapY * (rows - 1)) / rows;
        const cardS = Math.min(cellW, cellH);
        const gridW = COLS * cardS + (COLS - 1) * gapX;
        const gridH = rows * cardS + (rows - 1) * gapY;
        const gridLeft = m.cx - gridW / 2;
        const gridTop = panelY - panelH / 2 + padTop + (innerH - gridH) / 2;

        items.forEach((mission, i) => {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const cx = gridLeft + col * (cardS + gapX) + cardS / 2;
            const cy = gridTop + row * (cardS + gapY) + cardS / 2;
            this._drawCard(m, cx, cy, cardS, cardS, mission, THEMES[i % THEMES.length]);
        });
    }

    _drawCard (m, cx, cy, w, h, mission, theme) {
        const wrap = this.scene.add.container(cx, cy);
        const left = -w / 2;
        const top = -h / 2;
        const pad = w * 0.09;
        const innerW = w - pad * 2;
        const gapSm = h * 0.018;
        const gapMd = h * 0.024;

        const card = this.scene.add.image(0, 0, theme.card);
        this._fitContain(card, w, h);
        wrap.add(card);

        const corner = Math.min(w, h) * 0.09;
        const maskG = this.scene.add.graphics();
        maskG.fillStyle(0xffffff, 1);
        maskG.fillRoundedRect(cx + left, cy + top, w, h, corner);
        maskG.setVisible(false);
        wrap.setMask(maskG.createGeometryMask());
        this.add(maskG);

        let y = top + pad;

        const tag = this.scene.add.image(left + pad, y, K.missionTag);
        this._fitW(tag, w * 0.38);
        tag.setOrigin(0, 0);
        wrap.add(tag);
        wrap.add(this._text(tag.x + tag.displayWidth / 2, tag.y + tag.displayHeight / 2, `Mission ${mission.nOrder ?? ''}`.trim(), {
            fontSize: `${m.fs(TYPE.missionTag)}px`,
            fontStyle: 'bold',
            color: C_WHITE,
        }).setOrigin(0.5, 0.5));

        const status = this._statusLabel(mission.eStatus);
        const np = this.scene.add.image(left + w - pad, y, theme.notPlayed);
        this._fitW(np, w * 0.30);
        np.setOrigin(1, 0);
        wrap.add(np);
        wrap.add(this._text(np.x - np.displayWidth / 2, np.y + np.displayHeight / 2, status, {
            fontSize: `${m.fs(TYPE.notPlayed)}px`,
            fontStyle: 'bold',
            color: theme.tag,
        }).setOrigin(0.5, 0.5));

        y += Math.max(tag.displayHeight, np.displayHeight) + gapMd;

        const art = this.scene.add.image(0, y, theme.art);
        this._fitContain(art, innerW * 0.62, h * 0.16);
        art.setOrigin(0.5, 0);
        wrap.add(art);
        y += art.displayHeight + gapMd;

        const titleStyle = { fontSize: `${m.fs(TYPE.title)}px`, fontStyle: 'bold' };
        const title = this._text(left + pad, y, this._wrap(mission.sName ?? 'Mission', innerW, titleStyle), {
            ...titleStyle,
            color: theme.title,
        }).setOrigin(0, 0);
        wrap.add(title);
        y += title.height + gapSm;

        const itemCount = (mission.aShoppingList ?? []).reduce((sum, it) => sum + (it.nQuantity ?? 0), 0);
        const iconS = h * 0.048;
        const basket = this.scene.add.image(left + pad, y + iconS / 2, K.basketIcon);
        basket.setDisplaySize(iconS, iconS);
        basket.setOrigin(0, 0.5);
        wrap.add(basket);
        const itemStyle = { fontSize: `${m.fs(TYPE.items)}px` };
        const itemsTxt = this._text(
            basket.x + iconS + w * 0.025,
            y,
            this._wrap(`${itemCount} items to pick`, innerW - iconS - w * 0.04, itemStyle),
            { ...itemStyle, color: C_ITEMS },
        ).setOrigin(0, 0);
        wrap.add(itemsTxt);
        y += Math.max(iconS, itemsTxt.height) + gapSm;

        if (mission.sDescription) {
            const descStyle = { fontSize: `${m.fs(TYPE.desc)}px` };
            const wrappedDesc = this._wrap(mission.sDescription, innerW, descStyle);
            const descLines = wrappedDesc.split('\n').length;
            const desc = this._text(left + pad, y, wrappedDesc, {
                ...descStyle,
                color: C_BODY,
                lineSpacing: m.fs(TYPE.desc) * 0.25,
            }).setOrigin(0, 0);
            wrap.add(desc);
            y += descLines * m.fs(TYPE.desc) * 1.35 + h * 0.04;
        } else {
            y += h * 0.04;
        }

        const div = this.scene.add.graphics();
        div.lineStyle(2, 0xc8d0c8, 0.75);
        div.lineBetween(left + pad, y, left + w - pad, y);
        wrap.add(div);
        y += gapSm + 6;

        wrap.add(this._text(left + pad, y, 'Mission Rating', {
            fontSize: `${m.fs(TYPE.rating)}px`,
            color: C_RATING,
        }).setOrigin(0, 0));
        y += m.fs(TYPE.rating) + gapSm;

        const rating = Math.max(0, Math.min(3, Number(mission.nRating) || 0));
        const starS = h * 0.052;
        const starY = y + starS / 2;
        for (let i = 0; i < 3; i += 1) {
            const star = this.scene.add.image(
                left + pad + starS * 0.5 + i * (starS + w * 0.02),
                starY,
                i < rating ? K.starFilled : K.starEmpty,
            );
            star.setDisplaySize(starS, starS);
            wrap.add(star);
        }

        const btnH = h * 0.08;
        const btnW = Math.min(w * 0.40, innerW * 0.48);
        wrap.add(this._drawViewButton(
            m,
            left + w - pad - btnW / 2,
            starY,
            btnW,
            btnH,
            theme,
            mission,
        ));

        const score = mission.nScore;
        if (score != null && status !== 'Not Played') {
            wrap.add(this._text(left + pad, y + starS + gapSm, this._wrap(`Your Score: ${score} out of 100`, innerW * 0.7, { fontSize: `${m.fs(TYPE.score)}px` }), {
                fontSize: `${m.fs(TYPE.score)}px`,
                color: C_RATING,
            }).setOrigin(0, 0));
        }

        this.add(wrap);
        return wrap;
    }

    _drawViewButton (m, cx, cy, w, h, theme, mission) {
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

    _drawStatus (m, message) {
        const style = {
            fontSize: `${m.fs(28)}px`,
            fontStyle: 'bold',
            color: '#7c5a2e',
            align: 'center',
        };
        this.add(this._text(m.cx, m.y(0.55), this._wrap(message, m.W * 0.7, style), style).setOrigin(0.5, 0.5));
    }

    _statusLabel (status) {
        const key = String(status ?? '').toLowerCase();
        if (key === 'played' || key === 'completed') return 'Played';
        if (key === 'in_progress' || key === 'in-progress') return 'In Progress';
        return 'Not Played';
    }

    _selectMission (mission) {
        if (this._picked) return;
        this._picked = true;
        this._onSelect?.(mission);
    }

    close ({ restoreHome = true } = {}) {
        if (restoreHome && this.scene._root) this.scene._root.setVisible(true);
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
