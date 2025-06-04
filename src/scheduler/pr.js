import { DateTime } from "luxon";
import { env } from "../config/config.js";
import { getTargetChannel, createFakeMessage } from "../services/discord.js";
import {
  isOutsideWorkingHours,
  scheduleRunAtNextWorkingHour,
} from "../utils/time.js";

let prInterval;
let hasSchedulerRunOnce = false;

export async function schedulePRCheck(client) {
  if (shouldSkipFirstRun()) {
    scheduleNextRun(15 * 60 * 1000);
    return;
  }

  const nowInVilnius = DateTime.now().setZone(env.timezone);

  if (isOutsideWorkingHours(nowInVilnius)) {
    scheduleRunAtNextWorkingHour(nowInVilnius);
    return;
  }

  const channel = getTargetChannel(client, env.channel_id);
  if (!channel) return;

  const fakeMessage = createFakeMessage(channel);

  await handlePRCommand(fakeMessage);

  scheduleNextRun(15 * 60 * 1000);
}

function shouldSkipFirstRun() {
  if (!hasSchedulerRunOnce) {
    console.log(
      `[Auto] Skipping first scheduled PR check after startup (${DateTime.now()
        .setZone(env.timezone)
        .toFormat("HH:mm:ss")})`
    );
    hasSchedulerRunOnce = true;
    return true;
  }
  return false;
}

export function scheduleNextRun(ms) {
  prInterval = setTimeout(schedulePRCheck, ms);
}
