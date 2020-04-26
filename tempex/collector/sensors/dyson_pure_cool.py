import datetime
from libpurecool.dyson import DysonAccount
from .sensor import Sensor, SensorObservation


class DysonPureCool(Sensor):
    def __init__(self, name, config):
        super().__init__(name, config)

        self.__username = self.read_config("username", required=True)
        self.__password = self.read_config("password", required=True)
        self.__country = self.read_config("country", required=True)

    def fetch_latest(self):
        now = datetime.datetime.now(datetime.timezone.utc)
        obs_label = r"{station_id}_{date}".format(
            station_id=self.name,
            date=now.strftime("%Y%m%d"),
        )

        obs = self.load_observations(obs_label)
        if not obs:
            obs = []

        # Log to Dyson account
        # Language is a two characters code (eg: FR)
        dyson_account = DysonAccount(self.__username, self.__password, self.__country)
        logged = dyson_account.login()

        if not logged:
            print('Unable to login to Dyson account')
            return None

        # List sensors available on the Dyson account
        devices = dyson_account.devices()

        # Connect using discovery to the first device
        connected = devices[0].auto_connect()
        if not connected:
            print('Unable to access Dyson device')
            return None
        # connected == device available, state values are available, sensor values

        device = devices[0]
        data = SensorObservation(
            timestamp=datetime.datetime.now(datetime.timezone.utc).timestamp(),
            temperature=device.environmental_state.temperature - 273.15,
            humidity=device.environmental_state.humidity,
        )

        obs.append(data.all_obs)
        self.update_observations(obs_label, obs)

        # Disconnect
        devices[0].disconnect()

        return data
