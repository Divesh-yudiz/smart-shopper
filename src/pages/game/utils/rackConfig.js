/**
 * Rack config accessors — data lives in config/marketConfig.js
 */
import { MARKET_LAYOUT, MARKET_RACKS, MARKET_RACK_ORDER } from '../config/marketConfig.js';

const GRID_LAYOUT_KEYS = [
    'productsPerRow', 'shelfRows', 'gridXOffset', 'gridYOffset', 'rowGap', 'rowBottomSpace', 'rows',
];

function resolveGridValue(rack, grid, key) {
    return rack[key] ?? grid[key] ?? MARKET_LAYOUT[key] ?? 0;
}

/**
 * @param {number|number[]|Record<number, number>} rowBottomSpace
 * @param {number} shelfRows
 * @param {number} [fallback]
 * @returns {number[]}
 */
export function normalizeRowBottomSpaces(rowBottomSpace, shelfRows, fallback = 0) {
    if (typeof rowBottomSpace === 'number') {
        return Array.from({ length: shelfRows }, () => rowBottomSpace);
    }
    if (Array.isArray(rowBottomSpace)) {
        return Array.from({ length: shelfRows }, (_, n) => rowBottomSpace[n] ?? fallback);
    }
    if (rowBottomSpace && typeof rowBottomSpace === 'object') {
        return Array.from({ length: shelfRows }, (_, n) =>
            rowBottomSpace[n] ?? rowBottomSpace[`row${n}`] ?? fallback
        );
    }
    return Array.from({ length: shelfRows }, () => fallback);
}

function resolveRowBottomSpace(rack, grid) {
    return rack.rowBottomSpace ?? grid.rowBottomSpace ?? MARKET_LAYOUT.rowBottomSpace ?? 0;
}

function resolveRackGridLayout(rack) {
    const grid = pickGridLayout(rack.layout);
    const resolved = {
        productsPerRow: 4,
        shelfRows: 4,
        gridXOffset: 0,
        gridYOffset: 0,
        rowGap: 0,
        rowBottomSpace: 0,
        ...grid,
    };
    resolved.rowGap = resolveGridValue(rack, grid, 'rowGap');
    resolved.rowBottomSpace = resolveRowBottomSpace(rack, grid);
    resolved.rowBottomSpaces = normalizeRowBottomSpaces(
        resolved.rowBottomSpace,
        resolved.shelfRows,
        0
    );
    if (rack.rows?.length) {
        resolved.rows = rack.rows;
        resolved.shelfRows = rack.rows.length;
    } else if (grid.rows?.length) {
        resolved.rows = grid.rows;
        resolved.shelfRows = grid.rows.length;
    }
    return resolved;
}

function pickGridLayout(layout = {}) {
    return Object.fromEntries(
        GRID_LAYOUT_KEYS.filter((key) => layout[key] !== undefined).map((key) => [key, layout[key]])
    );
}

/** Reads ceilingHeight from rack root (preferred) or legacy placement inside layout */
export function resolveRackCeilingHeight(rack, defaultCeilingHeight) {
    return rack.ceilingHeight ?? rack.layout?.ceilingHeight ?? defaultCeilingHeight;
}

function freezeRack(rack) {
    const gridLayout = resolveRackGridLayout(rack);
    return Object.freeze({
        ...rack,
        ceilingHeight: resolveRackCeilingHeight(rack, MARKET_LAYOUT.ceilingHeight),
        rowGap: gridLayout.rowGap,
        rowBottomSpace: gridLayout.rowBottomSpace,
        layout: Object.freeze(gridLayout),
        products: Object.freeze(
            Object.fromEntries(
                Object.entries(rack.products).map(([key, product]) => [key, Object.freeze({ ...product })])
            )
        ),
    });
}

export const MARKET_CONFIG = Object.freeze({
    racks: Object.freeze(
        Object.fromEntries(
            Object.entries(MARKET_RACKS).map(([id, rack]) => [id, freezeRack(rack)])
        )
    ),
    rackOrder: Object.freeze([...MARKET_RACK_ORDER]),
});

export { MARKET_LAYOUT, MARKET_RACKS, MARKET_RACK_ORDER } from '../config/marketConfig.js';

export const MARKET_LAYOUT_FROZEN = Object.freeze({ ...MARKET_LAYOUT });

/** @returns {typeof MARKET_LAYOUT_FROZEN & { rackStep: number }} */
export function getMarketLayout() {
    const layout = MARKET_LAYOUT_FROZEN;
    return {
        ...layout,
        rackStep: layout.sectionWidth + layout.rackGap,
    };
}

/** @returns {string[]} ordered rack ids */
export function getRackOrder() {
    return [...MARKET_CONFIG.rackOrder];
}

/** @param {string} rackId */
export function getRack(rackId) {
    return MARKET_CONFIG.racks[rackId] ?? null;
}

/** @param {number} index */
export function getRackByIndex(index) {
    const rackId = MARKET_CONFIG.rackOrder[index];
    return rackId ? { id: rackId, ...MARKET_CONFIG.racks[rackId] } : null;
}

/** @param {string} rackId @returns {object[]} product list */
export function getRackProducts(rackId) {
    const rack = getRack(rackId);
    return rack ? Object.values(rack.products) : [];
}

/** @param {string} rackId @param {string} productKey */
export function getProduct(rackId, productKey) {
    const rack = getRack(rackId);
    return rack?.products[productKey] ?? null;
}

/** @param {string} rackId @param {number} productId */
export function getProductById(rackId, productId) {
    const products = getRackProducts(rackId);
    return products.find((p) => p.id === productId) ?? null;
}

/**
 * Builds the rack array consumed by MarketView / ProductRack.
 * @param {string[]} [rackIds] - subset of rack ids; defaults to full rackOrder
 */
export function getRacksForView(rackIds = getRackOrder()) {
    return rackIds
        .map((id) => {
            const rack = getRack(id);
            if (!rack) return null;
            const layout = getMarketLayout();
            return {
                id,
                category: rack.category,
                headerColor: rack.headerColor,
                layout: rack.layout,
                products: getRackProducts(id),
                gapAfter: rack.gapAfter,
                sectionWidth: rack.sectionWidth,
                ceilingHeight: resolveRackCeilingHeight(rack, layout.ceilingHeight),
            };
        })
        .filter(Boolean);
}

/** @param {number} ceilingHeight @param {ReturnType<getMarketLayout>} [layout] */
export function getRackVerticalLayout(ceilingHeight, layout = getMarketLayout()) {
    const rackTopY =
        ceilingHeight + layout.labelTopPadding + layout.labelHeight + layout.labelRackGap + layout.contentOffsetY;
    return {
        ceilingHeight,
        labelCenterY: ceilingHeight + layout.labelTopPadding + layout.labelHeight / 2 + layout.contentOffsetY,
        rackCenterY: rackTopY + layout.rackHeight / 2,
    };
}

/**
 * Computes horizontal positions from rack order, per-rack gaps, and section widths.
 * @param {string[]} [rackIds]
 * @returns {{ placements, contentWidth, scrollWidth, scrollStep }}
 */
export function getRackPlacements(rackIds = getRackOrder()) {
    const layout = getMarketLayout();
    const racks = getRacksForView(rackIds);
    let x = layout.margin;
    const placements = [];

    racks.forEach((rack, i) => {
        const sectionWidth = rack.sectionWidth ?? layout.sectionWidth;
        const ceilingHeight = rack.ceilingHeight;
        const vertical = getRackVerticalLayout(ceilingHeight, layout);
        placements.push({
            ...rack,
            centerX: x + sectionWidth / 2,
            sectionWidth,
            gapAfter: rack.gapAfter ?? layout.rackGap,
            ...vertical,
        });
        x += sectionWidth;
        if (i < racks.length - 1) {
            x += rack.gapAfter ?? layout.rackGap;
        }
    });

    const contentWidth = x + layout.margin;
    const scrollWidth = layout.backgroundWidth ?? contentWidth;

    return {
        placements,
        contentWidth,
        scrollWidth,
        scrollStep: layout.sectionWidth + layout.rackGap,
    };
}
