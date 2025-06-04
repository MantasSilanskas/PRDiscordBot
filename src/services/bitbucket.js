export async function fetchPullRequests(auth_token) {
  const response = await fetch(
    "https://api.bitbucket.org/2.0/repositories/peplinkec/fusionsim-cloud/pullrequests?pagelen=50",
    {
      method: "GET",
      headers: {
        Authorization: auth_token,
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();
  return data.values;
}

export async function fetchPullRequestDetails(prUrl, auth_token) {
  const match = prUrl.match(
    /bitbucket\.org\/([^\/]+)\/([^\/]+)\/pull-requests\/(\d+)/
  );

  if (!match) throw new Error(`Invalid PR URL: ${prUrl}`);

  const [, workspace, repoSlug, prId] = match;

  const response = await fetch(
    `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/pullrequests/${prId}`,
    {
      method: "GET",
      headers: {
        Authorization: auth_token,
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch PR details. Status: ${response.status}`);
  }

  return await response.json();
}

export function categorizePRs(prs) {
  let activeCount = 0;
  let wipCount = 0;
  let haltedCount = 0;

  const filteredPRs = [];

  for (const pr of prs) {
    const prTitle = pr.title.toLowerCase();

    if (pr.draft) {
      wipCount++;
      console.log(
        `Skipped Draft Pull Request by ${pr.author.display_name} - ${pr.title}`
      );
      continue;
    }

    if (prTitle.includes("wip")) {
      wipCount++;
      console.log(
        `Skipped WIP Pull Request by ${pr.author.display_name} - ${pr.title}`
      );
      continue;
    }

    if (prTitle.includes("halt")) {
      haltedCount++;
      console.log(
        `Skipped Halted Pull Request by ${pr.author.display_name} - ${pr.title}`
      );
      continue;
    }

    activeCount++;
    filteredPRs.push(pr);
  }

  return { activeCount, wipCount, haltedCount, filteredPRs };
}
