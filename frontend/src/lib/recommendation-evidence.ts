/** Turn durable agent evidence into language that makes sense to a learner. */
export function learnerFacingEvidence(evidence: string): string | null {
  const focus = evidence.match(/^focus:\s*(.+?)(?:\s*\([^)]*interest points\))?$/i);
  if (focus) return `Strongest theme: ${focus[1]}`;

  const engagement = evidence.match(/^(\d+s) engaged with (.+)$/i);
  if (engagement) return `You spent ${engagement[1]} exploring ${engagement[2]}`;

  if (/^building beyond enrolled\s+/i.test(evidence)) return null;

  const avoided = evidence.match(/^avoiding (.+) after learner feedback$/i);
  if (avoided) return `Keeping ${avoided[1]} out based on your feedback`;

  return evidence;
}

export function learnerFacingEvidenceList(evidence: string[]): string[] {
  return evidence.map(learnerFacingEvidence).filter((item): item is string => Boolean(item));
}
