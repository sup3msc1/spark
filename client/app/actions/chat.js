// @flow
import type {
    Dispatch,
    Store as ReduxStore,
} from 'redux';

// import type { Remote } from 'utils/websocket';
import * as RTC from 'utils/rtc';
import {
    initCamera,
    createConnection,
} from 'utils';

// eslint-disable-next-line no-undef
type GetState = () => State;
// eslint-disable-next-line no-undef
type Store = ReduxStore<State, Action>;

// eslint-disable-next-line no-undef
export function joinCall(): Action {
    return {
        type: 'JOIN',
    };
}

// eslint-disable-next-line no-undef
export function localStream(stream: MediaStream): Action {
    return {
        type: 'LOCAL_STREAM',
        payload: stream,
    };
}

// eslint-disable-next-line no-undef
export function remoteConnection(remote: string, connection: Connection): Action {
    return {
        type: 'REMOTE_CONNECTION',
        payload: {
            remote, connection,
        },
    };
}

// eslint-disable-next-line no-undef
export function remoteStream(remote: string, stream: MediaStream): Action {
    return {
        type: 'REMOTE_STREAM',
        payload: {
            remote, stream,
        },
    };
}

// eslint-disable-next-line no-undef
export function sendOffer(): Action {
    return {
        type: 'SEND_OFFER',
        // eslint-disable-next-line no-undef
        payload: async (dispatch: Dispatch<Action>, getState: GetState) => {
            dispatch(joinCall());

            const { stream: streamState } = getState();
            const WS = await import(/* webpackChunkName: "websocket" */ '../utils/websocket');

            const [
                stream,
                remotes,
            ]: [
                MediaStream,
                // eslint-disable-next-line no-undef
                Array<Remote>,
            ] = await Promise.all([
                initCamera(streamState.localStream),
                WS.joinRoom('default'),
            ]);

            return Promise.all(
                remotes
                    .filter(remote => !streamState.remotes.has(remote.id))
                    .map(async remote => {
                        const connection = createConnection(remote, stream);

                        dispatch(remoteConnection(remote.id, connection));

                        const reply = await remote.sendOffer(
                            await RTC.sendOffer(connection),
                        );

                        await RTC.openConnection(connection, reply);

                        return connection;
                    }),
            );
        },
    };
}

// eslint-disable-next-line no-undef
export function acceptOffer(remote: Remote, offer: Offer): Action {
    return {
        type: 'ACCEPT_OFFER',
        // eslint-disable-next-line no-undef
        payload: async (dispatch: Dispatch<Action>, getState: GetState) => {
            const {
                stream: streamState,
            } = getState();

            const stream = await initCamera(streamState.localStream);

            const connection = createConnection(remote, stream);
            dispatch(remoteConnection(remote.id, connection));

            return RTC.acceptOffer(connection, offer);
        },
    };
}

// eslint-disable-next-line no-undef
export function handleCandidate(store: Store, remote: string, candidate: Candidate): Action {
    return {
        type: 'HANDLE_CANDIDATE',
        // eslint-disable-next-line no-undef
        payload: async (dispatch: Dispatch<Action>, getState: GetState) => {
            const connection = await new Promise(resolve => {
                let unsubscribe;
                const handler = () => {
                    const {
                        stream: {
                            remotes,
                        },
                    } = getState();

                    if (remotes.has(remote) && remotes.get(remote).connection) {
                        resolve(remotes.get(remote).connection);
                        unsubscribe();
                    }
                };

                unsubscribe = store.subscribe(handler);
                handler();
            });

            return RTC.handleCandidate(
                connection,
                candidate,
            );
        },
    };
}
