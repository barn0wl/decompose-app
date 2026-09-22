// ─── ANCHORS ──────────────────────────────────────────────────────────────

import { StopType } from "../../generated/prisma";
import { AnchorStop } from "./types";

export const ANCHOR_STOPS: AnchorStop[] = [
  // Cocody
  { name: 'Carrefour La Vie',       commune: 'Cocody',       type: StopType.gbaka_station, latitude: 5.348077183704681,  longitude: -4.003998932346861 },
  { name: 'Saint Jean',             commune: 'Cocody',       type: StopType.landmark,      latitude: 5.335555307305185,  longitude: -4.003757711173526 },
  { name: 'Carrefour 9 Kilos',      commune: 'Cocody',       type: StopType.landmark,      latitude: 5.3580039615894774, longitude: -3.96453951595039 },
  { name: 'Angré Petro Ivoire',     commune: 'Cocody',       type: StopType.landmark,      latitude: 5.404421098618564,  longitude: -3.9875821630349324 },
  { name: 'CHU d\'Angré',           commune: 'Cocody',       type: StopType.landmark,      latitude: 5.404557696766911,  longitude: -3.956112841689849 },
  { name: 'Playce Palmeraie',       commune: 'Cocody',       type: StopType.landmark,      latitude: 5.3734570431046595, longitude: -3.9335970196467844 },
  { name: 'Rosiers 6',              commune: 'Cocody',       type: StopType.taxi_stop,     latitude: 5.394946660919032,  longitude: -3.9680634512354422 },
  // Yopougon
  { name: 'Yopougon Toit Rouge',    commune: 'Yopougon',     type: StopType.taxi_stop,     latitude: 5.349255236885707,  longitude: -4.077624034199311 },
  { name: 'Cosmos Yopougon',        commune: 'Yopougon',     type: StopType.landmark,      latitude: 5.349940589004634,  longitude: -4.074017492824232 },
  { name: 'Yopougon Maroc',         commune: 'Yopougon',     type: StopType.taxi_stop,     latitude: 5.340875407230319,  longitude: -4.113844050807754 },
  // Koumassi
  { name: 'Koumassi Remblais',      commune: 'Koumassi',     type: StopType.taxi_stop,     latitude: 5.300369987996002,  longitude: -3.964877905363696 },
  { name: 'Grand Carrefour de Koumassi', commune: 'Koumassi', type: StopType.gbaka_station, latitude: 5.288414191726205, longitude: -3.970688947691688 },
  { name: 'Boulangerie Opéra',      commune: 'Koumassi',     type: StopType.taxi_stop,     latitude: 5.303482595162278,  longitude: -3.9503928709185736 },
  // Marcory
  { name: 'Grand Carrefour de Marcory', commune: 'Marcory', type: StopType.gbaka_station,  latitude: 5.300591519768063,  longitude: -3.9892050937243018 },
  { name: 'Orca Deco',              commune: 'Marcory',      type: StopType.landmark,      latitude: 5.298076118304384,  longitude: -3.9844841764436314 },
  // Treichville
  { name: 'Gare de Bassam',         commune: 'Treichville',  type: StopType.gbaka_station, latitude: 5.299815886012507,  longitude: -4.00247787838008 },
  { name: 'Grand Marché de Treichville', commune: 'Treichville', type: StopType.taxi_stop, latitude: 5.309172264928636, longitude: -4.013676734199663 },
  { name: 'CHU de Treichville',     commune: 'Treichville',  type: StopType.landmark,      latitude: 5.293713963499158,  longitude: -4.003854169603117 },
  // Adjamé
  { name: 'Adjamé Liberté',         commune: 'Adjamé',       type: StopType.gbaka_station, latitude: 5.353515635393432,  longitude: -4.014971905363238 },
  { name: 'Adjamé Gare en Haut',    commune: 'Adjamé',       type: StopType.gbaka_station, latitude: 5.350286,           longitude: -4.022453 },
  // Plateau
  { name: 'Gare Sud Plateau',       commune: 'Plateau',      type: StopType.landmark,      latitude: 5.314771076799619,  longitude: -4.01844129480397 },
  { name: 'Cathédrale Saint Paul',  commune: 'Plateau',      type: StopType.landmark,      latitude: 5.333123736612489,  longitude: -4.019986840603219 },
  // Port-Bouet
  { name: 'Rond-point d\'Anani',    commune: 'Port-Bouet',   type: StopType.landmark,      latitude: 5.23614495894964,   longitude: -3.874810508986609 },
  { name: 'Premier Arrêt',          commune: 'Port-Bouet',   type: StopType.taxi_stop,     latitude: 5.244641156087436,  longitude: -3.9292019945985546 },
  { name: 'Au Casier',              commune: 'Port-Bouet',   type: StopType.taxi_stop,     latitude: 5.242861075018325,  longitude: -3.916787507298958 },
  // Grand-Bassam
  { name: 'Gare Routière de Bassam',      commune: 'Grand-Bassam', type: StopType.gbaka_station, latitude: 5.206774494595144, longitude: -3.7349442276523197 },
  { name: 'Rosiers 3',                    commune: 'Grand-Bassam', type: StopType.taxi_stop,     latitude: 5.216275482705988, longitude: -3.7817287806678093 },
  { name: 'Grand Marché de Grand-Bassam', commune: 'Grand-Bassam', type: StopType.landmark,      latitude: 5.207181393834313, longitude: -3.733717051626817 },
  // Bingerville
  { name: 'Nouvelle Gare de Bingerville', commune: 'Bingerville', type: StopType.gbaka_station, latitude: 5.353451690339081, longitude: -3.8768735790148234 },
  // Abobo
  { name: 'Abobo Gare Mairie',      commune: 'Abobo',        type: StopType.gbaka_station, latitude: 5.420007,           longitude: -4.017438 },
  { name: 'Abobo Gare',             commune: 'Abobo',        type: StopType.gbaka_station, latitude: 5.422042,           longitude: -4.018492 },
  { name: 'Abobo Gendarmerie',      commune: 'Abobo',        type: StopType.taxi_stop,     latitude: 5.426046,           longitude: -4.020434 },
  { name: 'N\'dotré',               commune: 'Abobo',        type: StopType.taxi_stop,     latitude: 5.443069,           longitude: -4.069399 },
  // Attécoubé
  { name: 'Gare Gesco',             commune: 'Attécoubé',    type: StopType.gbaka_station, latitude: 5.367094,           longitude: -4.101904 },
];
