// SHARED (frozen). Every function is pre-exported; owners only edit their own folder.
import { initializeApp } from 'firebase-admin/app';
initializeApp();

// Andreea
export { parseCheckin } from './checkin/parseCheckin';
export { summarizeState } from './checkin/summarizeState';
// Alexandra
export { planDay } from './day/planDay';
export { breakdownTask } from './day/breakdownTask';
export { jiraIssues } from './day/jiraIssues';
export { composeContribution } from './aac/composeContribution';
export { prepareMeeting } from './aac/prepareMeeting';
// Alina
export { advocateChat } from './advocate/advocateChat';
export { sendRequest } from './advocate/sendRequest';
export { decodeMessage } from './advocate/decodeMessage';
