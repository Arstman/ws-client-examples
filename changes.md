# 2018-10-03
 + Added private channels (only YOUR orders and trades for all currency pairs for convenience):
   -  PRIVATE_SUBSCRIBE_ORDER_RAW;
   -  PRIVATE_SUBSCRIBE_TRADE;
   -  PRIVATE_UNSUBSCRIBE;
 + Added private api requests:
   -  WALLET_ADDRESS;
   -  WITHDRAWAL_COIN;
   -  WITHDRAWAL_PAYEER;
   -  WITHDRAWAL_CAPITALIST;
   -  WITHDRAWAL_ADVCASH;

# 2018-08-31
 + Added private api requests:
   - CLIENT_ORDER;
   - COMMISSION;
   - COMMISSION_COMMON_INFO;
   - TRADE_HISTORY;
   - MARKET_ORDER;
# 2018-08-15
 + Added private api TRADES and CLIENT_ORDERS requests
 + Request rate limit is now separated from REST api and increased

# 2018-08-09
 + Added private api BALANCE and BALANCES requests
 + Added private api LAST_TRADES request
 * Refreshed python example
 * "Breaking change": Changed type of `sign` field of `WsRequestMetaData` from `string` to `bytes` (you can still use `deprecatedSign`, which is string)

# 2018-08-08
 + Added c# and java examples

# 2019-04-17
 + Added private balance notification channel (SUBSCRIBE_BALANCE_CHANGE)
