import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import Link from '../models/Link';

dotenv.config();

const seedData = async (): Promise<void> => {
  try {
    const mongoUri = (process.env.MONGO_URI || process.env.MONGODB_URI) as string;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for seeding...');

    await User.deleteMany({});
    await Link.deleteMany({});

    const admin = await User.create({
      name: 'Admin User',
      email: process.env.ADMIN_EMAIL || 'admin@corizo.in',
      password: process.env.ADMIN_PASSWORD || 'Admin@123',
      role: 'admin',
    });
    console.log(`Admin user created: ${admin.email}`);

    await User.create({
      name: 'Corizo Author',
      email: 'author@corizo.in',
      password: 'Author@123',
      role: 'author',
    });

    await Link.create([
      {
        title: 'Internship Applications – Q1 2025',
        description: 'All internship application form submissions from the main website for Q1 2025.',
        url: 'https://docs.google.com/spreadsheets/d/example1',
        category: 'Internship',
        type: 'Google Sheets',
        status: 'active',
        createdBy: admin._id,
      },
      {
        title: 'Contact Form Leads – March 2025',
        description: 'Contact form data collected from corizo.in homepage during March 2025.',
        url: 'https://docs.google.com/spreadsheets/d/example2',
        category: 'Leads',
        type: 'Google Sheets',
        status: 'active',
        createdBy: admin._id,
      },
      {
        title: 'Workshop Registrations – Web Dev Bootcamp',
        description: 'Registrations for the Web Development Bootcamp workshop.',
        url: 'https://docs.google.com/spreadsheets/d/example3',
        category: 'Workshop',
        type: 'Google Forms',
        status: 'active',
        createdBy: admin._id,
      },
      {
        title: 'Project Proposal Template',
        description: 'Standard project proposal document template for internal teams.',
        url: 'https://docs.google.com/document/d/example4',
        category: 'Templates',
        type: 'Google Docs',
        status: 'active',
        createdBy: admin._id,
      },
      {
        title: 'Employee Onboarding Survey',
        description: 'Onboarding feedback survey for new Corizo employees.',
        url: 'https://forms.microsoft.com/example5',
        category: 'HR',
        type: 'Microsoft Forms',
        status: 'active',
        createdBy: admin._id,
      },
      {
        title: 'Q2 Budget Tracker',
        description: 'Quarterly budget and expense tracker for all departments.',
        url: 'https://onedrive.live.com/example6',
        category: 'Finance',
        type: 'Microsoft Excel',
        status: 'active',
        createdBy: admin._id,
      },
    ]);

    console.log('Sample links created (6 links with types).');
    const adminPass = process.env.ADMIN_PASSWORD || 'Admin@123';
    console.log('\nSeed completed successfully!');
    console.log(`Admin login:  admin@corizo.in  /  ${adminPass}`);
    console.log('Author login: author@corizo.in /  Author@123');
  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

seedData();
