import type { SiteCrawlComparison, SiteCrawlResult } from '../types';

export function compareSiteCrawls(previous: SiteCrawlResult, current: SiteCrawlResult): SiteCrawlComparison {
  const previousIssues = new Map(previous.issues.map(issue => [issue.id, issue]));
  const currentIssues = new Map(current.issues.map(issue => [issue.id, issue]));
  const previousIds = new Set(previousIssues.keys());
  const currentIds = new Set(currentIssues.keys());

  return {
    previousHealthScore: previous.healthScore,
    healthScoreDelta: current.healthScore - previous.healthScore,
    resolvedIssueIds: [...previousIds].filter(id => !currentIds.has(id)),
    newIssueIds: [...currentIds].filter(id => !previousIds.has(id)),
    improvedIssueIds: [...currentIds].filter(id => {
      const before = previousIssues.get(id);
      const after = currentIssues.get(id);
      return Boolean(before && after && after.count < before.count);
    }),
    regressedIssueIds: [...currentIds].filter(id => {
      const before = previousIssues.get(id);
      const after = currentIssues.get(id);
      return Boolean(before && after && after.count > before.count);
    }),
  };
}
