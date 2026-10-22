// Owner: Alexandra. Real Jira Cloud (stretch of the integration track). Token never reaches the client.
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { requireAuth, requireUid, REGION } from '../lib/auth';
import type { WorkTask } from '../lib/types';

const JIRA_EMAIL = defineSecret('JIRA_EMAIL');
const JIRA_TOKEN = defineSecret('JIRA_TOKEN');

const mapStatus = (cat: string, name: string): WorkTask['status'] =>
  /block/i.test(name) ? 'blocked' : cat === 'done' ? 'done' : cat === 'indeterminate' ? 'in_progress' : 'todo';
const mapPriority = (p?: string): WorkTask['priority'] => (/high|highest|critical/i.test(p ?? '') ? 'high' : /low/i.test(p ?? '') ? 'low' : 'medium');

export const jiraIssues = onCall({ region: REGION, secrets: [JIRA_EMAIL, JIRA_TOKEN] }, async (req) => {
  requireAuth(req);
  const base = process.env.JIRA_BASE_URL;
  if (!base || JIRA_EMAIL.value() === 'none') throw new HttpsError('failed-precondition', 'Jira not configured');
  const jql = process.env.JIRA_JQL ?? 'assignee=currentUser() AND statusCategory!=Done';
  const auth = Buffer.from(`${JIRA_EMAIL.value()}:${JIRA_TOKEN.value()}`).toString('base64');
  const res = await fetch(`${base}/rest/api/3/search/jql`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ jql, maxResults: 20, fields: ['summary', 'status', 'priority', 'duedate', 'statuscategorychangedate', 'timeoriginalestimate'] }),
  });
  if (!res.ok) throw new HttpsError('unavailable', `Jira ${res.status}`);
  const json: any = await res.json();
  return (json.issues ?? []).map((i: any): WorkTask => ({
    id: i.key, title: i.fields.summary,
    status: mapStatus(i.fields.status?.statusCategory?.key, i.fields.status?.name),
    priority: mapPriority(i.fields.priority?.name),
    dueDate: i.fields.duedate ?? undefined,
    estimateMin: i.fields.timeoriginalestimate ? Math.round(i.fields.timeoriginalestimate / 60) : undefined,
    daysInStatus: i.fields.statuscategorychangedate ? Math.floor((Date.now() - Date.parse(i.fields.statuscategorychangedate)) / 864e5) : undefined,
    url: `${base}/browse/${i.key}`, source: 'jira',
  }));
});
