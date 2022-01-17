import RealtimeService from './lib/realtime-service.js';
export default ({ action, init }, context) => {
	init("app.before", () => {
		const service = new RealtimeService(context);

		service.registerActions(action);
		context.logger.child({ extension: 'realtime/hooks' }).info("Realtime Extension listening...");
	});

};
