import { describe, it, expect } from "vitest";
import { computeSplit } from "./commerce";

describe("computeSplit", () => {
  it("takes only the platform fee when there's no affiliate", () => {
    const result = computeSplit(1_000_000, 500, 1500, false);
    // 5% platform fee, no affiliate share
    expect(result).toEqual({
      platformFeeAmount: 50_000,
      affiliateAmount: 0,
      vendorAmount: 950_000,
    });
  });

  it("splits platform fee and affiliate commission when there is an affiliate", () => {
    const result = computeSplit(1_000_000, 500, 1500, true);
    expect(result).toEqual({
      platformFeeAmount: 50_000,
      affiliateAmount: 150_000,
      vendorAmount: 800_000,
    });
  });

  it("always satisfies the invariant: platformFee + affiliate + vendor === total", () => {
    const cases: Array<[number, number, number, boolean]> = [
      [1_000_000, 500, 1500, true],
      [1_000_000, 500, 1500, false],
      [1, 500, 1500, true],
      [999, 333, 4999, true],
      [10_000_000, 0, 5000, true],
      [10_000_000, 10000, 5000, true],
    ];
    for (const [total, platformBps, commissionBps, hasAffiliate] of cases) {
      const { platformFeeAmount, affiliateAmount, vendorAmount } = computeSplit(
        total,
        platformBps,
        commissionBps,
        hasAffiliate
      );
      expect(platformFeeAmount + affiliateAmount + vendorAmount).toBe(total);
    }
  });

  it("handles 0% platform commission", () => {
    const result = computeSplit(1_000_000, 0, 1500, true);
    expect(result.platformFeeAmount).toBe(0);
    expect(result.affiliateAmount).toBe(150_000);
    expect(result.vendorAmount).toBe(850_000);
  });

  it("handles 100% platform commission — vendor and affiliate get nothing", () => {
    const result = computeSplit(1_000_000, 10000, 1500, true);
    expect(result.platformFeeAmount).toBe(1_000_000);
    expect(result.affiliateAmount).toBe(0);
    expect(result.vendorAmount).toBe(0);
  });

  it("caps affiliate commission so it never pushes vendorAmount negative", () => {
    // platform 90% + affiliate would-be 50% must be capped to the remaining 10%
    const result = computeSplit(1_000_000, 9000, 5000, true);
    expect(result.platformFeeAmount).toBe(900_000);
    expect(result.affiliateAmount).toBe(100_000); // capped, not 500,000
    expect(result.vendorAmount).toBe(0);
  });

  it("rounds using Math.round semantics for fractional bps math", () => {
    const result = computeSplit(333, 500, 1500, true);
    // 333 * 0.05 = 16.65 -> rounds to 17
    expect(result.platformFeeAmount).toBe(17);
  });

  it("handles a total of 0", () => {
    const result = computeSplit(0, 500, 1500, true);
    expect(result).toEqual({ platformFeeAmount: 0, affiliateAmount: 0, vendorAmount: 0 });
  });
});
