import Phaser from 'phaser';
import { UI_TEXTURE_KEYS } from '../config/componentAssets.js';
import { addCauseText, setCauseText } from '../utils/gameText.js';

const BTN_SIZE = 124;

/**
 * Clipboard toggle beside MY CART — expands / collapses the shopping list panel.
 */
export default class ShoppingListButton extends Phaser.GameObjects.Container {
    constructor (scene, x, y, {
        size = BTN_SIZE,
        expanded = true,
        onToggle = () => { },
    } = {}) {
        super(scene, x, y);
        scene.add.existing(this);

        this._size = size;
        this._expanded = expanded;
        this._onToggle = onToggle;
        this._busy = false;

        this.setDepth(310);
        this._build();
        this._applyExpandedVisual(false);
    }

    _build () {
        const s = this._size;

        const shadow = this.scene.add.graphics();
        shadow.fillStyle(0x000000, 0.28);
        shadow.fillCircle(3, 5, s * 0.42);
        this.add(shadow);

        const bg = this.scene.add.graphics();
        this._bg = bg;
        this.add(bg);

        const icon = this.scene.add.image(0, -2, UI_TEXTURE_KEYS.listIcon);
        const iconSize = s * 0.8;
        icon.setDisplaySize(iconSize, iconSize);
        this.add(icon);
        this._icon = icon;

        this._badge = this.scene.add.graphics();
        this.add(this._badge);

        this._badgeText = addCauseText(this.scene, s * 0.32, -s * 0.32, '0/0', {
            fontSize: `${Math.round(s * 0.16)}px`,
            fontStyle: 'bold',
            color: '#ffffff',
            align: 'center',
        }).setOrigin(0.5, 0.5);
        this.add(this._badgeText);

        const hit = this.scene.add.circle(0, 0, s * 0.48, 0, 0);
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => {
            if (this._busy) return;
            this.scene.tweens.add({
                targets: this,
                scaleX: 1.08,
                scaleY: 1.08,
                duration: 80,
                ease: 'Quad.easeOut',
            });
        });
        hit.on('pointerout', () => {
            if (this._busy) return;
            this.scene.tweens.add({
                targets: this,
                scaleX: 1,
                scaleY: 1,
                duration: 80,
                ease: 'Quad.easeOut',
            });
        });
        hit.on('pointerup', () => this._handlePress());
        this.add(hit);
    }

    _drawBg (expanded) {
        const s = this._size;
        const r = s * 0.42;
        this._bg.clear();
        this._bg.fillStyle(expanded ? 0x2aa9a1 : 0xf0a030, 1);
        this._bg.fillCircle(0, 0, r);
        this._bg.fillStyle(0xffffff, 0.18);
        this._bg.fillCircle(-r * 0.18, -r * 0.22, r * 0.55);
        this._bg.lineStyle(3, expanded ? 0x1a7a74 : 0xc07818, 1);
        this._bg.strokeCircle(0, 0, r);
    }

    _applyExpandedVisual (animate) {
        this._drawBg(this._expanded);
        // Dim icon slightly when list is open so the button reads as "collapse".
        const targetAlpha = this._expanded ? 0.92 : 1;
        if (animate) {
            this.scene.tweens.add({
                targets: this._icon,
                alpha: targetAlpha,
                duration: 120,
            });
        } else {
            this._icon.setAlpha(targetAlpha);
        }
    }

    _handlePress () {
        if (this._busy) return;
        this._busy = true;
        this.scene.tweens.add({
            targets: this,
            scaleX: 0.92,
            scaleY: 0.92,
            duration: 60,
            yoyo: true,
            ease: 'Quad.easeOut',
            onComplete: () => {
                this._busy = false;
                this.setScale(1);
                this._expanded = !this._expanded;
                this._applyExpandedVisual(true);
                this._onToggle(this._expanded);
            },
        });
    }

    setExpanded (expanded) {
        if (this._expanded === expanded) return;
        this._expanded = expanded;
        this._applyExpandedVisual(true);
    }

    isExpanded () {
        return this._expanded;
    }

    /** Updates the corner progress badge (e.g. "1/5"). */
    setProgress (done, total) {
        const t = Math.max(0, total | 0);
        const d = Math.max(0, Math.min(done | 0, t));
        setCauseText(this._badgeText, `${d}/${t}`);

        const s = this._size;
        const fontSize = Math.round(s * 0.16);
        this._badgeText.setFontSize(fontSize);
        // Circle grows with the count, plus a little padding so the digits don't touch the edge.
        const pad = Math.max(4, s * 0.032);
        const br = Math.max(this._badgeText.width, this._badgeText.height) / 2 + pad;
        const bx = s * 0.32;
        const by = -s * 0.32;
        this._badgeText.setPosition(bx, by - fontSize * 0.06);
        this._badge.clear();
        this._badge.fillStyle(0xe05050, 1);
        this._badge.fillCircle(bx, by, br);
        this._badge.lineStyle(Math.max(2, s * 0.025), 0xffffff, 0.9);
        this._badge.strokeCircle(bx, by, br);
        this._badgeText.setVisible(t > 0);
        this._badge.setVisible(t > 0);
    }
}
