import sellAtBestTime from "./sellAtBestTime";

const oneDay = 1000 * 60 * 60 * 24;
const oneWeek = oneDay * 7;

const OHLCVSimple = [
  [undefined, 60, undefined, undefined, 125],
  [undefined, 125, undefined, undefined, 230],
  [undefined, 230, undefined, undefined, 215],
];

const OHLCVExtended = [
  [undefined, 60, undefined, undefined, 125],
  [undefined, 125, undefined, undefined, 230],
  [undefined, 230, undefined, undefined, 215],
  [undefined, 215, undefined, undefined, 250],
  [undefined, 220, undefined, undefined, 219],
];

const OHLCVComplex = [
  [undefined, 60, undefined, undefined, 125],
  [undefined, 125, undefined, undefined, 230],
  [undefined, 230, undefined, undefined, 215],
  [undefined, 215, undefined, undefined, 250],
  [undefined, 220, undefined, undefined, 219],
  [undefined, 219, undefined, undefined, 270],
  [undefined, 270, undefined, undefined, 280],
  [undefined, 280, undefined, undefined, 233],
  [undefined, 233, undefined, undefined, 330],
  [undefined, 350, undefined, undefined, 320],
];

test("should sell assets when the price is starting to decline", async () => {
  const sellAssets = jest.fn();
  const fetchOHLCV = jest.fn().mockResolvedValue(OHLCVSimple);

  await sellAtBestTime(
    0.5,
    new Date().getTime() + oneWeek,
    oneWeek,
    fetchOHLCV,
    sellAssets
  );

  expect(sellAssets).toHaveBeenCalledTimes(1);
});

test("should not sell assets if the price is in a growth period", async () => {
  const sellAssets = jest.fn();
  const fetchOHLCV = jest
    .fn()
    .mockResolvedValue([
      ...OHLCVSimple,
      [undefined, 215, undefined, undefined, 220],
    ]);

  await sellAtBestTime(
    0.5,
    new Date().getTime() + oneWeek,
    oneWeek,
    fetchOHLCV,
    sellAssets
  );

  expect(sellAssets).toHaveBeenCalledTimes(0);
});

test("should not sell assets if the price last growth period was not good enough", async () => {
  const sellAssets = jest.fn();
  const fetchOHLCV = jest.fn().mockResolvedValue(OHLCVExtended);

  await sellAtBestTime(
    0.5,
    new Date().getTime() + oneWeek,
    oneWeek,
    fetchOHLCV,
    sellAssets
  );

  expect(sellAssets).toHaveBeenCalledTimes(0);
});

test("should sell assets if the price last growth period was not good, but the risk tolerance is really low", async () => {
  const sellAssets = jest.fn();
  const fetchOHLCV = jest.fn().mockResolvedValue(OHLCVExtended);

  await sellAtBestTime(
    0.2,
    new Date().getTime() + oneWeek,
    oneWeek,
    fetchOHLCV,
    sellAssets
  );

  expect(sellAssets).toHaveBeenCalledTimes(1);
});

test("should sell assets if the price last growth period was not good, but the time pressure is high", async () => {
  const sellAssets = jest.fn();
  const fetchOHLCV = jest.fn().mockResolvedValue(OHLCVExtended);

  await sellAtBestTime(
    0.5,
    new Date().getTime() + oneDay * 2, // 2 days
    oneWeek,
    fetchOHLCV,
    sellAssets
  );

  expect(sellAssets).toHaveBeenCalledTimes(1);
});

test("should sell assets based on a complex OHLCV", async () => {
  const sellAssets = jest.fn();
  const fetchOHLCV = jest.fn().mockResolvedValue(OHLCVComplex);

  await sellAtBestTime(
    0.5,
    new Date().getTime() + oneDay * 2, // 2 days
    oneWeek,
    fetchOHLCV,
    sellAssets
  );

  expect(sellAssets).toHaveBeenCalledTimes(1);
});

test("should not sell assets based on a complex OHLCV if risk tolerance is higher and time pressure is lower", async () => {
  const sellAssets = jest.fn();
  const fetchOHLCV = jest.fn().mockResolvedValue(OHLCVComplex);

  await sellAtBestTime(
    0.9,
    new Date().getTime() + oneDay * 5,
    oneWeek,
    fetchOHLCV,
    sellAssets
  );

  expect(sellAssets).toHaveBeenCalledTimes(0);
});
