import { colors } from '../theme';

export type FeedCategory = 'Top Stories' | 'Crime' | 'Safety' | 'Traffic' | 'Community';

export type Story = {
  id: string;
  category: Exclude<FeedCategory, 'Top Stories'>;
  title: string;
  source: string;
  age: string;
  image: string;
  color: string;
};

export const feedCategories: FeedCategory[] = [
  'Top Stories',
  'Crime',
  'Safety',
  'Traffic',
  'Community',
];

export const stories: Story[] = [
  {
    id: 'lighting',
    category: 'Safety',
    title: 'City tackles street light outages in Braamfontein after community complaints.',
    source: 'ENCA',
    age: '7 hours ago',
    color: colors.red,
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=300&q=75',
  },
  {
    id: 'crime',
    category: 'Crime',
    title: 'Two suspects linked to a string of criminal activities in the Johannesburg CBD.',
    source: 'ENCA',
    age: '3 hours ago',
    color: colors.blue,
    image: 'https://images.unsplash.com/photo-1605806616949-1e87b487fc2f?auto=format&fit=crop&w=300&q=75',
  },
  {
    id: 'students',
    category: 'Community',
    title: 'Students voice safety concerns as incidents rise on campus.',
    source: 'ILWA',
    age: '2 hours ago',
    color: '#00B933',
    image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=300&q=75',
  },
  {
    id: 'traffic',
    category: 'Traffic',
    title: 'Major road closure expected in Braamfontein this weekend.',
    source: 'JRA',
    age: '1 hour ago',
    color: colors.purple,
    image: 'https://images.unsplash.com/photo-1494522358652-f30e61a60313?auto=format&fit=crop&w=300&q=75',
  },
];
