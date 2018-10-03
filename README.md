# Livecoin websocket API

Current version of Livecoin websocket API supports five types of public channels: ticker, orderbook (grouped by price), orderbook raw, trades, candles.

There are also two private channels with only (and all) customer's events: "private orders raw" for changes in customer's orders (and, optionally, all open customer's orders as initial state); "private trades" for all customer's trades.

There are methods for placing limit orders and canceling them, and methods for cryptocurrency/fiat withdrawal.

You can see description of previous version at https://github.com/lvcn1/ws-client-examples/tree/beta_v1 .

First, you should connect to websocket (address is wss://ws.api.livecoin.net/ws/beta2).

Then, you can subscribe/unsubscribe to any channel of an existing currency pair in the exchange.

If you want to place/cancel limit orders or use other private API, you should first login (providing your API key, signed by your private key) and then use methods for placing/cancelling orders (you also must signed your requests by your private key).

You can find example clients for Python and JavaScript in this repo. Simple clients for Java and C# are also here.

`WARNING!!!` examples contain invalid authentication keys. You have to provide your keys to test private api part. Be VERY careful - examples make orders and trades!!!!

`Restrictions`

1. You can resubscribe to each channel only once per minute (there is no restrictions for different channels).

2. Outgoing queue size of websocket is limited to 4096 messages. When the queue is full, connection is dropped.

Changelog is here: https://github.com/lvcn1/ws-client-examples/blob/master/changes.md

## 1. General protocol information

All incoming/outgoing messages are encoded using protobuf (https://developers.google.com/protocol-buffers/).

All decimals (quantities, prices, volumes, etc) are represented as strings (due to issue of loosing precision in floats).

All timestamps are in milliseconds from Unix Epoch in UTC.

### 1.1. Sending requests

For public requests you should:
 - construct your `*Request` message with all needed fields;
 - construct `WsRequest` message;
 - set `meta.request_type` field of `WsRequest` to the values associated with your *Request message type;
 - [optionaly] set `meta.token` field of `WsRequest` (it's value will be returned in response);
 - set `data` field of `WsRequest` to serialized `*Request` message;
 - send serialized `WsRequest` to websocket.

Python example (message for subscribing on ticker USD/BTC):

    request = LivecoinWSapi_pb2.SubscribeTickerChannelRequest()
    request.currency_pair = "BTC/USD"
    msg = LivecoinWSapi_pb2.WsRequest()
    msg.meta.request_type = LivecoinWSapi_pb2.WsRequestMetaData.SUBSCRIBE_TICKER
    msg.meta.token = "msg2"
    msg.msg = request.SerializeToString()
    websocket.send_binary(msg.SerializeToString())

For private requests (messages, containing `expire_control` field) you should:
 - construct your `*Request` message with all needed fields;
 - set `expire_control.now` field of your request to current Epoch timestamp in milliseconds;
 - set `expire_control.ttl` field of your request to current to 'Time to live' milliseconds;
 - construct `WsRequest` message;
 - set `meta.request_type` field of `WsRequest` to the values associated with your *Request message type;
 - [optionaly] set `meta.token` field of `WsRequest` (it's value will be returned in response);
 - set `data` field of `WsRequest` to serialized `*Request` message;
 - sign `data` field of `WsRequest`  with your private key and set `sign` field of `WsRequest` to your sign;
 - send serialized `WsRequest` to websocket.

Before sending any private requests (except LoginRequest) only after sucessful LoginRequest.

Python example (message for putting buy limit order):

    msg = LivecoinWSapi_pb2.PutLimitOrderRequest()
    request.expire_control.now = int(round(time.time() * 1000))
    # if processing will take more then 10s (network issues, for example), ignore this request with error
    request.expire_control.ttl = 10000
    request.currency_pair = "BTC/USD"
    request.order_type = LivecoinWSapi_pb2.PutLimitOrderRequest.BID
    request.amount = "0.0001432"
    request.price = "8345.2131"
    msg.meta.request_type = LivecoinWSapi_pb2.WsRequestMetaData.PUT_LIMIT_ORDER
    msg.meta.token = "msg3"
    msg.msg = request.SerializeToString()
    msg.meta.sign = hmac.new(MY_SECRET_KEY, msg=msg.msg, digestmod=hashlib.sha256).digest()
    websocket.send_binary(msg.SerializeToString())

Python example of LoginRequest (you have to send it only once per connection):

    msg = LivecoinWSapi_pb2.LoginRequest()
    request.expire_control.now = int(round(time.time() * 1000))
    request.expire_control.ttl = 60000
    request.api_key = MY_API_KEY
    msg.meta.request_type = LivecoinWSapi_pb2.WsRequestMetaData.LOGIN
    msg.meta.token = "logon"
    msg.msg = request.SerializeToString()
    msg.meta.sign = hmac.new(MY_SECRET_KEY, msg=msg.msg, digestmod=hashlib.sha256).digest()
    websocket.send_binary(msg.SerializeToString())

This looks here a little messy, but with wrappers (you can see them in examples), usage is enough comfortable.

### 1.2. Processing responses

You will get response on each message you have sent to the websocket plus notifications from subscribed channels.

Each message you get from websocket is either ping message (empty message), or protobuf-encoded WsResponse.
You have to:
 - check, if message is ping. If message length is zero, stop processing it;
 - deserialize `WsResponse` out of message;
 - deserialize `*Response` out of `msg` field of `WsResponse` (choose message type according to `meta.request_type` field);
 - process `*Response` message.

If you have sent your request with some value in `meta.token` field, the response will contain this value in it's `meta.token` field.

Be aware: responses to your messages can be `Errors` (in a case of error, of course).

### 1.3. Expire control

When you send private api messages, you set three fields: `expire_control.now`, `expire_control.ttl` and `sign`. Server checks this fields in this way:
 - if `expire_control.now` is more then 1 minute old, message is not processed and `Error` is sent as a response (replay protection);
 - if (`expire_control.now`+`expire_control.ttl`) is in the past, message is not processed and `Error` is sent as a response;
 - if `sign` is not equal to computed sign (for logged-in user) of message in `data`, message is not processed and `Error` is sent as a response.

## 2. General information

You will get empty ("") messages every 30 seconds. You don't need to answer them or send anything to keep connection alive (but read the restrictions about the outgoing queue size!!!).

All subscriptions are valid and active from subscription until you sent 'Unsibscribe' message or your connection is close. There are no other ways to cancel your subscription.

Time is synchronized with public NTP servers, so timestamps in messages are accurate.

There are no restrictions on the connection time **for now** (really - until the next service update). But this can be changed.

There are no special restrictions on the subscriptions count.

## 3. Request rate limit

Restrictions are based on "weight" of requests. You can use 200 points per minute. **For now** you can contact staff via tickets to increase your personal "points per minute", later limit will be dynamic (but not lesser then 200 points per minute).

Weights for requests are defined in comments in .proto file.


### 3. More info

For more information, please, see LivecoinWSapi.proto (https://github.com/lvcn1/ws-client-examples/blob/master/proto/LivecoinWSapi.proto) file and comments in it and the example sources.

In a case of any questions make an issue, please.