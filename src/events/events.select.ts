import { Prisma } from '@prisma/client';

// Sélection de base pour les événements
export const eventBasicSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  image: true,
  location: true,
  startDate: true,
  endDate: true,
  maxParticipants: true,
  price: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  organizerId: true,
  categoryId: true,
} satisfies Prisma.EventSelect;

// Sélection avec relations (organizer, category, tags)
export const eventWithRelationsSelect = {
  ...eventBasicSelect,
  organizer: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatar: true,
    },
  },
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  eventTag: {
    select: {
      tag: {
        select: {
          id: true,
          name: true,
          slug: true,
          color: true,
        },
      },
    },
  },
} satisfies Prisma.EventSelect;

// Sélection pour la liste (sans description complète)
export const eventListSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  image: true,
  location: true,
  startDate: true,
  endDate: true,
  maxParticipants: true,
  price: true,
  status: true,
  organizerId: true,
  categoryId: true,
  organizer: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
  category: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.EventSelect;
