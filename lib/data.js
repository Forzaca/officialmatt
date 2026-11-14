import { readDoc } from './store.js';

export const CATEGORIES = ['banners', 'bots', 'web', 'other'];
export const ORDER_STATUSES = ['queued', 'in_progress', 'review', 'completed'];

export const DEFAULT_SETTINGS = {
  available: true,
  statusNote: 'Taking on new projects',
  maintenance: false,
  maintenanceMessage: "I'm currently working on the website right now.",
  maintenanceEta: '',
  maintenanceStartedAt: null,
  reviewsOpen: true,
  timezone: '',
  discordInvite: '',
  updatedAt: null,
};

export async function getSettings() {
  const stored = await readDoc('settings', {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function publicSettings(s) {
  return {
    available: Boolean(s.available),
    statusNote: s.statusNote || '',
    maintenance: Boolean(s.maintenance),
    maintenanceMessage: s.maintenanceMessage || '',
    maintenanceEta: s.maintenanceEta || '',
    maintenanceStartedAt: s.maintenanceStartedAt || null,
    reviewsOpen: s.reviewsOpen !== false,
    timezone: s.timezone || '',
    discordInvite: s.discordInvite || '',
  };
}

export function publicReview(r) {
  return {
    id: r.id,
    name: r.displayName || r.username,
    username: r.username,
    avatar: r.avatar,
    rating: r.rating,
    text: r.text,
    project: r.project || '',
    image: r.image || null,
    createdAt: r.createdAt,
  };
}

export function publicOrder(o) {
  return {
    id: o.id,
    title: o.title,
    type: o.type,
    client: o.showClient ? o.client || 'Client' : 'Private client',
    status: o.status,
    progress: o.status === 'completed' ? 100 : Math.max(0, Math.min(100, Number(o.progress) || 0)),
    note: o.note || '',
    eta: o.eta || '',
    createdAt: o.createdAt,
    startedAt: o.startedAt || null,
    completedAt: o.completedAt || null,
    position: o.position ?? 0,
  };
}

export const sortWork = (list) =>
  [...list].sort((a, b) => (b.featured === true) - (a.featured === true) || (a.order ?? 0) - (b.order ?? 0) || (b.createdAt || 0) - (a.createdAt || 0));
