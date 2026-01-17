
export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  date: string;
  image: string;
  image_source?: 'ai' | 'upload';
  metaTitle: string;
  metaDescription: string;
  tags: string[];
  status?: 'published' | 'draft';
  created_at?: string;
}

export interface NavLink {
  label: string;
  href: string;
}

export enum Category {
  AI = 'Inteligência Artificial',
  TECH = 'Tecnologia',
  MARKETING = 'Marketing Digital',
  PRODUCTIVITY = 'Produtividade',
  INCOME = 'Renda Online',
  TOOLS = 'Ferramentas'
}
