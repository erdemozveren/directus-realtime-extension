import Pusher from 'pusher';
import bodyParser from 'body-parser';
import { getChannels, runChannelAuthorizer } from './helpers.js';
import { match } from 'path-to-regexp';



export default (router, { env, database, logger }) => {
	const log = logger.child({ extension: 'realtime/endpoints' });
	router.use(bodyParser.json());
	router.use(bodyParser.urlencoded({ extended: false }));
	const {
		RT_APP_ID,
		RT_APP_KEY,
		RT_APP_SECRET,
		RT_APP_HOST,
		RT_APP_CLUSTER,
		RT_APP_PORT,
		RT_USE_TLS,
		RT_ENCRYPTION_MASTER_KEY,
		RT_USE_STATS,
	} = env;

	const pusher = new Pusher({
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

	router.post('/auth', async (req, res) => {
		try {
			const auth = req.accountability;
			const socketId = req.body.socket_id;
			const channelName = req.body.channel_name;
			let channelType = null;

			if (channelName.indexOf("private-") !== -1) {
				// auth endpoint is only for private and presence channels
				channelType = "private";
			} else if (channelName.indexOf("presence-") !== -1) {
				channelType = "presence";
			} else {
				// channel is public (its invalid request)
				res.status(401).json({ success: false });
				return;
			}

			if (!auth.user) {
				// private channels only for authenticated users
				res.status(401).json({ success: false });
				return;
			}

			const userInfo = await database.from("directus_users").where("id", auth.user).limit(1).select("*");
			auth.user = userInfo?.[0];
			if (!auth.user) {
				// we cannot find user
				res.status(401).json({ success: false });
				return;
			}
			const channels = await getChannels(database, env, log);

			for (const channel of channels) {
				const isChannelMatch = match(channel.channel_name, { sensitive: true })(channelName);

				if (isChannelMatch !== false) {
					// if authorizer is null,its must be a public channel
					// public channels never make request to auth endpoint (they don't need auth)
					// so we reject to auth in case of "user" error (like accidentally lefts the field blank) or malicious requests
					const authorizedData = channel.authorizer === null ? false : runChannelAuthorizer(channel.authorizer, socketId, channelName, isChannelMatch.params, auth);
					if (channelType === "presence") {
						if (typeof authorizedData !== 'object') {
							// Presence Channels authorizer function must return json/object user data on success
							continue;
						}
						const authPresence = pusher.authenticate(socketId, channelName, authorizedData);
						res.send(authPresence);
						return;
					} else if (authorizedData === true) {
						const authPrivate = pusher.authenticate(socketId, channelName);
						res.send(authPrivate);
						return;
					}
				}
			}
		} catch (unexpectedError) {
			log.error("Realtime : Unexpected Error " + unexpectedError.message);
		}
		// if there is no match or error happends ;
		res.status(401).json({ success: false });
		return;
	});


	log.info("Realtime Endpoints initialized...");

};
