import { DateTime } from "luxon";
import { env } from "../config/config.js";
import { handlePRCommand } from "../commands/pr.js";
import {
  getTargetChannel,
  createFakeMessage,
  notifyError,
} from "../services/discord.js";
import {
  isOutsideWorkingHours,
  scheduleRunAtNextWorkingHour,
} from "../utils/time.js";

// eslint-disable-next-line no-unused-vars
let prInterval;
let hasSchedulerRunOnce = false;

export async function schedulePRCheck(client) {
  if (shouldSkipFirstRun()) {
    scheduleNextRun(client, 15 * 60 * 1000);
    return;
  }

  const nowInTimezone = DateTime.now().setZone(env.timezone);

  if (isOutsideWorkingHours(nowInTimezone)) {
    scheduleRunAtNextWorkingHour(client, nowInTimezone);
    return;
  }

  const channel = getTargetChannel(client, env.channel_id);
  if (!channel) return;

  const fakeMessage = createFakeMessage(channel);

  await handlePRCommand(fakeMessage, client).catch((error) => {
    console.error("Error in handlePRCommand:", error);
    notifyError(client, error).catch((err) =>
      console.error("Failed to notify about error:", err)
    );
  });

  scheduleNextRun(client, 15 * 60 * 1000);
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

export function scheduleNextRun(client, ms) {
  prInterval = setTimeout(() => schedulePRCheck(client), ms);
}
