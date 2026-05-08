export const KPI = [
  { label: 'Active users',    value: '12,489', delta: '+4.2%' },
  { label: 'MRR',             value: '$84.3k', delta: '+1.1%' },
  { label: 'Churn',           value: '2.4%',   delta: '-0.3%' },
  { label: 'NPS',             value: '72',     delta: '+5' },
];

export const PEOPLE = [
  { name: 'Ada Lovelace',  role: 'Engineer',   avatar: 'AL' },
  { name: 'Grace Hopper',  role: 'Architect',  avatar: 'GH' },
  { name: 'Alan Turing',   role: 'Researcher', avatar: 'AT' },
  { name: 'Linus T.',      role: 'Maintainer', avatar: 'LT' },
];

export const CONVERSATIONS = [
  { id: '1', who: 'Ada Lovelace',  preview: 'Pushed the analytical engine fix', unread: 2 },
  { id: '2', who: 'Grace Hopper',  preview: 'Compiler review at 3?',            unread: 0 },
  { id: '3', who: 'Alan Turing',   preview: 'See the test transcript',          unread: 1 },
];

export const MESSAGES = [
  { from: 'Ada Lovelace', text: 'Pushed the analytical engine fix.', mine: false, at: '10:02' },
  { from: 'me',            text: 'Nice — running CI now.',            mine: true,  at: '10:03' },
  { from: 'Ada Lovelace', text: 'Lmk if anything goes red.',          mine: false, at: '10:04' },
];
