// prisma/data/canonical-map.ts
// Raw name → canonical name. Applied before stop lookup at seed time.

export const CANONICAL_MAP: Record<string, string> = {
  // Adjamé
  'Adjamé Liberté - 220 logements': 'Adjamé Liberté',
  'Gare en haut': 'Adjamé Gare en Haut',
  'Gare en Haut': 'Adjamé Gare en Haut',
  // Treichville gare
  'Treichvile Gare de Bassam': 'Gare de Bassam',
  'Treichville Gare de Bassam': 'Gare de Bassam',
  // Riviera 2
  'Station Total Riviera 2': 'Riviera 2',
  'Rond-point Riviera 2': 'Riviera 2',
  // 9 Kilo
  '9 kilo': '9 Kilo',
  'Gare 9 Kilo': '9 Kilo',
  // Siporex (all variants collapse to one canonical; distinct coordinates)
  'Siporex au feux': 'Siporex',
  'Siporex - Pharmacie': 'Siporex',
  // Niangon
  'Terminus 27 Niangon Sud à Gauche': 'Terminus 27 Niangon Sud',
  // Koweit spelling
  'Yopougon Kowëit': 'Yopougon Koweit',
  // N'dotré spellings
  'Ndotre': 'N\'dotré',
  'N\'Dotré': 'N\'dotré',
  // Petro Ivoire
  'Petro Ivoire': 'Angré Petro Ivoire',
  // Plateau
  'Rond-point de l\'ancien camp': 'Rond-point Ancien Camp',
  // Carrefour la Vie
  'Carrefour la Vie': 'Carrefour La Vie',
  // Palais
  'Palais': 'Yopougon Palais',
  // Abobo
  'Abobo Marche': 'Abobo Marché',
  'Abobo Marche ': 'Abobo Marché',
  // 2 Plateaux
  '2 Plateaux Mobil': '2 Plateaux Mobile',
  '2 Plateaux Mobil ': '2 Plateaux Mobile',
  // Gare d'Abobo
  'Gare d\'Abobo': 'Abobo Gare',
};
