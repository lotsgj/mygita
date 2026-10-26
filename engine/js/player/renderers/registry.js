import { createGita700Renderer } from './gita-700.js';
import { createGitaYogaRenderer } from './gita-yoga.js';
import { createGitaSaraRenderer } from './gita-sara.js';
import { createVerseChantRenderer } from './verse-chant.js';

const renderers = {
  'player-1': async () => createGita700Renderer(),
  'player-2': async () => createGitaYogaRenderer(),
  'player-3': async (options) => createGitaSaraRenderer(options),
  'player-4': async () => createVerseChantRenderer()
};

let experiences = {};

export function configureExperiences(distribution) {
  experiences = Object.fromEntries(distribution.experiences.map((entry) => {
    const load = renderers[entry.renderer];
    if (!load) throw new Error(`Experience ${entry.id} references unavailable renderer ${entry.renderer}.`);
    return [entry.id, { ...entry, available: true, load }];
  }));
  return experiences;
}

export function getExperience(id) {
  return experiences[id] || null;
}

export function availableExperiences() {
  return Object.entries(experiences).filter(([, experience]) => experience.available);
}
