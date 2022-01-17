import Pusher from "pusher"
import { compile } from 'path-to-regexp';
import { getCache } from 'directus/cache';

export const CHANNEL_TABLE_NAME = "realtime_channels";
const CHANNELS_CACHE_KEY = 'realtime-channel-list';
const SCHEMA_CACHE_KEY = 'realtime-tables-schema';


export default class RealtimeService {
    logger = null;
    pusher = null;
    constructor(context) {
        this.context = context;
        this.logger = context.logger.child({ extension: 'realtime/hooks' });
        const {
            RT_APP_ID,
            RT_APP_KEY,
            RT_APP_SECRET,
            RT_APP_HOST,
            RT_APP_CLUSTER,
            RT_ENCRYPTION_MASTER_KEY,
            RT_APP_PORT,
            RT_USE_TLS,
            RT_USE_STATS,
        } = context.env;
        this.pusher = new Pusher({
            appId: RT_APP_ID ?? "app-id",
            key: RT_APP_KEY ?? "app-key",
            secret: RT_APP_SECRET ?? "app-secret",
            host: RT_APP_HOST ?? 'soketi',
            cluster: RT_APP_CLUSTER,
            port: RT_APP_PORT ?? 6001,
            useTLS: RT_USE_TLS ?? false,
            encryptionMasterKeyBase64: RT_ENCRYPTION_MASTER_KEY,
            disableStats: RT_USE_STATS ?? true,
        });
    }

    async getChannels() {
        try {
            const { cache } = getCache();
            const cachedChannels = await cache?.get(CHANNELS_CACHE_KEY);
            if (cachedChannels) {
                return cachedChannels;
            }
            const channels = await this.context.database.from(CHANNEL_TABLE_NAME).where({
                enabled: true,
            }).select("*");
            cache?.set(CHANNELS_CACHE_KEY, channels);
            return channels;
        } catch (databaseError) {
            this.logger.error("Database Error on loadingChannels ", databaseError.message);
        }
        return [];
    }

    registerActions(action) {
        const { cache } = getCache();
        action("items.create", ({ payload, key, collection }) => {
            if (collection === CHANNEL_TABLE_NAME) {
                cache?.delete(CHANNELS_CACHE_KEY);
            }
            this.onAction(collection, "create", { payload, key });
        });
        action("items.update", ({ payload, keys, collection }) => {
            if (collection === CHANNEL_TABLE_NAME) {
                cache?.delete(CHANNELS_CACHE_KEY);
            }
            this.onAction(collection, "update", { payload, keys });
        });
        action("items.delete", ({ payload, collection }) => {
            if (collection === CHANNEL_TABLE_NAME) {
                cache?.delete(CHANNELS_CACHE_KEY);
            }
            this.onAction(collection, "delete", payload);
        });
    }

    async getSchema() {
        const { cache } = getCache();
        const cachedSchema = await cache?.get(SCHEMA_CACHE_KEY);
        if (cachedSchema) {
            return cachedSchema;
        }
        try {
            const schema = await this.context.getSchema();
            cache?.set(SCHEMA_CACHE_KEY, schema);
            return schema;
        } catch (unexpectedError) {
            this.logger.error("Realtime Extension unable to get schema of collections");
            this.logger.error(unexpectedError.message);
        }
        return null;
    }

    async onAction(collection, action, meta) {
        const channels = await this.getChannels();
        for (const ch of channels) {
            if (ch.collection !== collection || ch[`trigger_on_${action}`] !== true) continue;
            try {
                if (action === "update") {
                    const schema = await this.context.getSchema();
                    const primaryKeyField = schema.collections[ch.collection].primary;
                    const clService = new this.context.services.ItemsService(ch.collection, { schema });
                    const affectedItems = await clService.readMany(meta.keys, { fields: ch.fields });
                    affectedItems.forEach(item => {
                        this.run_channel_publisher(ch, action, { collection, payload: item, changed: meta.payload, key: item[primaryKeyField] })
                    });
                } else if (action === "create") {
                    const schema = await this.context.getSchema();
                    const clService = new this.context.services.ItemsService(ch.collection, { schema });
                    const newPayload = await clService.readOne(meta.key, { fields: ch.fields });
                    meta.payload = newPayload;
                    this.run_channel_publisher(ch, action, meta)
                } else {
                    this.run_channel_publisher(ch, action, meta)
                }
            } catch (unexpectedError) {
                this.logger.error("Something went wrong on publisher of ", ch.channel_name, " ERROR ");
                this.logger.error(unexpectedError.message);
            }

        }
    }

    trigger(channel, options) {
        const { channelParams, event, data, exclude } = options;
        if (typeof channelParams !== 'object' || typeof event !== 'string' || typeof data !== 'object') {
            this.logger.error(`#[${channel.id}] ${channel.channel_name} - Missing Parameater on Trigger, Check your 'publisher' code`);
            return;
        }
        const broadcastTo = compile(channel.channel_name)(channelParams);
        this.pusher.trigger(broadcastTo, event, data, exclude);
    }

    run_channel_publisher(channel, action, meta) {
        try {
            const trigger = (channelParams, event, data, exclude) => this.trigger(channel, { channelParams, event, data, exclude });
            const broadcastTo = (channelName, channelParams, event, data, exclude) => this.trigger({ id: 'broadcastTo', channel_name: channelName }, { channelParams, event, data, exclude });
            return (new Function('collection', 'action', 'trigger', 'broadcastTo', 'meta', channel.publisher))(channel.collection, action, trigger, broadcastTo, meta);
        } catch (_cp) {
            this.logger.error(`REALTIME CHANNEL PUBLISHER ERROR [CHECK YOUR 'PUBLISHER' CODE, CHANNEL NAME ${channel.name}] ; ${_cp.message}`);
            return false;
        }
    }
}
