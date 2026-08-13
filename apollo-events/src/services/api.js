import axios from 'axios';

const API = axios.create({
  baseURL: '/api'
});

// Fallback seed events dataset for Firebase Hosting static deployment
export const INITIAL_SEED_EVENTS = [
  {
    _id: 'evt_001',
    title: 'National AI & Machine Learning Symposium 2026',
    description: 'A 2-day flagship technical workshop and symposium focusing on Deep Learning, Generative AI models, and real-world healthcare AI applications. Features live coding sessions, industry speakers from Apollo Healthcare & Tech firms, and hands-on lab projects.',
    eventType: 'Workshop',
    school: 'School of Technology',
    department: 'Computer Science & Engineering',
    poster: '/assets/poster_ai_conference.jpg',
    startDate: '2026-08-25',
    endDate: '2026-08-26',
    startTime: '10:00',
    endTime: '16:30',
    venue: 'PCRKC Auditorium',
    building: 'Sir C.V. Raman Academic Block',
    room: 'Auditorium 101',
    mapUrl: 'https://maps.google.com/?q=The+Apollo+University+Chittoor',
    mode: 'Offline',
    registrationRequired: true,
    registrationType: 'External',
    registrationUrl: 'https://forms.google.com/apollo-ai-symposium-2026',
    registrationDeadline: '2026-08-23',
    maxParticipants: 250,
    currentParticipantsCount: 142,
    eligibility: {
      programs: ['B.Tech CSE', 'B.Tech AI&DS', 'M.Tech'],
      schools: ['School of Technology', 'School of Management'],
      years: ['2nd Year', '3rd Year', '4th Year'],
      ugPg: 'All',
      facultyAllowed: true,
      externalAllowed: true
    },
    organizer: {
      school: 'School of Technology',
      department: 'Computer Science & Engineering',
      coordinatorName: 'Dr. Rajesh Sharma',
      email: 'dr.sharma@apollo.edu.in',
      phone: '+91 98765 43210'
    },
    status: 'PUBLISHED',
    computedStatus: 'UPCOMING',
    isFeatured: true
  },
  {
    _id: 'evt_002',
    title: 'Apollo MedTech Hackathon 2026: Innovations in Healthcare',
    description: '24-hour non-stop hackathon challenging students to solve pressing medical device, hospital workflow, and telemetry challenges. Mentored by senior physicians and software architects.',
    eventType: 'Hackathon',
    school: 'School of Technology',
    department: 'Artificial Intelligence & Data Science',
    poster: '/assets/poster_medtech.jpg',
    startDate: '2026-09-05',
    endDate: '2026-09-06',
    startTime: '09:00',
    endTime: '12:00',
    venue: 'APU Innovation Hub & IoT Center',
    building: 'APU Science & Tech Complex',
    room: 'Lab 304',
    mode: 'Hybrid',
    registrationRequired: true,
    registrationType: 'Internal',
    registrationDeadline: '2026-09-01',
    maxParticipants: 120,
    currentParticipantsCount: 88,
    eligibility: {
      programs: ['Engineering & Health Sciences Students'],
      schools: ['School of Technology', 'School of Health Sciences'],
      years: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
      ugPg: 'All',
      facultyAllowed: false,
      externalAllowed: true
    },
    organizer: {
      school: 'School of Technology',
      department: 'AI & Data Science',
      coordinatorName: 'Dr. Rajesh Sharma',
      email: 'dr.sharma@apollo.edu.in',
      phone: '+91 98765 43210'
    },
    status: 'PUBLISHED',
    computedStatus: 'UPCOMING',
    isFeatured: true
  },
  {
    _id: 'evt_003',
    title: 'International Conclave on Next-Gen Pharmaceutical Sciences',
    description: 'Brings together leading researchers in drug discovery, nano-medicine, and clinical trials. Highlighting breakthroughs in targeted oncology drug delivery systems.',
    eventType: 'Conference',
    school: 'Apollo Institute of Pharmaceutical Sciences',
    department: 'Pharmaceutics',
    poster: '/assets/poster_pharma.jpg',
    startDate: '2026-09-15',
    endDate: '2026-09-16',
    startTime: '09:30',
    endTime: '17:00',
    venue: 'AHERF Convention Center',
    building: 'Main Administrative Block',
    room: 'Auditorium 202',
    mode: 'Offline',
    registrationRequired: true,
    registrationType: 'External',
    registrationUrl: 'https://forms.google.com',
    registrationDeadline: '2026-09-10',
    maxParticipants: 300,
    currentParticipantsCount: 195,
    eligibility: {
      programs: ['B.Pharm', 'Pharm.D', 'M.Pharm'],
      schools: ['Apollo Institute of Pharmaceutical Sciences'],
      years: ['All Years'],
      ugPg: 'All',
      facultyAllowed: true,
      externalAllowed: true
    },
    organizer: {
      school: 'Apollo Institute of Pharmaceutical Sciences',
      department: 'Pharmaceutics',
      coordinatorName: 'Dr. Ananya Rao',
      email: 'dr.kumar@apollo.edu.in',
      phone: '+91 98765 12345'
    },
    status: 'PUBLISHED',
    computedStatus: 'UPCOMING',
    isFeatured: true
  },
  {
    _id: 'evt_004',
    title: 'Executive Healthcare Management & Leadership Workshop',
    description: 'Interactive leadership development workshop designed for healthcare management professionals and MBA students focusing on digital hospital administration.',
    eventType: 'Workshop',
    school: 'School of Management',
    department: 'MBA',
    poster: '/assets/poster_healthcare_leadership.jpg',
    startDate: '2026-09-22',
    endDate: '2026-09-22',
    startTime: '10:00',
    endTime: '15:30',
    venue: 'SOM Conference Hall',
    building: 'School of Management Block',
    room: 'Seminar Room A',
    mode: 'Offline',
    registrationRequired: true,
    registrationType: 'Internal',
    registrationDeadline: '2026-09-20',
    maxParticipants: 80,
    currentParticipantsCount: 45,
    eligibility: {
      programs: ['MBA Hospital Management', 'BBA'],
      schools: ['School of Management'],
      years: ['1st Year', '2nd Year'],
      ugPg: 'PG Only',
      facultyAllowed: true,
      externalAllowed: false
    },
    organizer: {
      school: 'School of Management',
      department: 'MBA',
      coordinatorName: 'Dr. Rajesh Sharma',
      email: 'dr.sharma@apollo.edu.in',
      phone: '+91 98765 43210'
    },
    status: 'PUBLISHED',
    computedStatus: 'UPCOMING',
    isFeatured: false
  }
];

// Attach JWT token
API.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('apollo_user') || 'null');
  if (user && user.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default API;
