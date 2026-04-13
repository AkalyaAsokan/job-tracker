export type FetcherType = 'greenhouse' | 'lever' | 'adzuna' | 'linkedin-id' | 'linkedin-kw';

export interface Company {
  id: string;
  name: string;
  fetcher: FetcherType;
  slug?: string;           // greenhouse / lever
  linkedInId?: number;     // linkedin-id
  linkedInKw?: string;     // linkedin-kw keyword (company name)
  adzunaQuery?: string;    // adzuna
  color: string;
  bg: string;
}

export const COMPANIES: Company[] = [
  {
    id: 'google',
    name: 'Google',
    fetcher: 'linkedin-id',
    linkedInId: 1441,
    color: '#4285F4',
    bg: '#EEF4FF',
  },
  {
    id: 'amazon',
    name: 'Amazon',
    fetcher: 'linkedin-id',
    linkedInId: 1586,
    color: '#FF9900',
    bg: '#FFF8EE',
  },
  {
    id: 'meta',
    name: 'Meta',
    fetcher: 'linkedin-id',
    linkedInId: 10667,
    color: '#1877F2',
    bg: '#EEF4FF',
  },
  {
    id: 'netflix',
    name: 'Netflix',
    fetcher: 'linkedin-id',
    linkedInId: 165158,
    color: '#E50914',
    bg: '#FEF0F0',
  },
  {
    id: 'uber',
    name: 'Uber',
    fetcher: 'linkedin-kw',
    linkedInKw: 'uber',
    color: '#000000',
    bg: '#F5F5F5',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    fetcher: 'linkedin-kw',
    linkedInKw: 'openai',
    color: '#10A37F',
    bg: '#EEFAF6',
  },
  {
    id: 'doordash',
    name: 'DoorDash',
    fetcher: 'linkedin-kw',
    linkedInKw: 'doordash',
    color: '#FF3008',
    bg: '#FFF0EE',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    fetcher: 'greenhouse',
    slug: 'stripe',
    color: '#6772E5',
    bg: '#F0EFFE',
  },
  {
    id: 'airbnb',
    name: 'Airbnb',
    fetcher: 'greenhouse',
    slug: 'airbnb',
    color: '#FF5A5F',
    bg: '#FFF0F0',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    fetcher: 'greenhouse',
    slug: 'anthropic',
    color: '#D4773A',
    bg: '#FEF5EE',
  },
];

export const COMPANY_MAP = Object.fromEntries(COMPANIES.map(c => [c.id, c]));
