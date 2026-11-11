const path = require('path');
// Load backend/.env regardless of the directory the script is run from
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

// Load models
const User = require('../src/models/User'); // legacy collection — cleared only
const Guest = require('../src/models/Guest');
const Host = require('../src/models/Host');
const Admin = require('../src/models/Admin');
const Unit = require('../src/models/Unit');
const Property = require('../src/models/Property');
const Booking = require('../src/models/Booking');
const Review = require('../src/models/Review');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hostn';

// This script DELETES all accounts, properties, units, bookings and reviews.
// Refuse to run against anything but a local database unless --force is passed.
const isLocalDb = /^mongodb:\/\/(localhost|127\.0\.0\.1|\[::1\]|mongo)(:\d+)?\//.test(MONGODB_URI);
if (!isLocalDb && !process.argv.includes('--force')) {
  console.error('❌ Refusing to seed: MONGODB_URI is not a local database.');
  console.error('   Seeding wipes existing data. Re-run with --force if you really mean it.');
  process.exit(1);
}

const MODEL_BY_ROLE = { guest: Guest, host: Host, admin: Admin };

const cities = ['Riyadh', 'Jeddah', 'Abha', 'Khobar', 'Mecca', 'Taif', 'Al Ula', 'Hail'];

const propertyImages = {
  chalet: [
    'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
    'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800',
    'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800',
  ],
  apartment: [
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
  ],
  villa: [
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
  ],
  studio: [
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800',
    'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800',
    'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800',
  ],
  farm: [
    'https://images.unsplash.com/photo-1500076656116-558758c991c1?w=800',
    'https://images.unsplash.com/photo-1505400284786-abd8fd099af3?w=800',
    'https://images.unsplash.com/photo-1593696140826-c58b021acf8b?w=800',
  ],
};

const amenitiesList = ['wifi', 'pool', 'parking', 'ac', 'kitchen', 'tv', 'washer', 'bbq', 'garden', 'balcony'];

const seedUsers = [
  {
    name: 'Tariq Al-Rashid',
    email: 'tariq@hostn.com',
    password: 'Password123',
    phone: '+966501234567',
    role: 'admin',
  },
  {
    name: 'Samir Khalid',
    email: 'samir@hostn.com',
    password: 'Password123',
    phone: '+966509876543',
    role: 'host',
  },
  {
    name: 'Fatima Al-Zahrani',
    email: 'fatima@hostn.com',
    password: 'Password123',
    phone: '+966507654321',
    role: 'host',
  },
  {
    name: 'Omar Hassan',
    email: 'omar@hostn.com',
    password: 'Password123',
    phone: '+966503456789',
    role: 'guest',
  },
  {
    name: 'Layla Ibrahim',
    email: 'layla@hostn.com',
    password: 'Password123',
    phone: '+966502345678',
    role: 'guest',
  },
];

const propertyTemplates = [
  {
    title: 'Luxury Mountain Chalet with Infinity Pool',
    description:
      'Experience the ultimate mountain getaway in this stunning chalet overlooking the valley. Features an infinity pool, private jacuzzi, fully equipped kitchen, and breathtaking panoramic views. Perfect for families and groups seeking privacy and luxury.',
    type: 'chalet',
    city: 'Abha',
    district: 'Al Muftaha',
    perNight: 850,
    discountPercent: 20,
    maxGuests: 10,
    bedrooms: 4,
    bathrooms: 3,
    beds: 6,
    isFeatured: true,
  },
  {
    title: 'Modern Studio Apartment Near Boulevard',
    description:
      'Stylish and modern studio apartment in the heart of the city, walking distance from top restaurants and entertainment venues. High-speed WiFi, smart TV, and premium amenities. Ideal for solo travelers and couples.',
    type: 'studio',
    city: 'Riyadh',
    district: 'Al Olaya',
    perNight: 299,
    discountPercent: 30,
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    beds: 1,
    isFeatured: true,
  },
  {
    title: 'Beachfront Villa with Private Pool',
    description:
      'Escape to this magnificent beachfront villa with direct sea access. Features a private heated pool, barbecue area, 5 spacious bedrooms, and a fully equipped kitchen. Watch the sunset from your private terrace.',
    type: 'villa',
    city: 'Jeddah',
    district: 'Al Hamra',
    perNight: 1500,
    discountPercent: 15,
    maxGuests: 12,
    bedrooms: 5,
    bathrooms: 4,
    beds: 8,
    isFeatured: true,
  },
  {
    title: 'Desert Farm Experience',
    description:
      'Reconnect with nature at this authentic desert farm. Includes traditional Arabic hospitality, camel rides, stargazing sessions, and farm-to-table breakfast. A unique experience for those seeking tranquility.',
    type: 'farm',
    city: 'Hail',
    district: 'Al Ghazalah',
    perNight: 650,
    discountPercent: 0,
    maxGuests: 8,
    bedrooms: 3,
    bathrooms: 2,
    beds: 4,
    isFeatured: false,
  },
  {
    title: 'Heritage Apartment in Old Town',
    description:
      'Live like a local in this beautifully restored apartment in the historic district. Exposed stone walls, traditional decor, and modern comforts create a unique blend of old and new.',
    type: 'apartment',
    city: 'Al Ula',
    district: 'Al Deerah',
    perNight: 480,
    discountPercent: 10,
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 1,
    beds: 2,
    isFeatured: true,
  },
  {
    title: 'Cozy Chalet with Mountain Views',
    description:
      'A charming wooden chalet nestled in the mountains with stunning views. Perfect for couples and small families. Includes a fireplace, private terrace, and is just minutes from hiking trails.',
    type: 'chalet',
    city: 'Taif',
    district: 'Al Hada',
    perNight: 420,
    discountPercent: 25,
    maxGuests: 6,
    bedrooms: 2,
    bathrooms: 2,
    beds: 3,
    isFeatured: false,
  },
  {
    title: 'Executive Suite Near KAEC',
    description:
      'Premium executive suite with panoramic ocean views. Features a private balcony, marble bathroom, gourmet kitchen, and concierge service. Business and leisure travelers will feel right at home.',
    type: 'apartment',
    city: 'Jeddah',
    district: 'Al Shati',
    perNight: 699,
    discountPercent: 0,
    maxGuests: 3,
    bedrooms: 2,
    bathrooms: 2,
    beds: 2,
    isFeatured: false,
  },
  {
    title: 'Poolside Villa in Compound',
    description:
      'Spacious villa in a gated compound with shared pool, gym, and playground. Child-friendly environment with 24/7 security. Close to international schools and shopping centers.',
    type: 'villa',
    city: 'Khobar',
    district: 'Al Rakah',
    perNight: 1100,
    discountPercent: 30,
    maxGuests: 10,
    bedrooms: 4,
    bathrooms: 3,
    beds: 6,
    isFeatured: true,
  },
  {
    title: 'Minimalist Studio in City Center',
    description:
      'A beautifully designed minimalist studio with all the essentials. Great for short business trips or weekend getaways. Walking distance to malls, restaurants, and metro station.',
    type: 'studio',
    city: 'Riyadh',
    district: 'Al Malaz',
    perNight: 249,
    discountPercent: 50,
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    beds: 1,
    isFeatured: false,
  },
  {
    title: 'Scenic Camp in the Desert',
    description:
      'Glamping experience under the stars in the majestic desert. Includes luxury tents with proper beds, private bathrooms, a common area with bonfire, and a professional guide for desert activities.',
    type: 'camp',
    city: 'Riyadh',
    district: 'Al Thumamah',
    perNight: 380,
    discountPercent: 0,
    maxGuests: 6,
    bedrooms: 2,
    bathrooms: 2,
    beds: 3,
    isFeatured: false,
  },
  {
    title: 'Family Chalet Near Rose Festival',
    description:
      'Perfect chalet for the whole family near the famous rose festival. Features a private pool, large garden, BBQ area, and play area for children. Short drive from the rose farms and market.',
    type: 'chalet',
    city: 'Taif',
    district: 'Al Shafa',
    perNight: 750,
    discountPercent: 20,
    maxGuests: 12,
    bedrooms: 5,
    bathrooms: 3,
    beds: 7,
    isFeatured: true,
  },
  {
    title: 'Boutique Hotel Suite with Sea View',
    description:
      'Indulge in this luxurious hotel suite overlooking the Red Sea. Includes daily housekeeping, room service, access to rooftop pool, and a complimentary breakfast for two.',
    type: 'hotel',
    city: 'Jeddah',
    district: 'Al Corniche',
    perNight: 950,
    discountPercent: 15,
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 2,
    beds: 2,
    isFeatured: false,
  },
];

const reviewComments = [
  'Absolutely amazing stay! The property was exactly as described, clean, and well-equipped. The host was very responsive and accommodating. Will definitely book again!',
  'Great location and beautiful property. The views were breathtaking. Only minor issue was the wifi speed, but everything else was perfect.',
  'We had a wonderful family vacation here. The kids loved the pool, and the house had everything we needed. Highly recommended for families!',
  'Perfect getaway from the city stress. The property was spotless and the host went above and beyond to make us feel welcome.',
  'Beautiful property with stunning views. The amenities were top-notch and the location was convenient. We will definitely be back!',
  'Excellent value for money. The property exceeded our expectations. Very clean, well-maintained, and in a great location.',
  'Had an amazing time! The host was super helpful with local recommendations. The property photos don\'t do it justice — it\'s even better in person.',
  'A true hidden gem! Perfect for couples looking for a romantic getaway. The ambiance was magical, especially at sunset.',
];

async function seed() {
  try {
    console.log('🌱 Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Guest.deleteMany({}),
      Host.deleteMany({}),
      Admin.deleteMany({}),
      Unit.deleteMany({}),
      Property.deleteMany({}),
      Booking.deleteMany({}),
      Review.deleteMany({}),
    ]);

    // Create users
    console.log('👥 Creating users...');
    // Accounts live in separate Guest / Host / Admin collections. Passwords are
    // passed in plain text: each model's pre-save hook hashes them exactly once.
    const users = [];
    for (const { role, ...fields } of seedUsers) {
      users.push(
        await MODEL_BY_ROLE[role].create({ ...fields, isVerified: true, phoneVerified: true })
      );
    }

    const [admin, host1, host2, guest1, guest2] = users;
    console.log(`   ✅ Created ${users.length} users`);

    // Create properties
    console.log('🏠 Creating properties...');
    const properties = [];
    const units = [];

    for (const template of propertyTemplates) {
      const hostUser = Math.random() > 0.5 ? host1 : host2;
      const typeImages = propertyImages[template.type] || propertyImages.chalet;

      const property = await Property.create({
        host: hostUser._id,
        title: template.title,
        description: template.description,
        type: template.type,
        location: {
          city: template.city,
          district: template.district,
          address: `${Math.floor(Math.random() * 999) + 1} Al Nuzha Street`,
          coordinates: {
            lat: 24.7136 + Math.random() * 2,
            lng: 46.6753 + Math.random() * 2,
          },
        },
        images: typeImages.map((url, i) => ({
          url,
          caption: `View ${i + 1}`,
          isPrimary: i === 0,
        })),
        amenities: amenitiesList.slice(0, Math.floor(Math.random() * 6) + 4),
        pricing: {
          perNight: template.perNight,
          cleaningFee: Math.floor(template.perNight * 0.1),
          discountPercent: template.discountPercent,
        },
        capacity: {
          maxGuests: template.maxGuests,
          bedrooms: template.bedrooms,
          bathrooms: template.bathrooms,
          beds: template.beds,
        },
        rules: {
          checkInTime: '14:00',
          checkOutTime: '12:00',
          minNights: 1,
          maxNights: 30,
          smokingAllowed: false,
          petsAllowed: Math.random() > 0.7,
          partiesAllowed: false,
        },
        isActive: true,
        isFeatured: template.isFeatured,
        tags: [template.type, template.city.toLowerCase()],
      });

      properties.push(property);

      // Listings only appear when a property has at least one active unit
      const nightly = template.perNight;
      const unit = await Unit.create({
        property: property._id,
        nameEn: 'Unit 1',
        nameAr: 'الوحدة 1',
        description: template.description,
        isActive: true,
        images: typeImages.map((url) => ({ url })),
        pricing: {
          sunday: nightly,
          monday: nightly,
          tuesday: nightly,
          wednesday: nightly,
          thursday: nightly,
          friday: nightly,
          saturday: nightly,
          cleaningFee: Math.floor(nightly * 0.1),
          discountPercent: template.discountPercent,
        },
        capacity: { maxGuests: template.maxGuests },
        hasBedrooms: true,
        bedrooms: { count: template.bedrooms },
        bathroomCount: template.bathrooms,
      });
      units.push(unit);
    }

    console.log(`   ✅ Created ${properties.length} properties with ${units.length} units`);

    // Create bookings
    console.log('📅 Creating bookings...');
    const bookings = [];

    for (let i = 0; i < 8; i++) {
      const property = properties[i % properties.length];
      const guest = i % 2 === 0 ? guest1 : guest2;
      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() - Math.floor(Math.random() * 30) - 5);
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + Math.floor(Math.random() * 5) + 2);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      const perNight = property.pricing.perNight;
      const subtotal = perNight * nights;
      const cleaningFee = property.pricing.cleaningFee || 0;
      const serviceFee = Math.round(subtotal * 0.1);
      const discount = 0;
      const taxableAmount = subtotal + cleaningFee + serviceFee - discount;
      const vat = Math.round(taxableAmount * 0.15);
      const total = taxableAmount + vat;

      const booking = await Booking.create({
        property: property._id,
        unit: units[i % units.length]._id,
        guest: guest._id,
        checkIn,
        checkOut,
        guests: { adults: 2, children: 0, infants: 0 },
        pricing: { perNight, nights, subtotal, cleaningFee, serviceFee, discount, vat, total },
        status: i < 4 ? 'completed' : 'confirmed',
        paymentStatus: 'paid',
        confirmedAt: new Date(),
      });

      bookings.push(booking);
    }

    console.log(`   ✅ Created ${bookings.length} bookings`);

    // Create reviews (only for completed bookings)
    console.log('⭐ Creating reviews...');
    const completedBookings = bookings.filter((b) => b.status === 'completed');
    let reviewCount = 0;

    for (const booking of completedBookings) {
      const overallRating = Math.floor(Math.random() * 3) + 8; // 8-10
      try {
        await Review.create({
          property: booking.property,
          guest: booking.guest,
          booking: booking._id,
          ratings: {
            overall: overallRating,
            cleanliness: Math.floor(Math.random() * 3) + 8,
            accuracy: Math.floor(Math.random() * 3) + 8,
            communication: Math.floor(Math.random() * 3) + 8,
            location: Math.floor(Math.random() * 3) + 8,
            value: Math.floor(Math.random() * 3) + 8,
          },
          comment: reviewComments[reviewCount % reviewComments.length],
          isVerified: true,
        });
        reviewCount++;
      } catch (e) {
        // Skip duplicate reviews
      }
    }

    console.log(`   ✅ Created ${reviewCount} reviews`);

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Test Accounts:');
    console.log('   Admin:  tariq@hostn.com    / Password123');
    console.log('   Host 1: samir@hostn.com    / Password123');
    console.log('   Host 2: fatima@hostn.com   / Password123');
    console.log('   Guest:  omar@hostn.com     / Password123');
    console.log('   Guest:  layla@hostn.com    / Password123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
}

seed();
