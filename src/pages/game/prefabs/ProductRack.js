import Phaser from 'phaser';
import { UI_TEXTURE_KEYS } from '../config/componentAssets.js';
import { getShelfRowsForRack } from '../config/shelfLayouts.js';
import config from '../utils/config.js';
import { getMarketLayout, normalizeRowBottomSpaces } from '../utils/rackConfig.js';

const { rackWidth: RACK_W, rackHeight: RACK_H, productIconScale: DEFAULT_ICON_SCALE } = getMarketLayout();
export { RACK_W, RACK_H };

const DEFAULT_LAYOUT = {
    productsPerRow: 4,
    shelfRows: 4,
    gridXOffset: 0,
    gridYOffset: 0,
    rowGap: 0,
    rowBottomSpace: 0,
    insetLeft: 50,
    insetRight: 36,
    shelfSurfaceInset: 10,
    rowYAdjust: [],
    rowXAdjust: [],
    iconScale: null,
    shelfHeightFactor: 0.88,
    iconAspect: 1,
    iconSlotFill: 0.92,
    spreadFullBay: false,
    rowSidePad: 24,
};

const PROD_GAP = 6;

/** Price-Base.png */
const PRICE_TAG_NATIVE_W = 85;
const PRICE_TAG_NATIVE_H = 33;
/** Default hang below shelf plank; lower = up, higher = down (per-row override in shelfLayouts.js) */
const DEFAULT_PRICE_TAG_OFFSET_Y = 10;

function formatShelfPrice (price) {
    if (price === null || price === undefined) return '-';
    return `AED ${Math.round(Number(price))}`;
}

function buildGridLayout (
    {
        productsPerRow,
        shelfRows,
        gridXOffset = 0,
        gridYOffset = 0,
        rowGap = 0,
        rowBottomSpace = 0,
        rowBottomSpaces,
        insetLeft = 50,
        insetRight = 36,
        shelfSurfaceInset = 10,
        rowYAdjust = [],
        rowXAdjust = [],
        iconScale,
        shelfHeightFactor = 0.88,
        iconAspect = 1,
        iconSlotFill = 0.92,
        spreadFullBay = false,
        rowSidePad = 24,
        shelfPlankOffset,
    },
    rackWidth = RACK_W,
    rackHeight = RACK_H
) {
    const rowBottoms = rowBottomSpaces ?? normalizeRowBottomSpaces(rowBottomSpace, shelfRows, 0);
    const totalRowGaps = Math.max(0, shelfRows - 1) * rowGap;
    const totalRowBottom = rowBottoms.reduce((sum, space) => sum + space, 0);
    const sectionH = (rackHeight - totalRowGaps - totalRowBottom) / shelfRows;
    const usableW = rackWidth - insetLeft - insetRight;
    const productW = (usableW - PROD_GAP * (productsPerRow - 1)) / productsPerRow;
    const colX = Array.from({ length: productsPerRow }, (_, i) =>
        -(rackWidth / 2) + insetLeft + productW / 2 + i * (productW + PROD_GAP) + gridXOffset
    );

    const plankOffset = shelfPlankOffset;

    /** Y where product bottom sits (on shelf plank). */
    const rowY = (n) => {
        const rowTop = -(rackHeight / 2) + n * (sectionH + rowGap);
        const plankLine = rowTop + sectionH - rowBottoms[n] - shelfSurfaceInset;
        if (plankOffset != null) {
            return plankLine + plankOffset + (rowYAdjust[n] ?? 0) + gridYOffset;
        }
        const adjust = rowYAdjust[n] ?? 0;
        return plankLine + adjust + gridYOffset;
    };

    return {
        rackWidth,
        rackHeight,
        productsPerRow,
        shelfRows,
        productW,
        sectionH,
        colX,
        rowY,
        rowGap,
        rowBottomSpaces: rowBottoms,
        rowYAdjust,
        rowXAdjust,
        insetLeft,
        insetRight,
        gridXOffset,
        iconScale: iconScale ?? DEFAULT_ICON_SCALE,
        shelfHeightFactor,
        iconAspect,
        iconSlotFill,
        spreadFullBay,
        rowSidePad,
        shelfPlankOffset,
    };
}

const PALETTE = [0xE74C3C, 0xF39C12, 0x27AE60, 0x2980B9, 0x8E44AD, 0xE67E22, 0x16A085, 0xC0392B, 0xD35400];

function normalizeProductMap (products, category, count) {
    if (!products) return defaultProducts(category, count);
    if (Array.isArray(products)) {
        const map = {};
        products.forEach((p) => {
            if (p.key) map[p.key] = p;
        });
        return Object.keys(map).length ? map : Object.fromEntries(products.map((p, i) => [i, p]));
    }
    return products;
}

function defaultProducts (category, count) {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        label: `${category} ${i + 1}`,
        price: +(Math.random() * 4 + 0.5).toFixed(2),
        color: PALETTE[i % PALETTE.length],
    }));
}

export default class ProductRack extends Phaser.GameObjects.Container {
    constructor(scene, x, y, {
        rackId,
        category = 'Products',
        layout,
        products,
        onProductClick = () => { },
    } = {}) {
        super(scene, x, y);
        scene.add.existing(this);

        const layoutConfig = { ...DEFAULT_LAYOUT, ...layout };
        if (layoutConfig.rows?.length) {
            const mappedMax = layoutConfig.rows.reduce(
                (max, row, i) => Math.max(max, (row.shelfRow ?? i) + 1),
                layoutConfig.rows.length
            );
            const explicitRows = layoutConfig.shelfRows;
            layoutConfig.shelfRows =
                explicitRows != null && explicitRows >= mappedMax ? explicitRows : mappedMax;
        }
        this._layout = buildGridLayout(layoutConfig);
        this._rackId = rackId;
        this._onProductClick = onProductClick;
        this._pendingShelfTags = [];

        const productMap = normalizeProductMap(products, category, this._layout.shelfRows * this._layout.productsPerRow);
        const shelfRows = layoutConfig.rows?.length
            ? layoutConfig.rows
            : (rackId ? getShelfRowsForRack(rackId) : []);

        if (shelfRows.length) {
            this._buildRowProducts(productMap, shelfRows);
        } else {
            this._buildGridProducts(Array.isArray(productMap) ? productMap : Object.values(productMap));
        }

        this._tagLayer = scene.add.container(0, 0);
        this.add(this._tagLayer);
        this._flushShelfPriceTags();
    }

    _rowSpan (layout) {
        const { insetLeft, insetRight, rackWidth, gridXOffset, spreadFullBay, rowSidePad = 24 } = layout;
        if (spreadFullBay) {
            const padL = layout.rowSidePadLeft ?? rowSidePad;
            const padR = layout.rowSidePadRight ?? rowSidePad;
            const usableW = rackWidth - padL - padR;
            return { usableW, startX: -(rackWidth / 2) + padL + gridXOffset };
        }
        const usableW = rackWidth - insetLeft - insetRight;
        return { usableW, startX: -(rackWidth / 2) + insetLeft + gridXOffset };
    }

    _buildGridProducts (products) {
        const { shelfRows, productsPerRow, colX, rowY, productW } = this._layout;
        const max = shelfRows * productsPerRow;
        const rowCenterX = (colX[0] + colX[productsPerRow - 1]) / 2;

        for (let row = 0; row < shelfRows; row++) {
            const rowProducts = [];
            for (let col = 0; col < productsPerRow; col++) {
                const index = row * productsPerRow + col;
                if (index >= max) break;
                rowProducts.push(products[index]);
            }
            if (!rowProducts.length) continue;

            rowProducts.forEach((product, col) => {
                this.add(this._createCard(product, colX[col], rowY(row), productW, this._layout.sectionH));
            });
            this._queueShelfRowPriceTag(rowCenterX, rowY(row), rowProducts[0]);
        }
    }

    _buildRowProducts (productMap, rows) {
        const catalog = productMap;
        const layout = this._layout;
        const { rowY, sectionH } = layout;
        const { usableW, startX: rowStartX } = this._rowSpan(layout);

        const rowXAdjust = layout.rowXAdjust ?? [];

        rows.forEach((rowCfg, rowIndex) => {
            if (rowCfg.skip) return;

            const shelfRowIndex = rowCfg.shelfRow ?? rowIndex;
            const shelfY = rowY(shelfRowIndex) + (rowCfg.offsetY ?? 0);
            const rowOffsetX = (rowCfg.offsetX ?? 0) + (rowXAdjust[shelfRowIndex] ?? 0);

            if (rowCfg.stacks?.length) {
                this._buildMixedShelfRow(
                    catalog,
                    rowCfg.stacks,
                    shelfY,
                    sectionH,
                    usableW,
                    rowStartX + rowOffsetX,
                    rowCfg.gap,
                    rowCfg
                );
                return;
            }

            const product = catalog[rowCfg.product];
            if (!product) {
                console.warn(`[ProductRack] Unknown product "${rowCfg.product}" on shelf ${rowIndex}`);
                return;
            }

            const count = Math.max(1, rowCfg.count ?? 1);
            const gap = rowCfg.gap ?? PROD_GAP;
            const slotW = count > 1 ? (usableW - gap * (count - 1)) / count : usableW;
            const startX = rowStartX + slotW / 2;

            for (let i = 0; i < count; i++) {
                const cx = startX + i * (slotW + gap);
                this.add(this._createCard(product, cx, shelfY, slotW, sectionH, rowCfg));
            }

            this._queueShelfRowPriceTag(rowStartX + rowOffsetX + usableW / 2, shelfY, product, rowCfg);
        });
    }

    _buildMixedShelfRow (catalog, stacks, shelfY, sectionH, usableW, rowStartX, gap = PROD_GAP, rowOverrides = {}) {
        const count = stacks.length;
        const slotW = count > 1 ? (usableW - gap * (count - 1)) / count : usableW;
        const startX = rowStartX + slotW / 2;
        const perItemTags =
            rowOverrides.priceTagPerItem === true ||
            this._rackId === 'fruits';

        let rowPriceProduct = null;

        stacks.forEach((entry, i) => {
            const product = catalog[entry.product];
            if (!product) {
                console.warn(`[ProductRack] Unknown product "${entry.product}" in mixed shelf`);
                return;
            }
            if (!rowPriceProduct) rowPriceProduct = product;
            const cx = startX + i * (slotW + gap);
            const perItem = { ...rowOverrides, ...entry };
            this.add(this._createCard(product, cx, shelfY, slotW, sectionH, perItem));

            if (perItemTags) {
                this._queueShelfRowPriceTag(cx, shelfY, product, perItem);
            }
        });

        if (!perItemTags && rowPriceProduct) {
            this._queueShelfRowPriceTag(rowStartX + usableW / 2, shelfY, rowPriceProduct, rowOverrides);
        }
    }

    _createCard (product, cx, shelfY, productW, sectionH, rowOverrides = {}) {
        const container = this.scene.add.container(cx, shelfY);
        const slotW = Number.isFinite(productW) ? productW : RACK_W / 4;
        const scale = rowOverrides.iconScale ?? this._layout.iconScale ?? DEFAULT_ICON_SCALE;
        const heightFactor = rowOverrides.shelfHeightFactor ?? this._layout.shelfHeightFactor ?? 0.88;
        const aspect = rowOverrides.iconAspect ?? this._layout.iconAspect ?? 1;
        const slotFill = rowOverrides.iconSlotFill ?? this._layout.iconSlotFill ?? 0.92;

        const maxH = sectionH * heightFactor * scale;
        const maxW = slotW * slotFill * scale;
        let iconH = Math.max(28, maxH);
        let iconW = Math.max(24, maxW);
        if (aspect > 1) {
            iconW = iconH / aspect;
            if (iconW > maxW) {
                iconW = maxW;
                iconH = iconW * aspect;
            }
        } else if (aspect < 1) {
            iconH = iconW / aspect;
            if (iconH > maxH) {
                iconH = maxH;
                iconW = iconH * aspect;
            }
        }

        if (product.textureKey && this.scene.textures.exists(product.textureKey)) {
            const img = this.scene.add.image(0, 0, product.textureKey);
            img.setOrigin(0.5, 1);
            img.setDisplaySize(iconW, iconH);
            container.add(img);
        } else if (product.textureKey) {
            console.warn(`[ProductRack] Texture not loaded: ${product.textureKey}`);
        }

        const hitH = Math.max(iconH, 40);
        const hitZone = this.scene.add.rectangle(0, -hitH / 2, slotW, hitH, 0, 0);
        hitZone.setInteractive({ useHandCursor: true });
        container.add(hitZone);

        let ptrDownX = 0;
        let ptrDownY = 0;

        hitZone.on('pointerover', () => {
            this.scene.tweens.add({ targets: container, scaleX: 1.06, scaleY: 1.06, duration: 80, ease: 'Quad.easeOut' });
        });
        hitZone.on('pointerout', () => {
            this.scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 80, ease: 'Quad.easeOut' });
        });
        hitZone.on('pointerdown', (ptr) => {
            ptrDownX = ptr.x;
            ptrDownY = ptr.y;
            this.scene.tweens.add({ targets: container, scaleX: 0.94, scaleY: 0.94, duration: 55 });
        });
        hitZone.on('pointerup', (ptr) => {
            this.scene.tweens.add({
                targets: container,
                scaleX: 1,
                scaleY: 1,
                duration: 90,
                ease: 'Elastic.easeOut',
                easeParams: [1.2, 0.8],
            });
            if (Math.abs(ptr.x - ptrDownX) + Math.abs(ptr.y - ptrDownY) < 20) {
                this._onProductClick(product);
            }
        });

        return container;
    }

    _queueShelfRowPriceTag (centerX, shelfY, product, rowCfg = {}) {
        if (!product && rowCfg.price == null) return;
        this._pendingShelfTags.push({ centerX, shelfY, product, rowCfg });
    }

    _flushShelfPriceTags () {
        this._pendingShelfTags.forEach((tag) => this._createShelfRowPriceTag(tag));
        this._pendingShelfTags = [];
    }

    /** One hanging tag per shelf row — Price-Base.png, centered (reference). */
    _createShelfRowPriceTag ({ centerX, shelfY, product, rowCfg }) {
        // rowCfg.price: explicit override; product.price: null means not in API (show '-'); undefined means no data (use default 16)
        const rawPrice = rowCfg.price !== undefined ? rowCfg.price : product?.price;
        const price = rawPrice === undefined ? 16 : rawPrice;
        const tagOffsetY = rowCfg.priceTagOffsetY ?? DEFAULT_PRICE_TAG_OFFSET_Y;
        const tagY = shelfY + tagOffsetY;

        const tagContainer = this.scene.add.container(centerX, tagY);

        const tag = this.scene.add.image(0, 0, UI_TEXTURE_KEYS.shelfPriceBase);
        tag.setOrigin(0.5, 0.5);
        tag.setDisplaySize(PRICE_TAG_NATIVE_W, PRICE_TAG_NATIVE_H);
        tagContainer.add(tag);

        const label = this.scene.add.text(0, -1, formatShelfPrice(price), {
            fontFamily: config.fonts.text,
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#1e3a5f',
            align: 'center',
        });
        label.setOrigin(0.5, 0.5);
        tagContainer.add(label);

        this._tagLayer.add(tagContainer);
    }
}
