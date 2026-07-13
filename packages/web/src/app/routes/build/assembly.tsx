import { cn } from "@/lib/utils";
import {
  IconAdjustmentsHorizontal,
  IconBolt,
  IconCpu,
  IconCube,
  IconPlayerPlay,
  IconPlugConnected,
  IconSettings2,
  IconTool,
} from "@tabler/icons-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

interface Step {
  key: string;
  text: ReactNode;
  note?: ReactNode;
  images?: string[];
}

interface Phase {
  title: string;
  icon: typeof IconCube;
  steps: Step[];
}

const PHASES: Phase[] = [
  {
    title: "Print the structural parts",
    icon: IconCube,
    steps: [
      {
        key: "print-enclosure",
        text: (
          <>
            Slice and print the enclosure and three module housings from{" "}
            <a
              href="https://github.com/dishwasher-detergent/mault/blob/master/3d%20model/card_sorter.3mf"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              card_sorter.3mf
            </a>{" "}
            (or re-export from{" "}
            <a
              href="https://github.com/dishwasher-detergent/mault/blob/master/3d%20model/Card%20Sorter.f3d"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Card Sorter.f3d
            </a>
            ).
          </>
        ),
        note: "PLA is fine for the housings; PETG if the unit will sit somewhere warm.",
      },
      {
        key: "dry-fit",
        text: "Dry-fit each module housing before inserting any electronics — sand or adjust any tight servo pockets now.",
        images: [
          "/instructions/top_down_view_device.jpg",
          "/instructions/corner_view_device.jpg",
          "/instructions/front_view_device.jpg",
        ],
      },
      {
        key: "mount-boards-to-panels",
        text: "Mount the Arduino and PCA9685 servo driver board to the base panels with 8 M2×6 screws.",
      },
      {
        key: "attach-base-panels",
        text: "Attach the base panels to the base with 8 M3×6 screws and 8 M3 nuts.",
        note: "Do this after the Arduino and PCA9685 are mounted to the panels — the boards are much harder to reach once the panels are on the base.",
      },
    ],
  },
  {
    title: "Mount the servos",
    icon: IconTool,
    steps: [
      {
        key: "mount-module-servos",
        text: "Install the bottom, paddle, and pusher servo into each of the 3 module housings (9 servos total).",
        note: "Center each servo at its neutral pulse before screwing down the horn, so mechanical range matches the firmware's open/closed travel.",
        images: ["/instructions/top_down_view_module.jpg"],
      },
      {
        key: "mount-bottom-flapper",
        text: "Attach the bottom flapper to the bottom servo's horn with M2×4 screws, servo held at its closed pulse so the flapper seats flush across the card path.",
        note: "This is the trapdoor a card falls through to reach the next module, or the current one on a match.",
        images: ["/instructions/bottom_paddle.jpg"],
      },
      {
        key: "mount-side-flappers",
        text: "Before attaching anything, command each paddle servo through its full range to confirm the linkage can reach fully open without binding. Then, with the servo held at its closed position, attach the left and right flapper to the shared linkage with M2×4 screws (one pair per module) so both sit flush and even.",
        note: "One paddle servo drives both flappers together — they open and close as a pair, not independently. Fit the flappers closed first; the exact open-position pulse gets fine-tuned later from the Module Calibration Grid.",
        images: ["/instructions/side_paddles.jpg"],
      },
      {
        key: "mount-pusher-arm",
        text: "Before fitting the arm, sweep the pusher servo through its full left-to-right range and find its true mechanical middle. With the servo held at that middle position, attach the card pusher arm to the horn with M2×4 screws so it sits centered between the left and right bins.",
        note: "Fitting the arm off-center biases the push distance to one side — the exact left/right pulses get fine-tuned later from the Module Calibration Grid.",
        images: ["/instructions/pusher_arms.jpg"],
      },
      {
        key: "fit-feeder-orings",
        text: "Fit 6 G20 o-rings onto the feeder roller.",
        note: "These give the roller grip on the card face — space them evenly along the roller's length.",
      },
      {
        key: "mount-feeder-roller",
        text: "Attach the roller to the feeder module.",
        images: ["/instructions/feeder_roller.jpg"],
      },
      {
        key: "mount-feeder-servo",
        text: "Install the continuous-rotation feeder servo to the roller, at the base of the hopper.",
        images: ["/instructions/feeder_servo.jpg"],
      },
    ],
  },
  {
    title: "Mount the IR sensors",
    icon: IconAdjustmentsHorizontal,
    steps: [
      {
        key: "mount-module-ir",
        text: "Fix one IR sensor at the gate of each module (1, 2, 3), aimed across the card path.",
      },
      {
        key: "mount-hopper-ir",
        text: "Fix the fourth IR sensor in the hopper throat, just above the feeder.",
        note: "This one tells the feeder when the hopper is empty — placement matters more than the module sensors.",
      },
    ],
  },
  {
    title: "Wire the electronics",
    icon: IconPlugConnected,
    steps: [
      {
        key: "wire-i2c",
        text: "Wire the PCA9685 to the Arduino's I²C bus (SDA/SCL) and 5V/GND for logic power.",
        note: "See the Wiring section above.",
      },
      {
        key: "wire-servos",
        text: "Wire all 10 servos into PCA9685 channels 0–13 per the channel map.",
      },
      {
        key: "wire-sensors",
        text: "Wire the 4 IR sensors to D2–D5.",
      },
      {
        key: "wire-power",
        text: "Bring the external 5V supply into the PCA9685 V+/GND terminal, and tie its ground to the Arduino's ground.",
        note: "Skipping the common ground is the #1 cause of servos that twitch but never move correctly.",
      },
    ],
  },
  {
    title: "Flash the firmware",
    icon: IconCpu,
    steps: [
      {
        key: "install-libraries",
        text: "In the Arduino IDE, install the ArduinoJson and Adafruit PWM Servo Driver libraries.",
        note: "Library Manager → search each by name.",
      },
      {
        key: "upload-sketch",
        text: 'Select board "Arduino Uno R4 Minima", select the correct port, then upload arduino/main/main.ino.',
      },
      {
        key: "confirm-ready",
        text: 'Open the Serial Monitor at 9600 baud and confirm you see {"status":"ready"} after the board resets.',
      },
    ],
  },
  {
    title: "First power-on test",
    icon: IconBolt,
    steps: [
      {
        key: "run-test-command",
        text: 'With the external servo supply connected, send {"test": true} over serial.',
        note: "Cycles every bottom and paddle open, sweeps all pushers left then right, resets to neutral, then briefly spins the feeder.",
      },
      {
        key: "watch-modules",
        text: "Watch each module during the test — confirm nothing binds or grinds at the end of its travel.",
        note: "If a servo strains at open or closed, its housing cutout likely needs adjusting before calibration.",
      },
    ],
  },
  {
    title: "Calibrate from the app",
    icon: IconSettings2,
    steps: [
      {
        key: "connect-serial",
        text: "Connect the Arduino to the app via Web Serial, then open /app/calibrate.",
      },
      {
        key: "calibrate-modules",
        text: "Module Calibration Grid — set the open/closed pulse for each bottom and paddle, and left/neutral/right for each pusher, module by module.",
      },
      {
        key: "calibrate-feeder",
        text: "Feeder Calibration Panel — tune feed speed, pulse/pause timing, and settle duration against your actual hopper.",
      },
      {
        key: "check-ir",
        text: "IR Sensor Panel — verify all 4 sensors report present/absent correctly with a card in hand.",
      },
      {
        key: "test-bins",
        text: "Bin Routing Controls — send a test card to each of the 7 bins in turn and confirm it lands correctly.",
      },
    ],
  },
  {
    title: "Load and run",
    icon: IconPlayerPlay,
    steps: [
      {
        key: "load-hopper",
        text: "Load the hopper and confirm the feeder stops pulsing once the hopper IR reads empty.",
      },
      {
        key: "full-pass",
        text: "Run a full scan-to-bin pass end to end before leaving the unit unattended.",
      },
    ],
  },
];

const STORAGE_KEY = "magic-vault:build-checklist";

function useChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChecked(JSON.parse(raw));
    } catch {
      // ignore malformed/unavailable storage
    }
  }, []);

  const toggle = (key: string) => {
    setChecked((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore unavailable storage
      }
      return next;
    });
  };

  return { checked, toggle };
}

export function BuildAssembly() {
  const { checked, toggle } = useChecklist();

  const allSteps = useMemo(() => PHASES.flatMap((p) => p.steps), []);
  const doneCount = allSteps.filter((s) => checked[s.key]).length;
  const pct = allSteps.length
    ? Math.round((doneCount / allSteps.length) * 100)
    : 0;

  return (
    <section id="assembly" className="mx-auto max-w-4xl px-4 py-16">
      <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
        Assembly
      </h2>
      <p className="mt-3 max-w-2xl text-sm/relaxed text-muted-foreground">
        Eight phases, structural work first. Checkboxes are saved in this
        browser, so you can close the tab mid-build and pick back up later.
      </p>

      <div className="mt-6">
        <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
          <span>
            {doneCount} of {allSteps.length} steps
          </span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary/50">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        {PHASES.map((phase, i) => (
          <div key={phase.title} className="rounded-lg border bg-card">
            <div className="flex items-center gap-3 border-b bg-secondary/30 px-4 py-3 md:px-5">
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <phase.icon size={16} />
              </span>
              <div className="flex flex-col items-baseline">
                <span className="font-mono text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Phase {i + 1}
                </span>
                <h3 className="font-heading text-sm font-semibold">
                  {phase.title}
                </h3>
              </div>
            </div>
            <div className="flex flex-col px-4 md:px-5">
              {phase.steps.map((step, j) => (
                <label
                  key={step.key}
                  htmlFor={step.key}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 py-3",
                    j !== phase.steps.length - 1 && "border-b border-dashed",
                  )}
                >
                  <input
                    id={step.key}
                    type="checkbox"
                    checked={!!checked[step.key]}
                    onChange={() => toggle(step.key)}
                    className="mt-0.5 size-4 shrink-0 accent-primary"
                  />
                  <div>
                    <p
                      className={cn(
                        "text-xs/relaxed",
                        checked[step.key] &&
                          "text-muted-foreground line-through decoration-muted-foreground/50",
                      )}
                    >
                      {step.text}
                    </p>
                    {step.note && (
                      <p className="mt-1 text-[11px]/relaxed text-muted-foreground">
                        {step.note}
                      </p>
                    )}
                    {step.images && step.images.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {step.images.map((src) => (
                          <img
                            key={src}
                            src={src}
                            alt=""
                            className="max-w-sm rounded-md border"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
