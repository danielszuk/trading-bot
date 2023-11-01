import { binance as Binance } from "ccxt";
import cron from "node-cron";
import sellAtBestTime from "./sellAtBestTime";

// Configure how much time we maximum have to sell our assets
const sellingTimeframe = 1000 * 60 * 60 * 24 * 7; // 1 week in milliseconds
let sellingDeadline: number | undefined; // undefined means we are not in a selling period

// Initialize Binance API in sandbox mode
const exchange = new Binance();

// Check the balance every hour
cron.schedule("0 * * * *", async () => {
  const balance = await exchange.fetchBalance();
  const btcBalance = balance["BTC"];
  if (btcBalance.free != 0) {
    // if we have free BTC, sell it
    if (sellingDeadline === undefined) {
      // set selling deadline, if we haven't set already (which would mean we are already in a selling period)
      sellingDeadline = new Date().getTime() + sellingTimeframe;
    }

    const currencyPair = "BTC/USD";
    const filterTimeFrame = 1000 * 60 * 60 * 24 * 7; // 1 week in milliseconds
    const OHLCVTimeFrame = "1h"; // 1 hour

    // Get time frame for filtering OHLCV data
    const since = new Date().getTime() - filterTimeFrame;

    sellAtBestTime(
      0.4,
      sellingDeadline,
      sellingTimeframe,
      () => exchange.fetchOHLCV(currencyPair, OHLCVTimeFrame, since),
      () =>
        exchange.createOrder(currencyPair, "market", "sell", btcBalance.free)
    );
  }
});
