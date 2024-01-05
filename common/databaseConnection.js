import mongoose from "mongoose";


export const dbConnection = async () => {
    try {
        const connection = await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDb Connection Successfully :: at ", connection.connection.host);
        
    } catch (error) {
        console.log("MongoDb Connection Error ::", error);
        process.exit(1)
    }
}

export default dbConnection;