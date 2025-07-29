function extractPRStatus(prInfo) {
  const participants = Array.isArray(prInfo.participants)
    ? prInfo.participants
    : [];
  const approvers = participants
    .filter((p) => p?.approved)
    .map((p) => p.user?.display_name || "Unknown");

  return {
    approvers,
    closer: prInfo.closed_by?.display_name ?? "Unknown",
    declineReason: prInfo.reason?.trim() || "No reason provided",
    title: prInfo.title?.trim() || "Untitled PR",
    author: prInfo.author?.display_name || "Unknown",
    url: prInfo.links?.html?.href || "No URL",
    state: prInfo.state?.toUpperCase() || "UNKNOWN",
  };
}

export function formatStatusMessage(prInfo) {
  const { approvers, closer, declineReason, title, author, url, state } =
    extractPRStatus(prInfo);

  const titleLine = `📝 ${title}\n👤 Author: ${author}`;

  if (state === "MERGED") {
    return [
      "✅ **Pull Request Merged** ✅",
      `🔍 Approved by: ${approvers.length ? approvers.join(", ") : "None"}`,
      titleLine,
      `🔗 ${url}`,
    ].join("\n");
  }

  return [
    "❌ **Pull Request Declined** ❌",
    `🛑 Declined by: ${closer}`,
    `📄 Reason: ${declineReason}`,
    titleLine,
    `🔗 ${url}`,
  ].join("\n");
}
