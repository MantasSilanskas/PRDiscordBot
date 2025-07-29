import { scheduleNextRun } from "../scheduler/pr.js";

const WORK_START_HOUR = 8;
const WORK_END_HOUR = 17;
const WEEKEND_DAYS = [6, 7];

export function isOutsideWorkingHours(now) {
  const { hour } = now;
  return hour < WORK_START_HOUR || hour >= WORK_END_HOUR;
}

export function scheduleRunAtNextWorkingHour(client, now) {
  let nextRun = now.set({
    hour: WORK_START_HOUR,
    minute: 0,
    second: 0,
    millisecond: 0,
  });

  if (now.hour >= WORK_END_HOUR) {
    nextRun = nextRun.plus({ days: 1 });
  }

  while (WEEKEND_DAYS.includes(nextRun.weekday)) {
    nextRun = nextRun.plus({ days: 1 });
  }

  const msUntilNextRun = nextRun.diff(now, "milliseconds").milliseconds;
  const totalMinutes = Math.round(msUntilNextRun / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  console.log(
    `🟠 [Auto] Skipping PR check: ${now.toFormat(
      "HH:mm"
    )} (outside working hours in Lithuania). Next run in ${hours}h ${minutes}m.`
  );

  scheduleNextRun(client, msUntilNextRun);
}
