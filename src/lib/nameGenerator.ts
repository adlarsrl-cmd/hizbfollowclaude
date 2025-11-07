const ADJECTIVES = [
  'Rapide', 'Brillant', 'Sage', 'Fort', 'Doux', 'Brave', 'Loyal', 'Noble', 'Calme', 'Vif',
  'Agile', 'Habile', 'Juste', 'Fier', 'Généreux', 'Patient', 'Sincère', 'Humble', 'Audacieux', 'Énergique',
  'Joyeux', 'Serein', 'Dynamique', 'Radieux', 'Diligent', 'Élégant', 'Fidèle', 'Gracieux', 'Harmonieux', 'Inspiré',
  'Lumineux', 'Majestueux', 'Optimiste', 'Paisible', 'Rayonnant', 'Solide', 'Tenace', 'Vigilant', 'Zélé', 'Attentif',
  'Swift', 'Bright', 'Wise', 'Strong', 'Gentle', 'Bold', 'Loyal', 'Noble', 'Calm', 'Keen',
  'Quick', 'Clever', 'Fair', 'Proud', 'Kind', 'Patient', 'Honest', 'Humble', 'Brave', 'Lively',
  'Happy', 'Serene', 'Active', 'Radiant', 'Diligent', 'Elegant', 'Faithful', 'Graceful', 'Harmonic', 'Inspired',
  'Bright', 'Grand', 'Cheerful', 'Peaceful', 'Shining', 'Solid', 'Steadfast', 'Alert', 'Eager', 'Mindful'
];

export function generateParticipantName(): string {
  const randomAdjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  return `Follower-${randomAdjective}`;
}
