import datetime
import requests
import json
from .sensor import Sensor, SensorObservation


class AustralianBureauOfMeteorology(Sensor):
    def __init__(self, name, config):
        super().__init__(name, config)

        # Load config
        self.__station_id = self.read_config("station_id")

    def __fetch_batch(self):
        now = datetime.datetime.now(datetime.timezone.utc)
        obs_label = r"{station_id}_{date}".format(
            station_id=self.__station_id,
            date=now.strftime("%Y%m%d"),
        )

        obs = self.load_observations(obs_label)

        if obs:
            # Check that we're within 40mins of the latest measurement
            last_obs = obs['observations']['data'][0]
            last_obs_time_str = last_obs['aifstime_utc']
            last_obs_time_utc = datetime.datetime.strptime(last_obs_time_str, "%Y%m%d%H%M%S", )
            last_obs_time_utc = last_obs_time_utc.replace(tzinfo=datetime.timezone.utc)

            time_since = now - last_obs_time_utc
            if time_since < datetime.timedelta(minutes=40):
                print("Using recent data from {} min ago".format(time_since.seconds / 60))
                return obs

        idn = self.__station_id.split(".")[0]
        url_template = r"http://www.bom.gov.au/fwo/{idn}/{station_id}.json"
        url = url_template.format(
            idn=idn,
            station_id=self.__station_id,
        )

        response = requests.get(url)
        if response.status_code != 200:
            raise Exception("Failed to get observations")

        data = json.loads(response.content)

        self.update_observations(obs_label, data)
        return data

    def fetch_latest(self):
        data = self.__fetch_batch()

        latest_obs = data['observations']['data'][0]
        obs = SensorObservation(
            timestamp=datetime.datetime.now(datetime.timezone.utc).timestamp(),
            temperature=latest_obs['air_temp'],
            humidity=latest_obs['rel_hum'],
        )
        return obs

    def recent_observations(self, last_timestamp):
        for label in self._labels_changed_since(last_timestamp):
            data = self.load_observations(label)
            for obs in data['observations']['data']:
                obs_time_str = obs['aifstime_utc']
                obs_time_utc = datetime.datetime.strptime(obs_time_str, "%Y%m%d%H%M%S", )
                obs_time_utc = obs_time_utc.replace(tzinfo=datetime.timezone.utc)

                if obs_time_utc > last_timestamp:
                    yield SensorObservation(
                        timestamp=obs_time_utc,
                        temperature=obs['air_temp'],
                        humidity=obs['rel_hum'],
                    )
