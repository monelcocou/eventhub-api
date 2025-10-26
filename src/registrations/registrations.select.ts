import { Prisma } from '@prisma/client';

// Sélection de base
export const registrationBasicSelect = {
  id: true,
  status: true,
  registeredAt: true,
  userId: true,
  eventId: true,
} satisfies Prisma.RegistrationSelect;

// Avec relations (user + event)
export const registrationWithRelationsSelect = {
  id: true,
  status: true,
  registeredAt: true,
  userId: true,
  eventId: true,
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatar: true,
    },
  },
  event: {
    select: {
      id: true,
      title: true,
      slug: true,
      image: true,
      location: true,
      startDate: true,
      endDate: true,
      price: true,
      status: true,
    },
  },
} satisfies Prisma.RegistrationSelect;

// Pour liste des inscrits (organizer)
export const registrationListSelect = {
  id: true,
  status: true,
  registeredAt: true,
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatar: true,
    },
  },
} satisfies Prisma.RegistrationSelect;
