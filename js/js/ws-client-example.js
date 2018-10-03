"use strict";

window.onload = function() {

    var MY_API_KEY = "sTaMP6f2zMdhjKQva7SSaZENStXx2kbk";
    var MY_SECRET_KEY = "z4TJJqYTgWqy2KGxuD14TUpddZmVRHxR";

    protobuf.load("js/wsApi.proto", function (err, root) {
        var socket = connect("wss://ws.api.livecoin.net/ws/beta2");
        socket.onopen = function () {
            console.log("Connection established.");
            login("login", MY_API_KEY, MY_SECRET_KEY, 300000);
            tickerSubscribe("token","BTC/USD", null);
            orderBookSubscribe("token1", "BTC/USD", 1);
            rawOrderBookSubscribe("token2", "BTC/USD", 0);
            tradeSubscribe("token3", "BTC/USD");
            candleSubscribe("token4", "BTC/USD", "1m", 0);
            setTimeout(function () {
                var UnsubscribeRequest = root.lookupType("protobuf.ws.UnsubscribeRequest");
                unsubscribe("token5",UnsubscribeRequest.ChannelType.CANDLE,"BTC/USD");
                var PrivateUnsubscribeRequest = root.lookupType("protobuf.ws.PrivateUnsubscribeRequest");
                privateChannelUnsubscribe("token5",MY_SECRET_KEY, 30000, PrivateUnsubscribeRequest.ChannelType.PRIVATE_ORDER_RAW)
            }, 30000);
            setTimeout(disconnect, 140000)
            //here you can make your trade decision
        };

        var doMessage = function(token, subscriptionPayload, lookupTypeValue, msgType) {
            var Message = root.lookupType(lookupTypeValue);
            var subscriptionError = Message.verify(subscriptionPayload);
            if(subscriptionError) {
                console.log(subscriptionError);
                throw Error(subscriptionError);
            }
            var subscriptionMessage = Message.create(subscriptionPayload);
            var subscriptionBuffer = Message.encode(subscriptionMessage).finish();


            var WsRequestMeta = root.lookupType("protobuf.ws.WsRequestMetaData");
            var metaPayload = {
                requestType: msgType,
                token: token,
                sign: null
            };
            var metaError = WsRequestMeta.verify(metaPayload);
            if (metaError) {
                console.log(metaError);
                throw Error(metaError);
            }
            var metaMessage = WsRequestMeta.create(metaPayload);

            var WsRequest = root.lookupType("protobuf.ws.WsRequest");
            var requestPayload = {
                meta: metaMessage,
                msg: subscriptionBuffer
            };
            var requestError = WsRequest.verify(requestPayload);
            if (requestError) {
                console.log(requestError);
                throw Error(requestError);
            }
            var requestMessage = WsRequest.create(requestPayload);
            var request = WsRequest.encode(requestMessage).finish();
            socket.send(request);
        };

        var tickerSubscribe = function (token, cp, frequency) {
            var subscriptionPayload = {
                currencyPair: cp,
                frequency: frequency
            };
            var WsRequestMeta = root.lookupType("protobuf.ws.WsRequestMetaData");

            doMessage(token, subscriptionPayload, "protobuf.ws.SubscribeTickerChannelRequest", WsRequestMeta.WsRequestMsgType.SUBSCRIBE_TICKER)
        };

        var orderBookSubscribe = function (token, cp, depth) {
            var WsRequestMeta = root.lookupType("protobuf.ws.WsRequestMetaData");
            var subscriptionPayload = {
                currencyPair: cp,
                frequency: depth
            };
            doMessage(token, subscriptionPayload, "protobuf.ws.SubscribeOrderBookChannelRequest", WsRequestMeta.WsRequestMsgType.SUBSCRIBE_ORDER_BOOK);
        };
        var rawOrderBookSubscribe = function (token, cp, depth) {
            var WsRequestMeta = root.lookupType("protobuf.ws.WsRequestMetaData");
            var subscriptionPayload = {
                currencyPair: cp,
                frequency: depth
            };
            doMessage(token, subscriptionPayload, "protobuf.ws.SubscribeOrderBookRawChannelRequest", WsRequestMeta.WsRequestMsgType.SUBSCRIBE_ORDER_BOOK_RAW);
        };
        var tradeSubscribe = function (token, cp) {
            var WsRequestMeta = root.lookupType("protobuf.ws.WsRequestMetaData");
            var subscriptionPayload = {
                currencyPair: cp
            };
            doMessage(token, subscriptionPayload, "protobuf.ws.SubscribeTradeChannelRequest", WsRequestMeta.WsRequestMsgType.SUBSCRIBE_TRADE);
        };
        var candleSubscribe = function(token, cp, interval, depth) {
            var WsRequestMeta = root.lookupType("protobuf.ws.WsRequestMetaData");
            var CandleChannelRequest = root.lookupType("protobuf.ws.SubscribeCandleChannelRequest");
            var subscriptionPayload = {
                currencyPair: cp,
                interval: CandleChannelRequest.CandleInterval.CANDLE_1_MINUTE,
                depth: depth === null ? depth : 0
            };
            doMessage(token, subscriptionPayload, "protobuf.ws.SubscribeCandleChannelRequest", WsRequestMeta.WsRequestMsgType.SUBSCRIBE_CANDLE);
        };
        var unsubscribe = function(token, channelType, cp) {
            var WsRequestMeta = root.lookupType("protobuf.ws.WsRequestMetaData");
            var subscriptionPayload = {
                channelType: channelType,
                currencyPair: cp
            };
            doMessage(token, subscriptionPayload, "protobuf.ws.UnsubscribeRequest", WsRequestMeta.WsRequestMsgType.UNSUBSCRIBE);
        };

        var doPrivateMessage = function(secretKey, token, msgPayload, lookupTypeValue, msgType) {

            var PrivateRequest = root.lookupType(lookupTypeValue);

            var privateMsgErr = PrivateRequest.verify(msgPayload);

            if (privateMsgErr) {
                throw Error(privateMsgErr);
            }
            var privateRequest = PrivateRequest.encode(
                PrivateRequest.create(msgPayload)).finish();
            var WsRequestMetaData = root.lookupType("protobuf.ws.WsRequestMetaData");
            var preparedMsg = byteArrayToWordArray(privateRequest);
            var keyArray = stringToByteArray(secretKey);
            var preparedKey = byteArrayToWordArray(keyArray);
            var hash = CryptoJS.HmacSHA256(preparedMsg, preparedKey);
            var sign = wordArrayToByteArray(hash);
            var metaPayload = {
                requestType: msgType,
                token: token,
                sign: sign
            };
            var metaErr = WsRequestMetaData.verify(metaPayload);
            if(metaErr) {
                throw Error(metaErr);
            }
            var WsRequest = root.lookupType("protobuf.ws.WsRequest");
            var requestPayload = {
                meta: WsRequestMetaData.create(metaPayload),
                msg: privateRequest
            };
            var requestErr = WsRequest.verify(requestPayload);
            if (requestErr) {
                throw Error(requestErr);
            }
            socket.send(WsRequest.encode(WsRequest.create(requestPayload)).finish())
        };

        var login = function(token, apiKey, secretKey, ttl){
            var RequestExpired = root.lookupType("protobuf.ws.RequestExpired");
            var expiredPayload = {
                now:Date.now(),
                ttl:ttl
            };
            var err = RequestExpired.verify(expiredPayload);
            if(err) {
                throw Error(err)
            }

            var WsRequestMetaData = root.lookupType("protobuf.ws.WsRequestMetaData");
            var requestExpired = RequestExpired.create(expiredPayload);
            var requestType = WsRequestMetaData.WsRequestMsgType.LOGIN;


            var loginPayload = {
                expireControl: requestExpired,
                apiKey: apiKey
            };

            doPrivateMessage(secretKey, token, loginPayload, "protobuf.ws.LoginRequest", requestType)
        };
        var putLimitOrder = function(token, secretKey, cp, orderType, amount, price, ttl){
            var RequestExpired = root.lookupType("protobuf.ws.RequestExpired");
            var expiredPayload = {
                now:Date.now(),
                ttl:ttl
            };
            var err = RequestExpired.verify(expiredPayload);
            if(err) {
                throw Error(err)
            }

            var WsRequestMetaData = root.lookupType("protobuf.ws.WsRequestMetaData");
            var requestExpired = RequestExpired.create(expiredPayload);
            var requestType = WsRequestMetaData.WsRequestMsgType.PUT_LIMIT_ORDER;

            var putLimitOrderPayload = {
                expireControl: requestExpired,
                currencyPair: cp,
                orderType: orderType,
                amount: amount,
                price: price
            };

            doPrivateMessage(secretKey, token, putLimitOrderPayload, "protobuf.ws.PutLimitOrderRequest", requestType);
        };
        var cancelLimitOrder = function(token, secretKey, id, cp, ttl){
            var RequestExpired = root.lookupType("protobuf.ws.RequestExpired");
            var expiredPayload = {
                now:Date.now(),
                ttl:ttl
            };
            var err = RequestExpired.verify(expiredPayload);
            if(err) {
                throw Error(err)
            }

            var WsRequestMetaData = root.lookupType("protobuf.ws.WsRequestMetaData");
            var requestExpired = RequestExpired.create(expiredPayload);
            var requestType = WsRequestMetaData.WsRequestMsgType.CANCEL_LIMIT_ORDER;

            var cancelLimitOrderPayload = {
                expireControl: requestExpired,
                currencyPair: cp,
                id: id
            };

            doPrivateMessage(secretKey, token, cancelLimitOrderPayload, "protobuf.ws.CancelLimitOrderRequest", requestType);
        };

        var balance = function(token, secretKey, cp, ttl) {
            var RequestExpired = root.lookupType("protobuf.ws.RequestExpired");
            var expiredPayload = {
                now:Date.now(),
                ttl:ttl
            };
            var err = RequestExpired.verify(expiredPayload);
            if(err) {
                throw Error(err)
            }

            var WsRequestMetaData = root.lookupType("protobuf.ws.WsRequestMetaData");
            var requestExpired = RequestExpired.create(expiredPayload);
            var requestType = WsRequestMetaData.WsRequestMsgType.BALANCE;

            var balancePayload = {
                expireControl: requestExpired,
                currency: cp
            };
            doPrivateMessage(secretKey, token, balancePayload, "protobuf.ws.BalanceRequest", requestType)
        };

        var balances = function(token, secretKey, cp, onlyNotZero, ttl) {
            var RequestExpired = root.lookupType("protobuf.ws.RequestExpired");
            var expiredPayload = {
                now:Date.now(),
                ttl:ttl
            };

            var err = RequestExpired.verify(expiredPayload);
            if(err) {
                throw Error(err)
            }

            var WsRequestMetaData = root.lookupType("protobuf.ws.WsRequestMetaData");
            var requestExpired = RequestExpired.create(expiredPayload);
            var requestType = WsRequestMetaData.WsRequestMsgType.BALANCES;

            var balancesPayload = {
                expireControl: requestExpired,
                currencyPair: cp,
                onlyNotZero: onlyNotZero
            };
            doPrivateMessage(secretKey, token, balancesPayload, "protobuf.ws.BalancesRequest", requestType)
        };

        var lastTrades = function(token, secretKey, cp, type, interval, ttl) {
            var RequestExpired = root.lookupType("protobuf.ws.RequestExpired");
            var expiredPayload = {
                now:Date.now(),
                ttl:ttl
            };

            var err = RequestExpired.verify(expiredPayload);
            if(err) {
                throw Error(err)
            }

            var WsRequestMetaData = root.lookupType("protobuf.ws.WsRequestMetaData");
            var requestExpired = RequestExpired.create(expiredPayload);
            var requestType = WsRequestMetaData.WsRequestMsgType.LAST_TRADES;

            var lastTradesPayload = {
                expireControl: requestExpired,
                currencyPair: cp,
                interval: interval,
                tradeType: type
            };
            doPrivateMessage(secretKey, token, lastTradesPayload, "protobuf.ws.LastTradesRequest", requestType)
        };

        var trades = function(token, secretKey, cp, direction, offset, limit, ttl) {
            var RequestExpired = root.lookupType("protobuf.ws.RequestExpired");
            var expiredPayload = {
                now:Date.now(),
                ttl:ttl
            };

            var err = RequestExpired.verify(expiredPayload);
            if(err) {
                throw Error(err)
            }

            var WsRequestMetaData = root.lookupType("protobuf.ws.WsRequestMetaData");
            var requestExpired = RequestExpired.create(expiredPayload);
            var requestType = WsRequestMetaData.WsRequestMsgType.TRADES;

            var tradesPayload = {
                expireControl: requestExpired,
                currencyPair: cp,
                direction: direction,
                offset: offset,
                limit: limit
            };
            doPrivateMessage(secretKey, token, tradesPayload, "protobuf.ws.TradesRequest", requestType)
        };

        var clientOrders = function(token, secretKey, cp, status, issuedFrom, issuedTo, orderType, startRow, endRow, ttl) {
            var RequestExpired = root.lookupType("protobuf.ws.RequestExpired");
            var expiredPayload = {
                now:Date.now(),
                ttl:ttl
            };

            var err = RequestExpired.verify(expiredPayload);
            if(err) {
                throw Error(err)
            }

            var WsRequestMetaData = root.lookupType("protobuf.ws.WsRequestMetaData");
            var requestExpired = RequestExpired.create(expiredPayload);
            var requestType = WsRequestMetaData.WsRequestMsgType.CLIENT_ORDERS;

            var msgPayload = {
                expireControl: requestExpired,
                currencyPair: cp,
                status: status,
                issuedFrom: issuedFrom,
                issuedTo: issuedTo,
                orderType: orderType,
                startRow: startRow,
                endRow: endRow
            };
            doPrivateMessage(secretKey, token, msgPayload, "protobuf.ws.ClientOrdersRequest", requestType)
        };

        var clientOrder = function(token, secretKey, orderId, currencyPair, ttl) {
            var RequestExpired = root.lookupType("protobuf.ws.RequestExpired");
            var expiredPayload = {
                now:Date.now(),
                ttl:ttl
            };

            var err = RequestExpired.verify(expiredPayload);
            if(err) {
                throw Error(err)
            }

            var WsRequestMetaData = root.lookupType("protobuf.ws.WsRequestMetaData");
            var requestExpired = RequestExpired.create(expiredPayload);
            var requestType = WsRequestMetaData.WsRequestMsgType.CLIENT_ORDER;

            var msgPayload = {
                expireControl: requestExpired,
                orderId: orderId,
                currencyPair: currencyPair
            };
            doPrivateMessage(secretKey, token, msgPayload, "protobuf.ws.ClientOrderRequest", requestType)
        };

        var commission = function(token, secretKey, ttl) {
            var RequestExpired = root.lookupType("protobuf.ws.RequestExpired");
            var expiredPayload = {
                now:Date.now(),
                ttl:ttl
            };

            var err = RequestExpired.verify(expiredPayload);
            if(err) {
                throw Error(err)
            }

            var WsRequestMetaData = root.lookupType("protobuf.ws.WsRequestMetaData");
            var requestExpired = RequestExpired.create(expiredPayload);
            var requestType = WsRequestMetaData.WsRequestMsgType.COMMISSION;

            var msgPayload = {
                expireControl: requestExpired
            };
            doPrivateMessage(secretKey, token, msgPayload, "protobuf.ws.CommissionRequest", requestType)
        };

        var commissionCommonInfo = function(token, secretKey, ttl) {
            var RequestExpired = root.lookupType("protobuf.ws.RequestExpired");
            var expiredPayload = {
                now:Date.now(),
                ttl:ttl
            };

            var err = RequestExpired.verify(expiredPayload);
            if(err) {
                throw Error(err)
            }

            var WsRequestMetaData = root.lookupType("protobuf.ws.WsRequestMetaData");
            var requestExpired = RequestExpired.create(expiredPayload);
            var requestType = WsRequestMetaData.WsRequestMsgType.COMMISSION_COMMON_INFO;

            var msgPayload = {
                expireControl: requestExpired
            };
            doPrivateMessage(secretKey, token, msgPayload, "protobuf.ws.CommissionCommonInfoRequest", requestType)
        };

        var tradeHistory = function(token, secretKey, start, end, types, limit, offset, ttl) {
            var RequestExpired = root.lookupType("protobuf.ws.RequestExpired");
            var expiredPayload = {
                now:Date.now(),
                ttl:ttl
            };

            var err = RequestExpired.verify(expiredPayload);
            if(err) {
                throw Error(err)
            }

            var WsRequestMetaData = root.lookupType("protobuf.ws.WsRequestMetaData");
            var requestExpired = RequestExpired.create(expiredPayload);
            var requestType = WsRequestMetaData.WsRequestMsgType.TRADE_HISTORY;

            var msgPayload = {
                expireControl: requestExpired,
                start: start,
                end: end,
                types: types,
                limit: limit,
                offset: offset
            };
            doPrivateMessage(secretKey, token, msgPayload, "protobuf.ws.TradeHistoryRequest", requestType)
        };

        var marketOrder = function(token, secretKey, currencyPair, amount, orderType, ttl) {
            var RequestExpired = root.lookupType("protobuf.ws.RequestExpired");
            var expiredPayload = {
                now:Date.now(),
                ttl:ttl
            };

            var err = RequestExpired.verify(expiredPayload);
            if(err) {
                throw Error(err)
            }

            var WsRequestMetaData = root.lookupType("protobuf.ws.WsRequestMetaData");
            var requestExpired = RequestExpired.create(expiredPayload);
            var requestType = WsRequestMetaData.WsRequestMsgType.MARKET_ORDER;

            var msgPayload = {
                expireControl: requestExpired,
                currencyPair: currencyPair,
                amount: amount,
                orderType: orderType
            };
            doPrivateMessage(secretKey, token, msgPayload, "protobuf.ws.MarkerOrderRequest", requestType)
        };

        var walletAddress = function(token, secretKey, currency, ttl) {
            var RequestExpired = root.lookupType("protobuf.ws.RequestExpired");
            var expiredPayload = {
                now:Date.now(),
                ttl:ttl
            };

            var err = RequestExpired.verify(expiredPayload);
            if(err) {
                throw Error(err)
            }

            var WsRequestMetaData = root.lookupType("protobuf.ws.WsRequestMetaData");
            var requestExpired = RequestExpired.create(expiredPayload);
            var requestType = WsRequestMetaData.WsRequestMsgType.WALLET_ADDRESS;

            var msgPayload = {
                expireControl: requestExpired,
                currency: currency
            };
            doPrivateMessage(secretKey, token, msgPayload, "protobuf.ws.WalletAddressRequest", requestType)
        };

        var withdrawalCoin = function(token, secretKey, wallet, currency, amount, description, ttl) {
            var RequestExpired = root.lookupType("protobuf.ws.RequestExpired");
            var expiredPayload = {
                now:Date.now(),
                ttl:ttl
            };

            var err = RequestExpired.verify(expiredPayload);
            if(err) {
                throw Error(err)
            }

            var WsRequestMetaData = root.lookupType("protobuf.ws.WsRequestMetaData");
            var requestExpired = RequestExpired.create(expiredPayload);
            var requestType = WsRequestMetaData.WsRequestMsgType.WITHDRAWAL_COIN;

            var msgPayload = {
                expireControl: requestExpired,
                wallet: wallet,
                currency: currency,
                amount: amount,
                description: description
            };
            doPrivateMessage(secretKey, token, msgPayload, "protobuf.ws.WithdrawalCoinRequest", requestType)
        };

        var withdrawalPayeer = function(token, secretKey, wallet, currency, amount, protect, protectPeriod, protectCode, ttl) {
            var RequestExpired = root.lookupType("protobuf.ws.RequestExpired");
            var expiredPayload = {
                now:Date.now(),
                ttl:ttl
            };

            var err = RequestExpired.verify(expiredPayload);
            if(err) {
                throw Error(err)
            }

            var WsRequestMetaData = root.lookupType("protobuf.ws.WsRequestMetaData");
            var requestExpired = RequestExpired.create(expiredPayload);
            var requestType = WsRequestMetaData.WsRequestMsgType.WITHDRAWAL_PAYEER;

            var msgPayload = {
                expireControl: requestExpired,
                wallet: wallet,
                currency: currency,
                amount: amount,
                protect: protect,
                protectPeriod: protectPeriod,
                protectCode: protectCode
            };
            doPrivateMessage(secretKey, token, msgPayload, "protobuf.ws.WithdrawalPayeerRequest", requestType)
        };

        var withdrawalCapitalist = function(token, secretKey, wallet, currency, amount, ttl) {
            var RequestExpired = root.lookupType("protobuf.ws.RequestExpired");
            var expiredPayload = {
                now:Date.now(),
                ttl:ttl
            };

            var err = RequestExpired.verify(expiredPayload);
            if(err) {
                throw Error(err)
            }

            var WsRequestMetaData = root.lookupType("protobuf.ws.WsRequestMetaData");
            var requestExpired = RequestExpired.create(expiredPayload);
            var requestType = WsRequestMetaData.WsRequestMsgType.WITHDRAWAL_CAPITALIST;

            var msgPayload = {
                expireControl: requestExpired,
                wallet: wallet,
                currency: currency,
                amount: amount
            };
            doPrivateMessage(secretKey, token, msgPayload, "protobuf.ws.WithdrawalCapitalistRequest", requestType)
        };

        var withdrawalAdvcash = function(token, secretKey, wallet, currency, amount, ttl) {
            var RequestExpired = root.lookupType("protobuf.ws.RequestExpired");
            var expiredPayload = {
                now:Date.now(),
                ttl:ttl
            };

            var err = RequestExpired.verify(expiredPayload);
            if(err) {
                throw Error(err)
            }

            var WsRequestMetaData = root.lookupType("protobuf.ws.WsRequestMetaData");
            var requestExpired = RequestExpired.create(expiredPayload);
            var requestType = WsRequestMetaData.WsRequestMsgType.WITHDRAWAL_ADVCASH;

            var msgPayload = {
                expireControl: requestExpired,
                wallet: wallet,
                currency: currency,
                amount: amount
            };
            doPrivateMessage(secretKey, token, msgPayload, "protobuf.ws.WithdrawalAdvcashRequest", requestType)
        };

        var privateOrderRawSubscribe = function (token, secretKey, ttl, subscribeType) {
            var RequestExpired = root.lookupType("protobuf.ws.RequestExpired");
            var expiredPayload = {
                now:Date.now(),
                ttl:ttl
            };

            var err = RequestExpired.verify(expiredPayload);
            if(err) {
                throw Error(err)
            }
            var WsRequestMetaData = root.lookupType("protobuf.ws.WsRequestMetaData");
            var requestExpired = RequestExpired.create(expiredPayload);
            var msgPayload = {
                expireControl: requestExpired,
                subscribeType: subscribeType
            };
            var requestType = WsRequestMetaData.WsRequestMsgType.PRIVATE_SUBSCRIBE_ORDER_RAW;
            doPrivateMessage(secretKey, token, msgPayload, "protobuf.ws.PrivateSubscribeOrderRawChannelRequest", requestType);
        };

        var privateTradeSubscribe = function (token, secretKey, ttl) {
            var RequestExpired = root.lookupType("protobuf.ws.RequestExpired");
            var expiredPayload = {
                now:Date.now(),
                ttl:ttl
            };

            var err = RequestExpired.verify(expiredPayload);
            if(err) {
                throw Error(err)
            }
            var WsRequestMetaData = root.lookupType("protobuf.ws.WsRequestMetaData");
            var requestExpired = RequestExpired.create(expiredPayload);
            var msgPayload = {
                expireControl: requestExpired
            };
            var requestType = WsRequestMetaData.WsRequestMsgType.PRIVATE_SUBSCRIBE_TRADE;
            doPrivateMessage(secretKey, token, msgPayload, "protobuf.ws.PrivateSubscribeTradeChannelRequest", requestType);
        };

        var privateChannelUnsubscribe = function(token, secretKey, ttl, channelType) {
            var RequestExpired = root.lookupType("protobuf.ws.RequestExpired");
            var expiredPayload = {
                now:Date.now(),
                ttl:ttl
            };

            var err = RequestExpired.verify(expiredPayload);
            if(err) {
                throw Error(err)
            }
            var WsRequestMeta = root.lookupType("protobuf.ws.WsRequestMetaData");
            var requestExpired = RequestExpired.create(expiredPayload);
            var msgPayload = {
                expireControl: requestExpired,
                channelType: channelType

            };
            doPrivateMessage(secretKey, token, msgPayload, "protobuf.ws.PrivateUnsubscribeRequest", WsRequestMeta.WsRequestMsgType.PRIVATE_UNSUBSCRIBE);
        };

        socket.onclose = function (event) {
            if (event.wasClean) {
                console.log('The connection is closed cleanly');
            } else {
                console.log('Connection failure'); // например, "убит" процесс сервера
            }
            console.log('Code: ' + event.code + ' reason: ' + event.reason);
        };

        socket.onmessage = function (event) {
            console.log("data received ");
            var WsResponse = root.lookupType("protobuf.ws.WsResponse");
            var wsMessageBuffer = event.data;
            if ((wsMessageBuffer) !== "") {
                var wsResponseMessage = WsResponse.decode(new Uint8Array(wsMessageBuffer));
                var WsResponseMeta = root.lookupType("protobuf.ws.WsResponseMetaData");
                var MessageClass;
                var message;
                if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.TICKER_CHANNEL_SUBSCRIBED) {
                    MessageClass = root.lookupType("protobuf.ws.TickerChannelSubscribedResponse");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onSubscribe({ channelType: "tiker", currencyPair: message.currencyPair});
                    if(message.data.length > 0) {
                        onTicker({currencyPair:message.currencyPair, data:message.data});
                    }
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.ORDER_BOOK_RAW_CHANNEL_SUBSCRIBED) {
                    MessageClass = root.lookupType("protobuf.ws.OrderBookRawChannelSubscribedResponse");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onSubscribe({ channelType: "orderbookraw", currencyPair: message.currencyPair});
                    if(message.data.length > 0) {
                        onOrderBookRaw({currencyPair:message.currencyPair, data:message.data});
                    }
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.ORDER_BOOK_CHANNEL_SUBSCRIBED) {
                    MessageClass = root.lookupType("protobuf.ws.OrderBookChannelSubscribedResponse");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onSubscribe({ channelType: "orderbook", currencyPair: message.currencyPair});
                    if(message.data.length > 0) {
                        onOrderBook({currencyPair:message.currencyPair, data:message.data});
                    }
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.TRADE_CHANNEL_SUBSCRIBED) {
                    MessageClass = root.lookupType("protobuf.ws.TradeChannelSubscribedResponse");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onSubscribe({ channelType: "trade", currencyPair: message.currencyPair});
                    if(message.data.length > 0) {
                        onTrade({currencyPair:message.currencyPair, data:message.data});
                    }
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.CANDLE_CHANNEL_SUBSCRIBED) {
                    MessageClass = root.lookupType("protobuf.ws.CandleChannelSubscribedResponse");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onSubscribe({ channelType: "candle", currencyPair: message.currencyPair});
                    if(message.data.length > 0) {
                        onCandle({currencyPair:message.currencyPair, interval: message.interval, data:message.data});
                    }
                }  else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.PRIVATE_ORDER_RAW_CHANNEL_SUBSCRIBED) {
                    MessageClass = root.lookupType("protobuf.ws.PrivateOrderRawChannelSubscribedResponse");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onPrivateChannelSubscribe({channelType: "privateorderraw"});
                    if(message.data.length > 0) {
                        onPrivateOrderraw({data: message.data});
                    }
                }  else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.PRIVATE_TRADE_CHANNEL_SUBSCRIBED) {
                    MessageClass = root.lookupType("protobuf.ws.PrivateTradeChannelSubscribedResponse");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onPrivateChannelSubscribe({channelType: "privatetrade"});
                    if(message.data.length > 0) {
                        onPrivateTrade({data: message.data});
                    }
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.CHANNEL_UNSUBSCRIBED) {
                    MessageClass = root.lookupType("protobuf.ws.ChannelUnsubscribedResponse");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    var UnsubscribeRequest = root.lookupType("protobuf.ws.UnsubscribeRequest");
                    var channelType;
                    if(UnsubscribeRequest.ChannelType.TICKER === message.type) {
                        channelType = "ticker"
                    } else if (UnsubscribeRequest.ChannelType.ORDER_BOOK_RAW === message.type) {
                        channelType = "orderbookraw"
                    } else if (UnsubscribeRequest.ChannelType.ORDER_BOOK === message.type) {
                        channelType = "orderbook"
                    } else if (UnsubscribeRequest.ChannelType.TRADE === message.type) {
                        channelType = "trade"
                    } else if (UnsubscribeRequest.ChannelType.CANDLE === message.type) {
                        channelType = "candle"
                    }
                    onUnsubscribe({ channelType: channelType, currencyPair: message.currencyPair});
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.PRIVATE_CHANNEL_UNSUBSCRIBED) {
                    MessageClass = root.lookupType("protobuf.ws.PrivateChannelUnsubscribedResponse");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    var PrivateUnsubscribeRequest = root.lookupType("protobuf.ws.PrivateUnsubscribeRequest");
                    var privateChannelType;
                    if(PrivateUnsubscribeRequest.ChannelType.PRIVATE_ORDER_RAW === message.type) {
                        privateChannelType = "privateorderraw"
                    } else if (PrivateUnsubscribeRequest.ChannelType.PRIVATE_TRADE === message.type) {
                        privateChannelType = "privatetrade"
                    }
                    onPrivateChanneUnsubscribe({ channelType: privateChannelType});
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.ERROR) {
                    MessageClass = root.lookupType("protobuf.ws.ErrorResponse");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onError(message);
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.TICKER_NOTIFY) {
                    MessageClass = root.lookupType("protobuf.ws.TickerNotification");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onTicker(message)
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.ORDER_BOOK_RAW_NOTIFY) {
                    MessageClass = root.lookupType("protobuf.ws.OrderBookRawNotification");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onOrderBookRaw(message)
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.ORDER_BOOK_NOTIFY) {
                    MessageClass = root.lookupType("protobuf.ws.OrderBookNotification");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onOrderBook(message)
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.TRADE_NOTIFY) {
                    MessageClass = root.lookupType("protobuf.ws.TradeNotification");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onTrade(message)
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.CANDLE_NOTIFY) {
                    MessageClass = root.lookupType("protobuf.ws.CandleNotification");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onCandle(message)
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.PRIVATE_ORDER_RAW_NOTIFY) {
                    MessageClass = root.lookupType("protobuf.ws.PrivateOrderRawNotification");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onPrivateOrderraw(message)
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.PRIVATE_TRADE_NOTIFY) {
                    MessageClass = root.lookupType("protobuf.ws.PrivateTradeNotification");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onPrivateTrade(message)
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.LOGIN_RESPONSE) {
                    MessageClass = root.lookupType("protobuf.ws.LoginResponse");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onLogin()
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.PUT_LIMIT_ORDER_RESPONSE) {
                    MessageClass = root.lookupType("protobuf.ws.PutLimitOrderResponse");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onPutLimitOrder(message)
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.CANCEL_LIMIT_ORDER_RESPONSE) {
                    MessageClass = root.lookupType("protobuf.ws.CancelLimitOrderResponse");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onCancelLimitOrder(message)
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.BALANCE_RESPONSE) {
                    MessageClass = root.lookupType("protobuf.ws.BalanceResponse");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onBalance(message)
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.BALANCES_RESPONSE) {
                    MessageClass = root.lookupType("protobuf.ws.BalancesResponse");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onBalances(message)
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.LAST_TRADES_RESPONSE) {
                    MessageClass = root.lookupType("protobuf.ws.LastTradesResponse");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onLastTrades(message)
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.TRADES_RESPONSE) {
                    MessageClass = root.lookupType("protobuf.ws.TradesResponse");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onTrades(message)
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.CLIENT_ORDERS_RESPONSE) {
                    MessageClass = root.lookupType("protobuf.ws.ClientOrdersResponse");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onClientOrders(message)
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.CLIENT_ORDER_RESPONSE) {
                    MessageClass = root.lookupType("protobuf.ws.ClientOrderResponse");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onClientOrder(message)
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.COMMISSION_RESPONSE) {
                    MessageClass = root.lookupType("protobuf.ws.CommissionResponse");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onCommission(message)
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.COMMISSION_COMMON_INFO_RESPONSE) {
                    MessageClass = root.lookupType("protobuf.ws.CommissionCommonInfoResponse");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onCommissionCommonInfo(message)
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.TRADE_HISTORY_RESPONSE) {
                    MessageClass = root.lookupType("protobuf.ws.TradeHistoryResponse");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onTradeHistory(message)
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.MARKET_ORDER_RESPONSE) {
                    MessageClass = root.lookupType("protobuf.ws.MarkerOrderResponse");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onMarketOrder(message)
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.WALLET_ADDRESS_RESPONSE) {
                    MessageClass = root.lookupType("protobuf.ws.WalletAddressResponse");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onWalletAddress(message)
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.WITHDRAWAL_COIN_RESPONSE) {
                    MessageClass = root.lookupType("protobuf.ws.WithdrawalCoinResponse");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onWithdrawalCoin(message)
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.WITHDRAWAL_PAYEER_RESPONSE) {
                    MessageClass = root.lookupType("protobuf.ws.WithdrawalPayeerResponse");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onWithdrawalPayeer(message)
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.WITHDRAWAL_CAPITALIST_RESPONSE) {
                    MessageClass = root.lookupType("protobuf.ws.WithdrawalCapitalistResponse");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onWithdrawalCapitalist(message)
                } else if (wsResponseMessage.meta.responseType === WsResponseMeta.WsResponseMsgType.WITHDRAWAL_ADVCASH_RESPONSE) {
                    MessageClass = root.lookupType("protobuf.ws.WithdrawalCapitalistResponse");
                    message = MessageClass.decode(wsResponseMessage.msg);
                    onWithdrawalAdvcash(message)
                }
            }
        };

        socket.onerror = function (error) {
            console.log("Websocket error " + error.message);
            //here you can make your trade decision
        };

        function onTicker(event) {
            console.log("ticker: " + JSON.stringify(event))
            //here you can make your trade decision
        }

        function onOrderBook(event) {
            console.log("orderbook: " + JSON.stringify(event))
            //here you can make your trade decision
        }

        function onOrderBookRaw(event) {
            console.log("orderbookraw: " + JSON.stringify(event))
            //here you can make your trade decision
        }

        function onTrade(event) {
            console.log("trade: " + JSON.stringify(event))
            //here you can make your trade decision
        }

        function onCandle(event) {
            console.log("candle: " + JSON.stringify(event))
        }

        function onPrivateOrderraw(event) {
            console.log("private order raw: " + JSON.stringify(event))
        }

        function onPrivateTrade(event) {
            console.log("private trade: " + JSON.stringify(event))
        }


        function onError(msg) {
            console.log("Error: "  + JSON.stringify(msg))
            //here you can make your trade decision
        }

        function onSubscribe(msg) {

            console.log("channel subscribed: " + JSON.stringify(msg));
            //here you can make your trade decision
        }

        function onUnsubscribe(msg) {
            console.log("channel unsubscribed: " + JSON.stringify(msg))
            //here you can make your trade decision
        }

        function onPrivateChannelSubscribe(msg) {
            console.log("private channel subscribed: " + JSON.stringify(msg))
            //here you can make your trade decision
        }

        function onPrivateChanneUnsubscribe(msg) {
            console.log("private channel unsubscribed: " + JSON.stringify(msg))
            //here you can make your trade decision
        }

        function onLogin() {
            console.log("Successful login");
            //here you can make your trade decision
            var orderType = root.lookupType("protobuf.ws.PutLimitOrderRequest").OrderType.BID;
            putLimitOrder("Limit", MY_SECRET_KEY,"BTC/USD", orderType,"10","20",30000);
            balance("balance", MY_SECRET_KEY,"BTC/USD", 300000);
            balances("balances", MY_SECRET_KEY,null,null, 30000);
            var interval = root.lookupType("protobuf.ws.LastTradesRequest").Interval.HOUR;
            lastTrades("lastTrades", MY_SECRET_KEY,"BTC/USD", null, interval, 300000);
            trades("trades", MY_SECRET_KEY, null, null, null, null, 30000);
            clientOrders("clientOrders", MY_SECRET_KEY, "BTC/USD", null, null, null, null, null, null, 30000);
            clientOrder("clientOrder", MY_SECRET_KEY, 569300001, "BTC/USD", 30000);
            commission("commission", MY_SECRET_KEY, 30000);
            commissionCommonInfo("commissionCommonInfo", MY_SECRET_KEY, 30000);
            var date = new Date();
            var end = date.getTime();
            date.setDate(date.getDate() - 30);
            var start = date.getTime();
            var sellTradeType = root.lookupType("protobuf.ws.TradeHistoryRequest").Types.SELL;
            var buyTradeType = root.lookupType("protobuf.ws.TradeHistoryRequest").Types.BUY;
            tradeHistory("tradeHistory", MY_SECRET_KEY, start, end, [sellTradeType,buyTradeType], 100, 0, 30000);
            var marketType = root.lookupType("protobuf.ws.ClientOrdersRequest").OrderType.BID;
            // marketOrder("marketOrder",MY_SECRET_KEY, "BTC/USD", "1", marketType, 30000);
            // walletAddress("Wallet", MY_SECRET_KEY, "BTC", 30000);
            // withdrawalCoin("out/coin", MY_SECRET_KEY, "34Adcp7UbL2sdBqaDc9s7SCisX7C5EALw3", "BTC", "0.002", null, 30000);
            // withdrawalPayeer("out/payeer", MY_SECRET_KEY, "P12345678", "USD", "0.01", null, null, null, 30000);
            // withdrawalCapitalist("out/capitalist", MY_SECRET_KEY, "U0000001", "USD", "0.01", 30000);
            // withdrawalAdvcash("out/advcash", MY_SECRET_KEY, "U123456789012", "USD", "0.01", 30000);
            var subscribeType = root.lookupType("protobuf.ws.PrivateSubscribeOrderRawChannelRequest").SubscribeType.WITH_INITIAL_STATE;
            privateOrderRawSubscribe("private order raw channel", MY_SECRET_KEY, 30000, subscribeType);
            privateTradeSubscribe("private trade channel", MY_SECRET_KEY, 30000);
        }

        function onPutLimitOrder(msg) {
            console.log("The order limit has been set: " + JSON.stringify(msg));
            //here you can make your trade decision
            cancelLimitOrder("cancel", MY_SECRET_KEY, Number.parseInt(msg.orderId),"BTC/USD",30000)
        }

        function onCancelLimitOrder(msg) {
            //here you can make your trade decision
            console.log("The order limit has been canceled: " + JSON.stringify(msg))
        }

        function onBalance(msg) {
            //here you can make your trade decision
            console.log("balance: " + JSON.stringify(msg))
        }

        function onBalances(msg) {
            //here you can make your trade decision
            console.log("balances: " + JSON.stringify(msg))
        }

        function onLastTrades(msg) {
            //here you can make your trade decision
            console.log("lastTrades: " + JSON.stringify(msg))
        }

        function onTrades(msg) {
            //here you can make your trade decision
            console.log("trades: " + JSON.stringify(msg))
        }

        function onClientOrders(msg) {
            //here you can make your trade decision
            console.log("clientOrders: " + JSON.stringify(msg))
        }

        function onClientOrder(msg) {
            //here you can make your trade decision
            console.log("clientOrder: " + JSON.stringify(msg))
        }

        function onCommission(msg) {
            //here you can make your trade decision
            console.log("commission: " + JSON.stringify(msg))
        }

        function onCommissionCommonInfo(msg) {
            //here you can make your trade decision
            console.log("commission: " + JSON.stringify(msg))
        }

        function onTradeHistory(msg) {
            //here you can make your trade decision
            console.log("TradeHistory: " + JSON.stringify(msg))
        }

        function onMarketOrder(msg) {
            //here you can make your trade decision
            console.log("MarketOrder: " + JSON.stringify(msg))
        }

        function onWalletAddress(msg) {
            //here you can make your trade decision
            console.log("WalletAddress: " + JSON.stringify(msg))
        }

        function onWithdrawalCoin(msg) {
            //here you can make your trade decision
            console.log("WithdrawalCoin: " + JSON.stringify(msg))
        }

        function onWithdrawalPayeer(msg) {
            //here you can make your trade decision
            console.log("WithdrawalPayeer: " + JSON.stringify(msg))
        }

        function onWithdrawalCapitalist(msg) {
            //here you can make your trade decision
            console.log("WithdrawalCapitalist: " + JSON.stringify(msg))
        }

        function onWithdrawalAdvcash(msg) {
            //here you can make your trade decision
            console.log("WithdrawalAdvcash: " + JSON.stringify(msg))
        }

        function connect(path) {
            var connection = new WebSocket(path);
            connection.binaryType = 'arraybuffer';
            return connection;
        }

        function disconnect() {
            socket.close();
            console.log("Connection closed")
        }

        function byteArrayToWordArray(ba) {
            var wa = [],
                i;
            for (i = 0; i < ba.length; i++) {
                wa[(i / 4) | 0] |= ba[i] << (24 - 8 * i);
            }

            return CryptoJS.lib.WordArray.create(wa, ba.length);
        }

        function wordToByteArray(word, length) {
            var ba = [],
                i,
                xFF = 0xFF;
            if (length > 0)
                ba.push(word >>> 24);
            if (length > 1)
                ba.push((word >>> 16) & xFF);
            if (length > 2)
                ba.push((word >>> 8) & xFF);
            if (length > 3)
                ba.push(word & xFF);

            return ba;
        }

        function wordArrayToByteArray(wordArray, length) {
            if (wordArray.hasOwnProperty("sigBytes") && wordArray.hasOwnProperty("words")) {
                length = wordArray.sigBytes;
                wordArray = wordArray.words;
            }

            var result = [],
                bytes;
            var i = 0;
            while (length > 0) {
                bytes = wordToByteArray(wordArray[i], Math.min(4, length));
                length -= bytes.length;
                result.push(bytes);
                i++;
            }
            return [].concat.apply([], result);
        }
        function stringToByteArray(string) {
            var data = [];
            for (var i = 0; i < string.length; i++){
                data.push(string.charCodeAt(i));
            }
            return data;
        }
    });
};