import dotenv from "dotenv"
import { app } from "./app.js";
import dbConnection from "./common/databaseConnection.js";


dotenv.config({
    path: './.env'
})


dbConnection()
.then(() => {
    app.listen(process.env.PORT || 3000, () => {
        console.log("app is listening at 3000 port");
    })
})
.catch((error) => {
    console.log("MongoDb Connection Error ::", error);
})