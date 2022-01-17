import { getCache } from 'directus/cache';
import ms from 'ms';

const CHANNELS_CACHE_KEY = 'realtime-channel-list';
const CHANNEL_TABLE_NAME = "realtime_channels";


export function runChannelAuthorizer(authorizer, socket_id, channelName, params, auth) {
    try {
        return (new Function('socket_id', 'channel_name', 'params', 'auth', authorizer))(socket_id, channelName, params, auth);
    } catch (_cae) {
        return false;
    }
}

export async function getChannels(database, env, log) {
    try {
        const { cache } = getCache();
        const cachedChannels = await cache?.get(CHANNELS_CACHE_KEY);
        if (cachedChannels) {
            return cachedChannels;
        }
        const channels = await database.from(CHANNEL_TABLE_NAME).where({
            enabled: true,
        }).select("*");
        cache?.set(CHANNELS_CACHE_KEY, channels, ms(env.CACHE_TTL ?? '15m'));
        return channels;
    } catch (databaseError) {
        log.error(`Database Error on loadingChannels ; ${databaseError}`);
        return [];
    }
}