import React, { useState } from 'react';
import { 
  MapPin, 
  Truck, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  Package, 
  Navigation, 
  ChevronRight,
  ShieldCheck,
  Compass,
  Building,
  Info
} from 'lucide-react';
import { TrackedOrderData } from '../types';

interface DeliveryProgressMapProps {
  order: TrackedOrderData;
}

type MapRegion = 'valley' | 'nationwide';

interface LocationEstimate {
  id: string;
  name: string;
  area: string;
  eta: string;
  courierType: string;
  distance: string;
  statusText: string;
  coordinates: { x: number; y: number };
}

const NEPAL_LOCATIONS: Record<string, LocationEstimate> = {
  inside_ring_road: {
    id: 'inside_ring_road',
    name: 'Inside Ring Road (Kathmandu / Lalitpur)',
    area: 'Baluwatar, Jhamsikhel, Thamel, New Road, Lazimpat, Baneshwor, Kupondole',
    eta: '1–2 business days (Same-day dispatch available)',
    courierType: 'Doorstep Bike Express Rider',
    distance: '2.5 – 6.0 km from Kathmandu Workshop',
    statusText: 'Direct city bike courier assigned',
    coordinates: { x: 50, y: 55 }
  },
  outside_ring_road: {
    id: 'outside_ring_road',
    name: 'Outside Ring Road (Valley Suburbs)',
    area: 'Bhaktapur Durbar, Kapan, Budhanilkantha, Imadol, Kirtipur, Thimi, Dhapakhel',
    eta: '2–3 business days',
    courierType: 'Valley Express Parcel Van / Bike',
    distance: '8.0 – 16.5 km from Kathmandu Workshop',
    statusText: 'Transiting via Ring Road Hub',
    coordinates: { x: 68, y: 48 }
  },
  pokhara: {
    id: 'pokhara',
    name: 'Pokhara (Gandaki Province)',
    area: 'Lakeside, Mahendrapool, New Road, Lamachaur, Damside',
    eta: '2–3 business days',
    courierType: 'Intercity Express Courier (Air / Highway)',
    distance: '200 km from Kathmandu',
    statusText: 'En route via Prithvi Highway corridor',
    coordinates: { x: 32, y: 50 }
  },
  chitwan: {
    id: 'chitwan',
    name: 'Chitwan / Bharatpur (Bagmati)',
    area: 'Narayangarh, Bharatpur Central, Ratnanagar, Sauraha',
    eta: '2–3 business days',
    courierType: 'Central Tarai Express Parcel Service',
    distance: '150 km from Kathmandu',
    statusText: 'Sorting at Narayangarh Regional Center',
    coordinates: { x: 42, y: 68 }
  },
  eastern_nepal: {
    id: 'eastern_nepal',
    name: 'Eastern Hubs (Dharan, Biratnagar, Itahari)',
    area: 'Dharan, Biratnagar, Itahari, Birtamode, Damak',
    eta: '3–5 business days',
    courierType: 'Nationwide Express Cargo with SMS Alerts',
    distance: '380 – 500 km from Kathmandu',
    statusText: 'Transiting via East-West Highway Hub',
    coordinates: { x: 80, y: 72 }
  }
};

export const DeliveryProgressMap: React.FC<DeliveryProgressMapProps> = ({ order }) => {
  const [mapRegion, setMapRegion] = useState<MapRegion>('valley');

  // Detect which location key best matches the tracked order
  const getInitialLocationKey = () => {
    const text = `${order.deliveryZoneName || ''} ${order.deliveryAddress || ''}`.toLowerCase();
    if (text.includes('pokhara') || text.includes('kaski')) return 'pokhara';
    if (text.includes('chitwan') || text.includes('bharatpur') || text.includes('narayangarh')) return 'chitwan';
    if (text.includes('dharan') || text.includes('biratnagar') || text.includes('itahari') || text.includes('jhapa') || text.includes('outside kathmandu valley')) return 'eastern_nepal';
    if (text.includes('outside ring road') || text.includes('bhaktapur') || text.includes('kapan') || text.includes('budhanilkantha') || text.includes('imadol')) return 'outside_ring_road';
    return 'inside_ring_road';
  };

  const [selectedLocationKey, setSelectedLocationKey] = useState<string>(getInitialLocationKey());
  const selectedLocation = NEPAL_LOCATIONS[selectedLocationKey] || NEPAL_LOCATIONS['inside_ring_road'];

  // Current stage progress percentage
  const progress = order.progressPercentage || 25;
  const isDelivered = order.currentPhase === 'delivered';
  const isOut = order.currentPhase === 'out_for_delivery';
  const isCrafting = order.currentPhase === 'handcrafting_and_packaging' || 
                     order.currentPhase === 'beading_in_progress' || 
                     order.currentPhase === 'quality_and_packaging';

  // Calculate coordinates for the courier vehicle marker along the route path
  const originX = 35;
  const originY = 65;
  const destX = selectedLocation.coordinates.x;
  const destY = selectedLocation.coordinates.y;

  // Linear interpolation along path based on progress
  const progressRatio = Math.min(1, Math.max(0, (progress - 15) / 85));
  const currentVehicleX = originX + (destX - originX) * progressRatio;
  const currentVehicleY = originY + (destY - originY) * progressRatio;

  return (
    <div className="bg-white rounded-2xl border border-[#E8DFD8] shadow-xs overflow-hidden space-y-4">
      {/* Map Header with Region Switcher */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-[#1C1B1A] via-[#24211E] to-[#1C1B1A] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#D4AF37]" />
            <h4 className="font-serif text-sm sm:text-base font-semibold tracking-wide">
              Live Delivery Route Map (Nepal)
            </h4>
          </div>
          <p className="text-[11px] text-[#A69E96]">
            Real-time transit tracker from our Kathmandu workshop to your doorstep
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl self-start sm:self-auto border border-white/15">
          <button
            type="button"
            onClick={() => setMapRegion('valley')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mapRegion === 'valley'
                ? 'bg-[#D4AF37] text-[#1C1B1A] shadow-xs'
                : 'text-white/80 hover:text-white'
            }`}
          >
            Kathmandu Valley
          </button>
          <button
            type="button"
            onClick={() => setMapRegion('nationwide')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mapRegion === 'nationwide'
                ? 'bg-[#D4AF37] text-[#1C1B1A] shadow-xs'
                : 'text-white/80 hover:text-white'
            }`}
          >
            Nationwide Nepal
          </button>
        </div>
      </div>

      {/* Interactive Map Visual Stage */}
      <div className="relative px-4 sm:px-5">
        <div className="relative w-full h-64 sm:h-72 rounded-2xl overflow-hidden bg-gradient-to-b from-[#FAF8F5] to-[#F2EDE8] border-2 border-[#E8DFD8] shadow-inner">
          
          {/* Subtle Map Grid lines */}
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#C5A880_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* SVG Route Visualization */}
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#2E7D32" stopOpacity="0.9" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Simulated Valley / Nepal Topography Curves */}
            {mapRegion === 'valley' ? (
              <>
                {/* Ring Road Outline approximation */}
                <ellipse cx="50" cy="55" rx="32" ry="24" fill="none" stroke="#E0D7D0" strokeWidth="1.2" strokeDasharray="2,2" />
                <text x="50" y="34" fontSize="3" fill="#8C7A6B" textAnchor="middle" fontWeight="bold">
                  KATHMANDU VALLEY RING ROAD CIRCUIT
                </text>
                {/* Bagmati River simulated curve */}
                <path d="M 20 40 Q 40 60, 55 58 T 85 85" fill="none" stroke="#B8D0E8" strokeWidth="1.5" strokeOpacity="0.6" />
                <text x="75" y="78" fontSize="2.5" fill="#7A9BB8" fontStyle="italic">Bagmati River</text>
              </>
            ) : (
              <>
                {/* Nepal Highway corridors */}
                <path d="M 15 52 Q 35 48, 50 60 T 90 70" fill="none" stroke="#D8CFC8" strokeWidth="1.4" />
                <text x="25" y="47" fontSize="2.6" fill="#8C7A6B">Prithvi Hwy (Pokhara)</text>
                <text x="70" y="65" fontSize="2.6" fill="#8C7A6B">East-West Hwy</text>
              </>
            )}

            {/* Active Delivery Route Line from Workshop to Destination */}
            <path
              d={`M ${originX} ${originY} Q ${(originX + destX) / 2} ${(originY + destY) / 2 - 8} ${destX} ${destY}`}
              fill="none"
              stroke="url(#routeGradient)"
              strokeWidth="2.4"
              strokeDasharray="3,2"
              className="animate-pulse"
              filter="url(#glow)"
            />

            {/* Origin Node: Artified Workshop (Kathmandu) */}
            <circle cx={originX} cy={originY} r="3" fill="#1C1B1A" stroke="#D4AF37" strokeWidth="1" />
            <circle cx={originX} cy={originY} r="5" fill="#D4AF37" fillOpacity="0.25" className="animate-ping" />

            {/* Destination Node: Customer's Area */}
            <circle cx={destX} cy={destY} r="3.2" fill={isDelivered ? "#2E7D32" : "#C5A880"} stroke="#FFFFFF" strokeWidth="1" />
            <circle cx={destX} cy={destY} r="6" fill={isDelivered ? "#2E7D32" : "#C5A880"} fillOpacity="0.2" className="animate-pulse" />

            {/* Intermediate Sorting Hub */}
            <circle cx={(originX + destX) / 2} cy={(originY + destY) / 2 - 4} r="1.8" fill="#8C7A6B" />
          </svg>

          {/* HTML Overlay: Workshop Pin Label */}
          <div 
            className="absolute -translate-x-1/2 -translate-y-full pointer-events-none"
            style={{ left: `${originX}%`, top: `${originY - 1}%` }}
          >
            <div className="bg-[#1C1B1A] text-white px-2 py-1 rounded-md text-[9px] font-bold shadow-md border border-[#D4AF37]/50 flex items-center gap-1 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
              <span>Kathmandu Workshop (Origin)</span>
            </div>
          </div>

          {/* HTML Overlay: Destination Pin Label */}
          <div 
            className="absolute -translate-x-1/2 -translate-y-full pointer-events-none"
            style={{ left: `${destX}%`, top: `${destY - 1}%` }}
          >
            <div className={`px-2 py-1 rounded-md text-[9px] font-bold shadow-md border flex items-center gap-1 whitespace-nowrap ${
              isDelivered 
                ? 'bg-emerald-700 text-white border-emerald-500' 
                : 'bg-white text-[#1C1B1A] border-[#C5A880]'
            }`}>
              <MapPin className="w-3 h-3 text-[#C5A880]" />
              <span>{order.deliveryAddress ? order.deliveryAddress.slice(0, 18) : selectedLocation.name}</span>
            </div>
          </div>

          {/* HTML Overlay: Moving Courier Rider Marker */}
          <div 
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-700 pointer-events-none"
            style={{ left: `${currentVehicleX}%`, top: `${currentVehicleY}%` }}
          >
            <div className="relative group">
              <div className="w-8 h-8 rounded-full bg-emerald-600 border-2 border-white shadow-lg flex items-center justify-center text-white ring-4 ring-emerald-500/30">
                <Truck className="w-4 h-4 animate-bounce" />
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-[#1C1B1A]/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap shadow-xs">
                {isDelivered 
                  ? 'Delivered' 
                  : isOut 
                  ? 'Rider in Transit' 
                  : isCrafting 
                  ? 'Packing at Bench' 
                  : 'Order Reserved'}
              </div>
            </div>
          </div>

          {/* Map Compass Rose / Watermark */}
          <div className="absolute bottom-2 right-2 bg-white/80 backdrop-blur-xs p-1.5 rounded-lg border border-[#E8DFD8] text-[9px] text-[#736C65] font-mono flex items-center gap-1 shadow-2xs pointer-events-none">
            <Navigation className="w-3 h-3 text-[#D4AF37] rotate-45" />
            <span>Kathmandu Valley • 27.70° N, 85.31° E</span>
          </div>
        </div>
      </div>

      {/* Location-Based Estimated Delivery Times Matrix */}
      <div className="px-4 sm:px-5 pb-5 space-y-3">
        <div className="flex items-center justify-between text-xs border-b border-[#F0EBE5] pb-2">
          <span className="font-semibold text-[#1C1B1A] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>Delivery Timelines by Nepal Region</span>
          </span>
          <span className="text-[11px] text-[#736C65]">
            Select area to preview route & ETA
          </span>
        </div>

        {/* Location Selector Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-left">
          {Object.values(NEPAL_LOCATIONS).map((loc) => {
            const isSelected = selectedLocationKey === loc.id;
            return (
              <button
                key={loc.id}
                type="button"
                onClick={() => setSelectedLocationKey(loc.id)}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#1C1B1A] text-white border-[#1C1B1A] shadow-xs'
                    : 'bg-[#FAF8F5] text-[#5E5955] border-[#E8DFD8] hover:border-[#C5A880]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold truncate block ${isSelected ? 'text-[#D4AF37]' : 'text-[#1C1B1A]'}`}>
                    {loc.id === 'inside_ring_road' ? 'Inside Ring Rd' :
                     loc.id === 'outside_ring_road' ? 'Outside Ring Rd' :
                     loc.id === 'pokhara' ? 'Pokhara' :
                     loc.id === 'chitwan' ? 'Chitwan' : 'Eastern Nepal'}
                  </span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />}
                </div>
                <span className="text-[9px] block text-[#A69E96] mt-0.5 truncate">
                  {loc.eta.split('(')[0]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Region Detailed ETA Card */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#FAF8F5] to-amber-50/40 border border-[#D4AF37]/40 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[#E8DFD8] pb-2">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#8C7A6B] block">
                Destination Target
              </span>
              <p className="text-xs sm:text-sm font-bold text-[#1C1B1A] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>{selectedLocation.name}</span>
              </p>
            </div>

            <div className="sm:text-right">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#8C7A6B] block">
                Estimated Delivery Window
              </span>
              <p className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
                ⚡ {selectedLocation.eta}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
            <div className="flex items-center gap-2">
              <Truck className="w-3.5 h-3.5 text-[#C5A880] shrink-0" />
              <div>
                <span className="text-[10px] text-[#736C65] block">Courier Service:</span>
                <span className="text-[11px] font-semibold text-[#1C1B1A]">{selectedLocation.courierType}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Building className="w-3.5 h-3.5 text-[#C5A880] shrink-0" />
              <div>
                <span className="text-[10px] text-[#736C65] block">Approx Distance:</span>
                <span className="text-[11px] font-semibold text-[#1C1B1A]">{selectedLocation.distance}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C5A880] shrink-0" />
              <div>
                <span className="text-[10px] text-[#736C65] block">Current Status:</span>
                <span className="text-[11px] font-semibold text-emerald-700">{selectedLocation.statusText}</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-[#736C65] italic pt-1 border-t border-[#E8DFD8]/60">
            Coverage areas include: {selectedLocation.area}. All parcels are packed with protective bubble cushioning and custom dust bag.
          </p>
        </div>
      </div>
    </div>
  );
};
