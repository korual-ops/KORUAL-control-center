export type MarginInput = {
  purchaseCost: number;
  shippingCost: number;
  customsVat: number;
  platformFeeRate: number;
  paymentFeeRate: number;
  adCost: number;
  targetMarginRate: number;
};

export type MarginResult = {
  totalLandedCost: number;
  estimatedFees: number;
  recommendedSellingPrice: number;
  expectedNetProfit: number;
};

export function calculateMargin(input: MarginInput): MarginResult {
  const totalLandedCost = input.purchaseCost + input.shippingCost + input.customsVat + input.adCost;
  const variableFeeRate = input.platformFeeRate + input.paymentFeeRate;
  const denominator = 1 - variableFeeRate - input.targetMarginRate;

  if (denominator <= 0) {
    throw new Error("Target margin and fee rates leave no room for pricing.");
  }

  const rawPrice = totalLandedCost / denominator;
  const recommendedSellingPrice = Math.ceil(rawPrice / 100) * 100;
  const estimatedFees = Math.round(recommendedSellingPrice * variableFeeRate);
  const expectedNetProfit = recommendedSellingPrice - totalLandedCost - estimatedFees;

  return { totalLandedCost, estimatedFees, recommendedSellingPrice, expectedNetProfit };
}
