import { LogStyles, log, style, clear, pushToTop } from "@tsmodule/log";
import cliSpinners from "cli-spinners";

export interface SpinnerConfigs {
  [text: string]: () => void | Promise<void>;
}

export type SpinnerState = "running" | "success" | "failure";

export type SpinnersArgs = {
  /**
   * The title of this spinner.
   */
  title?: string;
  /**
   * The type of spinner to use.
   */
  spinner?: cliSpinners.SpinnerName;
  /**
   * Whether to flush stdout on each frame (clearing previous contents, "kiosk"
   * experience).
   */
  flush?: boolean;
};

export type SpinnerResult = {
  successes: string[];
  failures: [string, string][];
};

export const spinners = async (
  configs: SpinnerConfigs,
  {
    title,
    spinner = "dots",
    flush = false,
  }: SpinnersArgs = {},
): Promise<SpinnerResult> => {
  let failed = 0;
  let finished = 0;

  const spinnerEntries = Object.entries(configs);
  const spinnerStates: Map<string, SpinnerState> = new Map();
  const spinnerErrors = new Map<string, string>();

  const successes: string[] = [];
  const failures: [string, string][] = [];

  /**
   * Initialize all spinner states to "running".
   */
  for (const [text] of spinnerEntries) {
    spinnerStates.set(
      text,
      "running"
    );
  }

  pushToTop();

  await Promise.all([
    /**
     * Run spinners.
     */
    (async () => {
      const { frames, interval } = cliSpinners[spinner];

      while (finished < spinnerEntries.length) {
        for (const frame of frames) {
          let frameOutput = "";
          if (title) {
            frameOutput += style(title, ["bold", "underline"]);
            frameOutput += "\n\n";
          }

          for (const [text] of spinnerEntries) {
            const state = spinnerStates.get(text);

            /**
             * If stdout is not a TTY, only show the first frame. This will let
             * us deduplicate all the frames of an in-progress spinner as just
             * one frame.
             */
            let prefix = process.stdout.isTTY ? frame : frames[0];
            const lineStyles: LogStyles[] = ["bold"];

            switch (state) {
              case "success":
                prefix = "✓";
                lineStyles.push("green");
                break;

              case "failure":
                prefix = "✗";
                lineStyles.push("red");
                break;
            }

            frameOutput += style(`  ${prefix}  ${text}`, lineStyles);
            frameOutput += "\n\n";

            const errors = spinnerErrors.get(text);
            if (errors) {
              frameOutput += style(`     ${errors}`, ["red"]);
              frameOutput += "\n\n";
            }
          }

          clear({ flush, overwrite: true });
          log(`${frameOutput}`);
          await new Promise((resolve) => setTimeout(resolve, interval));
        }
      }
    })(),
    /**
     * Execute spinner processes.
     */
    Promise.all(
      spinnerEntries.map(
        async ([text, fn]) => {
          spinnerStates.set(text, "running");
          try {
            await fn();
            spinnerStates.set(text, "success");
            successes.push(text);
          } catch (e) {
            spinnerStates.set(text, "failure");
            spinnerErrors.set(text, String(e));

            failures.push([text, String(e)]);
            failed++;
          } finally {
            finished++;
          }
        }
      )
    ),
  ]);

  const results = {
    successes,
    failures,
  };

  if (failed > 0) {
    // throw `${failed} spinner(s) failed.`;
    throw results;
  }

  return results;
};