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
];
