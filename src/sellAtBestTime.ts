import { OHLCV } from "ccxt";
import logger from "./utils/logger";

const sellAtBestTime = async (
  riskTolerance: number, // between 0 - 1 (1 is very tolerant, 0 is not tolerant at all)
  sellingDeadline: number,
  sellingTimeframe: number,
  fetchOHLCV: () => Promise<OHLCV[]>,
  sellAssets: () => Promise<unknown>
) => {
  // fetch OHLCV data
  logger.info("Fetching OHLCV data...");
  const ohlcv = await fetchOHLCV();
  if (ohlcv.length === 0) throw new Error("No OHLCV data found");
  logger.info("OHLCV data fetched", { length: ohlcv.length });

  // Loop through tickers and calculate growths (close - open)
  const tickerGrowths: number[] = [];
  ohlcv.forEach((ticker) => {
    const [_timestamp, open, _high, _low, close] = ticker;

    const growth = close - open;
    if (growth !== 0) tickerGrowths.push(growth);
  });
  logger.debug("tickerGrowths calculated", { tickerGrowths });

  // Calculate "growth periods" and "decline periods"
  const periodGrowths: number[] = [tickerGrowths[0]];
  tickerGrowths.splice(1).forEach((tickerGrowth) => {
    const currentPeriod = periodGrowths[periodGrowths.length - 1];

    if (
      (tickerGrowth > 0 && currentPeriod > 0) ||
      (tickerGrowth < 0 && currentPeriod < 0)
    ) {
      // if the ticker's growth is in the same direction as the current period, add it to the current period
      periodGrowths[periodGrowths.length - 1] += tickerGrowth;
    } else if (
      (tickerGrowth > 0 && currentPeriod < 0) ||
      (tickerGrowth < 0 && currentPeriod > 0)
    ) {
      // if the ticker's growth is in the opposite direction as the current period, start a new period
      periodGrowths.push(tickerGrowth);
    }
  });
  logger.debug("periodGrowths calculated", { periodGrowths });

  const highestGrowthPeriod = Math.max(...periodGrowths);
  const currentPeriodGrowth = periodGrowths[periodGrowths.length - 1];
  const lastPeriodGrowth = periodGrowths[periodGrowths.length - 2];

  logger.debug("interested periods", {
    highestGrowthPeriod,
    lastPeriodGrowth,
    currentPeriodGrowth,
  });
  if (lastPeriodGrowth > 0 && currentPeriodGrowth < 0) {
    // we are selling when the last period was a growth period, and the price is starting to decline in the current period
    const periodGrowthEvaluation = lastPeriodGrowth / highestGrowthPeriod; // between 0 - 1 (1 is highest growth, 0 is no growth)
    const timePressure =
      (sellingDeadline - new Date().getTime()) / sellingTimeframe; // between 0 - 1 (0 is highest pressure, 1 is no time pressure)
    logger.debug("risk measurements", {
      periodGrowthEvaluation,
      timePressure,
      riskTolerance,
    });
    if (periodGrowthEvaluation > riskTolerance * timePressure) {
      // When the last growth period was "good enough", sell assets
      await sellAssets();
    }
  }
};

export default sellAtBestTime;
