export const imagePools = {
  'T-Shirts': [
    'https://images.unsplash.com/photo-1583743814966-8936f37f4678?auto=format&fit=crop&w=900&q=85',
    'https://images.unsplash.com/photo-1527719327859-c6ce80353573?auto=format&fit=crop&w=900&q=85',
    'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=900&q=85',
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85',
  ],
  Shirts: [
    'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=85',
    'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=85',
    'https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?auto=format&fit=crop&w=900&q=85',
    'https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=900&q=85',
  ],
  Jeans: [
    'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=85',
    'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=85',
    'https://images.unsplash.com/photo-1604176354204-9268737828e4?auto=format&fit=crop&w=900&q=85',
    'https://images.unsplash.com/photo-1565084888279-aca607ecce0c?auto=format&fit=crop&w=900&q=85',
  ],
  Jackets: [
    'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=85',
    'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=85',
    'https://images.unsplash.com/photo-1544923246-77307dd628b8?auto=format&fit=crop&w=900&q=85',
    'https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?auto=format&fit=crop&w=900&q=85',
  ],
};

const defs = [
  ['Essential Crew Neck Tee', 'Zara', 'T-Shirts', 899, 1299, 4.6, ['Black', 'White', 'Rust']],
  ['Logo Cotton T-Shirt', 'Armani Exchange', 'T-Shirts', 1999, 2999, 4.7, ['Black', 'Navy', 'White']],
  ['Slim Fit Polo T-Shirt', 'Tommy Hilfiger', 'T-Shirts', 2499, 3499, 4.8, ['Navy', 'Red', 'White']],
  ['Pima Cotton Polo', 'Polo Ralph Lauren', 'T-Shirts', 3299, 4499, 4.9, ['Blue', 'Green', 'White']],
  ['Oversized Graphic Tee', 'Zara', 'T-Shirts', 1099, 1599, 4.4, ['White', 'Black', 'Beige']],
  ['Oxford Button-Down Shirt', 'Polo Ralph Lauren', 'Shirts', 2999, 4299, 4.8, ['Blue', 'White', 'Pink']],
  ['Slim Formal Shirt', 'Hugo Boss', 'Shirts', 3499, 4999, 4.7, ['White', 'Blue', 'Black']],
  ['Textured Resort Shirt', 'Zara', 'Shirts', 1799, 2499, 4.5, ['Beige', 'Green', 'Black']],
  ['Poplin Regular Fit Shirt', 'Tommy Hilfiger', 'Shirts', 2699, 3799, 4.6, ['White', 'Navy', 'Blue']],
  ['Tapered Selvedge Jeans', 'Zara', 'Jeans', 2499, 3499, 4.6, ['Blue', 'Black', 'Grey']],
  ['Straight Fit Denim', 'Tommy Hilfiger', 'Jeans', 3299, 4499, 4.8, ['Blue', 'Navy', 'Black']],
  ['J06 Slim Jeans', 'Armani Exchange', 'Jeans', 3999, 4999, 4.7, ['Black', 'Blue', 'Grey']],
  ['Classic Dark Wash Jeans', 'Hugo Boss', 'Jeans', 4299, 4999, 4.9, ['Navy', 'Black']],
  ['Vintage Wash Denim', 'Polo Ralph Lauren', 'Jeans', 3599, 4699, 4.5, ['Blue', 'Grey']],
  ['Faux Suede Bomber', 'Zara', 'Jackets', 2999, 4299, 4.7, ['Brown', 'Black', 'Green']],
  ['Lightweight Harrington', 'Tommy Hilfiger', 'Jackets', 3999, 4999, 4.8, ['Navy', 'Beige', 'Red']],
  ['Logo Zip Jacket', 'Armani Exchange', 'Jackets', 4499, 4999, 4.6, ['Black', 'Grey', 'Navy']],
  ['Water-Repellent Overshirt', 'Hugo Boss', 'Jackets', 4799, 4999, 4.9, ['Black', 'Green', 'Beige']],
];

export const hexes = {
  Black: '#171717',
  White: '#f7f7f4',
  Rust: '#a84d32',
  Navy: '#17233e',
  Red: '#b52b31',
  Blue: '#3f6592',
  Green: '#4d644b',
  Pink: '#d7aaa9',
  Beige: '#c8b99d',
  Grey: '#777975',
  Brown: '#6c4937',
};

export const products = defs.map((d, i) => ({
  id: i + 1,
  name: d[0],
  brand: d[1],
  category: d[2],
  price: d[3],
  originalPrice: d[4],
  rating: d[5],
  colors: d[6].map((name) => ({ name, hex: hexes[name] })),
  sizes: d[2] === 'Jeans' ? ['30', '32', '34', '36', '38'] : ['S', 'M', 'L', 'XL', 'XXL'],
  description: `A refined ${d[0].toLowerCase()} crafted for modern everyday wear. Designed with premium materials, a considered fit, and versatile detailing that moves easily from weekday to weekend.`,
  images: [0, 1, 2].map((x) => imagePools[d[2]][(i + x) % 4]),
  popularity: 100 - i * 3 + (i % 4) * 14,
  newest: i,
}));

export const fallback =
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80';

export const heroImages = [
  'https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=2000&q=88',
  'https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?auto=format&fit=crop&w=2000&q=88',
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=2000&q=88',
];

export const money = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

export const discount = (p) => Math.round((1 - p.price / p.originalPrice) * 100);
