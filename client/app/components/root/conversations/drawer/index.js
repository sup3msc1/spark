// @flow
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import compose from 'recompose/compose';
import { connect } from 'react-redux';
import Paper from 'material-ui/Paper';
import Subheader from 'material-ui/Subheader';
import { List, ListItem } from 'material-ui/List';
import IconButton from 'material-ui/IconButton';
import Divider from 'material-ui/Divider';
import ContentAdd from 'material-ui/svg-icons/content/add';
import CircularProgress from 'material-ui/CircularProgress';

import connectFirebase from 'utils/firebase/enhancer';

import styles from '../conversations.css';

import Profile from './profile';
import ChannelItem from './channel';
import UserListitem from './invite';
import CreateChannelDialog from './createChannel';
import HandleInviteDialog from './handleInvite';

type Props = {
    match: {
        params: {
            type: 'channels' | 'groups' | 'friends',
        },
    },
    history: {
        push: (string) => void, // eslint-disable-line react/no-unused-prop-types
    },

    uid: string,
    channels: ?Array<{
        name: string,
        subtext: ?string,
        type: 'CHANNEL' | 'GROUP' | 'PERSON',
        users: ?{
            [key: string]: {
                access: 'USER' | 'MODERATOR',
            },
        },
    }>,
    friends: ?{
        [key: string]: 'INVITE' | 'FRIEND',
    },
};

const PAPER_STYLE = {
    position: 'relative',
    width: 256,
    zIndex: 1,
};
const BTN_STYLE = {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 5,
};

class Conversations extends PureComponent {
    static contextTypes = {
        muiTheme: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);
        this.state = {
            inviteUid: null,
            showModal: false,
        };
    }

    state: {
        showModal: boolean,
    };

    componentWillMount() {
        this.selectChannel = async channel => {
            this.props.history.push(`/${this.props.match.params.type}/${channel}`);

            const { database } = await import(/* webpackChunkName: "firebase" */ '../../../../utils/firebase');
            const userRef = database.ref(`/channels/${channel}/users/${this.props.uid}`);
            userRef.once('value', snapshot => {
                if (snapshot.val() === null) {
                    userRef.child('access').set('USER');
                }
            });
        };
        this.openModal = () => {
            this.setState({ showModal: true });
        };
        this.closeModal = () => {
            this.setState({ showModal: false });
        };
        this.closeInviteModal = () => {
            this.setState({ inviteUid: null });
        };
    }

    props: Props;

    category(type) {
        const { channels, match } = this.props;
        const { channel } = match.params;

        if (channels) {
            const filtered = channels.filter(node => node.type === type);
            if (filtered.length) {
                return filtered.map(node => (
                    // $FlowIssue
                    <ChannelItem
                        onTouchTap={() => this.selectChannel(node.name)}
                        selected={channel === node.name}
                        key={node.name} value={node.name}
                        channel={node} />
                ));
            }

            return '';
        }

        return <ListItem leftAvatar={<CircularProgress />} primaryText="Loading ..." disabled />;
    }

    render() {
        let title;
        let category;
        const invites = [];
        const friends = [];

        // eslint-disable-next-line default-case
        switch (this.props.match.params.type) {
            case 'channels':
                title = 'Channels';
                category = 'CHANNEL';
                break;

            case 'groups':
                title = 'Groups';
                category = 'GROUP';
                break;

            case 'friends':
                title = 'Friends';
                category = 'PERSON';
                if (this.props.friends) {
                    invites.push(<Divider key="dividerInvites" />);
                    invites.push(<Subheader>Invites</Subheader>);

                    Object.entries(this.props.friends).forEach(([key, value]) => {
                        if (value === 'INVITE') {
                            invites.push(
                                <UserListitem
                                    onTouchTap={() => this.setState({ inviteUid: key })}
                                    key={key}
                                    uid={key} />,
                            );
                        } else if (value === 'FRIEND') {
                            friends.push(
                                <UserListitem
                                    onTouchTap={() => console.log('tap')}
                                    key={key}
                                    uid={key} />,
                            );
                        }
                    });
                    invites.push(<Divider key="dividerChannels" />);
                    invites.push(<Subheader>Channels</Subheader>);
                }
                break;
        }

        const { primary3Color } = this.context.muiTheme.palette;
        return (
            <Paper style={{ ...PAPER_STYLE, backgroundColor: primary3Color }} rounded={false}>
                <IconButton onTouchTap={this.openModal} style={BTN_STYLE}>
                    <ContentAdd />
                </IconButton>

                <List>
                    <Subheader className={styles.subheader}>{title}</Subheader>
                    {friends}
                    {invites}
                    {this.category(category)}
                </List>

                <Profile />

                <CreateChannelDialog
                    type={category}
                    open={this.state.showModal}
                    onRequestClose={this.closeModal} />

                <HandleInviteDialog
                    inviteUid={this.state.inviteUid}
                    closeModal={this.closeInviteModal}
                    uid={this.props.uid} />
            </Paper>
        );
    }
}

const enhance = compose(
    connect(
        ({ auth }) => ({
            uid: auth.user.uid,
        }),
    ),
    connectFirebase(
        () => '/channels',
        value => do {
            /* eslint-disable no-unused-expressions */
            if (value) {
                ({
                    channels: Object.entries(value).map(([name, val]) => ({ name, ...val })),
                });
            } else {
                null;
            }
            /* eslint-enable no-unused-expressions */
        },
    ),
    connectFirebase(
        ({ uid, match }) => (match.params.type === 'friends' ? `/users/${uid}/friends` : null),
        friends => ({ friends }),
    ),
);

export default enhance(Conversations);
