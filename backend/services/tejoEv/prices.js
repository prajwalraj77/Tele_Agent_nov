const TEJO_EV_PRICES = {
  X1: {
    offer: "Flat ₹10,000 Festival Discount across all variants",
    variants: [
      {
        battery: "1.2 kWh LFP",
        edition: "Base Edition / Bestseller",
        range: "Up to 60 km",
        mrp: 67000,
        offerPrice: 57000
      },
      {
        battery: "1.6 kWh LFP",
        edition: "City Plus",
        range: "Up to 80 km",
        mrp: 74000,
        offerPrice: 64000
      },
      {
        battery: "2.0 kWh LFP",
        edition: "Extended Commute / Popular",
        range: "Up to 120 km",
        mrp: 90000,
        offerPrice: 80000
      },
      {
        battery: "2.3 kWh LFP",
        edition: "Max Range",
        range: "Up to 140 km",
        mrp: 104000,
        offerPrice: 94000
      }
    ]
  },

  X3: {
    offer: "Flat ₹10,000 Festival Discount across all variants",
    variants: [
      {
        battery: "1.3 kWh",
        range: "Up to 70 km",
        mrp: 72000,
        offerPrice: 62000
      },
      {
        battery: "1.6 kWh",
        range: "Up to 80 km",
        mrp: 79000,
        offerPrice: 69000
      },
      {
        battery: "2.0 kWh",
        edition: "Most Popular",
        range: "Up to 120 km",
        mrp: 95000,
        offerPrice: 85000
      },
      {
        battery: "2.3 kWh",
        range: "Up to 140 km",
        mrp: 109000,
        offerPrice: 99000
      }
    ]
  },

  X4Plus: {
    variants: [
      { battery: "1.2 kWh LFP", range: "Up to 60 km", price: 81999 },
      { battery: "1.6 kWh LFP", range: "Up to 80 km", price: 88999 },
      { battery: "2.0 kWh LFP", range: "Up to 100 km", price: 99000 },
      {
        battery: "2.4 kWh LFP",
        edition: "Popular",
        range: "Up to 120 km",
        price: 103999
      },
      {
        battery: "3.0 kWh LFP",
        edition: "Long Range",
        range: "Up to 150 km",
        price: 114000
      }
    ]
  },

  X6: {
    variants: [
      { battery: "1.2 kWh LFP", range: "Up to 60 km", price: 84459 },
      { battery: "1.6 kWh LFP", range: "Up to 80 km", price: 90640 },
      { battery: "2.0 kWh LFP", range: "Up to 100 km", price: 101969 },
      {
        battery: "2.4 kWh LFP",
        edition: "Popular",
        range: "Up to 120 km",
        price: 108149
      },
      {
        battery: "3.0 kWh LFP",
        edition: "Long Range",
        range: "Up to 150 km",
        price: 118449
      }
    ]
  },

  IQTPro: {
    variants: [
      { battery: "1.6 kWh LFP", range: "Up to 70 km", price: 88000 },
      { battery: "2.0 kWh LFP", range: "Up to 100 km", price: 98999 },
      { battery: "2.4 kWh LFP", range: "Up to 120 km", price: 103999 },
      {
        battery: "3.0 kWh LFP",
        edition: "Popular",
        range: "Up to 150 km",
        price: 114000
      }
    ]
  },

  E4: {
    variants: [
      { battery: "1.6 kW", range: "Up to 60 km", price: 87974 },
      { battery: "2.0 kW", range: "Up to 90 km", price: 97749 },
      {
        battery: "2.3 kW",
        edition: "Popular",
        range: "Up to 100 km",
        price: 107524
      },
      { battery: "2.9 kW", range: "Up to 160 km", price: 122187 },
      {
        battery: "3.5 kW",
        edition: "Long Range",
        range: "Up to 180 km",
        price: 131962
      }
    ]
  },

  E4Pro: {
    variants: [
      {
        battery: "3.2 kWh LFP",
        range: "170 km",
        warranty: "8 Years or 70,000 km",
        listPrice: 172499,
        offerPrice: 149999
      },
      {
        battery: "4.0 kWh LFP",
        range: "225 km",
        warranty: "8 Years or 80,000 km",
        offerPrice: 164999
      },
      {
        battery: "6.2 kWh LFP",
        range: "320 km",
        warranty: "10 Years or 1,50,000 km",
        offerPrice: 179999
      },
      {
        battery: "6.5 kWh LFP",
        edition: "Popular",
        range: "350 km",
        warranty: "10 Years or 1,50,000 km",
        offerPrice: 199999
      },
      {
        battery: "7.5 kWh LFP",
        range: "400 km",
        warranty: "10 Years or 1,60,000 km",
        offerPrice: 239999
      },
      {
        battery: "8.5 kWh LFP",
        edition: "Flagship",
        range: "450 km",
        warranty: "10 Years or 1,90,000 km",
        offerPrice: 259999
      }
    ]
  },

  LoaderE2W: {
    variants: [
      { battery: "2 kWh LFP", range: "Up to 100 km", price: 110000 },
      {
        battery: "3 kWh LFP",
        edition: "Popular",
        range: "Up to 150 km",
        price: 130000
      },
      { battery: "4 kWh LFP", range: "Up to 200 km", price: 150000 },
      {
        battery: "6.5 kWh LFP",
        edition: "Long Range",
        range: "Up to 300 km",
        price: 210000
      }
    ]
  }
};

module.exports = { TEJO_EV_PRICES };