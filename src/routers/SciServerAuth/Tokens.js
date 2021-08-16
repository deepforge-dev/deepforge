/*
 * This is a wrapper for storing SciServer tokens for individual DeepForge users. To
 * keep it simpler, DeepForge usernames are referred to as userId/user (following the
 * convention in webgme routers) and SciServer usernames are referred to as username/name.
 */
const MONGO_COLLECTION = 'SciServerTokens';

class TokenStorage {
    constructor() {
        this.collection = null;
        this.guestAccount = undefined;
    }

    init(gmeConfig, db) {
        const one_day = 60*60*24;
        this.collection = db.collection(MONGO_COLLECTION);
        this.collection.createIndex({createdAt: 1}, {expireAfterSeconds: one_day});
        this.guestAccount = gmeConfig.authentication.guestAccount;
    }

    async register(user=this.guestAccount, name, token) {
        const createdAt = new Date();
        await this.collection.update({user, name}, {$set: {token, createdAt}}, {upsert: true});
    }

    async getUsernames(userId=this.guestAccount) {
        const docs = await this.collection.find({user: userId}, {name: 1}).toArray();
        return docs.map(doc => doc.name);
    }

    async getToken(userId=this.guestAccount, username) {
        const doc = await this.collection.findOne({user: userId, name: username}, {token: 1});
        if (!doc) {
            throw new NotFoundError();
        }
        return doc.token;
    }
}

class NotFoundError extends Error {
    constructor() {
        super('Token not found.');
    }
}

TokenStorage.prototype.NotFoundError = NotFoundError;

module.exports = new TokenStorage();
