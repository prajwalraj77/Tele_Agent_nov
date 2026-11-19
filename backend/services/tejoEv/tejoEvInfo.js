// ============================================================
// TEJO EV BUSINESS INFORMATION
// ============================================================
// Central source for Tejo EV business, product, pricing, showroom,
// contact, warranty, and service information.
//
// Update this file when official Tejo EV information changes.
// Gemini prompts should import this file instead of hardcoding
// business information.
// ============================================================

const TEJO_EV_INFO = {
  // ----------------------------------------------------------
  // BRAND
  // ----------------------------------------------------------

  brand: {
    name: "Tejo EV",

    businessType:
      "Electric scooter company",

    productCategory:
      "Electric scooters",

    website:
      "https://tejoev.com/",

    productPage:
      "https://tejoev.com/tejo-e-series/",

    contactPage:
      "https://tejoev.com/contact-us/",
  },

  // ----------------------------------------------------------
  // PRODUCT SCOPE
  // ----------------------------------------------------------

  businessRules: {
    sellsOnlyElectricScooters: true,

    sellsCars: false,

    sellsPetrolVehicles: false,

    sellsMotorcycles: false,

    sellsOtherVehicleTypes: false,

    productScopeInstruction:
      "Tejo EV sells electric scooters only. Tejo EV does not sell cars, petrol vehicles, motorcycles, or other vehicle types.",
  },

  // ----------------------------------------------------------
  // TEJO E4
  // ----------------------------------------------------------

  models: {
    e4: {
      name: "TEJO E4",

      category:
        "E4 Series",

      configurations: [
        {
          motorPower: "1.6 kW",
          price: 79999,
          priceDisplay: "₹79,999",
          idcRange: "Up to 70 km",
          batteryWarranty:
            "3 years or 20,000 km",
        },

        {
          motorPower: "2.0 kW",
          price: 89999,
          priceDisplay: "₹89,999",
          idcRange: "Up to 90 km",
          batteryWarranty:
            "3 years or 30,000 km",
        },

        {
          motorPower: "2.3 kW",
          price: 99999,
          priceDisplay: "₹99,999",
          idcRange: "Up to 100 km",
          batteryWarranty:
            "3 years or 35,000 km",
        },

        {
          motorPower: "2.9 kW",
          price: 115000,
          priceDisplay: "₹1,15,000",
          idcRange: "Up to 130 km",
          batteryWarranty:
            "3 years or 40,000 km",
        },

        {
          motorPower: "3.5 kW",
          price: 125000,
          priceDisplay: "₹1,25,000",
          idcRange: "Up to 150 km",
          batteryWarranty:
            "3 years or 60,000 km",
        },
      ],

      extendedWarranty: {
        priceBeforeGst:
          "₹5,000 + 18% GST",

        priceIncludingGst:
          "₹5,900",

        availability:
          "Available across E4 variants.",

        battery:
          "Provides additional battery coverage according to the applicable extended-warranty terms.",

        motorController:
          "Provides extended motor-controller coverage according to the applicable policy.",

        manufacturer:
          "Coverage is subject to the official warranty terms and service requirements.",
      },
    },

    // --------------------------------------------------------
    // TEJO E4 PRO
    // --------------------------------------------------------

    e4Pro: {
      name: "TEJO E4 Pro",

      category:
        "Fast-Charging Pro Series",

      architecture:
        "Fast-charge-ready LFP",

      configurations: [
        {
          batteryCapacity: "3.2 kWh",
          price: 139000,
          priceDisplay: "₹1,39,000",
          idcRange: "170 km",
          batteryWarranty:
            "8 years or 70,000 km",
        },

        {
          batteryCapacity: "4 kWh",
          price: 149000,
          priceDisplay: "₹1,49,000",
          idcRange: "225 km",
          batteryWarranty:
            "8 years or 80,000 km",
        },

        {
          batteryCapacity: "6.2 kWh",
          price: 165000,
          priceDisplay: "₹1,65,000",
          idcRange: "320 km",
          batteryWarranty:
            "10 years or 1,50,000 km",
        },

        {
          batteryCapacity: "6.5 kWh",
          price: 185000,
          priceDisplay: "₹1,85,000",
          idcRange: "350 km",
          batteryWarranty:
            "10 years or 1,50,000 km",
        },

        {
          batteryCapacity: "7.5 kWh",
          price: 199000,
          priceDisplay: "₹1,99,000",
          idcRange: "400 km",
          batteryWarranty:
            "10 years or 1,60,000 km",
        },

        {
          batteryCapacity: "8.1 kWh",
          price: 220000,
          priceDisplay: "₹2,20,000",
          idcRange: "450 km",
          batteryWarranty:
            "10 years or 1,90,000 km",
        },
      ],
    },
  },

  // ----------------------------------------------------------
  // SERVICE AND OWNERSHIP
  // ----------------------------------------------------------

  service: {
    roadsideAssistance:
      "Complimentary roadside assistance coordination for eligible TEJO EV customers, subject to availability and company terms.",

    doorstepService:
      "Complimentary doorstep general check-up and scheduled general service support, subject to service-area availability and company terms.",

    scheduledService:
      "Service is due every 3,500 km or 3 months, whichever occurs first, subject to the applicable service requirements.",
  },

  // ----------------------------------------------------------
  // CONTACT DETAILS
  // ----------------------------------------------------------

  contact: {
    salesPhone:
      "08062178431",

    servicePhone:
      "08069645165",

    email:
      "info@tejoev.com",
  },

  // ----------------------------------------------------------
  // SHOWROOMS / LOCATIONS
  // ----------------------------------------------------------

  showrooms: [
    {
      city: "Bengaluru",

      address:
        "NV EV TECH PRIVATE LIMITED, opposite SJRC School, Dr Rajkumar Rd, 4th M Block, Bengaluru, Karnataka 560010",

      phone:
        "08062178431",

      email:
        "info@tejoev.com",
    },

    {
      city: "Tumkur",

      address:
        "Saraswathipuram, Kunigal Main Road, near SBI Bank, Tumkur, Karnataka 572106",

      phone:
        "7259249869",

      email:
        "info@tejoev.com",
    },

    {
      city: "Mysore",

      address:
        "Opposite Gayathri Talkies, Chamaraja Double Road, Mysore, Karnataka 570001",

      phone:
        null,

      email:
        "info@tejoev.com",
    },

    {
      city: "Belagavi",

      address:
        "Sarapura 591305, Hukkeri Taluk, Badinatha EV Motors, near Bus Stand, Belagavi District, Karnataka",

      phone:
        null,

      email:
        "info@tejoev.com",
    },

    {
      city: "Bagalkote",

      address:
        "M/s SHRI Mallikarjun Motors, Plot No. 1/71, Agricultural Produce Marketing Committee, Jamakhandi Kodachi, Jamakhandi Road, Bagalkote, Karnataka 587301",

      phone:
        null,

      email:
        "info@tejoev.com",
    },
  ],

  // ----------------------------------------------------------
  // IMPORTANT AI RULES
  // ----------------------------------------------------------

  aiRules: [
    "Tejo EV sells electric scooters only.",

    "Do not say that Tejo EV sells cars.",

    "Do not recommend a car as a Tejo EV product.",

    "Do not present petrol vehicles, motorcycles, or other vehicle categories as Tejo EV products.",

    "Use the product information in this file when answering Tejo EV product questions.",

    "Do not invent missing specifications.",

    "Do not invent prices, offers, discounts, financing, delivery dates, availability, or policies.",

    "Published prices may change.",

    "Published range figures are test-condition figures and actual range may vary.",

    "Do not guarantee showroom stock unless current availability is known.",

    "Use the showroom information in this file when the customer asks where they can visit.",

    "Use the contact information in this file when the customer asks how to contact Tejo EV.",

    "If information is not available in this file, tell the customer that the information needs to be verified with Tejo EV.",
  ],

  // ----------------------------------------------------------
  // SOURCE INFORMATION
  // ----------------------------------------------------------

  source: {
    website:
      "https://tejoev.com/",

    productPage:
      "https://tejoev.com/tejo-e-series/",

    contactPage:
      "https://tejoev.com/contact-us/",

    lastReviewed:
      "2026-09-21",
  },
};

// ============================================================
// BUILD GEMINI BUSINESS KNOWLEDGE
// ============================================================
// Converts the central business information into a prompt section.
// ============================================================

function buildTejoEvKnowledgePrompt() {
  return `
TEJO EV OFFICIAL BUSINESS INFORMATION

Use the following information as the business knowledge for Tejo EV.

${JSON.stringify(
  TEJO_EV_INFO,
  null,
  2,
)}

IMPORTANT BUSINESS RULES:

- Tejo EV sells ELECTRIC SCOOTERS ONLY.
- Tejo EV does NOT sell cars.
- Tejo EV does NOT sell petrol vehicles.
- Tejo EV does NOT sell motorcycles.
- Do not recommend or discuss another vehicle category as if it were a Tejo EV product.
- When a customer asks for a car, politely explain that Tejo EV offers electric scooters only.
- Use the product, pricing, warranty, service, contact, and showroom information provided above.
- Never invent information that is not present above.
- Do not guarantee availability.
- Do not promise discounts or offers unless they are explicitly listed above.
- Prices and availability can change.
- If information is missing, tell the customer it needs to be verified with Tejo EV.
`;
}

module.exports = {
  TEJO_EV_INFO,
  buildTejoEvKnowledgePrompt,
};