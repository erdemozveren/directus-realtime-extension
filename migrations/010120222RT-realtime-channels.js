const CHANNEL_TABLE = "realtime_channels";
module.exports = {
    async up(knex) {
        const dr_field_presets = [
            {
                "collection": CHANNEL_TABLE,
                "field": "trigger_on_create",
                "special": null,
                "interface": "boolean",
                "options": null,
                "display": "boolean",
                "display_options": {
                    "labelOn": "Enabled",
                    "labelOff": "Disabled"
                },
                "readonly": false,
                "hidden": false,
                "sort": 8,
                "width": "full",
                "translations": null,
                "note": null,
                "conditions": null,
                "required": true,
                "group": null
            },
            {
                "collection": CHANNEL_TABLE,
                "field": "fields",
                "special": "json",
                "interface": "tags",
                "options": {
                    "presets": [
                        "*"
                    ],
                    "placeholder": "Add Fields"
                },
                "display": "labels",
                "display_options": null,
                "readonly": false,
                "hidden": false,
                "sort": 4,
                "width": "full",
                "translations": null,
                "note": "Specify the fields of the \"payload\" || This parameter supports dot notation to request nested relational fields",
                "conditions": null,
                "required": true,
                "group": null
            },
            {
                "collection": CHANNEL_TABLE,
                "field": "trigger_on_update",
                "special": null,
                "interface": "boolean",
                "options": null,
                "display": "boolean",
                "display_options": {
                    "labelOn": "Enabled",
                    "labelOff": "Disabled"
                },
                "readonly": false,
                "hidden": false,
                "sort": 9,
                "width": "full",
                "translations": null,
                "note": null,
                "conditions": null,
                "required": true,
                "group": null
            },
            {
                "collection": CHANNEL_TABLE,
                "field": "channel_name",
                "special": null,
                "interface": "input",
                "options": {
                    "iconLeft": "signal_cellular_alt",
                    "trim": true
                },
                "display": "raw",
                "display_options": null,
                "readonly": false,
                "hidden": false,
                "sort": 5,
                "width": "full",
                "translations": null,
                "note": "Example: accept any \"private-notification-:userId\" ,  accept only numeric roomId \"private-room-:roomId(\\d+)\"",
                "conditions": null,
                "required": true,
                "group": null
            },
            {
                "collection": CHANNEL_TABLE,
                "field": "collection",
                "special": null,
                "interface": "input",
                "options": {
                    "url": "/collections",
                    "trim": true,
                    "placeholder": "any collection name...",
                    "iconLeft": "dns"
                },
                "display": "raw",
                "display_options": null,
                "readonly": false,
                "hidden": false,
                "sort": 3,
                "width": "full",
                "translations": null,
                "note": null,
                "conditions": null,
                "required": true,
                "group": null
            },
            {
                "collection": CHANNEL_TABLE,
                "field": "authorizer",
                "special": null,
                "interface": "input-code",
                "options": {
                    "language": "javascript",
                    "template": "if (auth.user === params.userId) {\n    return true;\n}"
                },
                "display": null,
                "display_options": {
                    "conditionalFormatting": null
                },
                "readonly": false,
                "hidden": false,
                "sort": 6,
                "width": "full",
                "translations": null,
                "note": "Context ; socket_id, channel_name, params, auth || NEVER LEAVE THIS EMPTY EXCEPT FOR PUBLIC CHANNELS",
                "conditions": null,
                "required": false,
                "group": null
            },
            {
                "collection": CHANNEL_TABLE,
                "field": "trigger_on_delete",
                "special": null,
                "interface": "boolean",
                "options": null,
                "display": "boolean",
                "display_options": {
                    "labelOn": "Enabled",
                    "labelOff": "Disabled"
                },
                "readonly": false,
                "hidden": false,
                "sort": 10,
                "width": "full",
                "translations": null,
                "note": null,
                "conditions": null,
                "required": true,
                "group": null
            },
            {
                "collection": CHANNEL_TABLE,
                "field": "publisher",
                "special": null,
                "interface": "input-code",
                "options": {
                    "language": "javascript",
                    "template": "// Remember this is PURE JAVASCRIPT\n// YOU ARE RESPONSIBLE FOR WHAT IS SHARED WITH THE USER\n\ntrigger({userId:meta.payload.recipient.id},'new_notification',meta.payload);"
                },
                "display": null,
                "display_options": null,
                "readonly": false,
                "hidden": false,
                "sort": 7,
                "width": "full",
                "translations": null,
                "note": "Context: collection, action, trigger, broadcastTo, meta",
                "conditions": null,
                "required": true,
                "group": null
            },
            {
                "collection": CHANNEL_TABLE,
                "field": "id",
                "special": "uuid",
                "interface": null,
                "options": null,
                "display": null,
                "display_options": null,
                "readonly": true,
                "hidden": true,
                "sort": 1,
                "width": "full",
                "translations": null,
                "note": null,
                "conditions": null,
                "required": false,
                "group": null
            },
            {
                "collection": CHANNEL_TABLE,
                "field": "enabled",
                "special": null,
                "interface": "boolean",
                "options": {
                    "label": "Is channel active?"
                },
                "display": "boolean",
                "display_options": {
                    "labelOn": "Enabled",
                    "labelOff": "Disabled"
                },
                "readonly": false,
                "hidden": false,
                "sort": 2,
                "width": "full",
                "translations": null,
                "note": null,
                "conditions": null,
                "required": true,
                "group": null
            }
        ];


        await knex.schema.createTable(CHANNEL_TABLE, (table) => {
            table.uuid('id').primary();
            table.boolean('enabled').defaultTo(false).notNullable();
            table.string('collection').notNullable();
            table.json('fields').defaultTo(['*']).notNullable();
            table.string('channel_name', 164).unique().notNullable();
            table.text('authorizer').nullable();
            table.text('publisher').notNullable();
            table.boolean('trigger_on_create').defaultTo(true).notNullable();
            table.boolean('trigger_on_update').defaultTo(true).notNullable();
            table.boolean('trigger_on_delete').defaultTo(true).notNullable();
        });
        if (process.env.RT_DONT_PRESET) return;
        const checkCollections = await knex.from("directus_collections").where({ "collection": CHANNEL_TABLE }).limit(1).select("*");
        if (checkCollections.length <= 0) {
            await knex.insert({
                "collection": CHANNEL_TABLE,
                "icon": 'settings_input_antenna',
                "note": 'Realtime Channels for Websockets [Extension]',
                "display_template": "{{collection}} - {{channel_name}}",
                "hidden": false,
                "singleton": false,
                "translations": null,
                "archive_field": null,
                "archive_app_filter": false,
                "archive_value": null,
                "unarchive_value": null,
                "sort_field": null,
                "accountability": "all",
                "color": "#5F7BCE",
                "item_duplication_fields": null,
                "sort": null,
                "group": null,
                "collapse": "open"
            }).into('directus_collections');
        }
        const checkPresets = await knex.from("directus_fields").where({ "collection": CHANNEL_TABLE }).limit(1).select("*");
        if (checkPresets.length <= 0) {
            await knex.insert(dr_field_presets).into('directus_fields');
        }
    },

    async down(knex) {
        await knex.schema.dropTable(CHANNEL_TABLE);
        await knex.raw(`
        DELETE FROM public.directus_collections
        WHERE collection='${CHANNEL_TABLE}';
        
        DELETE FROM public.directus_fields 
        WHERE collection = '${CHANNEL_TABLE}';
        
        DELETE FROM public.directus_migrations
        WHERE version = '010120222RT';`);
    },
};