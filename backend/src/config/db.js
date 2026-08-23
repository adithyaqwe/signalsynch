const connectDB = async () => {
  try {
    // Mongoose is bypassed; using in-memory MockModels
    console.log(`[Database] Connected to In-Memory Mock Datastore`);
  } catch (error) {
    console.error(`[Database] Connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
