const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Event = require('../models/Event');
const Category = require('../models/Category');
const School = require('../models/School');
const AuditLog = require('../models/AuditLog');

const seedData = async () => {
  try {
    console.log('Seeding Apollo Events database...');

    // Clear existing collections if connected to DB
    await User.deleteMany({});
    await Event.deleteMany({});
    await Category.deleteMany({});
    await School.deleteMany({});
    await AuditLog.deleteMany({});

    // 1. Create Users
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('admin123', salt);
    const facultyPassword = await bcrypt.hash('faculty123', salt);
    const studentPassword = await bcrypt.hash('student123', salt);

    const admin = await User.create({
      name: 'Dr. Vikram Varma',
      email: 'admin@apollo.edu.in',
      password: adminPassword,
      role: 'admin',
      school: 'Office of Academic Affairs',
      department: 'University Administration'
    });

    const faculty1 = await User.create({
      name: 'Dr. Rajesh Sharma',
      email: 'dr.sharma@apollo.edu.in',
      password: facultyPassword,
      role: 'faculty',
      school: 'School of Technology',
      department: 'Computer Science & Engineering',
      phone: '+91 98765 43210'
    });

    const faculty2 = await User.create({
      name: 'Dr. Ananya Rao',
      email: 'dr.kumar@apollo.edu.in',
      password: facultyPassword,
      role: 'faculty',
      school: 'School of Health Sciences',
      department: 'Medical Technology',
      phone: '+91 98765 12345'
    });

    const student1 = await User.create({
      name: 'Rahul Babu',
      email: 'rahul.student@apollo.edu.in',
      password: studentPassword,
      role: 'student',
      school: 'School of Technology',
      department: 'Artificial Intelligence & Data Science',
      studentId: 'APU2024-CS-042'
    });

    console.log('Users created successfully.');

    // 2. Create Categories
    const categories = await Category.insertMany([
      { name: 'Workshop', description: 'Hands-on technical and academic workshops', iconName: 'Wrench', color: '#1789A5' },
      { name: 'Hackathon', description: 'Intensive collaborative coding & problem solving competitions', iconName: 'Code', color: '#27B8D5' },
      { name: 'Seminar', description: 'Expert talks and academic research presentations', iconName: 'BookOpen', color: '#064B6B' },
      { name: 'Conference', description: 'National and international symposia', iconName: 'Globe', color: '#FBB91B' },
      { name: 'Competition', description: 'Inter-departmental and national contests', iconName: 'Trophy', color: '#E5A40F' },
      { name: 'Cultural', description: 'Arts, music, dance, and cultural celebrations', iconName: 'Music', color: '#EC4899' },
      { name: 'Sports', description: 'Intramural and inter-college athletic tournaments', iconName: 'Activity', color: '#10B981' },
      { name: 'FDP', description: 'Faculty Development Programs', iconName: 'UserCheck', color: '#6366F1' }
    ]);

    // 3. Create Schools
    const schools = await School.insertMany([
      { name: 'School of Technology', code: 'SOT', departments: ['Computer Science & Eng', 'AI & Data Science', 'Cyber Security'] },
      { name: 'School of Management', code: 'SOM', departments: ['MBA', 'BBA', 'Finance & Analytics'] },
      { name: 'School of Health Sciences', code: 'SOHS', departments: ['Physiotherapy', 'Radiology', 'Medical Lab Tech'] },
      { name: 'Apollo Institute of Pharmaceutical Sciences', code: 'AIPS', departments: ['Pharm D', 'B.Pharm', 'Pharmaceutics'] },
      { name: 'School of Social Science', code: 'SOSS', departments: ['Psychology', 'Public Health', 'Social Work'] }
    ]);

    // 4. Create Events
    const events = await Event.insertMany([
      {
        title: 'National AI & Machine Learning Symposium 2026',
        description: 'A 2-day flagship technical workshop and symposium focusing on Deep Learning, Generative AI models, and real-world healthcare AI applications. Features live coding sessions, industry speakers from Apollo Healthcare & Tech firms, and hands-on lab projects.',
        eventType: 'Workshop',
        school: 'School of Technology',
        department: 'Computer Science & Engineering',
        poster: '/assets/poster_ai_ml.jpg',
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
          programs: ['B.Tech CSE', 'B.Tech AI&DS', 'M.Tech', 'B.Sc Data Science'],
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
        schedule: [
          { time: '10:00 AM - 10:30 AM', title: 'Inauguration & Keynote Address', speaker: 'Dr. Vinod Paul (Director, AI Research)', description: 'Opening speech on the Future of AI in Healthcare.' },
          { time: '10:30 AM - 12:30 PM', title: 'Deep Learning with PyTorch', speaker: 'Prof. K. S. Reddy', description: 'Hands-on session on neural networks architecture.' },
          { time: '01:30 PM - 03:30 PM', title: 'Generative AI & LLM Fine-Tuning', speaker: 'Meera Deshmukh (Lead AI Engineer)', description: 'Building custom RAG pipelines.' },
          { time: '03:30 PM - 04:30 PM', title: 'Student Project Demonstrations & Valedictory', speaker: 'Panel Members', description: 'Evaluation of student lab projects.' }
        ],
        speakers: [
          { name: 'Dr. Vinod Paul', designation: 'Chief Research Scientist', organization: 'Apollo Health Tech Lab', bio: 'Pioneer in AI-assisted diagnostic imaging with 15+ patents.' },
          { name: 'Meera Deshmukh', designation: 'Staff AI Engineer', organization: 'TechCorp AI', bio: 'Specialist in Large Language Models and Enterprise Knowledge Graphs.' }
        ],
        prizes: [
          { rank: '1st Prize', amount: '₹ 15,000', description: 'Certificate of Excellence + Trophy' },
          { rank: '2nd Prize', amount: '₹ 10,000', description: 'Certificate of Merit' }
        ],
        brochureUrl: 'https://apollo.edu.in/brochures/AI_Symposium_2026.pdf',
        rulesUrl: 'https://apollo.edu.in/rules/AI_Symposium_Guidelines.pdf',
        status: 'PUBLISHED',
        isFeatured: true,
        createdBy: faculty1._id,
        approvedBy: admin._id,
        approvalComment: 'Approved flagship technical event for School of Technology.'
      },
      {
        title: 'Apollo MedTech Hackathon 2026: Innovations in Healthcare',
        description: '24-hour non-stop hackathon challenging students to solve pressing medical device, hospital workflow, and telemetry challenges. Mentored by senior physicians and software architects.',
        eventType: 'Hackathon',
        school: 'School of Technology',
        department: 'Artificial Intelligence & Data Science',
        poster: '/assets/poster_hackathon.jpg',
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
        registrationUrl: '',
        registrationDeadline: '2026-09-01',
        maxParticipants: 120,
        currentParticipantsCount: 88,
        eligibility: {
          programs: ['All Engineering & Health Sciences Students'],
          schools: ['School of Technology', 'School of Health Sciences', 'Apollo Institute of Pharmaceutical Sciences'],
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
        schedule: [
          { time: '09:00 AM', title: 'Problem Statement Release & Hacking Begins', speaker: 'Organizing Team', description: 'Teams choose tracks and receive API credentials.' },
          { time: '02:00 PM', title: 'Mentorship Review Round 1', speaker: 'Industry Mentors', description: 'Architectural feedback on prototypes.' },
          { time: '09:00 AM (Day 2)', title: 'Final Pitching to Jury', speaker: 'Jury Panel', description: 'Top 10 teams pitch 3-min demos.' }
        ],
        prizes: [
          { rank: '1st Prize', amount: '₹ 50,000', description: 'Incubation Grant + Apollo Internship' },
          { rank: '2nd Prize', amount: '₹ 25,000', description: 'Cash Award + Tech Goodies' }
        ],
        status: 'PUBLISHED',
        isFeatured: true,
        createdBy: faculty1._id,
        approvedBy: admin._id
      },
      {
        title: 'International Conclave on Next-Gen Pharmaceutical Sciences',
        description: 'Brings together leading researchers in drug discovery, nano-medicine, and clinical trials. Highlighting breakthroughs in targeted oncology drug delivery systems.',
        eventType: 'Conference',
        school: 'Apollo Institute of Pharmaceutical Sciences',
        department: 'Pharmaceutics',
        poster: '/assets/poster_ai_ml.jpg',
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
        registrationUrl: 'https://forms.google.com/apollo-pharma-conclave',
        registrationDeadline: '2026-09-10',
        maxParticipants: 300,
        currentParticipantsCount: 195,
        eligibility: {
          programs: ['B.Pharm', 'Pharm.D', 'M.Pharm', 'Ph.D Scholars'],
          schools: ['Apollo Institute of Pharmaceutical Sciences', 'School of Health Sciences'],
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
        isFeatured: true,
        createdBy: faculty2._id,
        approvedBy: admin._id
      },
      {
        title: 'Executive Healthcare Management & Leadership Workshop',
        description: 'Interactive leadership development workshop designed for healthcare management professionals and MBA students focusing on digital hospital administration and NABH accreditation standards.',
        eventType: 'Workshop',
        school: 'School of Management',
        department: 'MBA',
        poster: '/assets/poster_hackathon.jpg',
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
        registrationUrl: '',
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
        isFeatured: false,
        createdBy: faculty1._id,
        approvedBy: admin._id
      },
      {
        title: 'Cybersecurity & Ethical Hacking Masterclass',
        description: 'Hands-on training on network security auditing, vulnerability assessment, penetration testing tools, and SOC incident response procedures.',
        eventType: 'Workshop',
        school: 'School of Technology',
        department: 'Cyber Security',
        poster: '/assets/poster_ai_ml.jpg',
        startDate: '2026-09-28',
        endDate: '2026-09-29',
        startTime: '11:00',
        endTime: '16:00',
        venue: 'PCRKC Cyber Lab',
        building: 'Academic Block B',
        room: 'Lab 201',
        mode: 'Offline',
        registrationRequired: true,
        registrationType: 'Internal',
        registrationUrl: '',
        registrationDeadline: '2026-09-25',
        maxParticipants: 60,
        currentParticipantsCount: 60,
        eligibility: {
          programs: ['B.Tech CSE', 'B.Tech Cyber Security'],
          schools: ['School of Technology'],
          years: ['3rd Year', '4th Year'],
          ugPg: 'UG Only',
          facultyAllowed: false,
          externalAllowed: false
        },
        organizer: {
          school: 'School of Technology',
          department: 'Cyber Security',
          coordinatorName: 'Dr. Rajesh Sharma',
          email: 'dr.sharma@apollo.edu.in',
          phone: '+91 98765 43210'
        },
        status: 'PENDING_APPROVAL',
        isFeatured: false,
        createdBy: faculty1._id
      },
      {
        title: 'Apollo Annual Cultural & Performing Arts Fest: "Euphony 2026"',
        description: 'The premier university cultural festival featuring music bands, solo vocal performances, classical and hip-hop dance competitions, drama, and fashion show.',
        eventType: 'Cultural',
        school: 'School of Social Science',
        department: 'Student Affairs',
        poster: '/assets/poster_hackathon.jpg',
        startDate: '2026-10-10',
        endDate: '2026-10-12',
        startTime: '16:00',
        endTime: '22:00',
        venue: 'Apollo Central Open Air Theater',
        building: 'Campus Quadrangle',
        room: 'Main Stage',
        mode: 'Offline',
        registrationRequired: true,
        registrationType: 'External',
        registrationUrl: 'https://forms.google.com/apollo-euphony-2026',
        registrationDeadline: '2026-10-05',
        maxParticipants: 1000,
        currentParticipantsCount: 420,
        eligibility: {
          programs: ['All Students'],
          schools: ['School of Technology', 'School of Management', 'School of Health Sciences', 'Apollo Institute of Pharmaceutical Sciences', 'School of Social Science'],
          years: ['All Years'],
          ugPg: 'All',
          facultyAllowed: true,
          externalAllowed: true
        },
        organizer: {
          school: 'School of Social Science',
          department: 'Student Affairs',
          coordinatorName: 'Dr. Ananya Rao',
          email: 'dr.kumar@apollo.edu.in',
          phone: '+91 98765 12345'
        },
        status: 'PUBLISHED',
        isFeatured: true,
        createdBy: faculty2._id,
        approvedBy: admin._id
      }
    ]);

    // Audit log initialization
    await AuditLog.create({
      userName: 'System Initializer',
      userEmail: 'admin@apollo.edu.in',
      userRole: 'admin',
      action: 'SYSTEM_SEEDED',
      details: 'Successfully seeded users, categories, schools, and 6 initial Apollo University events.'
    });

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
  }
};

module.exports = seedData;
