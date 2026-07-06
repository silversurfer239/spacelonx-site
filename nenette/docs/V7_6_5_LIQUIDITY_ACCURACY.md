# V7.6.5 Liquidity Accuracy Patch

This patch corrects liquidity terminology and separates three concepts that must not be conflated:

1. **Spot valuation**: wallet balance multiplied by the current pool spot price.
2. **Estimated exit proceeds**: constant-product output for a specific simulated sale.
3. **Current quote reserve**: the pool's present quote-token balance, which is an upper bound for direct output rather than guaranteed proceeds.

Every trade changes the pool reserve ratio. Therefore, the current quote reserve must never be described as liquidity available at a fixed price or as an amount obtainable before market movement.

## Risk bands
- `EXTREME EXIT RISK`: severe reserve imbalance, full-exit shortfall of at least 80%, or 10%-wallet shortfall of at least 30%.
- `HIGH EXIT RISK`: wallet value exceeds pool liquidity or severe execution shortfall.
- `ELEVATED EXIT RISK`: material execution constraints.
- `LIQUIDITY WATCH`: moderate depth constraints.
- `MANAGEABLE`: none of the configured thresholds are breached.

All simulations remain read-only and exclude gas, MEV, routing, other pools, market movement and token transfer mechanics.
