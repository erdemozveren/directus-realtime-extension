# Directus Realtime Extension

#### _Add realtime capabilities to your [Directus App](https://directus.io/)_

---
## Description
Realtime extension simply adds very thing layer between your [pusher](https://pusher.com) / [soketi](https://github.com/soketi/soketi) server and your directus app. 


---

Any Pusher-maintained or compatible client can connect to it.You have total control of your channels (What to publish or who to authorize) with pure javascript that you can edit in your admin panel per channel.

## Project Status

- [x] Alpha: Under heavy development
- [x] Public Alpha: Ready for use. But go easy on me, there may be a few kinks.
- [ ] Public Beta: Stable enough for most non-enterprise use-cases
- [ ] Public: Production-ready


**You can use [soketi](https://github.com/soketi/soketi) for free pusher alternative, its open-source.**


## Installing

* Clone this repo
* run `npm install && npm run build` in both "realtime-endpoints" and "realtime-hooks" directories.
* Both extensions are outputs to `dist/` folder and you have to move the output from the `dist/` folder and `/migrations` folder into your project's `./extensions/` folder
* and set ENV variables to your needs
* restart your direcuts app

> Note: Migration has `Data Model` for channels table for fast start if you don't want this simply remove it from migration file or set `RT_DONT_PRESET`env variable on first start. (There is no need to disable it but its your call.)

> Note : If you disabled `Data Model` presets you have te setup for yourself

### Env variables


| ENV NAME                 	| REQUIRED                                            	| DEFAULT                 	|
|--------------------------	|-----------------------------------------------------	|-------------------------	|
| RT_APP_ID                	| YES                                                 	| "app-id"                	|
| RT_APP_KEY               	| YES                                                 	| "app-key"               	|
| RT_APP_SECRET            	| YES                                                 	| "app-secret"            	|
| RT_APP_HOST              	| YES                                                 	| "soketi"                	|
| RT_APP_CLUSTER           	| NOT REQUIRED FOR SOKETI                                                  	| (undefined \| disabled) 	|
| RT_ENCRYPTION_MASTER_KEY 	| NOT REQUIRED IF YOR NOT NEED ENCRYPTION ON CHANNELS 	| (undefined \| disabled) 	|
| RT_APP_PORT              	| YES                                                 	| 6001                    	|
| RT_USE_TLS               	| NO                                                  	|                         	|
| RT_USE_STATS             	| NO                                                  	| (undefined \| disabled) 	|


### What's Next?

* You can create your channels like normal collection items from dashboard.
* I try to fill all note sections for all fileds, its should be a self-explanatory.


## Example Channel
 
 
 > channel name accepts value like express.js route variables (See [path-to-regexp](https://www.npmjs.com/package/path-to-regexp))

 Channel name : `private-chat-:userId`

 Collection : `chat` 

 ### Authorizer Context:
 ```js
 {
 socket_id: "pusher socket id",
 // requested channel name
 channel_name : "private-chat-cd6feea9-bcb2-45bb-a664-6fea3fea88b8",

 params : {
     userId:"cd6feea9-bcb2-45bb-a664-6fea3fea88b8"
     },

     auth: {
	user: { // All user fields
		id: "cd6feea9-bcb2-45bb-a664-6fea3fea88b8",
		first_name: "Admin",
		last_name: "User",
		email: "a@a.com",
		password: "$argon2i$v=19$m=4096,t=3,p=1$h+TgmA2455KVE52jizvyMw$1T/DOdSRpxDlGBz/Uft7QzkpeWIIITZulIS82tu7TAw",
		location: null,
		title: null,
		description: null,
		tags: null,
		avatar: null,
		language: "en-US",
		theme: "dark",
		tfa_secret: null,
		status: "active",
		role: "8bb80a0b-0467-4351-bd29-4ad16ffc7f92",
		token: null,
		last_access: "2022-01-16T23:50:23.737Z",
		last_page: "/content/realtime_channels/4e7b81a7-0e94-4b93-abc6-8ef7a40ab97d",
		provider: "default",
		external_identifier: null,
		auth_data: null,
		email_notifications: false
	},
	role: "8bb80a0b-0467-4351-bd29-4ad16ffc7f92",
	admin: true,
	app: true,
	ip: "172.18.0.1",
	userAgent: "insomnia/2021.7.2",
	permissions: [
        // ... user permissions
    ]
}
 }
 ```
 
 ### Example Authorizer Script
 ```js
 // For private channels
 if (auth.user.id === params.userId) {

    return true;
}
// For presence Channels
if(auth.user.id === params.userId)
{
return {user_id:auth.user.id,user_info:{name:auth.user.first_name}}; // Check Pusher presence channel docs.
}
```

### Publisher Context
```js
    {
        collection:"chat",
        action:"create", // update,delete
        trigger: (channelParams,eventName,payload,exclude?) => {}, // trigger event on channel with given parameters,exclude is optional
        broadcastTo: (channelName, channelParams, eventName, payload, exclude?) => {}, // exclude is optional

    }
 ```
 ### Example Publisher Script
 ```js
 // Remember this is PURE JAVASCRIPT
// YOU ARE RESPONSIBLE FOR WHAT IS SHARED WITH THE USER
// You can select which fields you want to see in meta.payload object (resolves relations with dot notation).
//
// in this situation fields can be : *,recipient.id,recipient.first_name
// to get all top-level fields and all second-level relational fields : *.*
 trigger({userId:meta.payload.recipient.id},"message",meta.payload);
// if you want to trigger event on another channel use broadcastTo

// if it doesn't have any dynamic parameters in channel name,pass empty object on channelParams.
broadcastTo("another-channel",{},"somethingHappend",meta.payload);

// or with params

broadcastTo("private-chat-notification-:userId",{userId:meta.payload.recipient.id},"message",meta.payload);


 ```

### When to trigger publisher

Just check in which action should publisher be called.
Useful for avoid unnecessary 'if's in script.

### Example Client

auth endpoint : {APP_PUBLIC_URL}/realtime/auth

```js
const client = new Pusher('app-key', {
	wsHost: 'localhost',
	wsPort: 6001,
	forceTLS: false,
	disableStats: true,
	authEndpoint: `http://localhost:8055/realtime/auth`,
	auth: {
		headers: {
			Authorization: `Bearer ${directus.auth && directus.auth.token}`
		}
	},
	enabledTransports: ['ws', 'wss'],
});
```

---
## Limits

except Pusher / Soketi server limits,extension doesn't have limit for implementations.Authorizer and Publisher fields are just a javascript functions with a useful parameters and functions.



## Contributing

Contributions are welcome.

## Reporting a Vulnerability
If you discover any security-related issues, please open a issue.

## Authors

Contributors names and contact info

* [@Erdem Özveren](https://github.com/erdemozveren)

## License

Its free and open-source do whatever you want with it.
This project is licensed under the MIT License - see the LICENSE.md file for details

---
>Sorry for any mistakes. English is not my native language