import time
import datetime
import configparser
from .sensors.australian_bureau_of_meteorology import AustralianBureauOfMeteorology
from .sensors.dyson_pure_cool import DysonPureCool


class Environment:
    type_lookup = {
        'AustralianBureauOfMeteorology': AustralianBureauOfMeteorology,
        'DysonPureCool': DysonPureCool,
    }

    def __init__(self, config_filename):
        self.sensors = []
        self.update_rate = 15 * 60
        self.load_config(config_filename)

    def run_once(self):
        print("-"*80)
        print("Observations for: ", datetime.datetime.now())
        for sensor in self.sensors:
            latest = sensor.fetch_latest()
            self.print_observation(sensor, latest)

    def print_observation(self, sensor, latest):
        heading = "{}: ".format(sensor.name)
        indent = " " * len(heading)
        num_printed = 0
        if latest:
            for i, obs in enumerate(("temperature", "humidity")):
                start = heading
                if i:
                    start = indent

                value = getattr(latest, obs, None)
                if value is not None:
                    print("{}{}: {}".format(start, obs, value))
                    num_printed += 1
            if num_printed == 0:
                print("{}{}".format(heading, "Unknown"))
        else:
            print("{}{}".format(heading, "Failed"))

    def load_config(self, config_filename):
        parser = configparser.ConfigParser()
        with open(config_filename) as f:
            parser.read_file(f)

        self.update_rate = parser["general"].getfloat("update_rate")

        sensor_defs = [x for x in parser.sections() if x.startswith("sensor.")]
        for sensor_def in sensor_defs:
            sensor_config = parser[sensor_def]
            name = sensor_def[7:]
            type = sensor_config.get("type")

            class_constructor = self.type_lookup.get(type)

            sensor = class_constructor(name, sensor_config)
            self.sensors.append(sensor)

        for sensor in self.sensors:
            print("Loaded sensor: {}".format(sensor.name))
