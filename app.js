'use strict';

const login = require('facebook-chat-api');
const bitcoinex = require('bitcoinex');
const request = require('request');
// const ggbMongo = require('./daemon/ggbMongo');
const Poloniex = require('poloniex.js');
const poloniex = new Poloniex();

const config = require('./config.js');

const THREAD_ID = config.thread_id; // Bitcoin chat box thread id.
const EMAIL = config.email;
const PASSWORD = config.password;
// Create simple echo bot

// const COMMAND_LIST = [
//   '/addlaoshi',
//   '/removelaoshi',
//   '/listlaoshi',
//   '/maicoin',
//   '/eth',
//   '/bitfinex',
// ];

let previousPrices;

function priceAlert(api) {
  poloniex.returnTicker((err, response) => {
    if (err) {
      console.log(`Error: prices not fetched. Retry in 5 seconds`);
      setTimeout(() => priceAlert(api), 1000 * 5); // try again in 5 seconds
    } else {
      if (!previousPrices) {
        console.log('initial prices fetched');
        previousPrices = response;
      } else {
        console.log('prices fetched');
        let text = '';
        config.coin_pairs.map((coin_pair) => {
          const currPrice = parseFloat(response[coin_pair].last);
          const prevPrice = parseFloat(previousPrices[coin_pair].last);
          const rate = (currPrice - prevPrice) / prevPrice;
          if (Math.abs(rate) > config.alert_rate) {
            text += `${coin_pair} ${config.alert_time_period}秒內從 ${prevPrice} ${currPrice > prevPrice ? '上升至' : '下降至'} ${currPrice} ，變化 ${(rate*100).toFixed(2)}%\n`;
          }
        });
        if (text) {  // not empty
          api.sendMessage(text, THREAD_ID);
          console.log(`message sent: ${text}`);
        }
        previousPrices = response;
      }
      setTimeout(() => priceAlert(api), 1000 * config.alert_time_period);
    }
  });
}

const echo = () => {
  login({ email: EMAIL, password: PASSWORD }, (err, api) => {
    if (err) {
      setInterval(echo, 1000 * 10);
      return console.error(err);
    }

    priceAlert(api);

    api.listen((listenError, message) => {
      if (!listenError) {
        if (/\/a/.test(message.body)) {
          poloniex.returnTicker((err, response) => {
            if (err) {
              // Log error message
              console.log("An error occurred: " + err.msg);
            } else {
              // console.log(response);
              let text = 'Poloniex 價格資訊：\n\n';
              config.coin_pairs.map(coin_pair => {
                text += `${coin_pair}: ${response[coin_pair].last} ${response[coin_pair].percentChange}\n`;
              });
              console.log(message.threadID);
              api.sendMessage(text, message.threadID);
            }
          });
        } else if (/\/bitfinex/.test(message.body)) {
          bitcoinex.getPriceWith('bitfinex', 'usd', (getPriceError, result) => {
            if (!getPriceError) {
              const text = `Bitfinex 的價格資訊：\n\n當日最高價(high): ${result.high.toFixed(2)} USD\n當日最低價(low): ${result.low.toFixed(2)} USD\n最後成交價(last): ${result.last.toFixed(2)} USD`;
              api.sendMessage(text, message.threadID);
            } else {
              console.error(getPriceError);
            }
          });
        } else if (/\/eth/.test(message.body)) {
          console.log('receive command: eth');
          request('https://api.coinbase.com/v2/prices/ETH-USD/spot', (error, response, body) => {
            if (error) console.error(`error:${error}`);
            else {
              const text = `Coinbase 的 ETH 最新成交價：${JSON.parse(body).data.amount} ${JSON.parse(body).data.currency}`;
              api.sendMessage(text, message.threadID);
            }
          });
        }
        console.log(message, null, 4);
      }
    });
    return 0;
  });
};

echo();

// module.exports = {
//   echo,
// };
