import * as React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { BrowserRouter } from 'react-router-dom';
import { createSelector } from 'reselect';
import { MuiThemeProvider as ThemeProvider, createMuiTheme } from '@material-ui/core/styles'; // v1.x
import amber from '@material-ui/core/colors/amber';
import lightBlue from '@material-ui/core/colors/lightBlue';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Drawer from '@material-ui/core/Drawer';
import IconButton from '@material-ui/core/IconButton';

import NavigationMenu from '@material-ui/icons/Menu';
import NavigationBack from '@material-ui/icons/ArrowBack';
import NavigationRefresh from '@material-ui/icons/Refresh';

import './App.css';

import withSpin from './widgets/withSpin';
import ErrorBoundary from './components/ErrorBoundary';
import SideMenu from './SideMenu';
import LoginGate from './LoginGate';
import { RouteResolver } from './routes';

import * as C from './constants';
import * as store from './store';
import * as actions from './store/actions';

import { History } from 'history';

const muiTheme = createMuiTheme({
  palette: {
    primary: amber,
    secondary: {
      light: lightBlue.A200,
      main: lightBlue.A400,
      dark: lightBlue.A700,
      contrastText: 'white',
    },
  }
});

// FIXME: get rid of this one
export function getPalette(part: string): string {
  const palette = {
    primary1Color: amber[500],
    primary2Color: amber[700],
    accent1Color: lightBlue[500],
    textColor: 'black',
    alternateTextColor: 'white',
  };

  return palette[part] || '';
}

export const routeResolver = new RouteResolver({
  home: '',
  pim: {
    contacts: {
      _id: {
        _base: ':itemUid',
        edit: 'edit',
        log: 'log',
      },
      new: 'new',
    },
    events: {
      _id: {
        _base: ':itemUid',
        edit: 'edit',
        log: 'log',
      },
      new: 'new',
    },
  },
  journals: {
    _id: {
      _base: ':journalUid',
      items: {
        _id: {
          _base: ':itemUid',
        },
      },
      entries: {
        _id: {
          _base: ':entryUid',
        },
      },
    },
  },
});

const AppBarWitHistory = withRouter(
  class extends React.PureComponent {
    props: {
      title: string,
      toggleDrawerIcon: any,
      history?: History;
      staticContext?: any;
      iconElementRight: any,
    };

    constructor(props: any) {
      super(props);
      this.goBack = this.goBack.bind(this);
      this.canGoBack = this.canGoBack.bind(this);
    }

    canGoBack() {
      return (
        (this.props.history!.length > 1) &&
        (this.props.history!.location.pathname !== routeResolver.getRoute('pim')) &&
        (this.props.history!.location.pathname !== routeResolver.getRoute('home'))
      );
    }

    goBack() {
      this.props.history!.goBack();
    }

    render() {
      const {
        staticContext,
        toggleDrawerIcon,
        history,
        iconElementRight,
        ...props
      } = this.props;
      return (
        <AppBar
          position="static"
          {...props}
        >
          <Toolbar>
            <div style={{ marginLeft: -12, marginRight: 20, }}>
              {!this.canGoBack() ?
                toggleDrawerIcon :
                <IconButton onClick={this.goBack}><NavigationBack /></IconButton>
              }
            </div>

            <div style={{ flexGrow: 1, fontSize: '1.25em' }}>
              {C.appName}
            </div>

            <div style={{ marginRight: -12 }}>
              {iconElementRight}
            </div>
          </Toolbar>
        </AppBar>
      );
    }
  }
);

const IconRefreshWithSpin = withSpin(NavigationRefresh);

class App extends React.PureComponent {
  state: {
    drawerOpen: boolean,
  };

  props: {
    credentials: store.CredentialsType;
    entries: store.EntriesType;
    fetchCount: number;
  };

  constructor(props: any) {
    super(props);
    this.state = { drawerOpen: false };

    this.toggleDrawer = this.toggleDrawer.bind(this);
    this.closeDrawer = this.closeDrawer.bind(this);
    this.refresh = this.refresh.bind(this);
  }

  toggleDrawer() {
    this.setState({drawerOpen: !this.state.drawerOpen});
  }

  closeDrawer() {
    this.setState({drawerOpen: false});
  }

  refresh() {
    store.store.dispatch<any>(actions.fetchAll(this.props.credentials.value!, this.props.entries));
  }

  render() {
    const credentials = (this.props.credentials) ? this.props.credentials.value : null;

    const fetching = this.props.fetchCount > 0;

    return (
      <ThemeProvider theme={muiTheme}>
        <BrowserRouter>
        <div>
          <AppBarWitHistory
            toggleDrawerIcon={<IconButton onClick={this.toggleDrawer}><NavigationMenu /></IconButton>}
            iconElementRight={
              <IconButton disabled={!credentials || fetching} onClick={this.refresh}>
                <IconRefreshWithSpin spin={fetching} />
              </IconButton>}

          />
          <Drawer
            open={this.state.drawerOpen}
            onClose={this.toggleDrawer}
          >
            <SideMenu etesync={credentials} onCloseDrawerRequest={this.closeDrawer} />
          </Drawer>

          <ErrorBoundary>
            <LoginGate credentials={this.props.credentials} />
          </ErrorBoundary>
        </div>
        </BrowserRouter>
      </ThemeProvider>
    );
  }
}

const credentialsSelector = createSelector(
  (state: store.StoreState) => state.credentials.value,
  (state: store.StoreState) => state.credentials.error,
  (state: store.StoreState) => state.credentials.fetching,
  (state: store.StoreState) => state.encryptionKey.key,
  (value, error, fetching, encryptionKey) => {
    if (value === null) {
      return {value, error, fetching};
    }

    return {
      error: error,
      fetching: fetching,
      value: {
        ...value,
        encryptionKey: encryptionKey,
      }
    };
  }
);

const mapStateToProps = (state: store.StoreState) => {
  return {
    credentials: credentialsSelector(state),
    entries: state.cache.entries,
    fetchCount: state.fetchCount,
  };
};

export default connect(
  mapStateToProps
)(App);
