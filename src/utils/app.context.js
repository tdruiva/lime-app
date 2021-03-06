/* eslint-disable react/sort-comp */
import { createContext, Component } from 'preact';
import { useContext } from 'preact/hooks';
import uhttpdService from './uhttpd.service';

const UNAUTH_SESSION_ID = '00000000000000000000000000000000';
const DEFAULT_TIMEOUT = 5000;
const DEFAULT_COMMUNITY_SETTINGS = {
	bad_signal: '-82',
	acceptable_loss: '20',
	bad_bandwidth: '1',
	good_signal: '-65',
	good_bandwidth: '5'
};

/** Context used to pass application wise data and services to nested components */
export const AppContext = createContext();

export class AppContextProvider extends Component {

	constructor(props) {
		super(props);
		this.loginAsRoot = this.loginAsRoot.bind(this);
		this.cancelFbw = this.cancelFbw.bind(this);
		this.setMenuEnabled = this.setMenuEnabled.bind(this);
		this.stopSuCounter = this.stopSuCounter.bind(this);
		this.state = {
			uhttpdService,
			nodeHostname: null,
			boardData: null,
			loading: true,
			unexpectedError: false,
			fbwConfigured: true,
			fbwCanceled: false,
			isRoot: false,
			communitySettings: {},
			suCounter: null,
			menuEnabled: true,
			loginAsRoot: this.loginAsRoot,
			cancelFbw: this.cancelFbw,
			setMenuEnabled: this.setMenuEnabled,
			stopSuCounter: this.stopSuCounter
		};
		this.initialState = this.state;
	}

	componentDidMount(){
		this._login('lime-app', 'generic')
			.then(() => {
				this.setState({ loading: false });
			})
			.then(() => Promise.all(
				[this._fetchBoardData(),
					this._fetchCommunitySettings(),
					this._fetchFBWStatus(),
					this._fetchUpgradeInfo()]
			))
			.then(([boardData, communitySettings, fbwStatus, upgradeInfo]) => {
				this.setState({
					nodeHostname: boardData.hostname,
					boardData,
					communitySettings: { ...DEFAULT_COMMUNITY_SETTINGS, ...communitySettings },
					fbwConfigured: !fbwStatus.lock,
					suCounter: Number(upgradeInfo.safe_upgrade_confirm_remaining_s)
				});
			})
			.catch((error) => {
				console.error(error);
				this.setState({ unexpectedError: true });
			});
	}


	_fetchBoardData() {
		return this.state.uhttpdService.call('system', 'board', {}).toPromise();
	}

	_fetchCommunitySettings() {
		return this.state.uhttpdService.call('lime-utils', 'get_community_settings', {}).toPromise()
			.catch(() => Promise.resolve(DEFAULT_COMMUNITY_SETTINGS));
	}

	_fetchFBWStatus() {
		return this.state.uhttpdService.call('lime-fbw', 'status', {}).toPromise()
			.catch(() => ({lock: false}));
	}

	_fetchUpgradeInfo() {
		return this.state.uhttpdService.call('lime-utils', 'get_upgrade_info', {}).toPromise();
	}

	_login(username, password) {
		const observable = this.state.uhttpdService.call('session', 'login',
			{ username, password, timeout: DEFAULT_TIMEOUT }, UNAUTH_SESSION_ID);
		return observable.toPromise()
			.then(response =>
				new Promise((res, rej) => {
					if (response.ubus_rpc_session) {
						this.state.uhttpdService.setSid(response.ubus_rpc_session);
						res(response);
					}
					else {
						rej(response);
					}
				}));
	}


	/** Passed down throw app context to allow components to login as root */
	loginAsRoot(password) {
		return this._login('root', password)
			.then(() => this.setState({ isRoot: true }));
	}

	cancelFbw() {
		this.setState({ fbwCanceled: true });
	}

	setMenuEnabled(value) {
		this.setState({ menuEnabled: value });
	}

	stopSuCounter() {
		this.setState({ suCounter: -1 })
	}

	render () {
		return (
			<AppContext.Provider value={this.state}>
				{this.props.children}
			</AppContext.Provider>
		);
	}
}

export function useAppContext() {
	const context = useContext(AppContext);
	if (context === undefined) {
		throw new Error('AppContext must be used within an AppContextProvider');
	}
	return context;
}
