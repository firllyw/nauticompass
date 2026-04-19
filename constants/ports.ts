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
  // --- SOUTH EAST ASIA (Building on your list) ---
  { id: 'MKS', name: 'Makassar', country: 'Indonesia', unlocode: 'ID UPG', latitude: -5.1477, longitude: 119.4327, timezone: 'Asia/Makassar' },
  { id: 'SUB', name: 'Surabaya', country: 'Indonesia', unlocode: 'ID SUB', latitude: -7.1956, longitude: 112.7322, timezone: 'Asia/Jakarta' },
  { id: 'JKT', name: 'Jakarta', country: 'Indonesia', unlocode: 'ID JKT', latitude: -6.1045, longitude: 106.8816, timezone: 'Asia/Jakarta' },
  { id: 'SIN', name: 'Singapore', country: 'Singapore', unlocode: 'SG SIN', latitude: 1.2644, longitude: 103.8200, timezone: 'Asia/Singapore' },
  { id: 'PKL', name: 'Port Klang', country: 'Malaysia', unlocode: 'MY PKL', latitude: 3.0000, longitude: 101.4000, timezone: 'Asia/Kuala_Lumpur' },
  { id: 'TNJ', name: 'Tanjung Pelepas', country: 'Malaysia', unlocode: 'MY TPP', latitude: 1.3700, longitude: 103.5500, timezone: 'Asia/Kuala_Lumpur' },
  { id: 'MNL', name: 'Manila', country: 'Philippines', unlocode: 'PH MNL', latitude: 14.5995, longitude: 120.9842, timezone: 'Asia/Manila' },
  { id: 'LCH', name: 'Laem Chabang', country: 'Thailand', unlocode: 'TH LCH', latitude: 13.0800, longitude: 100.9000, timezone: 'Asia/Bangkok' },
  { id: 'SGN', name: 'Ho Chi Minh City', country: 'Vietnam', unlocode: 'VN SGN', latitude: 10.7627, longitude: 106.6602, timezone: 'Asia/Ho_Chi_Minh' },
  { id: 'HPH', name: 'Hai Phong', country: 'Vietnam', unlocode: 'VN HPH', latitude: 20.8449, longitude: 106.6881, timezone: 'Asia/Ho_Chi_Minh' },

  // --- EAST ASIA (China, Japan, Korea) ---
  { id: 'SHA', name: 'Shanghai', country: 'China', unlocode: 'CN SHA', latitude: 31.2304, longitude: 121.4737, timezone: 'Asia/Shanghai' },
  { id: 'NGB', name: 'Ningbo-Zhoushan', country: 'China', unlocode: 'CN NGB', latitude: 29.8683, longitude: 121.5440, timezone: 'Asia/Shanghai' },
  { id: 'SZX', name: 'Shenzhen', country: 'China', unlocode: 'CN SZX', latitude: 22.5431, longitude: 114.0579, timezone: 'Asia/Shanghai' },
  { id: 'CAN', name: 'Guangzhou', country: 'China', unlocode: 'CN CAN', latitude: 23.1291, longitude: 113.2644, timezone: 'Asia/Shanghai' },
  { id: 'TAO', name: 'Qingdao', country: 'China', unlocode: 'CN TAO', latitude: 36.0671, longitude: 120.3826, timezone: 'Asia/Shanghai' },
  { id: 'TSN', name: 'Tianjin', country: 'China', unlocode: 'CN TSN', latitude: 39.1257, longitude: 117.1901, timezone: 'Asia/Shanghai' },
  { id: 'HKG', name: 'Hong Kong', country: 'China', unlocode: 'HK HKG', latitude: 22.3193, longitude: 114.1694, timezone: 'Asia/Hong_Kong' },
  { id: 'XMN', name: 'Xiamen', country: 'China', unlocode: 'CN XMN', latitude: 24.4798, longitude: 118.0894, timezone: 'Asia/Shanghai' },
  { id: 'DLC', name: 'Dalian', country: 'China', unlocode: 'CN DLC', latitude: 38.9140, longitude: 121.6147, timezone: 'Asia/Shanghai' },
  { id: 'BUS', name: 'Busan', country: 'South Korea', unlocode: 'KR BUS', latitude: 35.1796, longitude: 129.0756, timezone: 'Asia/Seoul' },
  { id: 'ICN', name: 'Incheon', country: 'South Korea', unlocode: 'KR ICN', latitude: 37.4563, longitude: 126.7052, timezone: 'Asia/Seoul' },
  { id: 'TYO', name: 'Tokyo', country: 'Japan', unlocode: 'JP TYO', latitude: 35.6895, longitude: 139.6917, timezone: 'Asia/Tokyo' },
  { id: 'YOK', name: 'Yokohama', country: 'Japan', unlocode: 'JP YOK', latitude: 35.4437, longitude: 139.6380, timezone: 'Asia/Tokyo' },
  { id: 'KOB', name: 'Kobe', country: 'Japan', unlocode: 'JP UKB', latitude: 34.6901, longitude: 135.1955, timezone: 'Asia/Tokyo' },
  { id: 'OSA', name: 'Osaka', country: 'Japan', unlocode: 'JP OSA', latitude: 34.6937, longitude: 135.5023, timezone: 'Asia/Tokyo' },
  { id: 'KAO', name: 'Kaohsiung', country: 'Taiwan', unlocode: 'TW KHH', latitude: 22.6273, longitude: 120.3014, timezone: 'Asia/Taipei' },
  { id: 'KEL', name: 'Keelung', country: 'Taiwan', unlocode: 'TW KEL', latitude: 25.1283, longitude: 121.7419, timezone: 'Asia/Taipei' },

  // --- MIDDLE EAST & SOUTH ASIA ---
  { id: 'DXB', name: 'Jebel Ali', country: 'UAE', unlocode: 'AE JEA', latitude: 25.0113, longitude: 55.0612, timezone: 'Asia/Dubai' },
  { id: 'AUH', name: 'Abu Dhabi', country: 'UAE', unlocode: 'AE AUH', latitude: 24.4539, longitude: 54.3773, timezone: 'Asia/Dubai' },
  { id: 'JED', name: 'Jeddah', country: 'Saudi Arabia', unlocode: 'SA JED', latitude: 21.4858, longitude: 39.1925, timezone: 'Asia/Riyadh' },
  { id: 'DMM', name: 'Dammam', country: 'Saudi Arabia', unlocode: 'SA DMM', latitude: 26.4327, longitude: 50.1084, timezone: 'Asia/Riyadh' },
  { id: 'KMT', name: 'Khor Fakkan', country: 'UAE', unlocode: 'AE KLF', latitude: 25.3313, longitude: 56.3419, timezone: 'Asia/Dubai' },
  { id: 'SAL', name: 'Salalah', country: 'Oman', unlocode: 'OM SLL', latitude: 17.0151, longitude: 54.0924, timezone: 'Asia/Muscat' },
  { id: 'NSA', name: 'Nhava Sheva', country: 'India', unlocode: 'IN NSA', latitude: 18.9500, longitude: 72.9500, timezone: 'Asia/Kolkata' },
  { id: 'MUN', name: 'Mundra', country: 'India', unlocode: 'IN MUN', latitude: 22.8400, longitude: 69.7000, timezone: 'Asia/Kolkata' },
  { id: 'MAA', name: 'Chennai', country: 'India', unlocode: 'IN MAA', latitude: 13.0827, longitude: 80.2707, timezone: 'Asia/Kolkata' },
  { id: 'CMB', name: 'Colombo', country: 'Sri Lanka', unlocode: 'LK CMB', latitude: 6.9271, longitude: 79.8612, timezone: 'Asia/Colombo' },
  { id: 'KHI', name: 'Karachi', country: 'Pakistan', unlocode: 'PK KHI', latitude: 24.8607, longitude: 67.0011, timezone: 'Asia/Karachi' },

  // --- EUROPE ---
  { id: 'RTM', name: 'Rotterdam', country: 'Netherlands', unlocode: 'NL RTM', latitude: 51.9225, longitude: 4.4792, timezone: 'Europe/Amsterdam' },
  { id: 'ANR', name: 'Antwerp', country: 'Belgium', unlocode: 'BE ANR', latitude: 51.2194, longitude: 4.4025, timezone: 'Europe/Brussels' },
  { id: 'HAM', name: 'Hamburg', country: 'Germany', unlocode: 'DE HAM', latitude: 53.5511, longitude: 9.9937, timezone: 'Europe/Berlin' },
  { id: 'BRV', name: 'Bremerhaven', country: 'Germany', unlocode: 'DE BRV', latitude: 53.5484, longitude: 8.5823, timezone: 'Europe/Berlin' },
  { id: 'VLC', name: 'Valencia', country: 'Spain', unlocode: 'ES VLC', latitude: 39.4699, longitude: -0.3763, timezone: 'Europe/Madrid' },
  { id: 'ALG', name: 'Algeciras', country: 'Spain', unlocode: 'ES ALG', latitude: 36.1408, longitude: -5.4562, timezone: 'Europe/Madrid' },
  { id: 'BCN', name: 'Barcelona', country: 'Spain', unlocode: 'ES BCN', latitude: 41.3851, longitude: 2.1734, timezone: 'Europe/Madrid' },
  { id: 'PIR', name: 'Piraeus', country: 'Greece', unlocode: 'GR PIR', latitude: 37.9425, longitude: 23.6469, timezone: 'Europe/Athens' },
  { id: 'GIO', name: 'Gioia Tauro', country: 'Italy', unlocode: 'IT GIT', latitude: 38.4258, longitude: 15.9014, timezone: 'Europe/Rome' },
  { id: 'GOA', name: 'Genoa', country: 'Italy', unlocode: 'IT GOA', latitude: 44.4056, longitude: 8.9463, timezone: 'Europe/Rome' },
  { id: 'MRS', name: 'Marseille', country: 'France', unlocode: 'FR MRS', latitude: 43.2965, longitude: 5.3698, timezone: 'Europe/Paris' },
  { id: 'LEH', name: 'Le Havre', country: 'France', unlocode: 'FR LEH', latitude: 49.4944, longitude: 0.1079, timezone: 'Europe/Paris' },
  { id: 'FXT', name: 'Felixstowe', country: 'UK', unlocode: 'GB FXT', latitude: 51.9620, longitude: 1.3510, timezone: 'Europe/London' },
  { id: 'SOU', name: 'Southampton', country: 'UK', unlocode: 'GB SOU', latitude: 50.9097, longitude: -1.4044, timezone: 'Europe/London' },
  { id: 'GDN', name: 'Gdansk', country: 'Poland', unlocode: 'PL GDN', latitude: 54.3520, longitude: 18.6466, timezone: 'Europe/Warsaw' },
  { id: 'LED', name: 'St Petersburg', country: 'Russia', unlocode: 'RU LED', latitude: 59.9311, longitude: 30.3609, timezone: 'Europe/Moscow' },
  { id: 'IST', name: 'Ambarli (Istanbul)', country: 'Turkey', unlocode: 'TR AMB', latitude: 40.9680, longitude: 28.6940, timezone: 'Europe/Istanbul' },

  // --- AMERICAS ---
  { id: 'LAX', name: 'Los Angeles', country: 'USA', unlocode: 'US LAX', latitude: 33.7701, longitude: -118.2437, timezone: 'America/Los_Angeles' },
  { id: 'LGB', name: 'Long Beach', country: 'USA', unlocode: 'US LGB', latitude: 33.7701, longitude: -118.1937, timezone: 'America/Los_Angeles' },
  { id: 'NYC', name: 'New York', country: 'USA', unlocode: 'US NYC', latitude: 40.7128, longitude: -74.0060, timezone: 'America/New_York' },
  { id: 'SAV', name: 'Savannah', country: 'USA', unlocode: 'US SAV', latitude: 32.0809, longitude: -81.0912, timezone: 'America/New_York' },
  { id: 'ORF', name: 'Norfolk', country: 'USA', unlocode: 'US ORF', latitude: 36.8508, longitude: -76.2859, timezone: 'America/New_York' },
  { id: 'HOU', name: 'Houston', country: 'USA', unlocode: 'US HOU', latitude: 29.7604, longitude: -95.3698, timezone: 'America/Chicago' },
  { id: 'SEA', name: 'Seattle', country: 'USA', unlocode: 'US SEA', latitude: 47.6062, longitude: -122.3321, timezone: 'America/Los_Angeles' },
  { id: 'OAK', name: 'Oakland', country: 'USA', unlocode: 'US OAK', latitude: 37.8044, longitude: -122.2712, timezone: 'America/Los_Angeles' },
  { id: 'VAN', name: 'Vancouver', country: 'Canada', unlocode: 'CA VAN', latitude: 49.2827, longitude: -123.1207, timezone: 'America/Vancouver' },
  { id: 'MTL', name: 'Montreal', country: 'Canada', unlocode: 'CA MTL', latitude: 45.5017, longitude: -73.5673, timezone: 'America/Toronto' },
  { id: 'LZC', name: 'Lazaro Cardenas', country: 'Mexico', unlocode: 'MX LZC', latitude: 17.9585, longitude: -102.2010, timezone: 'America/Mexico_City' },
  { id: 'MAN', name: 'Manzanillo', country: 'Mexico', unlocode: 'MX ZLO', latitude: 19.0522, longitude: -104.3159, timezone: 'America/Mexico_City' },
  { id: 'COL', name: 'Colon', country: 'Panama', unlocode: 'PA ONX', latitude: 9.3544, longitude: -79.9014, timezone: 'America/Panama' },
  { id: 'BLB', name: 'Balboa', country: 'Panama', unlocode: 'PA BLB', latitude: 8.9500, longitude: -79.5667, timezone: 'America/Panama' },
  { id: 'CTG', name: 'Cartagena', country: 'Colombia', unlocode: 'CO CTG', latitude: 10.3910, longitude: -75.4794, timezone: 'America/Bogota' },
  { id: 'SSZ', name: 'Santos', country: 'Brazil', unlocode: 'BR SSZ', latitude: -23.9608, longitude: -46.3339, timezone: 'America/Sao_Paulo' },
  { id: 'BUE', name: 'Buenos Aires', country: 'Argentina', unlocode: 'AR BUE', latitude: -34.6037, longitude: -58.3816, timezone: 'America/Argentina/Buenos_Aires' },
  { id: 'SAI', name: 'San Antonio', country: 'Chile', unlocode: 'CL SAI', latitude: -33.5833, longitude: -71.6167, timezone: 'America/Santiago' },

  // --- AFRICA & OCEANIA ---
  { id: 'TNG', name: 'Tanger Med', country: 'Morocco', unlocode: 'MA TNG', latitude: 35.8894, longitude: -5.5000, timezone: 'Africa/Casablanca' },
  { id: 'MSW', name: 'Port Said', country: 'Egypt', unlocode: 'EG PSD', latitude: 31.2653, longitude: 32.3019, timezone: 'Africa/Cairo' },
  { id: 'ALX', name: 'Alexandria', country: 'Egypt', unlocode: 'EG ALX', latitude: 31.2001, longitude: 29.9187, timezone: 'Africa/Cairo' },
  { id: 'DUR', name: 'Durban', country: 'South Africa', unlocode: 'ZA DUR', latitude: -29.8587, longitude: 31.0218, timezone: 'Africa/Johannesburg' },
  { id: 'LGS', name: 'Lagos', country: 'Nigeria', unlocode: 'NG LOS', latitude: 6.4541, longitude: 3.3813, timezone: 'Africa/Lagos' },
  { id: 'DKR', name: 'Dakar', country: 'Senegal', unlocode: 'SN DKR', latitude: 14.6928, longitude: -17.4467, timezone: 'Africa/Dakar' },
  { id: 'MBA', name: 'Mombasa', country: 'Kenya', unlocode: 'KE MBA', latitude: -4.0435, longitude: 39.6682, timezone: 'Africa/Nairobi' },
  { id: 'MEL', name: 'Melbourne', country: 'Australia', unlocode: 'AU MEL', latitude: -37.8136, longitude: 144.9631, timezone: 'Australia/Melbourne' },
  { id: 'SYD', name: 'Sydney', country: 'Australia', unlocode: 'AU SYD', latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney' },
  { id: 'BNE', name: 'Brisbane', country: 'Australia', unlocode: 'AU BNE', latitude: -27.4698, longitude: 153.0251, timezone: 'Australia/Brisbane' },
  { id: 'FRE', name: 'Fremantle', country: 'Australia', unlocode: 'AU FRE', latitude: -32.0569, longitude: 115.7439, timezone: 'Australia/Perth' },
  { id: 'AKL', name: 'Auckland', country: 'New Zealand', unlocode: 'NZ AKL', latitude: -36.8485, longitude: 174.7633, timezone: 'Pacific/Auckland' },

  // --- ADDITIONAL GLOBAL CONNECTORS ---
  { id: 'LIS', name: 'Lisbon', country: 'Portugal', unlocode: 'PT LIS', latitude: 38.7223, longitude: -9.1393, timezone: 'Europe/Lisbon' },
  { id: 'HEL', name: 'Helsinki', country: 'Finland', unlocode: 'FI HEL', latitude: 60.1695, longitude: 24.9354, timezone: 'Europe/Helsinki' },
  { id: 'OSL', name: 'Oslo', country: 'Norway', unlocode: 'NO OSL', latitude: 59.9139, longitude: 10.7522, timezone: 'Europe/Oslo' },
  { id: 'CPH', name: 'Copenhagen', country: 'Denmark', unlocode: 'DK CPH', latitude: 55.6761, longitude: 12.5683, timezone: 'Europe/Copenhagen' },
  { id: 'GOT', name: 'Gothenburg', country: 'Sweden', unlocode: 'SE GOT', latitude: 57.7089, longitude: 11.9746, timezone: 'Europe/Stockholm' },
  { id: 'TLV', name: 'Ashdod', country: 'Israel', unlocode: 'IL ASH', latitude: 31.8167, longitude: 34.6500, timezone: 'Asia/Jerusalem' },
  { id: 'BKK', name: 'Bangkok', country: 'Thailand', unlocode: 'TH BKK', latitude: 13.7563, longitude: 100.5018, timezone: 'Asia/Bangkok' },
  { id: 'CGP', name: 'Chittagong', country: 'Bangladesh', unlocode: 'BD CGP', latitude: 22.3350, longitude: 91.8325, timezone: 'Asia/Dhaka' },
  { id: 'SIA', name: 'Sihanoukville', country: 'Cambodia', unlocode: 'KH SNH', latitude: 10.6253, longitude: 103.5234, timezone: 'Asia/Phnom_Penh' },
  { id: 'MNZ', name: 'Muara', country: 'Brunei', unlocode: 'BN MUA', latitude: 5.0208, longitude: 115.0667, timezone: 'Asia/Brunei' },
  { id: 'KUA', name: 'Kuantan', country: 'Malaysia', unlocode: 'MY KUA', latitude: 3.8167, longitude: 103.3333, timezone: 'Asia/Kuala_Lumpur' },
  { id: 'BTG', name: 'Bontang', country: 'Indonesia', unlocode: 'ID BXT', latitude: 0.1333, longitude: 117.5000, timezone: 'Asia/Makassar' },
  { id: 'BIT', name: 'Bitung', country: 'Indonesia', unlocode: 'ID BIT', latitude: 1.4444, longitude: 125.1889, timezone: 'Asia/Makassar' }
];