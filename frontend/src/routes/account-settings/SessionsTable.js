import React, { Component } from 'react';
import { humanUA } from 'helpers';
import { notice } from 'window';
import { Table, Button, Modal, Icon } from 'antd';
import { EndSessionRequest, AllSessionsRequest } from 'api/sessions';
import moment from 'moment';
import { orderBy } from 'lodash';

const activeHeaders = [
  {
    title: 'Browser',
    dataIndex: 'browser',
    key: 'browser',
  },
  {
    title: 'Signed In',
    dataIndex: 'sign_in',
    key: 'sign_in',
  },
  {
    title: '',
    dataIndex: 'sign_out',
    key: 'sign_out',
  },
];

const expiredHeaders = [
  {
    title: 'Browser',
    dataIndex: 'browser',
    key: 'browser',
  },
  {
    title: 'IP Address',
    dataIndex: 'ip',
    key: 'ip',
  },
  {
    title: 'Signed In',
    dataIndex: 'sign_in',
    key: 'sign_in',
  },
  {
    title: 'Signed Out',
    dataIndex: 'sign_out',
    key: 'sign_out',
  },
];

class SessionsTable extends Component {
  state = {
    sessions: {
      active: [],
      expired: [],
    },
  };

  componentDidMount = () => {
    this.fetchSessions();
    const intervalId = setInterval(this.fetchSessions, 60000);
    this.setState({ intervalId });
  };

  fetchSessions = async () => {
    const resp = await AllSessionsRequest();
    if (resp && resp.ok) {
      this.setState({ sessions: resp.sessions });
    }
  };

  componentWillUnmount() {
    window.clearInterval(this.state.intervalId);
  }

  handleOnClick = session => {
    Modal.confirm({
      title: 'End Session',
      content: `Are you sure you want to end this session?\n\n This will sign out the device using it. And you will need to sign in again on that device.`,
      okText: 'End Session',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        this.endSession(session);
      },
      onCancel() {},
    });
  };

  browser(ua) {
    const hua = humanUA(ua);
    let icon = 'global';

    if (/chrome/i.test(hua)) {
      icon = 'chrome';
    }

    if (/explorer/i.test(hua)) {
      icon = 'windows';
    }

    if (/safari/i.test(hua)) {
      icon = 'apple';
    }

    return (
      <div>
        <Icon type={icon} /> {hua}
      </div>
    );
  }

  sessionDate = date => {
    const mDate = moment(date);
    const dayDifference = moment().diff(mDate, 'days');

    if (dayDifference >= 7) {
      const format = 'dddd, MMM Do YYYY, h:mm a';
      return mDate.format(format);
    } else {
      return mDate.fromNow();
    }
  };

  endSession = async session => {
    const resp = await EndSessionRequest(session.authenticationKey);
    if (resp && resp.ok) {
      notice('Session Signed Out');
      const { active, expired } = this.state.sessions;
      const activeIndex = active.findIndex(
        s => s.authenticationKey === session.authenticationKey,
      );

      this.setState({
        sessions: {
          active: [
            ...active.slice(0, activeIndex),
            ...active.slice(activeIndex + 1),
          ],
          expired: [...expired, { ...session, expiredAt: moment() }],
        },
      });
    }
  };

  expiredDataSource = (sessions, currentTime) => {
    return sessions.map((session, key) => {
      return {
        key,
        browser: this.browser(session.userAgent),
        sign_in: this.sessionDate(session.createdAt),
        sign_out: this.sessionDate(session.expiredAt),
        ip: session.ipAddress,
      };
    });
  };

  activeDataSource = (sessions, currentTime) => {
    return orderBy(
      sessions.map((session, key) => {
        const isCurrent =
          session.authenticationToken ===
          localStorage.getItem('_budgetal_session');

        const signOut = isCurrent ? (
          '(Current Session)'
        ) : (
          <Button
            className="delete-btn"
            onClick={() => this.handleOnClick(session)}
          >
            End Session
          </Button>
        );
        return {
          key,
          browser: this.browser(session.userAgent),
          sign_in: this.sessionDate(session.createdAt),
          sign_out: signOut,
          orderKey: moment(session.createdAt).unix(),
        };
      }),
      ['orderKey'],
      ['desc'],
    );
  };

  render() {
    return (
      <div>
        <Table
          dataSource={this.activeDataSource(
            this.state.sessions.active,
            this.state.currentTime,
          )}
          title={() => {
            return <b>Active Sessions</b>;
          }}
          pagination={false}
          locale={{ emptyText: "You don't have any active sessions." }}
          columns={activeHeaders}
        />
        <br />
        <Table
          dataSource={this.expiredDataSource(
            this.state.sessions.expired,
            this.state.currentTime,
          )}
          title={() => {
            return <b>Expired Sessions (last 10)</b>;
          }}
          pagination={false}
          locale={{ emptyText: "You don't have any expired sessions yet." }}
          columns={expiredHeaders}
        />
      </div>
    );
  }
}

export default SessionsTable;