import os
import json


class Sensor:
    STORAGE_ROOT = os.environ.get('TEMPEX_STORAGE_ROOT', os.getcwd())

    def __init__(self, name, config):
        self.__name = name
        self.__config = config or {}
        self.__obs_storage = os.path.join(self.STORAGE_ROOT, self.__config.get('observations', 'obs'))

    @property
    def name(self):
        return self.__name

    def fetch_latest(self):
        raise NotImplemented()

    def read_config(self, key, default=None, required=True):
        if required and key not in self.__config:
            raise Exception("Missing configuration entry: {} for sensor: {}".format(key, self.name))
        return self.__config.get(key, default)

    def update_observations(self, label, data):
        filename = os.path.join(self.__obs_storage, "{}.json".format(label))
        with open(filename, 'w') as f:
            f.write(json.dumps(data, indent=4))

    def load_observations(self, label):
        filename = "{}/{}.json".format(self.__obs_storage, label)

        if not os.path.isfile(filename):
            return None

        with open(filename, 'r') as f:
            content = f.read()

        data = json.loads(content)
        return data


class SensorObservation:
    def __init__(self, **kwargs):
        self.__obs = kwargs

    @property
    def timestamp(self):
        return self.__obs.get("timestamp")

    @property
    def temperature(self):
        return self.__obs.get("temperature")

    @property
    def humidity(self):
       return self.__obs.get("humidity")

    @property
    def wind(self):
        return self.__obs.get("wind")

    @property
    def all_obs(self):
        return self.__obs
