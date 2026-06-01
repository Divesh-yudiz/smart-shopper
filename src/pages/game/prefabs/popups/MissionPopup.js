import Phaser from 'phaser';
import config from '../../utils/config.js';
import { resolveItem } from '../../../../utils/gameApi.js';

// ── panel geometry ─────────────────────────────────────────────────────────────
const PW        = 1120;
const PH        = 860;
const CR        = 28;
const HEADER_H  = 110;
const PT        = -PH / 2;   // -430

// Content Y (from container centre)
const TITLE_Y   = PT + HEADER_H / 2;           // header centre   = -375
const CAT_Y     = PT + HEADER_H + 46;          // category banner = -274
const SECT_Y    = PT + HEADER_H + 102;         // "collect items"  = -218
const CARDS_TOP = PT + HEADER_H + 132;         // top of row-1    = -188

const CW   = 326;
const CH   = 185;
const COLS = 3;
const CGX  = 22;
const CGY  = 16;
const IR   = 46;

// Row-2 bottom = CARDS_TOP + CH + CGY + CH = -188+185+16+185 = 198
// Divider at   = 198 + 18                  = 216
// Button centre = PB - 54                  = 376
// Button top    = 376 - 40                 = 336  →  gap from divider+text = fine

// ── palette ────────────────────────────────────────────────────────────────────
const C_PANEL   = 0xfffbf0;   // warm cream
const C_BORDER  = 0xfbbf24;   // golden border
const C_HEADER  = 0xf5a623;   // orange header
const C_CARD    = 0xffffff;
const C_CARD_BD = 0xfde68a;
const C_ICON_BG = 0xfff3cd;
const C_QTY_BG  = 0xf5a623;
const C_GREEN   = 0x22c55e;
const C_WHITE   = '#ffffff';
const C_NAVY    = '#1a2d4a';

function formatName (key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()
        .replace(/\b\w/g, c => c.toUpperCase());
}

export default class MissionPopup extends Phaser.GameObjects.Container {
    constructor (scene) {
        super(scene, config.centerX, config.centerY);
        scene.add.existing(this);
        this.setDepth(550);
        this.setVisible(false);
        this._gridRows = 2;
    }

    open ({ shoppingList = [], category = '', shoppingTotal = 0, budget = 0, onStart = () => {} } = {}) {
        this._onStart = onStart;
        this.removeAll(true);
        this._build(shoppingList, category, shoppingTotal, budget);
        this.setVisible(true);
        this.setAlpha(0);
        this.setScale(0.88);
        this.scene.tweens.add({
            targets: this, alpha: 1, scale: 1,
            duration: 400, ease: 'Back.easeOut',
        });
    }

    // ── build ─────────────────────────────────────────────────────────────────

    _build (shoppingList, category, shoppingTotal, budget) {
        // dim overlay
        const ov = this.scene.add.rectangle(0, 0, config.width, config.height, 0x000000, 0.55);
        ov.setInteractive();
        this.add(ov);

        this._drawPanelBg();
        this._drawHeader(category);
        this._drawItems(shoppingList);
        this._drawFooter(shoppingTotal, budget);
        this._drawButton();
    }

    // ── panel background ──────────────────────────────────────────────────────

    _drawPanelBg () {
        const g = this.scene.add.graphics();

        // soft drop shadow
        g.fillStyle(0x000000, 0.22);
        g.fillRoundedRect(-PW / 2 + 8, PT + 10, PW, PH, CR);

        // thick golden border
        g.fillStyle(C_BORDER, 1);
        g.fillRoundedRect(-PW / 2 - 6, PT - 6, PW + 12, PH + 12, CR + 6);

        // cream body
        g.fillStyle(C_PANEL, 1);
        g.fillRoundedRect(-PW / 2, PT, PW, PH, CR);

        this.add(g);
    }

    // ── orange header ─────────────────────────────────────────────────────────

    _drawHeader (category) {
        const g = this.scene.add.graphics();

        // orange fill
        g.fillStyle(C_HEADER, 1);
        g.fillRoundedRect(-PW / 2, PT, PW, HEADER_H, {
            tl: CR, tr: CR, bl: 0, br: 0,
        });

        // top-shine strip
        g.fillStyle(0xffffff, 0.18);
        g.fillRoundedRect(-PW / 2 + 8, PT + 4, PW - 16, HEADER_H / 2 - 4, {
            tl: CR - 2, tr: CR - 2, bl: 0, br: 0,
        });

        // bottom separator line
        g.lineStyle(2, 0xe8920a, 0.6);
        g.lineBetween(-PW / 2, PT + HEADER_H, PW / 2, PT + HEADER_H);

        this.add(g);

        // star decorations
        this.add(this.scene.add.text(-PW / 2 + 38, TITLE_Y, '⭐', { fontSize: '44px' }).setOrigin(0, 0.5));
        this.add(this.scene.add.text( PW / 2 - 38, TITLE_Y, '⭐', { fontSize: '44px' }).setOrigin(1, 0.5));

        // title
        this.add(this.scene.add.text(0, TITLE_Y, 'YOUR SHOPPING MISSION!', {
            fontFamily: config.fonts.text,
            fontSize:   '46px',
            fontStyle:  'bold',
            color:      C_WHITE,
            stroke:     '#a05200',
            strokeThickness: 4,
        }).setOrigin(0.5, 0.5));

        // ── category badge ────────────────────────────────────────────────────
        if (category) {
            const bW = 520, bH = 48;
            const bg = this.scene.add.graphics();

            // badge bg — deep amber pill
            bg.fillStyle(0xc05000, 1);
            bg.fillRoundedRect(-bW / 2, CAT_Y - bH / 2, bW, bH, bH / 2);

            // inner shine
            bg.fillStyle(0xffffff, 0.12);
            bg.fillRoundedRect(-bW / 2 + 4, CAT_Y - bH / 2 + 3, bW - 8, bH / 2 - 3, {
                tl: bH / 2, tr: bH / 2, bl: 0, br: 0,
            });

            // border
            bg.lineStyle(2, 0xffd700, 0.9);
            bg.strokeRoundedRect(-bW / 2, CAT_Y - bH / 2, bW, bH, bH / 2);

            this.add(bg);

            this.add(this.scene.add.text(0, CAT_Y, `🎯  ${category}`, {
                fontFamily: config.fonts.text,
                fontSize:   '26px',
                fontStyle:  'bold',
                color:      '#ffd700',
                stroke:     '#6b2600',
                strokeThickness: 3,
            }).setOrigin(0.5, 0.5));
        }
    }

    // ── item grid ─────────────────────────────────────────────────────────────

    _drawItems (shoppingList) {
        const items = shoppingList.filter(Boolean);
        this._gridRows = Math.max(1, Math.ceil(items.length / COLS));

        const gridW  = COLS * CW + (COLS - 1) * CGX;
        const startX = -gridW / 2;

        // section label
        this.add(this.scene.add.text(0, SECT_Y, '🛒  Items to collect:', {
            fontFamily: config.fonts.text,
            fontSize:   '26px',
            fontStyle:  'bold',
            color:      C_NAVY,
        }).setOrigin(0.5, 0.5));

        items.forEach((item, i) => {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const cx  = startX + col * (CW + CGX) + CW / 2;
            const cy  = CARDS_TOP + row * (CH + CGY) + CH / 2;
            this._drawCard(cx, cy, item);
        });
    }

    _drawCard (cx, cy, item) {
        const g = this.scene.add.graphics();

        // shadow
        g.fillStyle(0x000000, 0.1);
        g.fillRoundedRect(cx - CW / 2 + 3, cy - CH / 2 + 4, CW, CH, 16);

        // white card body
        g.fillStyle(C_CARD, 1);
        g.fillRoundedRect(cx - CW / 2, cy - CH / 2, CW, CH, 16);

        // card border
        g.lineStyle(2, C_CARD_BD, 1);
        g.strokeRoundedRect(cx - CW / 2, cy - CH / 2, CW, CH, 16);

        // icon circle bg
        const iconY = cy - CH / 2 + IR + 16;
        g.fillStyle(C_ICON_BG, 1);
        g.fillCircle(cx, iconY, IR + 6);
        g.lineStyle(2, C_BORDER, 0.5);
        g.strokeCircle(cx, iconY, IR + 6);

        this.add(g);

        // product image
        const resolved = resolveItem(item.sItemKey);
        if (resolved) {
            const img = this.scene.add.image(cx, iconY, resolved.textureKey);
            img.setDisplaySize(IR * 1.75, IR * 1.75);
            this.add(img);
        }

        // item name
        this.add(this.scene.add.text(cx, iconY + IR + 14, formatName(item.sItemKey), {
            fontFamily: config.fonts.text,
            fontSize:   '20px',
            fontStyle:  'bold',
            color:      C_NAVY,
            align:      'center',
            wordWrap:   { width: CW - 20 },
        }).setOrigin(0.5, 0));

        // qty badge + price
        const rowY = cy + CH / 2 - 22;
        const qW = 72, qH = 28;

        const qg = this.scene.add.graphics();
        qg.fillStyle(C_QTY_BG, 1);
        qg.fillRoundedRect(cx - CW / 2 + 14, rowY - qH / 2, qW, qH, qH / 2);
        this.add(qg);

        this.add(this.scene.add.text(cx - CW / 2 + 14 + qW / 2, rowY, `×${item.nQuantity}`, {
            fontFamily: config.fonts.text, fontSize: '18px', fontStyle: 'bold', color: C_WHITE,
        }).setOrigin(0.5, 0.5));

        this.add(this.scene.add.text(cx + CW / 2 - 14, rowY, `$${item.nPrice}`, {
            fontFamily: config.fonts.text, fontSize: '21px', fontStyle: 'bold', color: '#16a34a',
        }).setOrigin(1, 0.5));
    }

    // ── footer (totals) ───────────────────────────────────────────────────────

    _drawFooter (shoppingTotal, budget) {
        const gridBot = CARDS_TOP + this._gridRows * (CH + CGY) - CGY;
        const divY    = gridBot + 18;

        const g = this.scene.add.graphics();
        g.lineStyle(1.5, 0xfde68a, 1);
        g.lineBetween(-PW / 2 + 60, divY, PW / 2 - 60, divY);
        this.add(g);

        let ty = divY + 28;

        const row = (label, value, valColor) => {
            this.add(this.scene.add.text(-180, ty, label, {
                fontFamily: config.fonts.text, fontSize: '25px', color: C_NAVY,
            }).setOrigin(0, 0.5));
            this.add(this.scene.add.text(180, ty, value, {
                fontFamily: config.fonts.text, fontSize: '25px', fontStyle: 'bold', color: valColor,
            }).setOrigin(1, 0.5));
            ty += 38;
        };

        if (shoppingTotal > 0) row('Mission Cost :', `$${shoppingTotal}`, '#f5a623');
        if (budget > 0)        row('Your Budget  :', `$${budget}`,        '#16a34a');
    }

    // ── start button ──────────────────────────────────────────────────────────

    _drawButton () {
        const btnW = 360, btnH = 72;
        const btnY = PH / 2 - 52;

        const g = this.scene.add.graphics();
        const draw = (hover) => {
            g.clear();
            // shadow
            g.fillStyle(0x000000, 0.2);
            g.fillRoundedRect(-btnW / 2 + 4, btnY - btnH / 2 + 5, btnW, btnH, btnH / 2);
            // body
            g.fillStyle(hover ? 0x16a34a : C_GREEN, 1);
            g.fillRoundedRect(-btnW / 2, btnY - btnH / 2, btnW, btnH, btnH / 2);
            // shine
            g.fillStyle(0xffffff, 0.15);
            g.fillRoundedRect(-btnW / 2 + 4, btnY - btnH / 2 + 3, btnW - 8, btnH / 2 - 3, {
                tl: btnH / 2, tr: btnH / 2, bl: 0, br: 0,
            });
            // border
            g.lineStyle(2.5, hover ? 0x86efac : 0x4ade80, 1);
            g.strokeRoundedRect(-btnW / 2, btnY - btnH / 2, btnW, btnH, btnH / 2);
        };
        draw(false);
        this.add(g);

        const lbl = this.scene.add.text(0, btnY, "🚀  LET'S GO!", {
            fontFamily: config.fonts.text,
            fontSize:   '34px',
            fontStyle:  'bold',
            color:      C_WHITE,
            stroke:     '#0f5a2a',
            strokeThickness: 3,
        }).setOrigin(0.5, 0.5);
        this.add(lbl);

        // gentle idle pulse
        this.scene.tweens.add({
            targets: lbl, scaleX: 1.04, scaleY: 1.04,
            duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });

        const hit = this.scene.add.rectangle(0, btnY, btnW, btnH, 0, 0);
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => {
            draw(true);
            this.scene.tweens.killTweensOf(lbl);
            this.scene.tweens.add({ targets: lbl, scaleX: 1.08, scaleY: 1.08, duration: 80, ease: 'Quad.easeOut' });
        });
        hit.on('pointerout', () => {
            draw(false);
            this.scene.tweens.killTweensOf(lbl);
            this.scene.tweens.add({
                targets: lbl, scaleX: 1.04, scaleY: 1.04,
                duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            });
        });
        hit.on('pointerup', () => this._close());
        this.add(hit);
    }

    // ── close ─────────────────────────────────────────────────────────────────

    _close () {
        this.scene.tweens.add({
            targets: this, alpha: 0, scale: 0.92,
            duration: 200, ease: 'Quad.easeIn',
            onComplete: () => { this.setVisible(false); this._onStart?.(); },
        });
    }
}
