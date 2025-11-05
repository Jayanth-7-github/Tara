const mongoose = require("mongoose");

/**
 * Connect to MongoDB using mongoose.
 * @param {string} [mongoUrl] - MongoDB connection string. If omitted, will read from process.env.MONGO_URL.
 * @returns {Promise<mongoose.Mongoose>} connected mongoose instance
 */
async function connectDB(mongoUrl) {
  const url = mongoUrl || process.env.MONGO_URL;
  if (!url) {
    throw new Error("MONGO_URL environment variable is not set.");
  }

  // Use the modern mongoose connection defaults
  await mongoose.connect(url, {
    // mongoose v6+ has these as defaults; kept here for clarity
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log("MongoDB connected");
  return mongoose;
}

async function disconnectDB() {
  await mongoose.disconnect();
  console.log("MongoDB disconnected");
}

module.exports = { connectDB, disconnectDB, mongoose };
