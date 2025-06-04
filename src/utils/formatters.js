function extractPRStatus(prInfo) {
  const approvers = prInfo.participants
    .filter((p) => p.approved)
    .map((p) => p.user.display_name);

  const closer = prInfo.closed_by?.display_name || "Unknown";
  const declineReason = prInfo.reason || "No reason provided";

  return { approvers, closer, declineReason };
}

export function formatStatusMessage(prInfo) {
  const { approvers, closer, declineReason } = extractPRStatus(prInfo);
  const titleLine = `[${prInfo.title}]\nAuthor: ${prInfo.author.display_name}`;
  const urlLine = prInfo.links.html.href;

  if (prInfo.state === "MERGED") {
    return [
      "✅ Merged ✅",
      `Approved by: ${approvers.join(", ") || "None"}`,
      titleLine,
      urlLine,
    ].join("\n");
  }

  return [
    "❌ Declined ❌",
    `Declined by: ${closer}`,
    `Reason: ${declineReason}`,
    titleLine,
    urlLine,
  ].join("\n");
}
