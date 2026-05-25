import Phaser from 'phaser';
import { getMarketLayout, normalizeRowBottomSpaces } from '../utils/rackConfig.js';

const { rackWidth: RACK_W, rackHeight: RACK_H, productIconScale: ICON_SCALE } = getMarketLayout();
export { RACK_W, RACK_H };
export const ACCENT_H = 10;  // thin coloured bar at top of rack (connects to label)

const DEFAULT_LAYOUT = {
    productsPerRow: 4,
    shelfRows: 4,
    gridXOffset: 0,
    gridYOffset: 0,
    rowGap: 0,
    rowBottomSpace: 0,
};

const SIDE_PAD = 28;
const PROD_GAP = 8;
const PRODUCT_H = 100;
const PLANK_H = 18;

function buildGridLayout(
    { productsPerRow, shelfRows, gridXOffset, gridYOffset, rowGap = 0, rowBottomSpace = 0, rowBottomSpaces },
    rackWidth = RACK_W,
    rackHeight = RACK_H
) {
    const rowBottoms = rowBottomSpaces ?? normalizeRowBottomSpaces(rowBottomSpace, shelfRows, 0);
    const totalRowGaps = Math.max(0, shelfRows - 1) * rowGap;
    const totalRowBottom = rowBottoms.reduce((sum, space) => sum + space, 0);
    const sectionH = (rackHeight - totalRowGaps - totalRowBottom) / shelfRows;
    const productW = (rackWidth - SIDE_PAD * 2 - PROD_GAP * (productsPerRow - 1)) / productsPerRow;
    const colX = Array.from({ length: productsPerRow }, (_, i) =>
        -(rackWidth / 2) + SIDE_PAD + productW / 2 + i * (productW + PROD_GAP) + gridXOffset
    );
    const rowY = (n) => {
        const rowTop = -(rackHeight / 2) + n * (sectionH + rowGap);
        return rowTop + sectionH - rowBottoms[n] - PRODUCT_H / 2 + gridYOffset;
    };
    return { productsPerRow, shelfRows, productW, sectionH, colX, rowY, rowGap, rowBottomSpaces: rowBottoms };
}

// ─── Colour palette ───────────────────────────────────────────────────────────
const PALETTE = [0xE74C3C, 0xF39C12, 0x27AE60, 0x2980B9, 0x8E44AD, 0xE67E22, 0x16A085, 0xC0392B, 0xD35400];

function defaultProducts(category, count) {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        label: `${category} ${i + 1}`,
        price: +(Math.random() * 4 + 0.5).toFixed(2),
        color: PALETTE[i % PALETTE.length],
    }));
}

// ─── ProductRack ─────────────────────────────────────────────────────────────
/**
 * A vertical rack column — 600 × 840 px — containing a 3 × 3 product grid.
 * The category label badge is rendered above by MarketView.
 *
 * @param {Phaser.Scene} scene
 * @param {number} x  world centre X
 * @param {number} y  world centre Y
 * @param {object} opts
 *   @param {string}   opts.category
 *   @param {number}   opts.headerColor    - accent bar tint
 *   @param {object}   opts.layout         - per-rack grid overrides from rackConfig
 *   @param {Array}    opts.products
 *   @param {Function} opts.onProductClick - (product) => void
 */
export default class ProductRack extends Phaser.GameObjects.Container {
    constructor(scene, x, y, {
        category = 'Products',
        headerColor = 0x3498DB,
        layout,
        products,
        onProductClick = () => { },
    } = {}) {
        super(scene, x, y);
        scene.add.existing(this);

        const layoutConfig = { ...DEFAULT_LAYOUT, ...layout };
        if (layoutConfig.rows?.length) {
            layoutConfig.shelfRows = layoutConfig.rows.length;
        }
        this._layout = buildGridLayout(layoutConfig);
        this._onProductClick = onProductClick;

        const productMap = products ?? defaultProducts(category, this._layout.shelfRows * this._layout.productsPerRow);
        if (layoutConfig.rows?.length) {
            this._buildRowProducts(productMap, layoutConfig.rows, layoutConfig.gridXOffset ?? 0);
        } else {
            this._buildGridProducts(Array.isArray(productMap) ? productMap : Object.values(productMap));
        }
    }

    _buildGridProducts(products) {
        const { shelfRows, productsPerRow, colX, rowY, productW } = this._layout;
        const max = shelfRows * productsPerRow;
        products.slice(0, max).forEach((product, index) => {
            const col = index % productsPerRow;
            const row = Math.floor(index / productsPerRow);
            this.add(this._createCard(product, colX[col], rowY(row), productW, this._layout.sectionH));
        });
    }

    /**
     * One product type per shelf row, repeated `count` times left → right.
     * @param {object} productMap — products keyed by product id (e.g. lollipop)
     * @param {Array<{ product: string, count: number, gap?: number }>} rows
     */
    _buildRowProducts(productMap, rows, gridXOffset = 0) {
        const catalog = Array.isArray(productMap)
            ? Object.fromEntries(productMap.map((p, i) => [i, p]))
            : productMap;
        const { rowY, sectionH, rackWidth } = this._layout;

        rows.forEach((rowCfg, rowIndex) => {
            const product = catalog[rowCfg.product];
            if (!product) return;

            const count = Math.max(1, rowCfg.count ?? 1);
            const gap = rowCfg.gap ?? PROD_GAP;
            const rowWidth = rackWidth - SIDE_PAD * 2;
            const slotW = count > 1 ? (rowWidth - gap * (count - 1)) / count : rowWidth;
            const startX = -(rackWidth / 2) + SIDE_PAD + slotW / 2 + gridXOffset;
            const cy = rowY(rowIndex);

            for (let i = 0; i < count; i++) {
                const cx = startX + i * (slotW + gap);
                this.add(this._createCard(product, cx, cy, slotW, sectionH));
            }
        });
    }

    _createCard(product, cx, cy, productW, sectionH) {
        const container = this.scene.add.container(cx, cy);
        const iconSize = Math.min(productW - 4, sectionH * 0.82) * ICON_SCALE;

        if (product.textureKey && this.scene.textures.exists(product.textureKey)) {
            const img = this.scene.add.image(0, 0, product.textureKey);
            img.setDisplaySize(iconSize, iconSize);
            container.add(img);
        }

        const hitZone = this.scene.add.rectangle(0, 0, productW, PRODUCT_H, 0, 0);
        hitZone.setInteractive({ useHandCursor: true });
        container.add(hitZone);

        let ptrDownX = 0, ptrDownY = 0;

        hitZone.on('pointerover', () => {
            this.scene.tweens.add({ targets: container, scaleX: 1.08, scaleY: 1.08, duration: 80, ease: 'Quad.easeOut' });
        });
        hitZone.on('pointerout', () => {
            this.scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 80, ease: 'Quad.easeOut' });
        });
        hitZone.on('pointerdown', (ptr) => {
            ptrDownX = ptr.x; ptrDownY = ptr.y;
            this.scene.tweens.add({ targets: container, scaleX: 0.93, scaleY: 0.93, duration: 55 });
        });
        hitZone.on('pointerup', (ptr) => {
            this.scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 90, ease: 'Elastic.easeOut', easeParams: [1.2, 0.8] });
            if (Math.abs(ptr.x - ptrDownX) + Math.abs(ptr.y - ptrDownY) < 20) {
                this._onProductClick(product);
            }
        });

        return container;
    }
}
