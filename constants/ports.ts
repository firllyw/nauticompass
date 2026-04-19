// constants/ports.ts
export interface Port {
  id: string;
  name: string;
  country: string;
  unlocode: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export const PORTS: Port[] = [
  {
    id: 'MKS',
    name: 'Makassar (Soekarno-Hatta)',
    country: 'Indonesia',
    unlocode: 'ID UPG',
    latitude: -5.1477,
    longitude: 119.4327,
    timezone: 'Asia/Makassar',
  },
  {
    id: 'SUB',
    name: 'Surabaya (Tanjung Perak)',
    country: 'Indonesia',
    unlocode: 'ID SUB',
    latitude: -7.1956,
    longitude: 112.7322,
    timezone: 'Asia/Jakarta',
  },
  {
    id: 'JKT',
    name: 'Jakarta (Tanjung Priok)',
    country: 'Indonesia',
    unlocode: 'ID JKT',
    latitude: -6.1045,
    longitude: 106.8816,
    timezone: 'Asia/Jakarta',
  },
  {
    id: 'SIN',
    name: 'Singapore (PSA)',
    country: 'Singapore',
    unlocode: 'SG SIN',
    latitude: 1.2644,
    longitude: 103.8200,
    timezone: 'Asia/Singapore',
  },
  {
    id: 'PEN',
    name: 'Penang (Butterworth)',
    country: 'Malaysia',
    unlocode: 'MY PEN',
    latitude: 5.4141,
    longitude: 100.3288,
    timezone: 'Asia/Kuala_Lumpur',
  },
  {
    id: 'BLW',
    name: 'Balikpapan',
    country: 'Indonesia',
    unlocode: 'ID BPN',
    latitude: -1.2654,
    longitude: 116.8312,
    timezone: 'Asia/Makassar',
  },
  {
    id: 'BTH',
    name: 'Batam (Batu Ampar)',
    country: 'Indonesia',
    unlocode: 'ID BTH',
    latitude: 1.1120,
    longitude: 104.0330,
    timezone: 'Asia/Jakarta',
  },
  {
    id: 'PLM',
    name: 'Palembang',
    country: 'Indonesia',
    unlocode: 'ID PLM',
    latitude: -2.9761,
    longitude: 104.7754,
    timezone: 'Asia/Jakarta',
  },
  {
    id: 'BDO',
    name: 'Belawan (Medan)',
    country: 'Indonesia',
    unlocode: 'ID BLW',
    latitude: 3.7877,
    longitude: 98.6850,
    timezone: 'Asia/Jakarta',
  },
  {
    id: 'AMQ',
    name: 'Ambon',
    country: 'Indonesia',
    unlocode: 'ID AMQ',
    latitude: -3.6936,
    longitude: 128.1800,
    timezone: 'Asia/Jayapura',
  },
  { id: 'SHA', name: 'Shanghai', country: 'China', unlocode: 'CN SHA', latitude: 31.2304, longitude: 121.4737, timezone: 'Asia/Shanghai' },
  { id: 'NGB', name: 'Ningbo-Zhoushan', country: 'China', unlocode: 'CN NGB', latitude: 29.8683, longitude: 121.5440, timezone: 'Asia/Shanghai' },
  { id: 'SZX', name: 'Shenzhen', country: 'China', unlocode: 'CN SZX', latitude: 22.5431, longitude: 114.0579, timezone: 'Asia/Shanghai' },
  { id: 'BUS', name: 'Busan', country: 'South Korea', unlocode: 'KR BUS', latitude: 35.1796, longitude: 129.0756, timezone: 'Asia/Seoul' },
  { id: 'HKG', name: 'Hong Kong', country: 'China', unlocode: 'HK HKG', latitude: 22.3193, longitude: 114.1694, timezone: 'Asia/Hong_Kong' },
  { id: 'DXB', name: 'Jebel Ali (Dubai)', country: 'UAE', unlocode: 'AE JEA', latitude: 25.0113, longitude: 55.0612, timezone: 'Asia/Dubai' },
  { id: 'PKL', name: 'Port Klang', country: 'Malaysia', unlocode: 'MY PKL', latitude: 3.0000, longitude: 101.4000, timezone: 'Asia/Kuala_Lumpur' },
  { id: 'TNJ', name: 'Tanjung Pelepas', country: 'Malaysia', unlocode: 'MY TPP', latitude: 1.3700, longitude: 103.5500, timezone: 'Asia/Kuala_Lumpur' },
  { id: 'KAO', name: 'Kaohsiung', country: 'Taiwan', unlocode: 'TW KHH', latitude: 22.6273, longitude: 120.3014, timezone: 'Asia/Taipei' },

  // --- Europe ---
  { id: 'RTM', name: 'Rotterdam', country: 'Netherlands', unlocode: 'NL RTM', latitude: 51.9225, longitude: 4.4792, timezone: 'Europe/Amsterdam' },
  { id: 'ANR', name: 'Antwerp', country: 'Belgium', unlocode: 'BE ANR', latitude: 51.2194, longitude: 4.4025, timezone: 'Europe/Brussels' },
  { id: 'HAM', name: 'Hamburg', country: 'Germany', unlocode: 'DE HAM', latitude: 53.5511, longitude: 9.9937, timezone: 'Europe/Berlin' },
  { id: 'VLC', name: 'Valencia', country: 'Spain', unlocode: 'ES VLC', latitude: 39.4699, longitude: -0.3763, timezone: 'Europe/Madrid' },

  // --- Americas ---
  { id: 'LAX', name: 'Los Angeles', country: 'USA', unlocode: 'US LAX', latitude: 33.7701, longitude: -118.2437, timezone: 'America/Los_Angeles' },
  { id: 'LGB', name: 'Long Beach', country: 'USA', unlocode: 'US LGB', latitude: 33.7701, longitude: -118.1937, timezone: 'America/Los_Angeles' },
  { id: 'NYC', name: 'New York/New Jersey', country: 'USA', unlocode: 'US NYC', latitude: 40.7128, longitude: -74.0060, timezone: 'America/New_York' },
  { id: 'SAV', name: 'Savannah', country: 'USA', unlocode: 'US SAV', latitude: 32.0809, longitude: -81.0912, timezone: 'America/New_York' },
  { id: 'SSZ', name: 'Santos', country: 'Brazil', unlocode: 'BR SSZ', latitude: -23.9608, longitude: -46.3339, timezone: 'America/Sao_Paulo' },

  // --- Others ---
  { id: 'TNG', name: 'Tanger Med', country: 'Morocco', unlocode: 'MA TNG', latitude: 35.8894, longitude: -5.5000, timezone: 'Africa/Casablanca' },
  { id: 'MEL', name: 'Melbourne', country: 'Australia', unlocode: 'AU MEL', latitude: -37.8136, longitude: 144.9631, timezone: 'Australia/Melbourne' },
];
