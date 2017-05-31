// @flow
import React from 'react';
import { connect } from 'react-redux';

import Video from './video';
import Text from './text';

type Props = {
    joined: boolean,
};

const Chat = ({ joined }: Props) => do {
    /* eslint-disable no-unused-expressions, semi */
    if (joined) {
        <Video />
    } else {
        <Text />
    }
    /* eslint-enable no-unused-expressions, semi */
};

const enhance = connect(
    ({ stream }) => ({
        joined: stream.joined,
    }),
);

export default enhance(Chat);
