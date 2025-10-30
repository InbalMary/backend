export default {
    dbURL: process.env.MONGO_URL || 'mongodb+srv://inbal:123@cluster0.mamqapt.mongodb.net/?appName=Cluster0',
    dbName: process.env.DB_NAME || 'stay_db'
}
