const config = {};

// use this facebook account as a bot
config.email = '';
config.password = '';

// the messenger thread you would like to send alerts to
config.thread_id = '';

// alert config
config.alert_time_interval = 10; // check the prices every xx seconds
config.alert_rate = 0.02; // send alert when price change over +- xx * 100%
config.alert_coin_pairs = [
  'USDT_BTC',
  'BTC_ETH',
];

module.exports = config;
