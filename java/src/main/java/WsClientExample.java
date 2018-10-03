import com.google.gson.Gson;
import com.google.protobuf.ByteString;
import com.google.protobuf.InvalidProtocolBufferException;
import com.neovisionaries.ws.client.WebSocket;
import com.neovisionaries.ws.client.WebSocketAdapter;
import com.neovisionaries.ws.client.WebSocketException;
import com.neovisionaries.ws.client.WebSocketFactory;
import model.events.*;
import protobuf.ws.LcWsApi;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.UnsupportedEncodingException;
import java.math.BigDecimal;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;

public class WsClientExample {
    public static final String MY_API_KEY = "sTaMP6f2zMdhjKQva7SSaZENStXx2kbk";
    public static final String MY_SECRET_KEY = "z4TJJqYTgWqy2KGxuD14TUpddZmVRHxR";

    private WebSocket webSocket;
    private Gson mapper = new Gson();

    public WsClientExample() throws IOException {
        webSocket = new WebSocketFactory()
                .createSocket("wss://ws.api.livecoin.net/ws/beta2")
                .addListener(new WebSocketAdapter() {
                    @Override
                    public void onTextMessage(WebSocket ws, String message) {
                    }
                    @Override
                    public void onBinaryMessage(WebSocket ws, byte[] binary) {
                        try {
                            parseMessage(binary);
                        } catch (Exception e) {
                            System.out.println(Arrays.toString(e.getStackTrace()));
                        }

                    }
                });
    }

    public static void main(String[] args) throws IOException, InterruptedException, NoSuchAlgorithmException, InvalidKeyException {

        WsClientExample app = new WsClientExample();
        app.run();
    }

    private void run() throws IOException, InterruptedException, InvalidKeyException, NoSuchAlgorithmException {
        try {
            webSocket.connect();
            subscribeTicker("BTC/USD", null);
            login(MY_API_KEY,MY_SECRET_KEY, 300000);
            //here you can make your trade decision

        } catch (WebSocketException e) {
            e.printStackTrace();
        }
        if (webSocket != null) {
            BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
            System.out.print("Press Enter to exit\n");
            br.readLine();
            System.out.println("exiting...");
            unsubscribeTicker("BTC/USD");
            //here you can make your trade decision
            Thread.sleep(2000);
            stop();

        }
    }

    private void unsubscribeTicker(String currencyPair) throws UnsupportedEncodingException, NoSuchAlgorithmException, InvalidKeyException {
        LcWsApi.UnsubscribeRequest.ChannelType channelType = LcWsApi.UnsubscribeRequest.ChannelType.TICKER;
        unsubscribeChannel(channelType, currencyPair);
    }

    private void onLogin() {
        System.out.println("Successful login");
        //here you can make your trade decision
    }

    private void onTicker(TickerEvent tickerEvent) {
        System.out.print(tickerEvent);
        //here you can make your trade decision
    }

    private void onOrderBook(OrderBookEvent orderBookEvent) {
        System.out.println(orderBookEvent);
        //here you can make your trade decision
    }

    private void onOrderBookRaw(OrderBookRawEvent orderBookRawEvent) {
        System.out.println(orderBookRawEvent);
        //here you can make your trade decision
    }

    private void onTrade(TradeEvent tradeEvent) {
        System.out.println(tradeEvent);
        //here you can make your trade decision
    }

    private void onCandle(CandleEvent candleEvent) {
        System.out.println(candleEvent);
        //here you can make your trade decision
    }

    private void onError(int errorCode, String errorMessage) {
        System.out.println("Error: \"" + errorCode + "\",text:\"" + errorMessage + "\"");
        //here you can make your trade decision
    }

    private void onSubscribe(String channelId) {
        System.out.println("Channel subscribed: " + channelId);
        //here you can make your trade decision
    }

    private void onUnsubscribe(String channelId) {
        System.out.println("Channel unSubscribed: " + channelId);
        //here you can make your trade decision
    }

    private void stop() {
        webSocket.disconnect();
        System.exit(0);
    }

    private void subscribeTicker(String symbol, Float frequency) throws UnsupportedEncodingException, NoSuchAlgorithmException, InvalidKeyException {
        LcWsApi.SubscribeTickerChannelRequest.Builder builder = LcWsApi.SubscribeTickerChannelRequest
                .newBuilder()
                .setCurrencyPair(symbol);
        if(frequency != null) {
            builder.setFrequency(frequency);
        }
        ByteString msg = builder.build().toByteString();
        ByteString sign = hashIt(MY_SECRET_KEY, msg.toByteArray());
        LcWsApi.WsRequestMetaData meta = LcWsApi.WsRequestMetaData
                .newBuilder()
                .setRequestType(LcWsApi.WsRequestMetaData.WsRequestMsgType.SUBSCRIBE_TICKER)
                .setSign(sign)
                .build();
        LcWsApi.WsRequest request = LcWsApi.WsRequest.newBuilder().setMeta(meta).setMsg(msg).build();
        webSocket.sendBinary(request.toByteArray());
    }

    private void unsubscribeChannel(LcWsApi.UnsubscribeRequest.ChannelType channelType, String currencyPair) throws UnsupportedEncodingException, NoSuchAlgorithmException, InvalidKeyException {
        ByteString msg = LcWsApi.UnsubscribeRequest
                .newBuilder()
                .setChannelType(channelType)
                .setCurrencyPair(currencyPair)
                .build()
                .toByteString();
        ByteString sign = hashIt(MY_SECRET_KEY, msg.toByteArray());
        LcWsApi.WsRequestMetaData meta = LcWsApi.WsRequestMetaData
                .newBuilder()
                .setRequestType(LcWsApi.WsRequestMetaData.WsRequestMsgType.UNSUBSCRIBE)
                .setSign(sign)
                .build();
        LcWsApi.WsRequest request = LcWsApi.WsRequest.newBuilder().setMeta(meta).setMsg(msg).build();
        webSocket.sendBinary(request.toByteArray());
    }

    private void login(String key, String secret, int ttl) throws UnsupportedEncodingException, NoSuchAlgorithmException, InvalidKeyException {
        long now = System.currentTimeMillis();
        LcWsApi.RequestExpired requestExpired = LcWsApi.RequestExpired.newBuilder()
                .setNow(now)
                .setTtl(ttl)
                .build();
        ByteString msg = LcWsApi.LoginRequest.newBuilder().setApiKey(key).setExpireControl(requestExpired).build().toByteString();
        ByteString sign = hashIt(secret, msg.toByteArray());
        LcWsApi.WsRequestMetaData meta = LcWsApi.WsRequestMetaData
                .newBuilder()
                .setRequestType(LcWsApi.WsRequestMetaData.WsRequestMsgType.LOGIN)
                .setSign(sign)
                .build();
        LcWsApi.WsRequest request = LcWsApi.WsRequest.newBuilder().setMeta(meta).setMsg(msg).build();
        webSocket.sendBinary(request.toByteArray());
    }

    private void parseMessage(byte[] data) throws InvalidProtocolBufferException {
        LcWsApi.WsResponse response = LcWsApi.WsResponse.parseFrom(data);
        if (response.getMeta().getResponseType().equals(LcWsApi.WsResponseMetaData.WsResponseMsgType.TICKER_CHANNEL_SUBSCRIBED)) {
            LcWsApi.TickerChannelSubscribedResponse message = LcWsApi.TickerChannelSubscribedResponse.parseFrom(response.getMsg());
            onSubscribe("Ticker/".concat(message.getCurrencyPair()));
            message.getDataList().forEach(t -> {
                TickerEvent ticker = prepareTickerEvent(t);
                ticker.setChannelId(String.format("Ticker/%s",message.getCurrencyPair()));
                onTicker(new TickerEvent());
            });
        }  else if (response.getMeta().getResponseType().equals(LcWsApi.WsResponseMetaData.WsResponseMsgType.TICKER_NOTIFY)) {
            LcWsApi.TickerNotification message = LcWsApi.TickerNotification.parseFrom(response.getMsg());
            message.getDataList().forEach(t -> {
                TickerEvent ticker = prepareTickerEvent(t);
                ticker.setChannelId(String.format("Ticker/%s",message.getCurrencyPair()));
                onTicker(new TickerEvent());
            });
        } else if (response.getMeta().getResponseType().equals(LcWsApi.WsResponseMetaData.WsResponseMsgType.CHANNEL_UNSUBSCRIBED)) {
            LcWsApi.ChannelUnsubscribedResponse message = LcWsApi.ChannelUnsubscribedResponse.parseFrom(response.getMsg());
            if (message.getType().equals(LcWsApi.UnsubscribeRequest.ChannelType.TICKER)) {
                onUnsubscribe(String.format("Ticker_%s",message.getCurrencyPair()));
            }

        } else if (response.getMeta().getResponseType().equals(LcWsApi.WsResponseMetaData.WsResponseMsgType.ERROR)) {
            LcWsApi.ErrorResponse message = LcWsApi.ErrorResponse.parseFrom(response.getMsg());
            onError(message.getCode(), message.getMessage());
        } else if (response.getMeta().getResponseType().equals(LcWsApi.WsResponseMetaData.WsResponseMsgType.LOGIN_RESPONSE)) {
            onLogin();
        }
    }

    private TickerEvent prepareTickerEvent(LcWsApi.TickerEvent t) {
        TickerEvent ticker = new TickerEvent();
        ticker.setLast(new BigDecimal(t.getLast()));
        ticker.setHigh(new BigDecimal(t.getHigh()));
        ticker.setLow(new BigDecimal(t.getLow()));
        ticker.setVolume(new BigDecimal(t.getVolume()));
        ticker.setVwap(new BigDecimal(t.getVwap()));
        ticker.setMaxBid(new BigDecimal(t.getMaxBid()));
        ticker.setMinAsk(new BigDecimal(t.getMinAsk()));
        ticker.setBestBid(new BigDecimal(t.getBestBid()));
        ticker.setBestAsk(new BigDecimal(t.getBestAsk()));
        return ticker;
    }

    private  ByteString hashIt(String secret, byte[] data) throws UnsupportedEncodingException, NoSuchAlgorithmException, InvalidKeyException {
        SecretKeySpec secretKey = new SecretKeySpec(secret.getBytes("UTF-8"), "HmacSHA256");
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(secretKey);
        byte[] hmacData = mac.doFinal(data);
        return ByteString.copyFrom(hmacData);
    }
}
