const uuid = require('node-uuid');
const {
    GraphQLList,
    GraphQLString,
    GraphQLNonNull,
    GraphQLObjectType,
} = require('graphql');
const {
    offsetToCursor,
    cursorForObjectInConnection,
    mutationWithClientMutationId,
} = require('graphql-relay');

const {
    createChannel,
    listChannels,
    sendMessage,
} = require('../../utils/kafka');
const { database, auth, exists } = require('../../utils/firebase');
const runBot = require('../../utils/bot');

const { channelKind, channelType, channelEdge } = require('../types/channel');
const { messageEdge, messageKind } = require('../types/message');
const viewerType = require('../types/viewer');

module.exports = new GraphQLObjectType({
    name: 'RootMutation',
    fields: {
        createChannel: mutationWithClientMutationId({
            name: 'CreateChannel',
            inputFields: {
                name: {
                    type: new GraphQLNonNull(GraphQLString),
                },
                type: {
                    type: new GraphQLNonNull(channelKind),
                },
                invite: {
                    type: new GraphQLList(GraphQLString),
                },
            },
            outputFields: {
                channelEdge: {
                    type: channelEdge,
                },
                viewer: {
                    type: viewerType,
                },
            },
            async mutateAndGetPayload({ name, type, invite }, { token }) {
                if(await exists(`/channels/${name}`)) {
                    throw new Error(`Channel ${name} already exists`);
                }

                const { sub } = await auth.verifyIdToken(token);

                await createChannel(name);

                const users = invite.reduce(
                    (map, uid) => Object.assign({
                        [uid]: {
                            access: 'USER',
                        },
                    }, map),
                    {
                        [sub]: {
                            access: 'MODERATOR',
                        },
                    }
                );

                database.ref(`/channels/${name}`).set({
                    type, users,
                });

                return {
                    viewer: {
                        id: token,
                    },
                    channelEdge: {
                        node: name,
                    },
                };
            },
        }),
        postMessage: mutationWithClientMutationId({
            name: 'PostMessage',
            inputFields: {
                channel: {
                    type: new GraphQLNonNull(GraphQLString),
                },
                kind: {
                    type: new GraphQLNonNull(messageKind),
                },
                content: {
                    type: new GraphQLNonNull(GraphQLString),
                },
            },
            outputFields: {
                messageEdge: {
                    type: messageEdge,
                },
                channel: {
                    type: channelType,
                },
            },
            async mutateAndGetPayload({ channel, kind, content }, { token }) {
                const { sub } = await auth.verifyIdToken(token);

                const key = uuid.v1();
                const value = {
                    kind, content,
                    author: sub,
                    time: Date.now(),
                };

                const offset = await sendMessage({
                    key,
                    topic: channel,
                    value: JSON.stringify(value),
                });

                if(kind === 'TEXT') {
                    database.ref(`/channels/${channel}/subtext`).set({
                        user: sub,
                        content,
                    });
                }

                database.ref(`/channels/${channel}/users`).once('value', snapshot => {
                    const users = snapshot.val();
                    Object.entries(users).forEach(([uid, { access, kick, ban }]) => {
                        if(ban || kick > Date.now()) {
                            return;
                        }

                        database.ref(`/users/${uid}`).once('value', async snapshot => {
                            const { type, url } = snapshot.val();
                            if (type === 'BOT') {
                                try {
                                    await runBot(channel, { uid, url, access }, value);
                                } catch (err) {
                                    console.error(url, err);
                                }
                            }
                        });
                    });
                });

                return {
                    channel,
                    messageEdge: {
                        cursor: offsetToCursor(offset - 1),
                        node: Object.assign({}, value, {
                            id: `${channel}:${offset}`,
                            uuid: key,
                        }),
                    },
                };
            },
        }),
    },
});
