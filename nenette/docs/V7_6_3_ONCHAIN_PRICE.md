# Nénette AI V7.6.3 On-Chain Price

## Purpose
Provide a live SLX price and liquidity estimate even when DexScreener endpoints return no pair data.

## Source hierarchy
- DexScreener pair endpoint
- DexScreener token endpoint
- QuickSwap V2 pair reserves on Polygon
- Static fallback

## QuickSwap mode
The terminal reads the pair token addresses and reserves, normalizes both token decimals, identifies the SLX side, and calculates the current pool spot ratio. The quote asset is converted to USD through a POL/USD reference.

## Limitations
A constant-product pool spot price can change with trades and does not guarantee the execution price of a large order. Historical volume, transaction counts and percentage changes are not derived from a single reserve snapshot and are therefore displayed as unavailable in on-chain-only mode.
