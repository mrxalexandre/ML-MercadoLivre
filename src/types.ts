export interface MeliPicture {
  id: string;
  url: string;
  secure_url: string;
  size: string;
  max_size: string;
  quality: string;
}

export interface MeliAttribute {
  id: string;
  name: string;
  value_name: string;
}

export interface MeliProduct {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  available_quantity: number;
  condition: string;
  permalink: string;
  pictures: MeliPicture[];
  video_id: string | null;
  attributes: MeliAttribute[];
  warranty: string;
  plain_description?: string;
  thumbnail: string;
  secure_thumbnail: string;
  createdAt?: any;
  docId?: string;
  clicks?: number;
  bonusHours?: number;
}

export interface Banner {
  id?: string;
  type: 'image' | 'video';
  url: string;
  link?: string;
  createdAt?: any;
}
