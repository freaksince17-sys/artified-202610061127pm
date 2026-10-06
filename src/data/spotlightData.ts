import { ArtisanalSpotlightPoint, Product } from '../types';

export const CATEGORY_ARTISANAL_SPOTLIGHTS: Record<string, ArtisanalSpotlightPoint[]> = {
  'pearl-bags': [
    {
      id: 'pearl-grade',
      title: 'Grade AAA High-Luster Pearls',
      tag: 'Pearl Grade & Finish',
      specHighlight: 'Grade AAA Gloss • Zero-Flake Coating',
      description: 'Hand-sorted spherical pearls with a mirror-like iridescent finish that casts radiant reflections under ambient indoor and sunlight.',
      x: 38,
      y: 28
    },
    {
      id: 'clasp-quality',
      title: '18k Champagne Gold Brass Clasp',
      tag: 'Hardware & Clasp Quality',
      specHighlight: '18k Electroplated • 10,000+ Cycles',
      description: 'Custom solid brass lobster clasps and reinforced jump rings engineered to resist tarnishing and discoloration even in humid monsoon weather.',
      x: 72,
      y: 20
    },
    {
      id: 'tensile-core',
      title: '15kg Tensile Dual-Twisted Core',
      tag: 'Hand-Knotting & Tension',
      specHighlight: 'Japanese Monofilament • 15kg Break Load',
      description: 'Threaded using heavy-duty 0.6mm Japanese monofilament cord with concealed tension-lock knots at every 3rd pearl by master crafter Sahina Shrestha.',
      x: 62,
      y: 54
    },
    {
      id: 'base-structure',
      title: 'Architectural Box Base Weave',
      tag: 'Structural Base Integrity',
      specHighlight: 'Tri-Directional Bead Interlock',
      description: 'Engineered geometric interlock weave prevents bottom sagging when carrying smartphones, heavy cosmetics, and key sets.',
      x: 46,
      y: 84
    }
  ],

  'pearl-necklaces': [
    {
      id: 'pearl-grade',
      title: 'Baroque & Spherical Luster Match',
      tag: 'Pearl Grade & Uniformity',
      specHighlight: 'Graduated Micron Luster',
      description: 'Each pearl is individually graded for calibrated roundness, smooth skin, and deep iridescent depth that flatters all skin tones.',
      x: 48,
      y: 35
    },
    {
      id: 'clasp-quality',
      title: 'Adjustable Extender & Lobster Clasp',
      tag: 'Clasp & Extension Quality',
      specHighlight: 'Skin-Friendly Hypoallergenic Alloy',
      description: 'Equipped with a 5cm extender chain and smooth-glide claw clasp for personalized collarbone vs choker neckline adjustments.',
      x: 76,
      y: 22
    },
    {
      id: 'knotting-tension',
      title: 'Fluid Drape & Flexible Knotting',
      tag: 'Hand-Stringing Tension',
      specHighlight: 'Non-Kinking Silk-Nylon Blend',
      description: 'Precisely tensioned so the strands lay completely flat against the collarbone without pinching skin or curling upwards.',
      x: 32,
      y: 65
    }
  ],

  'macrame': [
    {
      id: 'cotton-cord',
      title: '100% Organic Braided Cotton',
      tag: 'Material Purity',
      specHighlight: '3mm Multi-Ply Natural Fiber',
      description: 'Sustainably sourced, unbleached cotton cord that is gentle to the touch, eco-friendly, and naturally static-free.',
      x: 48,
      y: 25
    },
    {
      id: 'knot-symmetry',
      title: 'Hand-Tied Square & Spiral Knots',
      tag: 'Weave Mastery',
      specHighlight: '1,200+ Hand-Tied Knots',
      description: 'Uniform spacing and balanced tension achieve perfect symmetry, creating organic geometric textures inspired by traditional Newari weaving.',
      x: 52,
      y: 58
    },
    {
      id: 'fringe-finish',
      title: 'Precision-Combed Feather Fringe',
      tag: 'Handcrafted Finishing',
      specHighlight: 'Boho Tassel Brush Finish',
      description: 'Individually hand-combed and steam-pressed tassels that drape cleanly and resist matting.',
      x: 50,
      y: 88
    }
  ],

  'accessories': [
    {
      id: 'crystal-luster',
      title: 'Faceted Aurora Crystal Beads',
      tag: 'Gemstone & Crystal Grade',
      specHighlight: 'Multi-Faceted Refraction',
      description: 'Precision-cut crystal beads with high light dispersion that cast prismatic rainbow glints with every subtle wrist movement.',
      x: 42,
      y: 40
    },
    {
      id: 'closure-clasp',
      title: 'Heart Toggle & Secure Clasp',
      tag: 'Clasp Security',
      specHighlight: 'Solid Zinc-Brass Composite',
      description: 'Designed for effortless one-handed fastening while remaining completely secure during active daily movement.',
      x: 68,
      y: 35
    },
    {
      id: 'elastic-strength',
      title: 'Quad-Strand Elastic Core',
      tag: 'Flexibility & Strength',
      specHighlight: 'Memory Elastic • Anti-Snapping',
      description: 'Multi-stranded transparent memory cord stretches comfortably over hand and instantly contracts to hug wrist contour.',
      x: 50,
      y: 68
    }
  ],

  'custom-beaded': [
    {
      id: 'pearl-grade',
      title: 'Bespoke Pearl Selection',
      tag: 'Pearl Grade',
      specHighlight: 'Premium Grade Acrylic Luster',
      description: 'Specially hand-selected beads tested for zero dye rub-off and lasting optical brilliance.',
      x: 45,
      y: 30
    },
    {
      id: 'clasp-quality',
      title: 'Reinforced Hardware Fitting',
      tag: 'Hardware Craft',
      specHighlight: 'Anti-Tarnish Kathmandu Tested',
      description: 'Solid metal rings and clasps sealed with protective micro-coating to resist atmospheric oxidation.',
      x: 70,
      y: 25
    },
    {
      id: 'hand-knotting',
      title: 'Single-Creator Kathmandu Weave',
      tag: 'Kathmandu Atelier Heritage',
      specHighlight: 'Over 6–10 Craft Hours',
      description: 'Crafted exclusively from start to finish by the creator to guarantee singular consistent knotting tension.',
      x: 50,
      y: 75
    }
  ]
};

/**
 * Returns spotlight points for a given product
 */
export function getProductSpotlightPoints(product: Product): ArtisanalSpotlightPoint[] {
  if (product.spotlights && product.spotlights.length > 0) {
    return product.spotlights;
  }

  const category = product.category || 'pearl-bags';
  return CATEGORY_ARTISANAL_SPOTLIGHTS[category] || CATEGORY_ARTISANAL_SPOTLIGHTS['pearl-bags'];
}
