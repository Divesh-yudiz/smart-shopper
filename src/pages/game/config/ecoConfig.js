/**
 * Eco-impact product variants — every shop item can be bought as a cheaper,
 * higher-eco-impact pick, or a costlier, lower-eco-impact ("eco-friendly") pick.
 */

export const ECO_PRICE_MULTIPLIER = 1.5;   // eco-friendly price = standard price * this (rounded up)
export const ECO_STANDARD_IMPACT = -3;     // eco meter delta per unit for the cheap/high-impact pick
export const ECO_FRIENDLY_IMPACT = 8;      // eco meter delta per unit for the costly/low-impact pick

const standardDescription = (label) => `${label} — regular packaging & sourcing, budget-friendly price.`;
const ecoDescription = (label) => `${label} — eco-friendly, recyclable packaging & sustainable sourcing.`;

/**
 * Builds the { standard, eco } variant pair for a shelf product.
 * Both variants keep the base product's `key`/`textureKey` so shopping-list
 * matching and cart-API resolution work unchanged regardless of which is bought.
 * @param {object} baseProduct
 * @param {{standard: object|null, eco: object|null}|null} [apiVariants] — real
 *   price/ecoImpact/description from the API (gameApi.getItemVariants). When a
 *   side is missing (offline/demo mode, or that item has no API entry yet) it
 *   falls back to the computed multiplier/description.
 */
export function buildEcoVariantPair (baseProduct, apiVariants = null) {
    if (!baseProduct) return null;
    const label = baseProduct.label ?? 'Product';
    const apiStandard = apiVariants?.standard;
    const apiEco = apiVariants?.eco;

    const standardPrice = apiStandard?.price ?? baseProduct.price ?? 0;
    const ecoPrice = apiEco?.price
        ?? Math.max(standardPrice + 1, Math.round(standardPrice * ECO_PRICE_MULTIPLIER));

    return {
        standard: {
            ...baseProduct,
            price: standardPrice,
            ecoImpact: apiStandard?.ecoImpact ?? ECO_STANDARD_IMPACT,
            isEcoVariant: false,
            description: apiStandard?.description || standardDescription(label),
        },
        eco: {
            ...baseProduct,
            price: ecoPrice,
            ecoImpact: apiEco?.ecoImpact ?? ECO_FRIENDLY_IMPACT,
            isEcoVariant: true,
            description: apiEco?.description || ecoDescription(label),
        },
    };
}
