const crypto = require('crypto');
const { getFirestore } = require('../../../config/firebase.config');
const iprsConfig = require('../../../config/iprs.config');
const logger = require('../../../utils/logger');

class IPRSIdentityCacheService {
  constructor() {
    this.memoryRecords = new Map();
    this.collectionName = process.env.IPRS_IDENTITY_CACHE_COLLECTION || 'iprs_identity_cache';
    this.eventsCollectionName = process.env.IPRS_LOOKUP_EVENTS_COLLECTION || 'iprs_lookup_events';
  }

  hashIdentifier(type, identifier) {
    return crypto
      .createHmac('sha256', iprsConfig.identifierHashSecret)
      .update(`${type}:${String(identifier)}`)
      .digest('hex');
  }

  cacheKey(type, identifier) {
    return `${type}_${this.hashIdentifier(type, identifier)}`;
  }

  async find(type, identifier) {
    const id = this.cacheKey(type, identifier);
    const db = getFirestore();

    if (db) {
      try {
        const snapshot = await db.collection(this.collectionName).doc(id).get();
        if (!snapshot.exists) return null;
        return { id: snapshot.id, ...snapshot.data() };
      } catch (error) {
        logger.error({ error: error.message, type }, 'IPRS_IDENTITY_CACHE_READ_FAILED');
      }
    }

    return this.memoryRecords.get(id) || null;
  }

  async save({ type, identifier, method, data, context, fetchedByIp }) {
    const id = this.cacheKey(type, identifier);
    const now = new Date();
    const record = {
      id,
      identifierHash: this.hashIdentifier(type, identifier),
      verificationType: type,
      verificationMethod: method,
      data,
      requestedBy: context.userId || null,
      requestedByIp: context.clientIp || null,
      fetchedByIp: fetchedByIp || null,
      fetchedFrom: 'IPRS',
      createdAt: now,
      updatedAt: now
    };

    const db = getFirestore();
    if (db) {
      try {
        await db.collection(this.collectionName).doc(id).set(record, { merge: true });
      } catch (error) {
        logger.error({ error: error.message, type }, 'IPRS_IDENTITY_CACHE_WRITE_FAILED');
      }
    }

    this.memoryRecords.set(id, record);
    return record;
  }

  async recordLookupEvent({ requestId, type, identifier, method, source, status, context, fetchedByIp }) {
    const event = {
      requestId,
      identifierHash: this.hashIdentifier(type, identifier),
      verificationType: type,
      verificationMethod: method,
      source,
      status,
      requestedBy: context.userId || null,
      requestedByIp: context.clientIp || null,
      fetchedByIp: fetchedByIp || null,
      createdAt: new Date()
    };

    const db = getFirestore();
    if (db) {
      try {
        await db.collection(this.eventsCollectionName).doc(requestId).set(event, { merge: true });
      } catch (error) {
        logger.error({ error: error.message, type }, 'IPRS_LOOKUP_EVENT_WRITE_FAILED');
      }
    }

    return event;
  }
}

module.exports = IPRSIdentityCacheService;
