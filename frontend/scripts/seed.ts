import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as readline from 'readline';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Import models
import User from '../src/lib/models/User';
import Property from '../src/lib/models/Property';
import Booking from '../src/lib/models/Booking';
import Review from '../src/lib/models/Review';
import ActivityLog from '../src/lib/models/ActivityLog';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is not set');
  process.exit(1);
}

interface SeedStats {
  users: number;
  properties: number;
  bookings: number;
  reviews: number;
  activityLogs: number;
}

const stats: SeedStats = {
  users: 0,
  properties: 0,
  bookings: 0,
  reviews: 0,
  activityLogs: 0,
};

// Arabic names data
const arabicNames = {
  hosts: [
    { name: 'محمد الأحمد', email: 'host1@hostn.sa', phone: '+966501234567' },
    { name: 'فاطمة الخالد', email: 'host2@hostn.sa', phone: '+966502345678' },
    { name: 'علي الدوسري', email: 'host3@hostn.sa', phone: '+966503456789' },
  ],
  guests: [
    { name: 'سارة العتيبي', email: 'guest1@hostn.sa', phone: '+966504567890' },
    { name: 'يوسف الشهري', email: 'guest2@hostn.sa', phone: '+966505678901' },
    { name: 'ليلى السبيعي', email: 'guest3@hostn.sa', phone: '+966506789012' },
    { name: 'خالد القحطاني', email: 'guest4@hostn.sa', phone: '+966507890123' },
    { name: 'نور الزهراني', email: 'guest5@hostn.sa', phone: '+966508901234' },
  ],
};

// Saudi Arabian cities and districts
const saudiCities = {
  'الرياض': {
    districts: ['العليا', 'النرجس', 'الربيع', 'السليمانية', 'الخليج', 'الروضة'],
    coordinates: { lat: 24.7136, lng: 46.6753 },
  },
  'جدة': {
    districts: ['الشاطئ', 'البلد', 'الروضة', 'الأندلس', 'الحمراء', 'الصفا'],
    coordinates: { lat: 21.5433, lng: 39.1728 },
  },
  'مكة المكرمة': {
    districts: ['المزاميع', 'القرى', 'الشوقية', 'أم الجود', 'الحسينية'],
    coordinates: { lat: 21.4225, lng: 39.8262 },
  },
  'الدمام': {
    districts: ['الدفينة', 'العنود', 'الشرقية', 'النور', 'الفيصلية', 'أحد'],
    coordinates: { lat: 26.4124, lng: 50.1972 },
  },
};

const propertyDescriptions = {
  villa: 'فيلا فاخرة مع إطلالات رائعة، مجهزة بكل المرافق الحديثة والمكيفات الهواء، تتمتع بحديقة خاصة جميلة وموقف سيارات آمن. مناسبة للعائلات الكبيرة.',
  apartment: 'شقة مريحة وحديثة في موقع استراتيجي، قريبة من جميع المرافق والخدمات، تم تجديدها مؤخراً مع أثاث عصري وأجهزة كهربائية متقدمة.',
  chalet: 'شاليه فخم مع طراز معاصر، يحتوي على حمام سباحة خاص وشرفات واسعة، مثالي للعطل والاسترخاء، يوفر الخصوصية والهدوء التام.',
  studio: 'أستوديو صغير وعملي، مجهز بكامل الأساسيات، موقع مركزي قريب من المتاجر والمطاعم، مثالي للمسافرين وللإقامات القصيرة.',
  farm: 'مزرعة خاصة وسط الطبيعة الخضراء، تحتوي على بيت ريفي مريح مع حديقة واسعة، توفر هدوء وراحة نفسية بعيداً عن الزحام.',
};

const reviewComments = [
  'تجربة رائعة جداً! المكان نظيف وجميل والمضيف متعاون جداً وسريع الرد.',
  'الموقع ممتاز والغرف مريحة جداً، سأأتي مرة أخرى بكل تأكيد.',
  'خدمة ممتازة والأسعار معقولة، كل شيء موافق للوصف وحتى أفضل.',
  'مكان هادئ وجميل جداً، نظافة عالية وتفاصيل رائعة في التصميم الداخلي.',
  'تجربة استثنائية، المضيفة كانت لطيفة جداً وساعدتنا في كل شيء.',
  'الإقامة كانت مريحة جداً وكل المرافق موجودة، شكراً على الضيافة الرائعة.',
  'مكان جميل مع إطلالات ساحرة، سوف ننصح الأصدقاء به بكل تأكيد.',
  'الخدمة ممتازة والنظافة عالية جداً، موقع مثالي قرب جميع الأماكن المهمة.',
];

const amenitiesList = ['wifi', 'parking', 'ac', 'kitchen', 'tv', 'garden', 'balcony', 'security'];

function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase());
    });
  });
}

async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI!);
    console.log('✓ Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

async function clearDatabase(): Promise<void> {
  try {
    await User.deleteMany({});
    await Property.deleteMany({});
    await Booking.deleteMany({});
    await Review.deleteMany({});
    await ActivityLog.deleteMany({});
    console.log('✓ Database cleared');
  } catch (error) {
    console.error('Error clearing database:', error);
    throw error;
  }
}

async function seedUsers(): Promise<{ admin: any; hosts: any[]; guests: any[] }> {
  const password = 'Admin123!';
  const hashedPassword = await bcryptjs.hash(password, 12);

  // Create admin user
  const admin = await User.create({
    name: 'مدير النظام',
    email: 'admin@hostn.sa',
    password: hashedPassword,
    phone: '+966501111111',
    role: 'admin',
    isVerified: true,
  });

  // Create host users
  const hosts = await Promise.all(
    arabicNames.hosts.map((host) =>
      User.create({
        name: host.name,
        email: host.email,
        password: hashedPassword,
        phone: host.phone,
        role: 'host',
        isVerified: true,
      })
    )
  );

  // Create guest users
  const guests = await Promise.all(
    arabicNames.guests.map((guest) =>
      User.create({
        name: guest.name,
        email: guest.email,
        password: hashedPassword,
        phone: guest.phone,
        role: 'guest',
        isVerified: true,
      })
    )
  );

  stats.users = 1 + hosts.length + guests.length;
  console.log(`✓ Created ${stats.users} users (1 admin, ${hosts.length} hosts, ${guests.length} guests)`);

  return { admin, hosts, guests };
}

async function seedProperties(
  admin: any,
  hosts: any[]
): Promise<any[]> {
  const properties: any[] = [];
  let propertyCount = 0;

  const cities = Object.entries(saudiCities);

  for (let i = 0; i < cities.length; i++) {
    const [cityName, cityData] = cities[i];
    const cityProperties = i === 0 ? 3 : i === 1 ? 3 : i === 2 ? 2 : 2; // 10 total

    for (let j = 0; j < cityProperties; j++) {
      const host = hosts[propertyCount % hosts.length];
      const district = cityData.districts[j % cityData.districts.length];
      const types = Object.keys(propertyDescriptions) as Array<
        keyof typeof propertyDescriptions
      >;
      const type = types[propertyCount % types.length];
      const coordinates = cityData.coordinates;
      const offsetLat = (Math.random() - 0.5) * 0.05;
      const offsetLng = (Math.random() - 0.5) * 0.05;

      const property = await Property.create({
        host: host._id,
        title: `${type === 'villa' ? 'فيلا' : type === 'apartment' ? 'شقة' : type === 'chalet' ? 'شاليه' : type === 'studio' ? 'أستوديو' : type === 'farm' ? 'مزرعة' : 'منزل'} فاخرة في ${district}`,
        description: propertyDescriptions[type],
        type,
        location: {
          city: cityName,
          district,
          address: `شارع ${['الملك فهد', 'الملك عبدالعزيز', 'التحلية', 'الحمراء'][j % 4]}، ${district}`,
          coordinates: {
            lat: coordinates.lat + offsetLat,
            lng: coordinates.lng + offsetLng,
          },
        },
        images: [
          {
            url: `https://via.placeholder.com/800x600?text=${encodeURIComponent(type)}_${j + 1}`,
            caption: 'صورة رئيسية',
            isPrimary: true,
          },
          {
            url: `https://via.placeholder.com/800x600?text=${encodeURIComponent(type)}_${j + 2}`,
            caption: 'غرفة النوم',
            isPrimary: false,
          },
          {
            url: `https://via.placeholder.com/800x600?text=${encodeURIComponent(type)}_${j + 3}`,
            caption: 'الحمام',
            isPrimary: false,
          },
        ],
        amenities: amenitiesList.slice(0, Math.floor(Math.random() * 5) + 4),
        pricing: {
          perNight: 150 + Math.random() * 250,
          cleaningFee: 30 + Math.random() * 70,
          discountPercent: Math.random() > 0.7 ? Math.floor(Math.random() * 20) : 0,
          weeklyDiscount: Math.floor(Math.random() * 15),
        },
        capacity: {
          maxGuests: 2 + Math.floor(Math.random() * 6),
          bedrooms: 1 + Math.floor(Math.random() * 4),
          bathrooms: 1 + Math.floor(Math.random() * 3),
          beds: 1 + Math.floor(Math.random() * 5),
        },
        rules: {
          checkInTime: '14:00',
          checkOutTime: '12:00',
          minNights: 1,
          maxNights: 30,
          smokingAllowed: Math.random() > 0.7,
          petsAllowed: Math.random() > 0.6,
          partiesAllowed: false,
        },
        ratings: {
          average: 0,
          count: 0,
        },
        moderationStatus: 'approved',
        moderatedBy: admin._id,
        moderatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        isActive: true,
        isFeatured: Math.random() > 0.7,
        tags: ['عائلي', 'هادئ', 'فاخر', 'قريب من المرافق'],
        unavailableDates: [],
      });

      properties.push(property);
      propertyCount++;
    }
  }

  stats.properties = properties.length;
  console.log(`✓ Created ${properties.length} properties across Saudi Arabia`);

  return properties;
}

async function seedBookings(properties: any[], guests: any[]): Promise<any[]> {
  const bookings: any[] = [];
  const statuses = ['pending', 'confirmed', 'completed', 'cancelled'];
  const now = new Date();

  // Create 10-15 bookings
  const bookingCount = 10 + Math.floor(Math.random() * 6);

  for (let i = 0; i < bookingCount; i++) {
    const property = properties[i % properties.length];
    const guest = guests[i % guests.length];
    const status = statuses[i % statuses.length];

    // Vary dates: some past, some future
    const daysOffset = Math.floor(Math.random() * 180) - 60;
    const checkIn = new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000);
    const nights = 2 + Math.floor(Math.random() * 6);
    const checkOut = new Date(checkIn.getTime() + nights * 24 * 60 * 60 * 1000);

    const perNight = property.pricing.perNight;
    const subtotal = perNight * nights;
    const cleaningFee = property.pricing.cleaningFee;
    const serviceFee = Math.round(subtotal * 0.1);
    const discount = Math.floor(Math.random() * 50);
    const total = subtotal + cleaningFee + serviceFee - discount;

    const booking = await Booking.create({
      property: property._id,
      guest: guest._id,
      checkIn,
      checkOut,
      guests: {
        adults: 1 + Math.floor(Math.random() * 2),
        children: Math.random() > 0.7 ? Math.floor(Math.random() * 2) : 0,
        infants: 0,
      },
      pricing: {
        perNight,
        nights,
        subtotal,
        cleaningFee,
        serviceFee,
        discount,
        total: Math.max(total, 0),
      },
      status,
      paymentStatus: status === 'completed' ? 'paid' : status === 'cancelled' ? 'refunded' : 'unpaid',
      specialRequests:
        Math.random() > 0.6
          ? ['وسادة إضافية من فضلك', 'نحتاج سرير أطفال', 'هل يمكن تأخير وقت الدخول؟'][
              Math.floor(Math.random() * 3)
            ]
          : undefined,
      confirmedAt: status !== 'pending' ? new Date(checkIn.getTime() - 48 * 60 * 60 * 1000) : undefined,
      cancelledAt:
        status === 'cancelled'
          ? new Date(checkIn.getTime() - 24 * 60 * 60 * 1000)
          : undefined,
    });

    bookings.push(booking);
  }

  stats.bookings = bookings.length;
  console.log(`✓ Created ${bookings.length} bookings with various statuses`);

  return bookings;
}

async function seedReviews(
  properties: any[],
  bookings: any[],
  guests: any[]
): Promise<void> {
  const reviews: any[] = [];
  const completedBookings = bookings.filter((b) => b.status === 'completed');

  // Create 5-8 reviews from completed bookings
  const reviewCount = Math.min(5 + Math.floor(Math.random() * 4), completedBookings.length);

  for (let i = 0; i < reviewCount; i++) {
    const booking = completedBookings[i];
    const property = await Property.findById(booking.property);

    const overallRating = 7 + Math.floor(Math.random() * 4);
    const review = await Review.create({
      property: booking.property,
      guest: booking.guest,
      booking: booking._id,
      ratings: {
        overall: overallRating,
        cleanliness: 7 + Math.floor(Math.random() * 4),
        accuracy: 7 + Math.floor(Math.random() * 4),
        communication: 8 + Math.floor(Math.random() * 3),
        location: 7 + Math.floor(Math.random() * 4),
        value: 6 + Math.floor(Math.random() * 5),
      },
      comment: reviewComments[i % reviewComments.length],
      isVerified: true,
    });

    reviews.push(review);

    // Update property ratings
    const propertyReviews = await Review.find({ property: booking.property });
    const avgRating =
      propertyReviews.reduce((sum, r) => sum + r.ratings.overall, 0) /
      propertyReviews.length;
    await Property.findByIdAndUpdate(booking.property, {
      'ratings.average': Math.round(avgRating * 10) / 10,
      'ratings.count': propertyReviews.length,
    });
  }

  stats.reviews = reviews.length;
  console.log(`✓ Created ${reviews.length} reviews with property ratings updated`);
}

async function seedActivityLogs(admin: any, hosts: any[], properties: any[]): Promise<void> {
  const logs: any[] = [];

  // Admin approves properties
  for (let i = 0; i < Math.min(5, properties.length); i++) {
    const log = await ActivityLog.create({
      action: 'property_approved',
      performedBy: admin._id,
      targetType: 'property',
      targetId: properties[i]._id.toString(),
      details: `تم الموافقة على العقار: ${properties[i].title}`,
    });
    logs.push(log);
  }

  // Host creates properties
  for (let i = 0; i < Math.min(3, hosts.length); i++) {
    const log = await ActivityLog.create({
      action: 'property_created',
      performedBy: hosts[i]._id,
      targetType: 'property',
      details: `تم إنشاء ${2 + i} عقارات جديدة من قبل المضيف`,
    });
    logs.push(log);
  }

  // System actions
  const log = await ActivityLog.create({
    action: 'system_action',
    performedBy: admin._id,
    targetType: 'system',
    details: 'تم تشغيل برنامج البذر - تم إنشاء بيانات جديدة للاختبار',
  });
  logs.push(log);

  stats.activityLogs = logs.length;
  console.log(`✓ Created ${logs.length} activity log entries`);
}

async function main(): Promise<void> {
  try {
    await connectDatabase();

    console.log('\n========================================');
    console.log('   Hostn MongoDB Seeding Script');
    console.log('========================================\n');

    const answer = await askQuestion(
      '⚠️  This will clear all existing data and seed fresh test data.\n' +
        'Do you want to continue? (yes/no): '
    );

    if (answer !== 'yes' && answer !== 'y') {
      console.log('Seeding cancelled.');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log('\nStarting database seeding...\n');

    await clearDatabase();

    const { admin, hosts, guests } = await seedUsers();
    const properties = await seedProperties(admin, hosts);
    const bookings = await seedBookings(properties, guests);

    await seedReviews(properties, bookings, guests);
    await seedActivityLogs(admin, hosts, properties);

    console.log('\n========================================');
    console.log('   Seeding Summary');
    console.log('========================================\n');
    console.log(`✓ Admin User: admin@hostn.sa (password: Admin123!)`);
    console.log(`✓ Host Users: ${stats.users - 1 - arabicNames.guests.length} users`);
    console.log(`✓ Guest Users: ${arabicNames.guests.length} users`);
    console.log(`  (All users share password: Admin123!)\n`);
    console.log(`✓ Total Data Created:`);
    console.log(`  - ${stats.users} users`);
    console.log(`  - ${stats.properties} properties`);
    console.log(`  - ${stats.bookings} bookings`);
    console.log(`  - ${stats.reviews} reviews`);
    console.log(`  - ${stats.activityLogs} activity logs`);
    console.log('\n========================================\n');

    console.log('✓ Database seeding completed successfully!');
    console.log(
      '✓ You can now run the application and login with the test credentials.\n'
    );
  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed.');
  }
}

main();
