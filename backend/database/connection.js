const mongoose = require("mongoose");

async function connectDatabase() {
  try {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    await mongoose.connect(uri, {
      // SRV connection options to handle DNS issues
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      maxPoolSize: 10,
      minPoolSize: 2,
      retryWrites: true,
      retryReads: true,
      // Force IPv4 to avoid IPv6 DNS issues
      family: 4,
    });

    console.log(
      "MongoDB connected successfully"
    );
  } catch (error) {
    console.error(
      "MongoDB connection failed:",
      error
    );

    // Provide helpful error message for DNS issues
    if (error.name === 'MongoServerSelectionError' || error.message?.includes('ENOTFOUND')) {
      console.error(
        "\n⚠️  DNS Resolution Error: Cannot reach MongoDB Atlas cluster.\n" +
        "   This is likely a network/DNS issue on your machine.\n" +
        "   Try:\n" +
        "   1. Check your internet connection\n" +
        "   2. Try a different DNS (8.8.8.8, 1.1.1.1)\n" +
        "   3. Disable VPN/proxy if active\n" +
        "   4. Use a direct connection string instead of SRV\n" +
        "   5. Whitelist your IP in MongoDB Atlas Network Access\n"
      );
    }

    process.exit(1);
  }
}

module.exports = {
  connectDatabase,
};