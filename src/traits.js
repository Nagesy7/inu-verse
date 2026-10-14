// Personality traits: small, free perks picked at character creation (never bought).
export const TRAITS = {
  hardworker: { name: 'Hard Worker', desc: '+10% mini-game job pay', jobPay: 1.1 },
  greenpaw: { name: 'Green Paw', desc: 'Crops grow 15% faster', grow: 1.15 },
  charmer: { name: 'Charmer', desc: 'Hearts grow 20% faster', hearts: 1.2 },
  hustler: { name: 'Hustler', desc: 'Shoppers 12% more likely to buy', sales: 1.12 },
};
export const perk = (s, key) => TRAITS[s?.player?.trait]?.[key] || 1;
