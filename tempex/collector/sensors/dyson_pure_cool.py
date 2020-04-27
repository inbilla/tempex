import datetime
import socket
from libpurecool.dyson import DysonAccount
from .sensor import Sensor, SensorObservation


class DysonPureCool(Sensor):
    def __init__(self, name, config):
        super().__init__(name, config)

        self.__username = self.read_config("username", required=True)
        self.__password = self.read_config("password", required=True)
        self.__country = self.read_config("country", required=True)
        self.__device_hostname = self.read_config("hostname", required=False)
        self.__account = None
        self.__device = None

    def login_account(self):
        if self.__account:
            return self.__account

        # Log to Dyson account
        # Language is a two characters code (eg: FR)
        dyson_account = DysonAccount(self.__username, self.__password, self.__country)
        logged = dyson_account.login()
        self.__account = dyson_account

        if not logged:
            print('Unable to login to Dyson account')
            self.__account = None

        return self.__account

    def connect_device(self):
        if self.__device:
            return self.__device

        # Log to Dyson account
        dyson_account = self.login_account()

        # List sensors available on the Dyson account
        devices = dyson_account.devices()

        # Connect using discovery to the first device
        if self.__device_hostname:
            connected = devices[0].connect(self.__device_hostname)
        else:
            connected = devices[0].auto_connect(timeout=10, retry=3)
        if not connected:
            return None
        # connected == device available, state values are available, sensor values

        self.__device = devices[0]

        return self.__device

    def fetch_latest(self):
        now = datetime.datetime.now(datetime.timezone.utc)
        obs_label = r"{station_id}_{date}".format(
            station_id=self.name,
            date=now.strftime("%Y%m%d"),
        )

        obs = self.load_observations(obs_label)
        if not obs:
            obs = []

        device = self.connect_device()
        if not device:
            return None

        data = SensorObservation(
            timestamp=datetime.datetime.now(datetime.timezone.utc).timestamp(),
            temperature=device.environmental_state.temperature - 273.15,
            humidity=device.environmental_state.humidity,
        )

        obs.append(data.all_obs)
        self.update_observations(obs_label, obs)

        device.disconnect()
        self.__device = None

        return data
