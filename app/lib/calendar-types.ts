export type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  allDay: boolean;
};

export function getDemoCalendarEvents(): CalendarEvent[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  return [
    {
      id: 'demo-1',
      title: 'Matcha & evening stroll',
      description: 'Taking the scenic route through the park after work.',
      location: 'Riverside Walk',
      startDate: new Date(y, m, d, 18, 30).toISOString(),
      endDate: new Date(y, m, d, 19, 30).toISOString(),
      allDay: false,
    },
    {
      id: 'demo-2',
      title: 'Dinner at Osteria Mozza',
      description: 'Corner table reserved under Mara.',
      location: 'High Street 42',
      startDate: new Date(y, m, d + 2, 19, 30).toISOString(),
      endDate: new Date(y, m, d + 2, 21, 30).toISOString(),
      allDay: false,
    },
    {
      id: 'demo-3',
      title: 'Weekend cabin trip',
      description: 'Packing warm sweaters, books, and coffee beans.',
      location: 'Pine Creek Reserve',
      startDate: new Date(y, m, d + 5, 0, 0, 0).toISOString(),
      endDate: new Date(y, m, d + 7, 23, 59, 59).toISOString(),
      allDay: true,
    },
    {
      id: 'demo-4',
      title: 'Farmers market with Mara',
      description: 'Pick up fresh sourdough, apples, and seasonal flowers.',
      location: 'Old Town Square',
      startDate: new Date(y, m, d + 9, 9, 30).toISOString(),
      endDate: new Date(y, m, d + 9, 11, 30).toISOString(),
      allDay: false,
    },
    {
      id: 'demo-5',
      title: 'Dentist appointment',
      description: 'Routine cleaning for both of us.',
      location: 'Northside Dental Care',
      startDate: new Date(y, m, d + 13, 14, 0).toISOString(),
      endDate: new Date(y, m, d + 13, 15, 0).toISOString(),
      allDay: false,
    },
    {
      id: 'demo-6',
      title: 'Acoustic concert night',
      description: 'Doors open at 19:00.',
      location: 'The Garden Hall',
      startDate: new Date(y, m, d + 18, 20, 0).toISOString(),
      endDate: new Date(y, m, d + 18, 22, 30).toISOString(),
      allDay: false,
    },
  ];
}
