import * as React from 'react';
import flv from 'flv.js';
import { connect } from 'react-redux';
import { fetchStream } from '../../actions';
import { RouteComponentProps } from 'react-router';
import { Stream } from '../../model/Stream';
import { AppState } from '../../reducers';
import { copyTextToClipboard, resetCopy, formatedDate, timeDifferenceForDate } from '../../utils';
import { User } from '../../model/User';
const img = require('../../assets/default-avatar.jpg');

interface PropsStreamShow extends RouteComponentProps<MatchProps> {
  fetchStream(id: string): Promise<void>;
}

interface MatchProps {
  id: string;
}

interface PropsFromState {
  stream: Stream;
  currentUser: User;
}

class StreamShow extends React.Component<PropsStreamShow & PropsFromState, {}> {
  videoRef: React.RefObject<HTMLVideoElement>;
  player: flv.Player;
  RTMP_SERVER: string;

  constructor(props: PropsStreamShow & PropsFromState) {
    super(props);
    this.videoRef = React.createRef();
    this.RTMP_SERVER = process.env.RTMP_SERVER || 'localhost';
  }

  componentDidMount() {
    this.props.fetchStream(this.props.match.params.id);
    this.buildPlayer();
  }

  componentDidUpdate() {
    this.buildPlayer();
  }

  componentWillUnmount() {
    this.player.destroy();
  }

  streamKey = () => {
    return new Date(this.props.stream.createdAt).getTime().toString().slice(1);
  };

  buildPlayer() {
    if (this.player || !this.props.stream) {
      return;
    }

    const streamKey = this.streamKey();
    const url = process.env.HTTPS
      ? `https://${this.RTMP_SERVER}:8443/live/${streamKey}.flv`
      : `http://${this.RTMP_SERVER}:8000/live/${streamKey}.flv`;

    this.player = flv.createPlayer({
      type: 'flv',
      isLive: true,
      url
    }, {
      enableWorker: false,
      lazyLoadMaxDuration: 3 * 60,
      seekType: 'range'
    });

    if (process.env.NODE_ENV === 'production') {
      flv.LoggingControl.enableAll = false;
    }

    this.player.attachMediaElement(this.videoRef.current);
    this.player.load();
  }

  renderAdmin = (userId: string) => {
    if (this.props.currentUser && userId === this.props.currentUser.userId) {
      const url = `rtmp://${this.RTMP_SERVER}/live/${this.streamKey()}`;
      return (
        <div className='field'>
          <label>Live stream link</label>
          <div className='ui secondary segment'>
            <span
              className='copyBtn'
              data-tooltip='Copy to clipboard'
              data-inverted=''
              onClick={() => copyTextToClipboard(url)}
              onMouseEnter={() => resetCopy()}
            >
              <i className='copy link icon' />
            </span>
            <p className='text'>{url}</p>
          </div>
        </div>
      );
    }
  }

  render() {
    if (!this.props.stream) {
      return <div>Loading...</div>;
    }

    const {
      title,
      description,
      user,
      createdAt,
      views
    } = this.props.stream;

    return (
      <div>
        <video ref={this.videoRef} style={{ width: '100%' }} controls />
        <h1 className='streamTitle'>{title}</h1>
        <p className='streamViews'>{`${views ? views : 0} ${views > 1 ? 'views' : 'view'}`}</p>
        <div className='ui divider'></div>
        <div className='ui feed'>
          <div className='event'>
            <div className='label'>
              <img src={user.avatar ? user.avatar : String(img)} />
            </div>
            <div className='content'>
              <div className='summary'>
                {user.name}
              </div>
              <div className='date'>
                Published on <abbr title={formatedDate(createdAt)}>
                  {formatedDate(createdAt, 'short')}
                </abbr>
              </div>
              <div className='extra'>
                <form className='ui form'>
                  <div className='field'>
                    <label>Description</label>
                    <p>{description}</p>
                  </div>
                  {this.renderAdmin(user.userId)}
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state: AppState, ownProps: PropsStreamShow): PropsFromState => {
  return {
    stream: state.streams[ownProps.match.params.id],
    currentUser: state.auth.user
  };
};

export default connect(mapStateToProps, { fetchStream })(StreamShow);