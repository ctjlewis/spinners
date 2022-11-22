import { spinners } from "../dist/index.js";

const sleep = (ms: number) => new Promise(
  (resolve) => setTimeout(resolve, ms)
);

try {
  await spinners({
    "Set: APU ON": async () => {
      await sleep(5000);
      throw "APU failed to start";
    },

    "Set: Fuel cutoff OFF": async () => {
      await sleep(1000);
    },

    "Set: Flaps 20%": async () => {
      await sleep(2000);
    }
  }, {
    title: "Takeoff procedure"
  });
} catch (e) {
  await spinners({
    "Set: APU OFF": async () => {
      await sleep(1000);
    },
    "Set: Fuel cutoff ON": async () => {
      await sleep(1000);
    },
    "Set: Throttle 0%": async () => {
      await sleep(1000);
    }
  }, {
    title: "Abort procedure"
  });

  // eslint-disable-next-line no-console
  console.log("Threw error", e);
}