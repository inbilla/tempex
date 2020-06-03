import datetime
from elasticsearch import Elasticsearch


class Processor:
    def __init__(self, environment):
        self.environment = environment
        self.sensor_last_processed = {}
        self.__es = Elasticsearch([{'host': 'localhost', 'port': 9200}])
        self.__index_created = False

    def create_index(self, index_name='observations'):
        if self.__index_created:
            return
        self.__index_created = True

        created = False
        # index settings
        settings = {
            "settings": {
                "number_of_shards": 1,
                "number_of_replicas": 0
            },
        }
        try:
            self.__es.indices.delete(index=index_name, ignore=[400, 404])

            if not self.__es.indices.exists(index_name):
                # Ignore 400 means to ignore "Index Already Exist" error.
                self.__es.indices.create(index=index_name, ignore=400, body=settings)
                print('Created Index')
            created = True
        except Exception as ex:
            print(str(ex))
        finally:
            return created

    def store_record(self, record, index_name='observations'):
        self.create_index()
        try:
            outcome = self.__es.index(index=index_name, doc_type='obs', body=record)
        except Exception as ex:
            print('Error in indexing data')
            print(str(ex))

    def run_once(self):
        print('-'*80)
        for sensor in self.environment.sensors:
            self.process_sensor(sensor)
            
    def min_time_utc(self):
        time = datetime.datetime.min.replace(tzinfo=datetime.timezone.utc)
        return time

    def process_sensor(self, sensor):
        last_processed = self.sensor_last_processed.get(sensor.name, self.min_time_utc())
        new_obs = sensor.recent_observations(last_processed)
        for obs in new_obs:
            self.submit_observation(sensor, obs)
            if last_processed < obs.timestamp:
                last_processed = obs.timestamp
        
        self.sensor_last_processed[sensor.name] = last_processed

    def submit_observation(self, sensor, observation):
        print("Observing sensor: {} as {}".format(sensor.name, observation.temperature))
        record = dict(observation.all_obs)
        record.update({
            'name': sensor.name
        })
        self.store_record(record)

    def data_query(self, es, time_begin="now-5d", time_end="now", interval="30m", values=["avg_temperature"]):
        res = es.search(
            index="observations",
            body={
                "query": {
                    "bool": { 
                        "filter": [
                            { 
                                "range": { 
                                    "timestamp": { 
                                        "gte": time_begin,  # "now-5d",
                                        "lte": time_end,  # "now"
                                    },
                                },
                            },
                        ], 
                    }, 
                },
                "size": 0, 
                "aggregations": { 
                    "sensors": { 
                        "terms": { 
                            "field": "name.keyword", 
                        },
                        "aggregations": { 
                            "per_interval": { 
                                "date_histogram": { 
                                    "field": "timestamp", 
                                    "fixed_interval": interval
                                },
                                "aggregations": {
                                    k: {k.split("_")[0]: {"field": k.split("_")[1]}} for k in values
                                }
                            } 
                        }
                    }
                },
            })
        results = {}
        for sensor in res['aggregations']['sensors']['buckets']:
            sensor_name = sensor['key']
            for obs in sensor['per_interval']['buckets']:
                timestamp = obs['key']
                time_bucket = results.get(timestamp, {})

                time_bucket[sensor_name] = {
                    k: obs[k]['value'] for k in values
                }
                results[timestamp] = time_bucket

        return results

    def query(self):
        import json
        print(json.dumps(self.data_query(self.__es), indent=4))
