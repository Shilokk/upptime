/** Countries on the explore globe: centroid and the library species commonly found there. */
export interface CountryInfo {
  code: string
  lat: number
  lng: number
  commonPlants: string[]
}

export const COUNTRIES: CountryInfo[] = [
  { code: 'GB', lat: 54.0, lng: -2.5, commonPlants: ['quercus-robur', 'urtica-dioica', 'rubus-fruticosus', 'hyacinthoides-non-scripta'] },
  { code: 'IE', lat: 53.4, lng: -8.0, commonPlants: ['crataegus-monogyna', 'digitalis-purpurea', 'rubus-fruticosus'] },
  { code: 'ES', lat: 40.2, lng: -3.7, commonPlants: ['taraxacum-officinale', 'rosa-canina', 'ophrys-apifera'] },
  { code: 'PT', lat: 39.5, lng: -8.0, commonPlants: ['corylus-avellana', 'rosa-canina', 'plantago-major'] },
  { code: 'FR', lat: 46.6, lng: 2.3, commonPlants: ['tilia-europaea', 'sambucus-nigra', 'achillea-millefolium'] },
  { code: 'DE', lat: 51.2, lng: 10.4, commonPlants: ['fagus-sylvatica', 'urtica-dioica', 'reynoutria-japonica'] },
  { code: 'NO', lat: 61.5, lng: 8.5, commonPlants: ['betula-pendula', 'chamaenerion-angustifolium'] },
  { code: 'HR', lat: 45.1, lng: 15.2, commonPlants: ['quercus-robur', 'primula-vulgaris', 'symphytum-officinale'] },
  { code: 'RU', lat: 58.0, lng: 60.0, commonPlants: ['betula-pendula', 'chamaenerion-angustifolium', 'trifolium-pratense'] },
  { code: 'KZ', lat: 48.0, lng: 67.0, commonPlants: ['achillea-millefolium', 'plantago-major'] },
  { code: 'IN', lat: 21.5, lng: 78.5, commonPlants: ['mentha-aquatica', 'urtica-dioica', 'bellis-perennis'] },
  { code: 'LK', lat: 7.8, lng: 80.7, commonPlants: ['impatiens-glandulifera', 'mentha-aquatica'] },
  { code: 'NP', lat: 28.3, lng: 84.1, commonPlants: ['impatiens-glandulifera', 'urtica-dioica', 'taraxacum-officinale'] },
  { code: 'BD', lat: 23.7, lng: 90.4, commonPlants: ['mentha-aquatica', 'plantago-major'] },
  { code: 'PK', lat: 30.4, lng: 69.3, commonPlants: ['taraxacum-officinale', 'rosa-canina', 'achillea-millefolium'] },
  { code: 'TH', lat: 15.8, lng: 101.0, commonPlants: ['mentha-aquatica', 'impatiens-glandulifera'] },
  { code: 'VN', lat: 16.2, lng: 107.8, commonPlants: ['mentha-aquatica', 'plantago-major'] },
  { code: 'ID', lat: -2.5, lng: 118.0, commonPlants: ['mentha-aquatica', 'lythrum-salicaria'] },
  { code: 'CN', lat: 35.0, lng: 104.0, commonPlants: ['reynoutria-japonica', 'buddleja-davidii', 'taraxacum-officinale'] },
  { code: 'KR', lat: 36.5, lng: 127.8, commonPlants: ['reynoutria-japonica', 'taraxacum-officinale'] },
  { code: 'JP', lat: 36.2, lng: 138.3, commonPlants: ['reynoutria-japonica', 'buddleja-davidii', 'mentha-aquatica'] },
  { code: 'KE', lat: 0.2, lng: 37.9, commonPlants: ['jacobaea-vulgaris', 'plantago-major'] },
  { code: 'NG', lat: 9.1, lng: 8.7, commonPlants: ['plantago-major', 'mentha-aquatica'] },
  { code: 'ZA', lat: -29.0, lng: 25.0, commonPlants: ['rosa-canina', 'jacobaea-vulgaris', 'rubus-fruticosus'] },
  { code: 'EG', lat: 26.8, lng: 30.8, commonPlants: ['achillea-millefolium', 'mentha-aquatica'] },
  { code: 'US', lat: 39.8, lng: -98.6, commonPlants: ['hedera-helix', 'lythrum-salicaria', 'taraxacum-officinale', 'jacobaea-vulgaris'] },
  { code: 'CA', lat: 56.1, lng: -106.3, commonPlants: ['lythrum-salicaria', 'chamaenerion-angustifolium', 'impatiens-glandulifera'] },
  { code: 'MX', lat: 23.6, lng: -102.5, commonPlants: ['symphytum-officinale', 'taraxacum-officinale'] },
  { code: 'BR', lat: -14.2, lng: -51.9, commonPlants: ['sambucus-nigra', 'mentha-aquatica'] },
  { code: 'AR', lat: -38.4, lng: -63.6, commonPlants: ['trifolium-pratense', 'rubus-fruticosus'] },
  { code: 'AU', lat: -25.3, lng: 133.8, commonPlants: ['buddleja-davidii', 'rubus-fruticosus', 'jacobaea-vulgaris'] },
  { code: 'NZ', lat: -40.9, lng: 174.9, commonPlants: ['rubus-fruticosus', 'buddleja-davidii', 'digitalis-purpurea'] },
]
