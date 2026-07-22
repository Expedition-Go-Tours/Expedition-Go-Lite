const LOCATION_FOLDERS: Record<string, string> = {
  'Accra, Ghana': 'accra',
  'Accra, Greater Accra Region': 'accra',
  'Cape Coast, Ghana': 'cape-coast',
  'Kakum, Ghana': 'kakum',
  'Elmina, Ghana': 'elmina',
  'Eastern Region, Ghana': 'eastern-region',
  'Volta Region, Ghana': 'volta-region',
  'Northern Region, Ghana': 'northern-region',
  'Greater Accra, Ghana': 'greater-accra',
  'Ada Foah, Ghana': 'ada-foah',
  'Kumasi, Ghana': 'kumasi',
  'Central Region, Ghana': 'central-region',
  'Western Region, Ghana': 'western-region',
  'Ghana': 'ghana',
}

const DESTINATION_FOLDERS: Record<string, string> = {
  'Accra': 'accra',
  'Cape Coast': 'cape-coast',
  'Kakum National Park': 'kakum',
  'Kumasi': 'kumasi',
  'Elmina': 'elmina',
  'Mole National Park': 'northern-region',
  'Wli Waterfalls': 'volta-region',
  'Ada Foah': 'ada-foah',
  'Busua Beach': 'western-region',
  'Shai Hills Reserve': 'greater-accra',
}

export function getTourImage(location: string, variant: number = 1): string {
  const folder = LOCATION_FOLDERS[location]
  if (!folder) return `/images/tours/accra/${variant}.webp`
  return `/images/tours/${folder}/${variant}.webp`
}

export function getDestinationImage(title: string, variant: number = 1): string {
  const folder = DESTINATION_FOLDERS[title]
  if (!folder) return `/images/tours/accra/${variant}.webp`
  return `/images/tours/${folder}/${variant}.webp`
}
