using System;
using WebSocketSharp;
using System.Threading;
using ws_client.model.events;
using ws_client.model.parameters;
using System.IO;
using System.Text;
using System.Security.Cryptography;

namespace ws_client
{
    class WsClientExample : IDisposable
    {
        public const string MY_API_KEY = "sTaMP6f2zMdhjKQva7SSaZENStXx2kbk";
        public const string MY_SECRET_KEY = "z4TJJqYTgWqy2KGxuD14TUpddZmVRHxR";
        private WebSocket ws;

        public WsClientExample(String url)
        {
            this.ws = new WebSocket(url);
        }

        static void Main(string[] args)
        {

            using (var wsclient = new WsClientExample("wss://ws.api.livecoin.net/ws/beta2"))
            {
                wsclient.run();
                Console.WriteLine("Press Enter to exit");
                Console.ReadKey(true);
                //Thread.Sleep(500);
            }
        }

        private void run()
        {
            ws.OnOpen += Ws_OnOpen;
            ws.OnMessage += Ws_OnMessage;
            ws.OnError += Ws_OnError;
            ws.OnClose += Ws_OnClose;
            ws.Connect();
        }

        private void Ws_OnError(object sender, WebSocketSharp.ErrorEventArgs e)
        {
            Console.WriteLine("Error: " + e.Message);
        }

        private void Ws_OnMessage(object sender, MessageEventArgs e)
        {
            if (e.IsBinary)
            {
                processMessage(e.RawData);
            }
        }

        private void Ws_OnOpen(object sender, EventArgs e)
        {
            Console.WriteLine("Status: Connected");
            WsClient_Subscribe(new TickerParams("BTC/USD",1.1f));
            WsClient_Login(MY_API_KEY, MY_SECRET_KEY, 30000);
            //here you can make your trade decision
        }

        private void Ws_OnClose(object sender, CloseEventArgs e)
        {
            Console.WriteLine("Status: Disconnected");
            //here you can make your trade decision
        }

        private void WsClient_OnTicker(TickerEvent tickerEvent)
        {
            Console.WriteLine(tickerEvent);
            //here you can make your trade decision
        }

        private void WsClient_OnOrderBook(OrderBookEvent orderBookEvent)
        {
            Console.WriteLine(orderBookEvent);
            //here you can make your trade decision
        }

        private void WsClient_OnOrderBookRaw(OrderBookRawEvent orderBookRawEvent)
        {
            Console.WriteLine(orderBookRawEvent);
            //here you can make your trade decision
        }

        private void WsClient_OnTrade(TradeEvent tradeEvent)
        {
            Console.WriteLine(tradeEvent);
            //here you can make your trade decision
        }

        private void WsClient_OnCandleRaw(CandleEvent candleRawEvent)
        {
            Console.WriteLine(candleRawEvent);
            //here you can make your trade decision
        }

        private void WsClient_OnError(int code, String message)
        {
            Console.WriteLine("Error code: \"" + code + "\", message:\"" + message + "\"");
            //here you can make your trade decision
        }

        private void WsClient_OnSubscribe(String channelId)
        {
            Console.WriteLine("Channel subscribed: " + channelId);
            //here you can make your trade decision
        }

        private void WsClient_OnUnsubscribe(String channelId)
        {
            Console.WriteLine("Channel unsubscribed: " + channelId);
            //here you can make your trade decision
        }

        private void WsClient_OnLogin()
        {
            Console.WriteLine("Login Successful");
            //here you can make your trade decision
        }



        private void WsClient_Subscribe(Params param)
        {
            byte[] msg;
            if(param is TickerParams)
            {
                TickerParams tickerParams = ((TickerParams)param);
                var message = new protobuf.ws.SubscribeTickerChannelRequest
                {
                    CurrencyPair = tickerParams.symbol
                };
                if(tickerParams.frequency != null)
                {
                    message.Frequency = (float)tickerParams.frequency;
                }

                using (MemoryStream msgStream = new MemoryStream())
                {
                    ProtoBuf.Serializer.Serialize(msgStream, message);
                    msg = msgStream.ToArray();
                }
            } else
            {
                throw new NotImplementedException();
            }
            var meta = new protobuf.ws.WsRequestMetaData
            {
                RequestType = protobuf.ws.WsRequestMetaData.WsRequestMsgType.SubscribeTicker
            };

            protobuf.ws.WsRequest request = new protobuf.ws.WsRequest
            {
                Meta = meta,
                Msg = msg
            };

            sendRequest(request);

        }

        private void WsClient_Unsubscribe(protobuf.ws.UnsubscribeRequest.ChannelType type, String currencyPair)
        {
            protobuf.ws.UnsubscribeRequest message = new protobuf.ws.UnsubscribeRequest
            {
                channel_type = type,
                CurrencyPair = currencyPair
            };

            byte[] msg;

            using (MemoryStream msgStream = new MemoryStream())
            {
                ProtoBuf.Serializer.Serialize(msgStream, message);
                msg = msgStream.ToArray();
            };

            protobuf.ws.WsRequestMetaData meta = new protobuf.ws.WsRequestMetaData{
                RequestType = protobuf.ws.WsRequestMetaData.WsRequestMsgType.Unsubscribe
            };

            protobuf.ws.WsRequest request = new protobuf.ws.WsRequest{
                Meta = meta,
                Msg = msg
            };

            sendRequest(request);
        }

        private void WsClient_Login(String key, String secret, int ttl)
        {
            byte[] msg;

            protobuf.ws.LoginRequest message = new protobuf.ws.LoginRequest
            {
                ExpireControl = new protobuf.ws.RequestExpired
                {
                    Now = (long)(DateTime.UtcNow - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalMilliseconds,
                    Ttl = ttl
                },
                ApiKey = key
            };

            using (MemoryStream msgStream = new MemoryStream())
            {
                ProtoBuf.Serializer.Serialize(msgStream, message);
                msg = msgStream.ToArray();
            }
            byte[] sign = ComputeHash(secret, msg);
            var meta = new protobuf.ws.WsRequestMetaData
            {
                RequestType = protobuf.ws.WsRequestMetaData.WsRequestMsgType.Login,
                Sign = sign
            };

            protobuf.ws.WsRequest request = new protobuf.ws.WsRequest
            {
                Meta = meta,
                Msg = msg
            };

            sendRequest(request);
        }

        private void sendRequest(protobuf.ws.WsRequest request)
        {
            using (var requestStream = new MemoryStream())
            {
                ProtoBuf.Serializer.Serialize(requestStream, request);
                ws.Send(requestStream.ToArray());
            }
        }

        public void Dispose()
        {
            if (ws != null)
            {
                WsClient_Unsubscribe(protobuf.ws.UnsubscribeRequest.ChannelType.Ticker, "BTC/USD");
                //here you can make your trade decision
                Thread.Sleep(2000);
                ws.Close();
            }
        }

        private void processMessage(byte[] receivedData)
        {
            using (MemoryStream responseStream = new MemoryStream(receivedData))
            {
                protobuf.ws.WsResponse response = ProtoBuf.Serializer.Deserialize<protobuf.ws.WsResponse>(responseStream);
                if (response.Meta.ResponseType == protobuf.ws.WsResponseMetaData.WsResponseMsgType.TickerChannelSubscribed)
                {
                    using (MemoryStream messageStream = new MemoryStream(response.Msg))
                    {
                        protobuf.ws.TickerChannelSubscribedResponse message = ProtoBuf.Serializer.Deserialize<protobuf.ws.TickerChannelSubscribedResponse>(messageStream);
                        string channelId = "Ticker_" + message.CurrencyPair;
                        WsClient_OnSubscribe(channelId);
                        message.Datas.ForEach(delegate (protobuf.ws.TickerEvent evt) {
                            TickerEvent preparedEvent = prepareTickerEvent(evt);
                            preparedEvent.ChannelId = "Ticker_" + message.CurrencyPair;
                            WsClient_OnTicker(preparedEvent);
                        });
                    }
                } else if (response.Meta.ResponseType == protobuf.ws.WsResponseMetaData.WsResponseMsgType.TickerNotify)
                {
                    using (MemoryStream messageStream = new MemoryStream(response.Msg))
                    {
                        protobuf.ws.TickerNotification message = ProtoBuf.Serializer.Deserialize<protobuf.ws.TickerNotification>(messageStream);
                        string channelId = "Ticker_" + message.CurrencyPair;
                        message.Datas.ForEach(delegate (protobuf.ws.TickerEvent evt) {
                            TickerEvent preparedEvent = prepareTickerEvent(evt);
                            preparedEvent.ChannelId = "Ticker_" + message.CurrencyPair;
                            WsClient_OnTicker(preparedEvent);
                        });
                    }
                } else if (response.Meta.ResponseType == protobuf.ws.WsResponseMetaData.WsResponseMsgType.Error)
                {
                    using (MemoryStream messageStream = new MemoryStream(response.Msg))
                    {
                        protobuf.ws.ErrorResponse message = ProtoBuf.Serializer.Deserialize<protobuf.ws.ErrorResponse>(messageStream);
                        WsClient_OnError(message.Code, message.Message);
                    }
                } else if(response.Meta.ResponseType == protobuf.ws.WsResponseMetaData.WsResponseMsgType.ChannelUnsubscribed)
                {
                    using (MemoryStream messageStream = new MemoryStream(response.Msg)) {
                        protobuf.ws.ChannelUnsubscribedResponse message = ProtoBuf.Serializer.Deserialize<protobuf.ws.ChannelUnsubscribedResponse>(messageStream);
                        if (message.Type == protobuf.ws.UnsubscribeRequest.ChannelType.Ticker)
                        {
                            WsClient_OnUnsubscribe("Ticker_" + message.CurrencyPair);
                        }
                    }
                } else if (response.Meta.ResponseType == protobuf.ws.WsResponseMetaData.WsResponseMsgType.LoginResponse)
                {
                    WsClient_OnLogin();
                }
            }
        }

        private TickerEvent prepareTickerEvent(protobuf.ws.TickerEvent evt)
        {
            TickerEvent ticker = new TickerEvent();
            ticker.Last = parseDecimal(evt.Last);
            ticker.High = parseDecimal(evt.High);
            ticker.Low = parseDecimal(evt.Low);
            ticker.Volume = parseDecimal(evt.Volume);
            ticker.Vwap = parseDecimal(evt.Vwap);
            ticker.MaxBid = parseDecimal(evt.MaxBid);
            ticker.MinAsk = parseDecimal(evt.MinAsk);
            ticker.BestBid = parseDecimal(evt.BestBid);
            ticker.BestAsk = parseDecimal(evt.BestAsk);
            return ticker;
        } 

        private decimal parseDecimal(string number)
        {
            return Decimal.Parse(number, System.Globalization.NumberStyles.Float, System.Globalization.NumberFormatInfo.InvariantInfo);
        }

        private byte[] ComputeHash(string secret, byte[] message)
        {
            var key = Encoding.UTF8.GetBytes(secret);
            byte[] hash = null;
            using (var hmac = new HMACSHA256(key))
            {
                hash = hmac.ComputeHash(message);
            }

            return hash;
        }

        private string ByteArrayToString(byte[] ba)
        {
            StringBuilder hex = new StringBuilder(ba.Length * 2);
            foreach (byte b in ba)
                hex.AppendFormat("{0:x2}", b);
            return hex.ToString();
        }
    }

}
