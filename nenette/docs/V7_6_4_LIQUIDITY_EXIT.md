# V7.6.4 Liquidity & Exit Simulator

## Objective
Separate spot valuation from practical exit value when SLX liquidity is thin.

## Direct-pool estimate
For an SLX sale amount `dx`, the simulator uses the current QuickSwap V2 reserves and a configurable fee assumption:

- `effectiveInput = dx × (1 - fee)`
- `quoteOut = quoteReserve × effectiveInput / (slxReserve + effectiveInput)`

The USD estimate is `quoteOut × quotePriceUsd`.

## Metrics
- Spot value before pool impact.
- Estimated quote-token output.
- Estimated USD proceeds.
- Average execution price.
- Execution loss versus spot value.
- Post-trade spot price.
- Pool price impact.
- Wallet spot value relative to total pool liquidity.
- Wallet SLX balance relative to the pool's SLX reserve.

## Readiness scoring
When exit liquidity is weak, the wallet score is capped and the status becomes `LIQUIDITY WATCH`, `EXIT WATCH` or `HIGH EXIT RISK`.

## Limitations
This is not a router quote and does not account for gas, MEV, other pools, routing, transfer taxes, market movement or transaction failure. No transaction is built or signed.
