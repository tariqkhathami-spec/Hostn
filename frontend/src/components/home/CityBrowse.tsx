import Link from 'next/link';

const cities = [
  {
    name: 'Riyadh',
    image: 'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=400',
  },
  {
    name: 'Jeddah',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400',
  },
  {
    name: 'Abha',
    image: 'https://images.unsplash.com/photo-1519451241324-20b4ea2c4220?w=400',
  },
  {
    name: 'Al Ula',
    image: 'https://images.unsplash.com/photo-1565534416698-4e9e2c8dae95?w=400',
  },
  {
    name: 'Khobar',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400',
  },
  {
    name: 'Taif',
    image: 'https://images.unsplash.com/photo-1504214208698-ea1916a2195a?w=400',
  },
];

export default function CityBrowse() {
  return (
    <section className="py-8 sm:py-14 bg-gray-50">
      <div className="container-custom">
        <div className="mb-5 sm:mb-8">
          <h2 className="section-title mb-1">Browse by Destination</h2>
          <p className="text-gray-500 text-xs sm:text-sm">Find the perfect stay in your favorite city</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {cities.map((city) => (
            <Link
              key={city.name}
              href={`/listings?city=${city.name}`}
              className="group relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
            >
              <div
                className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-500"
                style={{ backgroundImage: `url(${city.image})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                <p className="font-bold text-sm">{city.name}</p>
                <p className="text-xs text-white/80">Explore stays</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
