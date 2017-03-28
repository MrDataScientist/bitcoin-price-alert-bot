'use strict';

const login = require('facebook-chat-api');
const Poloniex = require('poloniex.js');

const config = require('./config.js')

const poloniex = new Poloniex();
let previousPrices;
let threadList = [];

const bot = () => {
  login({ email: config.email, password: config.password }, (err, api) => {
    if (err) {
      setInterval(bot, 1000 * 10);
      return console.error(err);
    }
    initialize(api);

    api.listen((listenError, message) => {
      if (!listenError) {
        console.log(message);
        if (/\/a/.test(message.body)) {
          returnPrices(api, message);
        }
      }
    });
    return 0;
  });
};

function initialize(api) {
  console.log('Getting thread list...');
  api.getThreadList(null, null, 'inbox', (err, arr) => {
    if (err) {
      console.log('Error: Thread list not fetched. Retry in 5 seconds.');
      setTimeout(() => initialize(api), 1000 * 5);
    } else {
      console.log('Thread list fetched.');
      threadList = arr;

      // console.log('Sending initial message...');
      // sendInitialMessage(api);

      console.log('Start monitoring prices.');
      monitorPrices(api);
    }
  });
}

function sendInitialMessage(api) {
  let text = `Hi! I'm price alert bot!\nI'm monitoring the prices of\n`;
  config.alert_coin_pairs.map((coin_pair) => {
    text += coin_pair + `\n`;
  });
  text += `and if a price changes over +- ${config.alert_rate * 100}% in ${config.alert_time_interval} seconds, I will tell you immediately!`

  threadList.map((thread) => {
    api.sendMessage(text, thread.threadID);
    console.log(`Initial message sent to thread ${thread.threadID}`);
  });
}

function monitorPrices(api) {
  poloniex.returnTicker((err, response) => {
    if (err || !response) {
      console.log(`Error: prices not fetched. Retry in 5 seconds`);
      setTimeout(() => monitorPrices(api), 1000 * 5); // try again in 5 seconds
    } else {
      if (!previousPrices) {
        console.log('initial prices fetched');
        previousPrices = response;
      } else {
        console.log('prices fetched');
        try {
          // for each coin pair, check if the rate of change is greater than the threshold
          let text = '';
          config.alert_coin_pairs.map((coin_pair) => {
            const currPrice = parseFloat(response[coin_pair].last);
            const prevPrice = parseFloat(previousPrices[coin_pair].last);
            const rate = (currPrice - prevPrice) / prevPrice;
            if (Math.abs(rate) > config.alert_rate) {
              text += `${coin_pair} ${currPrice > prevPrice ? '▲' : '▼'}${(rate*100).toFixed(2)}%\nfrom ${prevPrice} \nto ${currPrice} in ${config.alert_time_interval} seconds.\n`;
            }
          });
          // if text not empty, send the alert
          if (text) {
            threadList.map((thread) => {
              api.sendMessage(text, thread.threadID);
              console.log(`Message '${text}' sent to thread ${thread.threadID}`);
            });
          }
          previousPrices = response;
        }
        catch(err) {
          console.log('Error in monitorPrices: prices fetched but something went wrong');
          console.log('err: ', err);
          console.log('response: ', response);
        }
      }
      setTimeout(() => monitorPrices(api), 1000 * config.alert_time_interval);
    }
  });
}

function returnPrices(api, message) {
  poloniex.returnTicker((err, response) => {
    if (err || !response) {
      console.log(`Error: prices not fetched. Retry in 5 seconds`);
      setTimeout(() => returnPrices(api, message), 1000 * 5); // try again in 5 seconds
    } else {
      try {
        let text = ``;
        config.alert_coin_pairs.map(coin_pair => {
          text += `${coin_pair}: ${response[coin_pair].last} ${response[coin_pair].percentChange}\n`;
        });
        console.log(message.threadID);
        api.sendMessage(text, message.threadID);
      }
      catch(err) {
        console.log('Error in returnPrices: prices fetched but something went wrong');
        console.log('err: ', err);
        console.log('response: ', response);
      }
    }
  });
}

bot();

// module.exports = {
//   bot,
// };
