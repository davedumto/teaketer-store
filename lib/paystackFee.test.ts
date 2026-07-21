import { describe, it, expect } from "vitest";
import { calculatePaystackFee } from "./paystackFee";

describe("calculatePaystackFee", () => {
  it("returns 0 for a zero amount", () => {
    expect(calculatePaystackFee(0)).toBe(0);
  });

  it("returns 0 for a negative amount", () => {
    expect(calculatePaystackFee(-100_000)).toBe(0);
  });

  it("waives the ₦100 flat fee just under the ₦2,500 threshold", () => {
    // ₦2,499.99 -> 1.5% only, no flat fee
    const amount = 249_999;
    expect(calculatePaystackFee(amount)).toBe(Math.round(amount * 0.015));
  });

  it("applies the flat fee exactly at the ₦2,500 threshold", () => {
    const amount = 250_000; // ₦2,500
    expect(calculatePaystackFee(amount)).toBe(Math.round(amount * 0.015) + 10_000);
  });

  it("computes 1.5% + ₦100 for a typical order above the threshold", () => {
    const amount = 1_000_000; // ₦10,000
    // 1.5% of 1,000,000 = 15,000 + 10,000 flat = 25,000
    expect(calculatePaystackFee(amount)).toBe(25_000);
  });

  it("caps the fee at ₦2,000 for large orders", () => {
    const amount = 50_000_000; // ₦500,000 — well past the cap
    expect(calculatePaystackFee(amount)).toBe(200_000);
  });

  it("caps the fee exactly at the boundary where 1.5% + flat first exceeds ₦2,000", () => {
    // Uncapped fee = amount * 0.015 + 10,000. Cap kicks in once uncapped > 200,000.
    // amount * 0.015 = 190,000 -> amount ≈ 12,666,667 kobo
    const justBelowCap = 12_600_000; // uncapped ≈ 199,000 -> under cap
    const justAboveCap = 12_700_000; // uncapped ≈ 200,500 -> over cap

    expect(calculatePaystackFee(justBelowCap)).toBeLessThan(200_000);
    expect(calculatePaystackFee(justAboveCap)).toBe(200_000);
  });

  it("rounds to the nearest kobo", () => {
    const amount = 333_333; // produces a fractional percentage fee
    const expectedUncapped = Math.round(amount * 0.015) + 10_000;
    expect(calculatePaystackFee(amount)).toBe(expectedUncapped);
  });
});
