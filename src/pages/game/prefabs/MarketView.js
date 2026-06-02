import Phaser from 'phaser';
import { getRackBannerAsset } from '../config/bannerAssets.js';
import config from '../utils/config.js';
import { getMarketLayout, getRackPlacements, getRacksForView } from '../utils/rackConfig.js';
import ProductRack from './ProductRack.js';

const { rackWidth: RACK_W, labelHeight: LABEL_H } = getMarketLayout();

// ─── MarketView ───────────────────────────────────────────────────────────────
/**
 * Horizontal side-by-side rack layout for a 1920 × 1080 landscape canvas.
 * Shows 3 racks at once; scroll with ← / → arrow keys only.
 *
 * @param {Phaser.Scene} scene
 * @param {Array}    racksData       - from getRacksForView(); defaults to MARKET_CONFIG
 * @param {Function} onProductClick  - (product, rackId, rackIndex) callback
 */
export default class MarketView extends Phaser.GameObjects.Container {
    constructor(scene, racksData = getRacksForView(), onProductClick = () => { }) {
        super(scene, 0, 0);
        scene.add.existing(this);

        this._onProductClick = onProductClick;

        const rackIds = racksData.map((r) => r.id);
        const { placements, scrollWidth } = getRackPlacements(rackIds);
        this._placements = placements;

        // Build a lookup so we always use the caller-supplied products (may have API prices patched in)
        const racksById = Object.fromEntries(racksData.map((r) => [r.id, r]));

        this._minX = Math.min(0, -(scrollWidth - config.width));
        this._maxX = 0;

        // 1. Scrollable inner container
        this._inner = scene.add.container(0, 0);
        this.add(this._inner);

        // Mask: clip to canvas so off-screen racks are hidden & non-interactive
        const maskGfx = scene.make.graphics({ add: false });
        maskGfx.fillStyle(0xffffff);
        maskGfx.fillRect(0, 0, config.width, config.height);
        this._inner.setMask(maskGfx.createGeometryMask());

        // 2. Background image (scrolls with racks)
        this._buildBackground(scrollWidth);

        // 3. Bay banners + product racks
        const { showCategoryLabel, showBanners } = getMarketLayout();

        placements.forEach((rackCfg, i) => {
            const rx = rackCfg.centerX;
            if (showBanners) {
                const bannerX = rackCfg.bannerCenterX ?? rx;
                this._buildRackBanner(bannerX, rackCfg.bannerCenterY, rackCfg.id, rackCfg.sectionWidth, i);
            }
            if (showCategoryLabel) {
                this._buildCategoryLabel(rx, rackCfg.labelCenterY, rackCfg.category, rackCfg.headerColor);
            }
            // Use products from the caller-supplied racksData so API-patched prices are preserved
            const suppliedRack = racksById[rackCfg.id];
            const rack = new ProductRack(scene, rx, rackCfg.rackCenterY, {
                rackId: rackCfg.id,
                category: rackCfg.category,
                headerColor: rackCfg.headerColor,
                layout: rackCfg.layout,
                products: suppliedRack?.products ?? rackCfg.products,
                onProductClick: (p) => this._onProductClick(p, rackCfg.id, i),
            });
            this._inner.add(rack);
        });

    }

    // ── Category banner (colored plate + icon) ────────────────────────────────
    _buildRackBanner (cx, cy, rackId, sectionWidth, bayIndex = 0) {
        const banner = getRackBannerAsset(rackId);
        if (!banner) return;

        const layout = getMarketLayout();
        const { bannerWidthRatio, bannerIconScale, bannerAnimate = true } = layout;
        const plateKey = banner.plateKey;
        const iconKey = banner.iconKey;

        if (!this.scene.textures.exists(plateKey) || !this.scene.textures.exists(iconKey)) {
            console.warn(`[MarketView] Banner textures missing for rack "${rackId}"`);
            return;
        }

        const container = this.scene.add.container(cx, cy);
        const plate = this.scene.add.image(0, 0, plateKey);
        plate.setOrigin(0.5, 0.5);

        const targetW = sectionWidth * bannerWidthRatio;
        const plateScale = targetW / plate.width;
        plate.setScale(plateScale);

        const icon = this.scene.add.image(0, -6, iconKey);
        icon.setOrigin(0.5, 0.5);
        const iconMul = (banner.iconScale ?? 1) * bannerIconScale;
        const iconScale = plateScale * iconMul;
        icon.setScale(iconScale);

        container.add(plate);
        if (bannerAnimate) {
            this._addBannerSparkles(container, plateScale, bayIndex);
        }
        container.add(icon);
        container.setDepth(2);
        this._inner.add(container);

        if (bannerAnimate) {
            this._animateRackBanner(container, icon, cy, bayIndex, iconScale);
        }
    }

    /** Small twinkles around the plate (like reference banner stars) */
    _addBannerSparkles (container, plateScale, bayIndex) {
        const halfW = plateScale * 95;
        const halfH = plateScale * 38;
        const spots = [
            { x: -halfW * 0.92, y: -halfH * 0.55, size: 5, phase: 0 },
            { x: halfW * 0.88, y: -halfH * 0.45, size: 4, phase: 180 },
            { x: -halfW * 0.55, y: halfH * 0.35, size: 4, phase: 90 },
            { x: halfW * 0.62, y: halfH * 0.4, size: 5, phase: 270 },
            { x: -halfW * 0.2, y: -halfH * 0.75, size: 3, phase: 45 },
            { x: halfW * 0.25, y: -halfH * 0.7, size: 3, phase: 120 },
        ];

        const baseDelay = bayIndex * 65;

        spots.forEach((spot, i) => {
            const sparkle = this.scene.add.graphics();
            this._drawSparkleShape(sparkle, spot.size);
            sparkle.setPosition(spot.x, spot.y);
            sparkle.setAlpha(0);
            sparkle.setScale(0.2);
            container.add(sparkle);

            const cycle = 700 + i * 140;
            this.scene.tweens.add({
                targets: sparkle,
                alpha: 0.95,
                scale: 1.15,
                angle: spot.phase + 90,
                duration: cycle,
                delay: baseDelay + i * 110,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        });
    }

    _drawSparkleShape (graphics, size) {
        graphics.clear();
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(0, 0, size * 0.35);
        graphics.lineStyle(Math.max(1, size * 0.2), 0xfffde8, 0.95);
        graphics.beginPath();
        graphics.moveTo(0, -size);
        graphics.lineTo(0, size);
        graphics.moveTo(-size, 0);
        graphics.lineTo(size, 0);
        graphics.strokePath();
        graphics.lineStyle(Math.max(1, size * 0.15), 0xffffff, 0.7);
        graphics.beginPath();
        graphics.moveTo(-size * 0.7, -size * 0.7);
        graphics.lineTo(size * 0.7, size * 0.7);
        graphics.moveTo(size * 0.7, -size * 0.7);
        graphics.lineTo(-size * 0.7, size * 0.7);
        graphics.strokePath();
    }

    /** Pop-in on banner + gentle icon sway (no plate movement) */
    _animateRackBanner (container, icon, _baseY, bayIndex, iconScale) {
        const stagger = bayIndex * 65;
        container.setScale(0.72);
        container.setAlpha(0);

        this.scene.tweens.add({
            targets: container,
            scale: 1,
            alpha: 1,
            duration: 420,
            delay: stagger,
            ease: 'Back.easeOut',
        });

        icon.setAngle(-15);
        this.scene.tweens.add({
            targets: icon,
            angle: 15,
            duration: 1800,
            delay: stagger + 380,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        this.scene.tweens.add({
            targets: icon,
            scaleX: iconScale * 1.05,
            scaleY: iconScale * 1.05,
            duration: 1800,
            delay: stagger + 520,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    // ── Category label badge ──────────────────────────────────────────────────
    _buildCategoryLabel (cx, cy, category, color) {
        const W = RACK_W;
        const H = LABEL_H;
        const R = 14;

        const bg = this.scene.add.graphics();
        // Drop shadow
        bg.fillStyle(0x000000, 0.2);
        bg.fillRoundedRect(cx - W / 2 + 3, cy - H / 2 + 4, W, H, R);
        // Badge fill
        bg.fillStyle(color);
        bg.fillRoundedRect(cx - W / 2, cy - H / 2, W, H, R);
        // Top shine
        bg.fillStyle(0xffffff, 0.18);
        bg.fillRoundedRect(cx - W / 2, cy - H / 2, W, H * 0.45,
            { tl: R, tr: R, bl: 0, br: 0 });

        this._inner.add(bg);

        const label = this.scene.add.text(cx, cy, category, {
            fontFamily: 'Cause',
            fontSize: '32px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#00000066',
            strokeThickness: 3,
            align: 'center',
        });
        label.setOrigin(0.5, 0.5);
        this._inner.add(label);
    }

    // ── Background image (scrolls with inner, covers full content area) ───────
    _buildBackground (totalW) {
        const bg = this.scene.add.image(totalW / 2, config.height / 2, 'game_bg');
        bg.setDisplaySize(totalW, config.height);
        this._inner.addAt(bg, 0);
    }

    get scrollX ()    { return this._inner.x; }
    get scrollMinX () { return this._minX; }
    get scrollMaxX () { return this._maxX; }

    // ── Driven by WalkingCharacter — call each frame with character's dx ──────
    scrollBy (dx) {
        this._inner.x = Phaser.Math.Clamp(this._inner.x + dx, this._minX, this._maxX);
    }

    scrollTo (x) {
        this._inner.x = Phaser.Math.Clamp(x, this._minX, this._maxX);
    }

    destroy (fromScene) {
        super.destroy(fromScene);
    }
}
