import { scheduleNextRun } from "../scheduler/pr.js";

export function isOutsideWorkingHours(now) {
  const hour = now.hour;
  return hour < 8 || hour >= 17;
}

export function scheduleRunAtNextWorkingHour(now) {
  let nextRun = now.set({ hour: 8, minute: 0, second: 0, millisecond: 0 });

  if (now.hour >= 17) {
    nextRun = nextRun.plus({ days: 1 });
  }

  while ([6, 7].includes(nextRun.weekday)) {
    nextRun = nextRun.plus({ days: 1 });
  }

  const msUntilNextRun = nextRun.diff(now).as("milliseconds");
  const totalMinutes = Math.round(msUntilNextRun / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  console.log(
    `[Auto] Skipping PR check: ${now.toFormat(
      "HH:mm"
    )} (outside working hours in Lithuania). Next run in ${hours} hours ${minutes} minutes.`
  );

  scheduleNextRun(msUntilNextRun);
}
